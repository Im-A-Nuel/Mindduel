import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { recordCheckIn, getCheckInStats } from '../lib/checkin-store.js'

const bodySchema = z.object({
  player: z.string().min(4),
  txHash: z.string().nullable().optional(),
})

export async function checkinRoutes(app: FastifyInstance) {
  // POST /api/checkin — mirror an on-chain check-in for streak tracking.
  app.post('/checkin', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body' })
    }
    const { player, txHash } = parsed.data
    await recordCheckIn(player, txHash ?? null)
    return getCheckInStats(player)
  })

  // GET /api/checkin/:player — streak + check-in stats.
  app.get('/checkin/:player', async (request, reply) => {
    const { player } = request.params as { player: string }
    if (!player || player.length < 4) {
      return reply.status(400).send({ error: 'Invalid player' })
    }
    return getCheckInStats(player)
  })
}
