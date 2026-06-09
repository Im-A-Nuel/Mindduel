import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { QUESTIONS, getFiltered, pickRandom, type Category, type Difficulty } from '../data/questions.js'
import { createCommit, revealCommit, peekCommit } from '../lib/commit-reveal.js'

const VALID_CATEGORIES: Category[] = [
  'General Knowledge',
  'Crypto & Web3',
  'Science',
  'History',
  'Math',
  'Pop Culture',
]

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

const questionQuerySchema = z.object({
  categories: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  /** Player wallet pubkey or guest id — used to avoid serving the same Q twice in a row. */
  player:     z.string().optional(),
  /** Match id — used to prevent both players in the same match from seeing the same question. */
  matchId:    z.string().optional(),
})

/**
 * Per-player ring buffer of recently-served question ids. Without this the
 * naive `Math.random()` pick frequently re-shows the same Q within a single
 * match (the bank is ~70 questions and a typical match consumes 5-9, so the
 * collision probability is very real). Keeping the last MAX_RECENT served
 * ids per player and excluding them from the pool fixes the perceived
 * "soal sama terus" complaint.
 *
 * In-memory map; cleared on backend restart, which is fine for our use case.
 * Periodic GC trims entries that haven't been touched for an hour to bound
 * memory growth in long-lived deployments.
 */
const MAX_RECENT = 25
const recentByPlayer = new Map<string, { ids: string[]; touchedAt: number }>()

function pushRecent(player: string, id: string) {
  const now = Date.now()
  const entry = recentByPlayer.get(player) ?? { ids: [], touchedAt: now }
  entry.ids.push(id)
  if (entry.ids.length > MAX_RECENT) entry.ids = entry.ids.slice(-MAX_RECENT)
  entry.touchedAt = now
  recentByPlayer.set(player, entry)
}

function getRecent(player: string): Set<string> {
  return new Set(recentByPlayer.get(player)?.ids ?? [])
}

setInterval(() => {
  const cutoff = Date.now() - 60 * 60_000
  for (const [k, v] of recentByPlayer) {
    if (v.touchedAt < cutoff) recentByPlayer.delete(k)
  }
}, 10 * 60_000)

/**
 * Per-match set of question ids already served to either player. Prevents P1
 * and P2 from receiving the same question within the same match — the
 * per-player ring buffer alone cannot do this because each player has their
 * own separate buffer and the buffers don't cross-reference each other.
 *
 * GC: drop entries older than 6 hours (a match is never that long).
 */
const matchUsedById = new Map<string, { ids: Set<string>; touchedAt: number }>()

function pushMatchUsed(matchId: string, questionId: string) {
  const now = Date.now()
  const entry = matchUsedById.get(matchId) ?? { ids: new Set<string>(), touchedAt: now }
  entry.ids.add(questionId)
  entry.touchedAt = now
  matchUsedById.set(matchId, entry)
}

function getMatchUsed(matchId: string): Set<string> {
  return matchUsedById.get(matchId)?.ids ?? new Set()
}

setInterval(() => {
  const cutoff = Date.now() - 6 * 60 * 60_000
  for (const [k, v] of matchUsedById) {
    if (v.touchedAt < cutoff) matchUsedById.delete(k)
  }
}, 30 * 60_000)

const revealBodySchema = z.object({
  sessionId: z.string().min(1),
  answerIndex: z.number().int().min(0).max(3),
})

export async function triviaRoutes(app: FastifyInstance) {
  // GET /trivia/question?categories=Math,Science&difficulty=medium
  // Returns question without correctIndex + commit hash for anti-cheat
  app.get('/trivia/question', async (request, reply) => {
    const parsed = questionQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query params', details: parsed.error.flatten() })
    }

    const { categories: catsParam, difficulty, player, matchId } = parsed.data

    const cats: Category[] = catsParam
      ? (catsParam.split(',').map(s => s.trim()).filter(s => VALID_CATEGORIES.includes(s as Category)) as Category[])
      : []

    const diff = VALID_DIFFICULTIES.includes(difficulty as Difficulty) ? (difficulty as Difficulty) : undefined

    // Source-pool selection — STRICT category respect.
    //
    // Earlier rule "fallback to ALL QUESTIONS if pool < 3" caused the
    // "I picked Math but got Web3" bug: a Math+Hard pool only contains 2
    // questions, which tripped the threshold and silently widened to every
    // category. Players saw Web3/History/etc. when they explicitly chose Math.
    //
    // New rule:
    //   1. If the user picked categories, NEVER serve a question from a
    //      different category. Period.
    //   2. If the (category × difficulty) intersection is too small to be
    //      playable, drop the difficulty filter but keep the category.
    //   3. Only when no categories are picked do we use the full bank.
    let source: typeof QUESTIONS
    if (cats.length > 0) {
      const exact = getFiltered(cats, diff)
      source = exact.length > 0 ? exact : getFiltered(cats, undefined)
    } else {
      source = diff ? getFiltered([], diff) : QUESTIONS
    }
    // Final safety net: never let `source` be empty. An unknown/empty category
    // intersection would make pickRandom() return undefined and crash on `q.id`
    // below. Fall back to the full bank so the endpoint can't 500.
    if (source.length === 0) source = QUESTIONS

    // Anti-repeat: exclude questions this player saw recently AND questions
    // already used in this match (so both players never see the same question).
    // Fallback gracefully — tighten exclusions one layer at a time so play
    // never stalls even in very small category pools.
    const matchUsed = matchId ? getMatchUsed(matchId) : new Set<string>()

    let q
    if (player) {
      const recent = getRecent(player)
      // Tier 1: exclude both player-recent and match-used
      let candidates = source.filter(qq => !recent.has(qq.id) && !matchUsed.has(qq.id))
      // Tier 2: only exclude match-used (allow player repeats)
      if (candidates.length === 0) candidates = source.filter(qq => !matchUsed.has(qq.id))
      // Tier 3: no exclusions (pool exhausted)
      if (candidates.length === 0) candidates = source
      q = pickRandom(candidates)
      pushRecent(player, q.id)
    } else {
      let candidates = source.filter(qq => !matchUsed.has(qq.id))
      if (candidates.length === 0) candidates = source
      q = pickRandom(candidates)
    }

    if (matchId) pushMatchUsed(matchId, q.id)

    const { sessionId, hash } = createCommit(q.id, q.correctIndex)

    return {
      sessionId,
      commitHash: hash,
      question: {
        id: q.id,
        question: q.question,
        options: q.options,
        category: q.category,
        difficulty: q.difficulty,
        timeLimit: q.timeLimit,
      },
    }
  })

  // POST /trivia/reveal  { sessionId, answerIndex }
  // Returns correct/wrong + reveals correctIndex
  app.post('/trivia/reveal', async (request, reply) => {
    const parsed = revealBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }

    const { sessionId, answerIndex } = parsed.data
    const result = revealCommit(sessionId, answerIndex)

    if (!result) {
      return reply.status(410).send({ error: 'Session expired or not found' })
    }

    return result
  })

  // GET /trivia/peek?sessionId=xxx&type=eliminate2|first-letter
  // Returns hint metadata (subset of correctIndex info) without consuming
  // the session. Caller is expected to have paid for the hint on-chain
  // before invoking this — server doesn't enforce, demo trust model.
  app.get('/trivia/peek', async (request, reply) => {
    const schema = z.object({
      sessionId: z.string().min(1),
      type: z.enum(['eliminate2', 'first-letter']),
    })
    const parsed = schema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten() })
    }
    const { sessionId, type } = parsed.data
    const peek = peekCommit(sessionId, type)
    if (!peek) return reply.status(410).send({ error: 'Session expired or hint type already peeked' })

    if (type === 'eliminate2') {
      const wrongIndices = [0, 1, 2, 3].filter(i => i !== peek.correctIndex)
      const picks = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2)
      return { type, wrongIndices: picks }
    }

    const q = QUESTIONS.find(qq => qq.id === peek.questionId)
    if (!q) return reply.status(500).send({ error: 'Question not found' })
    const opt = q.options[peek.correctIndex] ?? ''
    const firstLetter = opt.trim().charAt(0).toUpperCase()
    return { type, firstLetter }
  })

  // GET /trivia/categories  — list available categories with question counts
  app.get('/trivia/categories', async () => {
    return VALID_CATEGORIES.map(cat => ({
      id: cat,
      label: cat,
      count: QUESTIONS.filter(q => q.category === cat).length,
    }))
  })

  // GET /trivia/stats
  app.get('/trivia/stats', async () => {
    return {
      total: QUESTIONS.length,
      byCategory: Object.fromEntries(
        VALID_CATEGORIES.map(cat => [cat, QUESTIONS.filter(q => q.category === cat).length])
      ),
      byDifficulty: Object.fromEntries(
        VALID_DIFFICULTIES.map(d => [d, QUESTIONS.filter(q => q.difficulty === d).length])
      ),
    }
  })
}
