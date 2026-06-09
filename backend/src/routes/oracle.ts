import type { FastifyInstance } from 'fastify'
import { Keypair, PublicKey, Ed25519Program } from '@solana/web3.js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { getMatch } from '../lib/match-store.js'

const PROGRAM_ID = new PublicKey(process.env.MIND_DUEL_PROGRAM_ID ?? '8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN')
const GAME_SEED = Buffer.from('game')

/**
 * The oracle key must equal the on-chain ORACLE_PUBKEY (== TREASURY_PUBKEY in
 * constants.rs). For the hackathon the platform runs one key for treasury +
 * sponsor + oracle, so we load it the same way the sponsor route does, with a
 * dedicated ORACLE_* override available for a future split.
 */
/** On-chain ORACLE_PUBKEY (== TREASURY_PUBKEY in constants.rs). The loaded
 * oracle key MUST equal this or every proof is rejected by the program. */
const EXPECTED_ORACLE = 'CPoofbZho4bJmSAyVJxfeMK9CoZpXpDYftctghwUJX86'

function tryLoadKeypair(json?: string, b64?: string, path?: string): Keypair | null {
  if (json) { try { return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(json))) } catch {} }
  if (b64) { try { return Keypair.fromSecretKey(Buffer.from(b64, 'base64')) } catch {} }
  if (path) { try { return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, 'utf8')))) } catch {} }
  return null
}

function loadOracleKeypair(): Keypair | null {
  // A dedicated ORACLE_* source takes FULL precedence — otherwise a sponsor key
  // (which is a different, fee-paying hot wallet) would shadow it and produce
  // signatures the on-chain program rejects. Only when no ORACLE_* is configured
  // do we fall back to the sponsor key / default keyfile (single-key setups).
  const fromOracle = tryLoadKeypair(
    process.env.ORACLE_KEYPAIR_JSON,
    process.env.ORACLE_KEYPAIR_BASE64,
    process.env.ORACLE_KEYPAIR_PATH,
  )
  if (fromOracle) return fromOracle
  return tryLoadKeypair(
    process.env.SPONSOR_KEYPAIR_JSON,
    process.env.SPONSOR_KEYPAIR_BASE64,
    process.env.SPONSOR_KEYPAIR_PATH ?? resolve(process.cwd(), '.keys', 'payer.json'),
  )
}

/**
 * Per-match game-PDA nonce. MUST match the frontend's `nonceForMatch` exactly
 * (64-bit FNV-1a over the matchId) so the PDA the oracle signs for is the same
 * one the players locked their stakes in.
 */
function nonceForMatch(matchId: string): bigint {
  const MASK = 0xffffffffffffffffn
  const PRIME = 0x100000001b3n
  let hash = 0xcbf29ce484222325n
  for (let i = 0; i < matchId.length; i++) {
    hash = (hash ^ BigInt(matchId.charCodeAt(i))) & MASK
    hash = (hash * PRIME) & MASK
  }
  return hash
}

function deriveGamePda(playerOne: PublicKey, matchId: string): PublicKey {
  const nonceBuf = Buffer.alloc(8)
  nonceBuf.writeBigUInt64LE(nonceForMatch(matchId))
  return PublicKey.findProgramAddressSync([GAME_SEED, playerOne.toBuffer(), nonceBuf], PROGRAM_ID)[0]
}

/** Sign `message` with the oracle key and return the 64-byte Ed25519 signature. */
function signMessage(oracle: Keypair, message: Buffer): Buffer {
  const ix = Ed25519Program.createInstructionWithPrivateKey({ privateKey: oracle.secretKey, message })
  // Ed25519 ix data: num_sigs(1) pad(1) offsets(14) pubkey(32) sig(64) message(..).
  // Read signature_offset from the offsets struct rather than hardcoding it.
  const sigOffset = ix.data.readUInt16LE(2)
  return Buffer.from(ix.data.subarray(sigOffset, sigOffset + 64))
}

const proofSchema = z.object({
  matchId: z.string().min(1),
  winner: z.string().min(32),
})

export async function oracleRoutes(app: FastifyInstance) {
  const oracle = loadOracleKeypair()

  if (!oracle) {
    app.log.warn('[oracle] No oracle keypair configured — /oracle/settle-proof will 503.')
  } else if (oracle.publicKey.toBase58() !== EXPECTED_ORACLE) {
    app.log.warn(
      `[oracle] Loaded oracle key ${oracle.publicKey.toBase58()} != on-chain ORACLE_PUBKEY ${EXPECTED_ORACLE}. ` +
      'settle_with_proof will REJECT these signatures. Set ORACLE_KEYPAIR_* to the treasury key.',
    )
  } else {
    app.log.info('[oracle] Oracle key matches on-chain ORACLE_PUBKEY.')
  }

  app.get('/oracle/pubkey', async (_req, reply) => {
    if (!oracle) return reply.code(503).send({ error: 'Oracle not configured on backend.' })
    return { pubkey: oracle.publicKey.toBase58() }
  })

  // Produce an oracle proof the winner can submit to `settle_with_proof`. The
  // oracle signs ONLY the recorded winner of a finished match — it derives the
  // game PDA and message itself, so a caller cannot get a signature for an
  // arbitrary winner. (Off-chain trust note: the recorded winner currently comes
  // from the client report via /match/finish; hardening that to server-verified
  // trivia outcomes is the documented upgrade path.)
  app.post('/oracle/settle-proof', async (req, reply) => {
    if (!oracle) return reply.code(503).send({ error: 'Oracle not configured on backend.' })

    const parsed = proofSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    const { matchId, winner } = parsed.data

    const match = await getMatch(matchId)
    if (!match) return reply.code(404).send({ error: 'Match not found.' })
    if (match.status !== 'finished' || match.winner === null) {
      return reply.code(409).send({ error: 'Match is not finished with a recorded winner yet.' })
    }
    if (match.winner !== winner) {
      return reply.code(403).send({ error: 'Requested winner does not match the recorded result.' })
    }

    let playerOnePk: PublicKey
    let winnerPk: PublicKey
    try {
      playerOnePk = new PublicKey(match.playerOne)
      winnerPk = new PublicKey(winner)
    } catch {
      return reply.code(400).send({ error: 'Malformed pubkey in match record.' })
    }

    const gamePda = deriveGamePda(playerOnePk, matchId)
    const message = Buffer.concat([gamePda.toBuffer(), winnerPk.toBuffer()])
    const signature = signMessage(oracle, message)

    return {
      oraclePubkey: oracle.publicKey.toBase58(),
      gamePubkey: gamePda.toBase58(),
      message: message.toString('base64'),
      signature: signature.toString('base64'),
    }
  })
}
