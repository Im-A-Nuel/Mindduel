import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getProfile, upsertProfile, validateDisplayName, NAME_MIN, NAME_MAX } from '../lib/profile-store.js'

const bodySchema = z.object({
  player:      z.string().min(4),
  displayName: z.string(),
  avatarSeed:  z.string().max(64).nullable().optional(),
})

const ERROR_MESSAGE: Record<string, string> = {
  'too-short':          `Name must be at least ${NAME_MIN} characters.`,
  'too-long':           `Name must be at most ${NAME_MAX} characters.`,
  'bad-chars':          'Name can only use letters, numbers, spaces, dots, dashes and underscores.',
  'looks-like-address': 'Name cannot look like a wallet address.',
  'reserved':           'That name is reserved.',
}

export async function profileRoutes(app: FastifyInstance) {
  // GET /api/profile/:player — public display name for one address.
  app.get('/profile/:player', async (request, reply) => {
    const { player } = request.params as { player: string }
    if (!player || player.length < 4) {
      return reply.status(400).send({ error: 'Invalid player' })
    }
    const row = await getProfile(player)
    return {
      player,
      displayName: row?.displayName ?? null,
      avatarSeed:  row?.avatarSeed  ?? null,
    }
  })

  // POST /api/profile — set the display name shown instead of the address.
  //
  // Like the rest of the API this is unauthenticated: the client asserts which
  // address it is. That is consistent with how matches are reported today, but
  // it does mean a name is not proof of ownership.
  app.post('/profile', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body' })
    }
    const { player, displayName, avatarSeed } = parsed.data

    const check = validateDisplayName(displayName)
    if (!check.ok) {
      return reply.status(400).send({ error: ERROR_MESSAGE[check.error] ?? 'Invalid name' })
    }

    const row = await upsertProfile(player, check.name, avatarSeed ?? null)
    return { player: row.player, displayName: row.displayName, avatarSeed: row.avatarSeed }
  })
}
