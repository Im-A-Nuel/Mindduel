import type { FastifyInstance } from 'fastify'
import { Keypair, Transaction, PublicKey, ComputeBudgetProgram, Ed25519Program } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

const PROGRAM_ID = process.env.MIND_DUEL_PROGRAM_ID ?? '8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN'

/**
 * Whitelist of program IDs that the sponsor is willing to pay fees for.
 * Anything outside this list is rejected before signing — otherwise a
 * malicious client could craft a tx that drains the sponsor wallet via
 * an unrelated SystemProgram::Transfer.
 *
 * Sponsor signs only as fee payer, never as authority for any instruction,
 * so as long as every instruction targets a program where the sponsor is
 * not a required signer (which is the case for all entries here), the
 * worst-case impact is paying the tx fee. That is the explicit deal.
 */
function buildAllowedPrograms(): Set<string> {
  return new Set<string>([
    PROGRAM_ID,
    ComputeBudgetProgram.programId.toBase58(),
    TOKEN_PROGRAM_ID.toBase58(),
    ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
    '11111111111111111111111111111111', // SystemProgram (for create_account/transfer used inside Anchor PDA init)
    Ed25519Program.programId.toBase58(), // Ed25519 verify ix prepended to settle_with_proof
  ])
}

function loadSponsorKeypair(): Keypair | null {
  // Priority 1: JSON array in env var (Railway-friendly, no file needed)
  const envJson = process.env.SPONSOR_KEYPAIR_JSON
  if (envJson) {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(envJson)))
    } catch {}
  }

  // Priority 2: base64-encoded secret key in env var
  const envB64 = process.env.SPONSOR_KEYPAIR_BASE64
  if (envB64) {
    try {
      return Keypair.fromSecretKey(Buffer.from(envB64, 'base64'))
    } catch {}
  }

  // Priority 3: file path (local dev)
  const path = process.env.SPONSOR_KEYPAIR_PATH ?? resolve(process.cwd(), '.keys', 'payer.json')
  try {
    const raw = readFileSync(path, 'utf8')
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)))
  } catch {
    return null
  }
}

const signSchema = z.object({
  /** base64-encoded serialized Transaction (NOT signed by user yet) */
  tx: z.string().min(1),
})

// Per-IP rate limiter for /sponsor/sign-tx. Each request fee-charges the
// sponsor wallet, so without a cap an attacker could drain it. 30 req/min
// per IP comfortably covers genuine play (one tx every 2s) while making
// drain attacks financially uninteresting.
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT     = 30
const ipBuckets = new Map<string, { count: number; resetAt: number }>()

function takeRateToken(ip: string): boolean {
  const now = Date.now()
  const bucket = ipBuckets.get(ip)
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (bucket.count >= RATE_LIMIT) return false
  bucket.count += 1
  return true
}

// Periodic GC so the map doesn't accumulate entries forever.
setInterval(() => {
  const now = Date.now()
  for (const [ip, b] of ipBuckets) {
    if (now > b.resetAt) ipBuckets.delete(ip)
  }
}, 5 * 60_000)

export async function sponsorRoutes(app: FastifyInstance) {
  const sponsor = loadSponsorKeypair()
  const allowed = buildAllowedPrograms()

  app.get('/sponsor/pubkey', async (_req, reply) => {
    if (!sponsor) {
      return reply.code(503).send({ error: 'Sponsor not configured on backend.' })
    }
    return { pubkey: sponsor.publicKey.toBase58() }
  })

  app.post('/sponsor/sign-tx', async (req, reply) => {
    if (!sponsor) {
      return reply.code(503).send({ error: 'Sponsor not configured on backend.' })
    }
    const ip = req.ip ?? 'unknown'
    if (!takeRateToken(ip)) {
      return reply.code(429).send({ error: 'Too many sponsor requests. Slow down.' })
    }
    const parsed = signSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }

    let tx: Transaction
    try {
      tx = Transaction.from(Buffer.from(parsed.data.tx, 'base64'))
    } catch {
      return reply.code(400).send({ error: 'Could not decode transaction.' })
    }

    // Validate fee payer is sponsor (defends against the client claiming a
    // sponsored tx and then quietly billing someone else).
    if (!tx.feePayer || !tx.feePayer.equals(sponsor.publicKey)) {
      return reply.code(400).send({ error: 'Fee payer must be the sponsor pubkey.' })
    }

    // Critical: the sponsor's ONLY legitimate role is fee payer. It must never
    // appear inside any instruction's account list. Without this guard an
    // attacker could craft a SystemProgram::Transfer { from: sponsor, to:
    // attacker } (System is allowlisted for PDA/ATA init) and our partialSign
    // would authorize the drain — Anchor partialSign signs the tx wholesale,
    // there's no per-instruction sign control.
    //
    // We reject on the pubkey *appearing at all*, not just on the `isSigner`
    // flag, because that flag is reconstructed from attacker-supplied serialized
    // bytes and is not a trustworthy authority signal. The fee-payer slot lives
    // in the message header, not in instruction keys, so a genuine sponsored tx
    // never references the sponsor inside an instruction.
    for (const ix of tx.instructions) {
      for (const meta of ix.keys) {
        if (meta.pubkey.equals(sponsor.publicKey)) {
          return reply.code(400).send({
            error: 'Sponsor pubkey must not appear in any instruction — sponsor signs only as fee payer.',
          })
        }
      }
    }

    // Validate every instruction targets an allowed program.
    for (const ix of tx.instructions) {
      if (!allowed.has(ix.programId.toBase58())) {
        return reply.code(400).send({ error: `Instruction targets disallowed program: ${ix.programId.toBase58()}` })
      }
    }

    // Sponsor partial-signs as fee payer only. The user still needs to sign
    // for any instruction where they are a required signer (e.g. their stake
    // transfer). The submitted, fully-signed tx is then relayed by the FE.
    try {
      tx.partialSign(sponsor)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return reply.code(500).send({ error: 'Sponsor sign failed: ' + msg })
    }

    const serialized = tx.serialize({ requireAllSignatures: false }).toString('base64')
    return { tx: serialized, sponsor: sponsor.publicKey.toBase58() }
  })
}
