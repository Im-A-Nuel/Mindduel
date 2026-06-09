import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  createTournament,
  getTournament,
  listOpenTournaments,
  joinTournament,
  getBracket,
} from '../lib/tournament-store.js'

const createSchema = z.object({
  name:      z.string().min(2).max(60),
  size:      z.union([z.literal(4), z.literal(8)]),
  stake:     z.number().min(0),
  currency:  z.enum(['sol', 'usdc']).default('sol'),
  mode:      z.enum(['classic', 'shifting', 'scaleup', 'blitz']).default('classic'),
  createdBy: z.string().min(1),
})

const joinSchema = z.object({
  player: z.string().min(1),
})

export async function tournamentRoutes(app: FastifyInstance) {
  app.post('/tournament/create', async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }
    const t = await createTournament(parsed.data)
    return t
  })

  app.get('/tournament/list', async () => {
    const list = await listOpenTournaments()
    return { tournaments: list }
  })

  app.get('/tournament/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const t = await getTournament(id)
    if (!t) return reply.code(404).send({ error: 'Not found' })
    return t
  })

  app.get('/tournament/:id/bracket', async (request, reply) => {
    const { id } = request.params as { id: string }
    const t = await getTournament(id)
    if (!t) return reply.code(404).send({ error: 'Not found' })
    const bracket = await getBracket(id)
    return { tournamentId: id, bracket }
  })

  app.post('/tournament/:id/join', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = joinSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body' })
    const result = await joinTournament(id, parsed.data.player)
    if (!result.ok) return reply.code(400).send({ error: result.reason })
    const updated = await getTournament(id)
    return { ok: true, started: result.started, tournament: updated }
  })
}
