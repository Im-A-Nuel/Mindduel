import type { FastifyInstance } from 'fastify'
import {
  getLeaderboard,
  getHistoryForPlayer,
  getMatch,
  finishMatch,
  saveSettlement,
} from '../lib/match-store.js'
import {
  recordMatchOnChain,
  getLeaderboardOnchain,
  getPlayerOnchain,
  isChainConfigured,
} from '../lib/chain.js'
import { awardBadgesAfterMatch, listBadgesForPlayer, getBadgeMeta, type BadgeType } from '../lib/badges.js'
import { findBracketByMatchId, recordTournamentMatchResult } from '../lib/tournament-store.js'
import { z } from 'zod'

const finishBodySchema = z.object({
  matchId: z.string().min(1),
  winner:  z.string().nullable(),
  ranked:  z.boolean().default(false),
})

const vsAiBodySchema = z.object({
  player: z.string().min(1),
  mode:   z.string().min(1),
  result: z.enum(['win', 'loss', 'draw']),
})

export async function statsRoutes(app: FastifyInstance) {
  // GET /api/leaderboard — top players by on-chain points (DB fallback if the
  // contract is unset / unreachable).
  app.get('/leaderboard', async (request) => {
    const { period = 'alltime', limit } = (request.query ?? {}) as { period?: string; limit?: string }
    const lim = Math.min(100, Math.max(1, Number(limit) || 25))

    const onchain = await getLeaderboardOnchain(lim)
    const rows = onchain.length > 0
      ? onchain.map(r => ({
          address: r.address,
          points:  r.points,
          wins:    r.wins,
          losses:  r.losses,
          winRate: (r.wins + r.losses) > 0 ? Math.round((r.wins / (r.wins + r.losses)) * 100) : 0,
        }))
      : await getLeaderboard(lim)

    return {
      period,
      entries: rows.map((r, i) => ({
        rank:    i + 1,
        address: r.address,
        points:  r.points,
        wins:    r.wins,
        losses:  r.losses,
        winRate: r.winRate,
      })),
    }
  })

  // GET /api/history/:player — match history for a wallet address
  app.get('/history/:player', async (request, reply) => {
    const { player } = request.params as { player: string }
    if (!player || player.length < 4) {
      return reply.status(400).send({ error: 'Invalid player address' })
    }
    const limit = Math.min(100, Math.max(1, Number((request.query as { limit?: string }).limit) || 50))
    const rows = await getHistoryForPlayer(player, limit)
    return { player, count: rows.length, matches: rows }
  })

  // POST /api/match/finish — report the finished match. For ranked matches the
  // backend relayer records the result on-chain (recordMatch) and returns the
  // points deltas + tx hash. Idempotent: both clients may call with the same
  // winner; the on-chain record + DB transition each happen exactly once, and a
  // replay returns the stored settlement so the loser also gets its delta.
  app.post('/match/finish', async (request, reply) => {
    const parsed = finishBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    const { matchId, winner, ranked } = parsed.data

    const finished = await finishMatch(matchId, winner)

    // Replay (already finished): return the stored settlement so the second
    // caller (typically the loser) still receives its delta + tx hash.
    if (!finished) {
      const existing = await getMatch(matchId)
      if (existing && existing.status === 'finished') {
        return {
          ok: true,
          winnerDelta: existing.winnerDelta ?? 0,
          loserDelta:  existing.loserDelta ?? 0,
          txHash:      existing.txHash,
        }
      }
      return reply.status(409).send({ ok: false, error: 'Match not in a finishable state or winner invalid.' })
    }

    // Casual / unranked or no real opponent → no on-chain recording.
    const p1 = finished.playerOne
    const p2 = finished.playerTwo
    const isRealPvP = !!p2 && p2 !== 'AI'
    let result = { ok: true as const, winnerDelta: 0, loserDelta: 0, winnerPoints: null as number | null, loserPoints: null as number | null, txHash: null as string | null }

    if (ranked && finished.ranked && isRealPvP) {
      const isDraw = winner === null
      // For a draw the contract treats winner/loser as players A/B.
      const a = winner ?? p1
      const b = isDraw ? p2! : (winner === p1 ? p2! : p1)
      const rec = await recordMatchOnChain({ winner: a, loser: b, draw: isDraw, matchId })
      if (rec) {
        await saveSettlement(matchId, rec.winnerDelta, rec.loserDelta, rec.txHash)
        result = { ok: true, winnerDelta: rec.winnerDelta, loserDelta: rec.loserDelta, winnerPoints: rec.winnerPoints, loserPoints: rec.loserPoints, txHash: rec.txHash }
      }
    }

    // Award badges to the winner (DB-only). Uses on-chain points for high_rank.
    let earned: string[] = []
    if (winner) {
      const onchain = isChainConfigured() ? await getPlayerOnchain(winner) : null
      earned = await awardBadgesAfterMatch({ player: winner, points: onchain?.points })

      // Tournament bracket advance, if applicable.
      const bracket = await findBracketByMatchId(matchId)
      if (bracket) await recordTournamentMatchResult({ bracketId: bracket.bracketId, winner })
    }

    return { ...result, earnedBadges: earned }
  })

  // POST /api/match/vsai — record a vs-AI practice match in history (never ranked).
  app.post('/match/vsai', async (request, reply) => {
    const parsed = vsAiBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    const { player, result } = parsed.data
    const { randomBytes } = await import('crypto')
    const matchId = randomBytes(6).toString('hex').toUpperCase()
    const joinCode = `VSAI-${randomBytes(3).toString('hex').toUpperCase()}`
    const now = Date.now()
    const winner = result === 'win' ? player : result === 'loss' ? 'AI' : null
    const { db } = await import('../lib/db.js')
    const { matches } = await import('../lib/schema.js')
    await db.insert(matches).values({
      matchId, joinCode,
      playerOne: player, playerTwo: 'AI',
      mode: 'vs-ai', ranked: 0,
      status: 'finished',
      winner, winnerDelta: 0, loserDelta: 0, txHash: null,
      createdAt: now, updatedAt: now, finishedAt: now,
    })
    return { ok: true, matchId }
  })

  // GET /api/badges/:player — list a player's badges (DB-backed)
  app.get('/badges/:player', async (request, reply) => {
    const { player } = request.params as { player: string }
    if (!player || player.length < 4) {
      return reply.status(400).send({ error: 'Invalid player address' })
    }
    const rows = await listBadgesForPlayer(player)
    return {
      player,
      count: rows.length,
      badges: rows.map(b => {
        const meta = getBadgeMeta(b.type as BadgeType)
        return {
          id:          b.id,
          type:        b.type,
          name:        meta?.name ?? b.type,
          symbol:      meta?.symbol ?? '',
          description: meta?.description ?? '',
          image:       meta?.image ?? '',
          earnedAt:    b.earnedAt,
          status:      'earned' as const,
        }
      }),
    }
  })
}
