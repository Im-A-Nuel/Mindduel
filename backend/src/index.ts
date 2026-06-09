import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { triviaRoutes } from './routes/trivia.js'
import { matchRoutes } from './routes/match.js'
import { wsRoutes } from './routes/ws.js'
import { statsRoutes } from './routes/stats.js'
import { tournamentRoutes } from './routes/tournament.js'
import { getLiveStats, cleanupExpiredMatches } from './lib/match-store.js'
import { isChainConfigured } from './lib/chain.js'

const app = Fastify({ logger: true })

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) ?? [
  'http://localhost:3000',
  'https://mindduel.app',
]

// Vercel preview deployments use unpredictable subdomains. Allow them via a
// regex only if explicitly enabled.
const allowVercelPreview = process.env.ALLOW_VERCEL_PREVIEW === '1'

await app.register(cors, {
  origin: (origin, cb) => {
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
await app.register(statsRoutes, { prefix: '/api' })
await app.register(tournamentRoutes, { prefix: '/api' })
await app.register(wsRoutes)

app.get('/health', async () => ({
  status: 'ok',
  timestamp: Date.now(),
  version: '0.1.0',
}))

// Live stats — derived from Postgres
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
function checkEnv() {
  const issues: string[] = []
  if (!process.env.DATABASE_URL) issues.push('DATABASE_URL not set — match store will fail')
  if (!process.env.RANKING_CONTRACT_ADDRESS) {
    issues.push('RANKING_CONTRACT_ADDRESS not set — ranked results will NOT be recorded on-chain (DB-only)')
  }
  if (!process.env.RELAYER_PRIVATE_KEY) {
    issues.push('RELAYER_PRIVATE_KEY not set — backend cannot submit recordMatch (DB-only)')
  }

  if (issues.length === 0) {
    app.log.info(`✓ Env sanity check passed (on-chain ranking ${isChainConfigured() ? 'ENABLED' : 'disabled'})`)
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
