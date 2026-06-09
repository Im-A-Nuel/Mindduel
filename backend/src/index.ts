import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { triviaRoutes } from './routes/trivia.js'
import { matchRoutes } from './routes/match.js'
import { wsRoutes } from './routes/ws.js'
import { faucetRoutes } from './routes/faucet.js'
import { statsRoutes } from './routes/stats.js'
import { tournamentRoutes } from './routes/tournament.js'
import { sponsorRoutes } from './routes/sponsor.js'
import { oracleRoutes } from './routes/oracle.js'
import { getLiveStats, cleanupExpiredMatches } from './lib/match-store.js'

const app = Fastify({ logger: true })

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) ?? [
  'http://localhost:3000',
  'https://mindduel.app',
]

// Vercel preview deployments use unpredictable subdomains like
// mind-duel-<hash>-<owner>.vercel.app. Allow them via a regex if the env
// var is set (only the production domain should ever be in the literal
// list above to avoid a wildcard-allows-everyone footgun).
const allowVercelPreview = process.env.ALLOW_VERCEL_PREVIEW === '1'

await app.register(cors, {
  origin: (origin, cb) => {
    // Server-to-server / curl etc. — no Origin header. Allow.
    if (!origin) return cb(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    if (allowVercelPreview && /\.vercel\.app$/.test(new URL(origin).hostname)) {
      return cb(null, true)
    }
    cb(new Error(`Origin ${origin} not allowed by CORS`), false)
  },
  methods: ['GET', 'POST', 'DELETE'],
})

await app.register(websocket)
await app.register(triviaRoutes, { prefix: '/api' })
await app.register(matchRoutes,  { prefix: '/api' })
await app.register(faucetRoutes)
await app.register(statsRoutes, { prefix: '/api' })
await app.register(tournamentRoutes, { prefix: '/api' })
await app.register(sponsorRoutes, { prefix: '/api' })
await app.register(oracleRoutes, { prefix: '/api' })
await app.register(wsRoutes)

app.get('/health', async () => ({
  status: 'ok',
  timestamp: Date.now(),
  version: '0.1.0',
}))

// Live stats — derived from Postgres (Neon)
app.get('/api/stats', async () => {
  return await getLiveStats()
})

// Periodic cleanup of stale waiting matches (every 1 hour)
setInterval(async () => {
  try {
    const n = await cleanupExpiredMatches()
    if (n > 0) app.log.info(`Cleaned ${n} expired waiting matches`)
  } catch (e) {
    app.log.error({ err: String(e) }, 'cleanupExpiredMatches failed')
  }
}, 60 * 60 * 1000)

// ── Env sanity check ──────────────────────────────────────────────────
// Surfacing missing env vars at startup beats failing 30 seconds later
// when the first user clicks something. Warn, don't exit, because the app
// is partially functional even when sponsor / badge minting are unavailable.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

function checkEnv() {
  const issues: string[] = []
  if (!process.env.DATABASE_URL)           issues.push('DATABASE_URL not set — match store will fail')
  if (!process.env.MOCK_USDC_MINT)         issues.push('MOCK_USDC_MINT not set — USDC matches will fail')
  if (!process.env.SPONSOR_KEYPAIR_PATH && !process.env.SPONSOR_KEYPAIR) {
    issues.push('SPONSOR_KEYPAIR(_PATH) not set — sponsored gas disabled, users pay their own fees')
  }
  if (!process.env.BADGE_MINTER_KEYPAIR_PATH) {
    issues.push('BADGE_MINTER_KEYPAIR_PATH not set — NFT badges will not mint (will stay pending)')
  }
  if (!process.env.RPC_URL && !process.env.SOLANA_RPC_URL) {
    issues.push('RPC_URL not set — defaulting to public devnet (rate-limited)')
  }

  // Warn if dev keypair files exist at the default local path.
  // They are gitignored, but flag them in prod so ops knows they're present.
  const localKeysDir = resolve(process.cwd(), '.keys')
  if (existsSync(localKeysDir)) {
    app.log.warn('⚠ .keys/ directory exists on disk — ensure it is NOT deployed to prod containers. Use secret files (Railway) or env vars instead.')
  }

  if (issues.length === 0) {
    app.log.info('✓ Env sanity check passed')
  } else {
    app.log.warn('⚠ Env issues detected:')
    issues.forEach(issue => app.log.warn(`  - ${issue}`))
  }
}
checkEnv()

const port = Number(process.env.PORT ?? 3001)
try {
  await app.listen({ port, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
