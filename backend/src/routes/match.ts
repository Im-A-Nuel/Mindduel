import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  createMatch,
  joinByCode,
  getMatch,
  getMatchForPlayer,
  enqueue,
  dequeue,
  queueLength,
} from '../lib/match-store.js'
import { broadcastToMatch } from './ws.js'

const createBodySchema = z.object({
  playerOne: z.string().min(1),
  mode: z.enum(['classic', 'shifting', 'scaleup', 'blitz', 'vs-ai']).default('classic'),
  ranked: z.boolean().default(false),
  categories: z.array(z.string()).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
})

const joinBodySchema = z.object({
  joinCode: z.string().regex(/^MNDL-[A-F0-9]{6}$/),
  playerTwo: z.string().min(1),
})

const queueBodySchema = z.object({
  playerId: z.string().min(1),
  mode: z.enum(['classic', 'shifting', 'scaleup', 'blitz']).default('classic'),
  ranked: z.boolean().default(false),
  categories: z.array(z.string()).optional(),
})

const dequeueBodySchema = z.object({
  playerId: z.string().min(1),
})

export async function matchRoutes(app: FastifyInstance) {
  // POST /match/create  — create private match, get joinCode
  app.post('/match/create', async (request, reply) => {
    const parsed = createBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }

    const { playerOne, mode, ranked, categories, difficulty } = parsed.data
    const match = await createMatch(playerOne, mode, ranked, categories ?? null, difficulty)

    return {
      matchId: match.matchId,
      joinCode: match.joinCode,
      status: match.status,
    }
  })

  // POST /match/join  — join a private match by joinCode
  app.post('/match/join', async (request, reply) => {
    const parsed = joinBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }

    const { joinCode, playerTwo } = parsed.data
    const match = await joinByCode(joinCode, playerTwo)

    if (!match) {
      return reply.status(404).send({ error: 'Match not found, already started, or join code invalid' })
    }

    // Notify anyone already connected to the room (typically the creator,
    // who opened /game and connected WS before this join happened) that the
    // match is now active — without this, their client never learns the
    // opponent's address or re-syncs turn state until their next own action.
    broadcastToMatch(match.matchId, { type: 'state', match })

    return {
      matchId: match.matchId,
      status: match.status,
      mode: match.mode,
      ranked: match.ranked,
      playerOne: match.playerOne,
      categories: match.categories ?? [],
      difficulty: match.difficulty,
    }
  })

  // GET /match/:matchId  — get current match state
  app.get('/match/:matchId', async (request, reply) => {
    const { matchId } = request.params as { matchId: string }
    const match = await getMatch(matchId)

    if (!match) {
      return reply.status(404).send({ error: 'Match not found' })
    }

    return match
  })

  // POST /match/queue  — join matchmaking queue
  app.post('/match/queue', async (request, reply) => {
    const parsed = queueBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }

    const { playerId, mode, ranked, categories } = parsed.data
    const result = await enqueue(playerId, mode, ranked, categories ?? null)

    // Same reasoning as /match/join: if the OTHER paired player's client is
    // already sitting connected to this matchId's WS room (e.g. reused a
    // pending match they created earlier), tell it the match just went
    // active so it isn't stuck on a pre-pairing snapshot.
    if (result.status === 'matched' && result.matchId) {
      const match = await getMatch(result.matchId)
      if (match) broadcastToMatch(match.matchId, { type: 'state', match })
    }

    return {
      ...result,
      queueLength: await queueLength(),
    }
  })

  // DELETE /match/queue  — leave matchmaking queue
  app.delete('/match/queue', async (request, reply) => {
    const parsed = dequeueBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body' })
    }

    await dequeue(parsed.data.playerId)
    return { ok: true, queueLength: await queueLength() }
  })

  // GET /match/queue/status  — how many players waiting
  app.get('/match/queue/status', async () => ({
    queueLength: await queueLength(),
  }))

  // GET /match/player/:playerId  — find active match for a player (matchmaking polling)
  app.get('/match/player/:playerId', async (request, reply) => {
    const { playerId } = request.params as { playerId: string }
    const match = await getMatchForPlayer(playerId)
    if (!match) return reply.status(404).send({ error: 'No active match' })
    return { matchId: match.matchId, status: match.status, categories: match.categories ?? [], difficulty: match.difficulty }
  })
}
