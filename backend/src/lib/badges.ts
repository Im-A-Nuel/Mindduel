import { eq, and, desc, sql } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { db } from './db.js'
import { matches, badges, type Badge } from './schema.js'

export type BadgeType =
  | 'first_win'
  | 'streak_3'
  | 'streak_5'
  | 'streak_10'
  | 'whale'      // staked ≥ 1 SOL in a single match
  | 'flawless'   // win without losing a single turn (>= 5 questions, 100%)

interface BadgeMeta {
  name:        string
  description: string
  symbol:      string
  image:       string  // simple gradient SVG data URI
}

const BADGE_META: Record<BadgeType, BadgeMeta> = {
  first_win: {
    name: 'First Blood', symbol: 'MD-FIRST',
    description: 'Won your first match on MindDuel.',
    image: gradientSvg('#FF6B6B', '#C92A2A', 'I'),
  },
  streak_3: {
    name: 'Triple Threat', symbol: 'MD-S3',
    description: 'Three consecutive wins.',
    image: gradientSvg('#FFB142', '#FF6A00', '3'),
  },
  streak_5: {
    name: 'Pentakill', symbol: 'MD-S5',
    description: 'Five consecutive wins.',
    image: gradientSvg('#9B5DE5', '#5E3FBE', '5'),
  },
  streak_10: {
    name: 'Decimator', symbol: 'MD-S10',
    description: 'Ten consecutive wins. Inhuman.',
    image: gradientSvg('#FFD700', '#E8B800', 'X'),
  },
  whale: {
    name: 'Big Stake', symbol: 'MD-WHALE',
    description: 'Wagered 1+ SOL in a single duel.',
    image: gradientSvg('#06B6D4', '#0E7490', 'W'),
  },
  flawless: {
    name: 'Flawless', symbol: 'MD-FLAW',
    description: 'Won a match with 100% trivia accuracy across 5+ questions.',
    image: gradientSvg('#34C759', '#0A7A2D', '★'),
  },
}

function gradientSvg(c1: string, c2: string, glyph: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='${c2}'/></linearGradient></defs><rect width='128' height='128' rx='28' fill='url(#g)'/><text x='64' y='86' text-anchor='middle' font-size='64' fill='white' font-family='system-ui' font-weight='700'>${glyph}</text></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

export function getBadgeMeta(type: BadgeType): BadgeMeta {
  return BADGE_META[type]
}

/**
 * Compute the player's current win streak from finished matches (most recent first).
 * Returns the count of consecutive wins ending at the latest match.
 */
async function currentWinStreak(player: string): Promise<number> {
  const rows = await db.select({
    winner: matches.winner,
    finishedAt: matches.finishedAt,
  }).from(matches)
    .where(and(
      eq(matches.status, 'finished'),
      sql`(${matches.playerOne} = ${player} OR ${matches.playerTwo} = ${player})`,
    ))
    .orderBy(desc(matches.finishedAt))
    .limit(20)

  let streak = 0
  for (const r of rows) {
    if (r.winner === player) streak++
    else break
  }
  return streak
}

async function totalWins(player: string): Promise<number> {
  const [{ wins }] = await db.select({
    wins: sql<number>`count(*)::int`,
  }).from(matches)
    .where(and(eq(matches.status, 'finished'), eq(matches.winner, player)))
  return wins
}

async function hasBadge(player: string, type: BadgeType): Promise<boolean> {
  const [row] = await db.select().from(badges)
    .where(and(eq(badges.player, player), eq(badges.type, type)))
    .limit(1)
  return !!row
}

interface AwardContext {
  player:    string
  matchPot:  number      // total pot of the just-finished match (player's currency)
  currency:  'sol' | 'usdc'
}

/**
 * Inspect a player's record after a settled match and award any newly-eligible
 * badges. Returns the set of badge types that were awarded by this call.
 *
 * NFT minting itself is fire-and-forget via mintBadgeOnChain — DB row is created
 * with mint_addr=null, then patched once the on-chain mint completes.
 */
export async function awardBadgesAfterMatch(ctx: AwardContext): Promise<BadgeType[]> {
  const wins   = await totalWins(ctx.player)
  const streak = await currentWinStreak(ctx.player)
  const earned: BadgeType[] = []

  const candidates: BadgeType[] = []
  if (wins >= 1) candidates.push('first_win')
  if (streak >= 3) candidates.push('streak_3')
  if (streak >= 5) candidates.push('streak_5')
  if (streak >= 10) candidates.push('streak_10')
  // whale: stake side of pot is 1+ SOL (pot = stake * 2)
  if (ctx.currency === 'sol' && ctx.matchPot >= 2) candidates.push('whale')

  for (const type of candidates) {
    if (await hasBadge(ctx.player, type)) continue
    const id = randomBytes(8).toString('hex')
    await db.insert(badges).values({
      id, player: ctx.player, type,
      mintAddr: null, txSig: null,
      earnedAt: Date.now(),
    })
    earned.push(type)
    // Mint async (don't block settle response if Solana RPC is slow)
    void mintBadgeOnChain(id, ctx.player, type).catch(err => {
      console.error('[badges] mint failed for', type, ctx.player, err)
    })
  }

  return earned
}

export async function listBadgesForPlayer(player: string): Promise<Badge[]> {
  return await db.select().from(badges)
    .where(eq(badges.player, player))
    .orderBy(desc(badges.earnedAt))
}

// ── On-chain mint via Metaplex Umi ─────────────────────────────────────
//
// Lazy-loaded so the rest of the backend works even if Umi setup fails
// (e.g. missing keypair, RPC down). A failed mint just leaves mint_addr=null
// in the DB row, and the frontend treats that as "claim pending".

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let umiInstance: unknown = null
async function getUmi(): Promise<{ umi: any; signer: any } | null> {
  if (umiInstance) return umiInstance as { umi: any; signer: any }
  try {
    const { createUmi } = await import('@metaplex-foundation/umi-bundle-defaults')
    const { keypairIdentity } = await import('@metaplex-foundation/umi')
    const rpcUrl = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
    const umi = createUmi(rpcUrl)

    // Reuse the same payer keypair that funded the program deploy.
    const path = process.env.BADGE_MINTER_KEYPAIR_PATH ?? resolve(process.cwd(), '.keys', 'payer.json')
    const secretArray = JSON.parse(readFileSync(path, 'utf8')) as number[]
    const signer = umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(secretArray))
    umi.use(keypairIdentity(signer))
    umiInstance = { umi, signer }
    return umiInstance as { umi: any; signer: any }
  } catch (e) {
    console.error('[badges] Umi init failed (mints will be DB-only):', e)
    return null
  }
}

async function mintBadgeOnChain(badgeId: string, player: string, type: BadgeType): Promise<void> {
  const ctx = await getUmi()
  if (!ctx) return

  // Retry up to 3 times with exponential backoff (2s, 4s, 8s). Devnet
  // RPC blips are common — without retries badges silently disappear,
  // since the badges row was already inserted with mint_addr=null.
  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { generateSigner, publicKey, percentAmount } = await import('@metaplex-foundation/umi')
      const { createNft, mplTokenMetadata } = await import('@metaplex-foundation/mpl-token-metadata')

      ctx.umi.use(mplTokenMetadata())

      const meta = BADGE_META[type]
      const mint = generateSigner(ctx.umi)

      const builder = createNft(ctx.umi, {
        mint,
        name:   meta.name,
        symbol: meta.symbol,
        uri:    `data:application/json;base64,${Buffer.from(JSON.stringify({
          name: meta.name,
          symbol: meta.symbol,
          description: meta.description,
          image: meta.image,
          attributes: [
            { trait_type: 'badge_type', value: type },
            { trait_type: 'player',     value: player },
          ],
        })).toString('base64')}`,
        sellerFeeBasisPoints: percentAmount(0),
        tokenOwner: publicKey(player),
        isCollection: false,
      })

      const result = await builder.sendAndConfirm(ctx.umi)
      const sig = Buffer.from(result.signature).toString('hex')
      const mintAddr = mint.publicKey.toString()

      await db.update(badges)
        .set({ mintAddr, txSig: sig })
        .where(eq(badges.id, badgeId))

      console.log(`[badges] minted ${type} for ${player.slice(0, 8)}… → ${mintAddr.slice(0, 8)}… (attempt ${attempt})`)
      return
    } catch (e) {
      const isLast = attempt === MAX_ATTEMPTS
      console.error(`[badges] mint attempt ${attempt}/${MAX_ATTEMPTS} failed for ${type} ${player.slice(0, 8)}…:`, e instanceof Error ? e.message : e)
      if (isLast) {
        console.error(`[badges] PERMANENTLY FAILED — row ${badgeId} stays pending. Manual recovery needed.`)
        return
      }
      const delay = 2_000 * Math.pow(2, attempt - 1)  // 2s, 4s, 8s
      await new Promise(r => setTimeout(r, delay))
    }
  }
}
