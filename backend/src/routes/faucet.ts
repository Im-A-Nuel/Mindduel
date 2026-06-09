import type { FastifyInstance } from 'fastify'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'

const FAUCET_AMOUNT_USDC = 100
const USDC_DECIMALS = 6
const RATE_LIMIT_MS = 24 * 60 * 60 * 1000 // 24 hours

const reqSchema = z.object({
  wallet: z.string().min(32).max(44),
})

const lastRequestByWallet = new Map<string, number>()

function loadFaucetEnv() {
  const mint    = process.env.MOCK_USDC_MINT
  const authRaw = process.env.MINT_AUTHORITY_SECRET
  if (!mint || !authRaw) return null
  let authBytes: number[]
  try { authBytes = JSON.parse(authRaw) } catch { return null }

  // Fee payer for faucet txs — defaults to backend/.keys/payer.json (the wallet
  // that funded mint creation). If unavailable, falls back to mint authority
  // (which must then have SOL).
  let payer: Keypair
  const payerPath = process.env.FAUCET_PAYER_KEYPAIR_PATH ?? resolve(process.cwd(), '.keys', 'payer.json')
  try {
    const raw = readFileSync(payerPath, 'utf8')
    payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)))
  } catch {
    payer = Keypair.fromSecretKey(Uint8Array.from(authBytes))
  }

  return {
    mintPubkey: new PublicKey(mint),
    authority:  Keypair.fromSecretKey(Uint8Array.from(authBytes)),
    payer,
    rpcUrl:     process.env.RPC_URL ?? clusterApiUrl('devnet'),
  }
}

export async function faucetRoutes(app: FastifyInstance) {
  const env = loadFaucetEnv()

  app.post('/api/faucet', async (req, reply) => {
    if (!env) {
      return reply.code(503).send({ error: 'Faucet not configured. Set MOCK_USDC_MINT and MINT_AUTHORITY_SECRET.' })
    }

    const parsed = reqSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid wallet address' })
    }

    let walletPubkey: PublicKey
    try {
      walletPubkey = new PublicKey(parsed.data.wallet)
    } catch {
      return reply.code(400).send({ error: 'Invalid wallet address' })
    }

    const now    = Date.now()
    const lastAt = lastRequestByWallet.get(parsed.data.wallet) ?? 0
    if (now - lastAt < RATE_LIMIT_MS) {
      const remainingMs   = RATE_LIMIT_MS - (now - lastAt)
      const totalMinutes  = Math.ceil(remainingMs / 60_000)
      const hours         = Math.floor(totalMinutes / 60)
      const minutes       = totalMinutes % 60
      const wait          = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
      return reply.code(429).send({ error: `Rate limited. Try again in ${wait}.` })
    }
    lastRequestByWallet.set(parsed.data.wallet, now)

    const connection = new Connection(env.rpcUrl, 'confirmed')
    const ata        = getAssociatedTokenAddressSync(env.mintPubkey, walletPubkey, false)
    const baseUnits  = BigInt(FAUCET_AMOUNT_USDC) * BigInt(10 ** USDC_DECIMALS)

    try {
      const tx = new Transaction().add(
        createAssociatedTokenAccountIdempotentInstruction(
          env.payer.publicKey,      // payer (must have SOL)
          ata,
          walletPubkey,             // owner
          env.mintPubkey,
        ),
        createMintToInstruction(
          env.mintPubkey,
          ata,
          env.authority.publicKey,  // mint authority
          baseUnits,
        ),
      )
      tx.feePayer = env.payer.publicKey
      const signers = env.payer.publicKey.equals(env.authority.publicKey)
        ? [env.payer]
        : [env.payer, env.authority]
      const signature = await sendAndConfirmTransaction(connection, tx, signers, {
        commitment: 'confirmed',
      })
      return { signature, amount: FAUCET_AMOUNT_USDC, ata: ata.toBase58() }
    } catch (err) {
      // Log the full error server-side only. Never echo it to the client —
      // String(err) can leak the RPC URL, keypair file paths, or internal
      // addresses to an attacker probing the faucet.
      app.log.error({ err: String(err) }, 'Faucet mint failed')
      lastRequestByWallet.delete(parsed.data.wallet)
      return reply.code(500).send({ error: 'Mint failed. Please try again later.' })
    }
  })
}
