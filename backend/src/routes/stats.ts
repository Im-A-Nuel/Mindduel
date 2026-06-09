import type { FastifyInstance } from 'fastify'
import { getLeaderboard, getHistoryForPlayer, finishMatch } from '../lib/match-store.js'
import { awardBadgesAfterMatch, listBadgesForPlayer, getBadgeMeta, type BadgeType } from '../lib/badges.js'
import { findBracketByMatchId, recordTournamentMatchResult } from '../lib/tournament-store.js'
import { z } from 'zod'

const finishBodySchema = z.object({
  matchId:    z.string().min(1),
  winner:     z.string().nullable(),
  pot:        z.number().min(0),
  fee:        z.number().min(0),
  onChainSig: z.string().nullable().optional(),
})

const vsAiBodySchema = z.object({
  player: z.string().min(1),
  mode:   z.string().min(1),
  result: z.enum(['win', 'loss', 'draw']),
})

export async function statsRoutes(app: FastifyInstance) {
  // GET /api/leaderboard  — top players by wins (real, derived from finished matches)
  app.get('/leaderboard', async (request) => {
    const { period = 'alltime', limit } = (request.query ?? {}) as { period?: string; limit?: string }
    const lim = Math.min(50, Math.max(1, Number(limit) || 25))
    const rows = await getLeaderboard(lim)
    return {
      period,
      entries: rows.map((r, i) => ({
        rank:      i + 1,
        address:   r.address,
        wins:      r.wins,
        matches:   r.matches,
        losses:    r.matches - r.wins,
        solEarned: r.solEarned,
        usdcEarned:r.usdcEarned,
        winRate:   r.winRate,
      })),
    }
  })

  // GET /api/history/:player  — match history for a wallet address
  app.get('/history/:player', async (request, reply) => {
    const { player } = request.params as { player: string }
    if (!player || player.length < 4) {
      return reply.status(400).send({ error: 'Invalid player address' })
    }
    const limit = Math.min(100, Math.max(1, Number((request.query as { limit?: string }).limit) || 50))
    const rows = await getHistoryForPlayer(player, limit)
    return { player, count: rows.length, matches: rows }
  })

  // POST /api/match/finish  — frontend reports settle outcome so DB stays in sync.
  // (No auth — devnet trust model. On-chain is the source of truth; this endpoint
  // only powers leaderboard/history queries.)
  //
  // finishMatch is idempotent and validates winner membership + active status:
  // it returns null for a replay / unknown match / forged winner. We gate ALL
  // side-effects (badge mint, bracket advance) on a non-null return so an
  // attacker can't replay this endpoint to farm NFTs / inflate the leaderboard.
  app.post('/match/finish', async (request, reply) => {
    const parsed = finishBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    const { matchId, winner, pot, fee, onChainSig } = parsed.data
    const finished = await finishMatch(matchId, winner, pot, fee, onChainSig ?? null)
    if (!finished) {
      // Already finished, not active, unknown match, or winner is not a player.
      return reply.status(409).send({ ok: false, error: 'Match not in a finishable state or winner invalid.' })
    }

    // Award badges if there's a winner. Mint happens fire-and-forget.
    let earned: string[] = []
    if (winner) {
      earned = await awardBadgesAfterMatch({ player: winner, matchPot: pot, currency: finished.currency })
    }

    // If this match is part of a tournament bracket, propagate the winner up.
    if (winner) {
      const bracket = await findBracketByMatchId(matchId)
      if (bracket) {
        await recordTournamentMatchResult({ bracketId: bracket.bracketId, winner })
      }
    }
    return { ok: true, earnedBadges: earned }
  })

  // POST /api/match/vsai — record a vs-AI practice match in history.
  // No on-chain stake; opponent stored as the literal "AI" sentinel so the
  // leaderboard query (which filters by valid wallet winner) ignores it.
  app.post('/match/vsai', async (request, reply) => {
    const parsed = vsAiBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    const { player, mode, result } = parsed.data
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
      mode: 'vs-ai',
      stake: 0, currency: 'sol',
      status: 'finished',
      winner, pot: 0, fee: 0, onChainSig: null,
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
          id:        b.id,
          type:      b.type,
          name:      meta?.name ?? b.type,
          symbol:    meta?.symbol ?? '',
          description: meta?.description ?? '',
          image:     meta?.image ?? '',
          mintAddr:  b.mintAddr,
          txSig:     b.txSig,
          earnedAt:  b.earnedAt,
          status:    b.mintAddr ? 'minted' : 'pending',
        }
      }),
    }
  })
}
