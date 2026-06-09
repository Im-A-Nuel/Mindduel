import { eq, and, desc, sql } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { db } from './db.js'
import { matches, badges, type Badge } from './schema.js'

export type BadgeType =
  | 'first_win'
  | 'streak_3'
  | 'streak_5'
  | 'streak_10'
  | 'high_rank'   // reached Gold tier (1200+ points) on the ranked ladder
  | 'flawless'    // win without losing a single turn (>= 5 questions, 100%)

interface BadgeMeta {
  name:        string
  description: string
  symbol:      string
  image:       string  // simple gradient SVG data URI
}

/** Points threshold for the high_rank badge (mirrors the Gold tier). */
const HIGH_RANK_POINTS = 1200

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
  high_rank: {
    name: 'Gold Rank', symbol: 'MD-GOLD',
    description: 'Climbed to Gold (1200+ points) on the ranked ladder.',
    image: gradientSvg('#F5B301', '#B8860B', '★'),
  },
  flawless: {
    name: 'Flawless', symbol: 'MD-FLAW',
    description: 'Won a match with 100% trivia accuracy across 5+ questions.',
    image: gradientSvg('#34C759', '#0A7A2D', '✓'),
  },
}

function gradientSvg(c1: string, c2: string, glyph: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='${c2}'/></linearGradient></defs><rect width='128' height='128' rx='28' fill='url(#g)'/><text x='64' y='86' text-anchor='middle' font-size='64' fill='white' font-family='system-ui' font-weight='700'>${glyph}</text></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

export function getBadgeMeta(type: BadgeType): BadgeMeta {
  return BADGE_META[type]
}

/** Consecutive wins ending at the player's latest finished match. */
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
  player: string
  /** Winner's current on-chain points (for the high_rank badge). */
  points?: number
}

/**
 * Inspect a player's record after a settled match and award any newly-eligible
 * badges. DB-only (no NFT mint). Returns the badge types awarded by this call.
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
  if ((ctx.points ?? 0) >= HIGH_RANK_POINTS) candidates.push('high_rank')

  for (const type of candidates) {
    if (await hasBadge(ctx.player, type)) continue
    const id = randomBytes(8).toString('hex')
    await db.insert(badges).values({
      id, player: ctx.player, type, earnedAt: Date.now(),
    })
    earned.push(type)
  }

  return earned
}

export async function listBadgesForPlayer(player: string): Promise<Badge[]> {
  return await db.select().from(badges)
    .where(eq(badges.player, player))
    .orderBy(desc(badges.earnedAt))
}
