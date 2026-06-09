import { randomBytes } from 'crypto'
import { eq, and, or, desc, sql } from 'drizzle-orm'
import { db } from './db.js'
import { matches, queue } from './schema.js'

export type MatchStatus = 'waiting' | 'active' | 'finished'

/**
 * Public match shape. The board / currentPlayer / winner during play are synced
 * live over WebSocket; the DB caches metadata for lobby, queue, leaderboard and
 * history. There is no staking on Celo — `ranked` decides whether the result is
 * recorded on-chain.
 */
export interface MatchState {
  matchId:       string
  joinCode:      string
  playerOne:     string
  playerTwo:     string | null
  mode:          string
  ranked:        boolean
  status:        MatchStatus
  categories?:   string[]
  difficulty?:   string
  // Board fields kept for type compatibility — not persisted (synced over WS).
  board:         (string | null)[]
  currentPlayer: 'X' | 'O'
  turn:          number
  winner:        string | null
  winnerDelta:   number | null
  loserDelta:    number | null
  txHash:        string | null
  createdAt:     number
  updatedAt:     number
}

/**
 * In-memory map of matchId → trivia categories chosen by the creator, so the
 * joiner gets the same question pool. GC drops entries older than 6 hours.
 */
const categoriesByMatchId = new Map<string, { cats: string[]; difficulty?: string; createdAt: number }>()
setInterval(() => {
  const cutoff = Date.now() - 6 * 60 * 60_000
  for (const [k, v] of categoriesByMatchId) {
    if (v.createdAt < cutoff) categoriesByMatchId.delete(k)
  }
}, 30 * 60_000)

/**
 * Matchmaking pre-created matches, keyed by the waiting player's id, so both
 * players agree on a matchId before they connect over WebSocket. In-memory —
 * lost on restart, which only drops stale queue entries.
 */
const pendingMatchByPlayer = new Map<string, string>()

function rowToState(row: typeof matches.$inferSelect): MatchState {
  const cached = categoriesByMatchId.get(row.matchId)
  return {
    matchId:       row.matchId,
    joinCode:      row.joinCode,
    playerOne:     row.playerOne,
    playerTwo:     row.playerTwo,
    mode:          row.mode,
    ranked:        row.ranked === 1,
    status:        row.status as MatchStatus,
    winner:        row.winner,
    winnerDelta:   row.winnerDelta,
    loserDelta:    row.loserDelta,
    txHash:        row.txHash,
    categories:    cached?.cats,
    difficulty:    cached?.difficulty,
    createdAt:     row.createdAt,
    updatedAt:     row.updatedAt,
    board:         Array(9).fill(null),
    currentPlayer: 'X',
    turn:          0,
  }
}

function makeId(): string {
  return randomBytes(6).toString('hex').toUpperCase()
}

function makeCode(): string {
  return `MNDL-${randomBytes(3).toString('hex').toUpperCase()}`
}

export async function createMatch(
  playerOne: string,
  mode: string,
  ranked: boolean,
  categories: string[] | null = null,
  difficulty?: string,
): Promise<MatchState> {
  const matchId = makeId()
  const joinCode = makeCode()
  const now = Date.now()
  const [row] = await db.insert(matches).values({
    matchId, joinCode, playerOne, playerTwo: null,
    mode, ranked: ranked ? 1 : 0, status: 'waiting',
    createdAt: now, updatedAt: now,
  }).returning()
  if ((categories && categories.length > 0) || difficulty) {
    categoriesByMatchId.set(matchId, { cats: categories ?? [], difficulty, createdAt: now })
  }
  return rowToState(row)
}

export async function joinByCode(joinCode: string, playerTwo: string): Promise<MatchState | null> {
  const [row] = await db.select().from(matches).where(eq(matches.joinCode, joinCode)).limit(1)
  if (!row) return null
  if (row.playerOne === playerTwo) return null

  // Conditional update: only the FIRST joiner wins the seat.
  const now = Date.now()
  const [updated] = await db.update(matches)
    .set({ playerTwo, status: 'active', updatedAt: now })
    .where(and(
      eq(matches.matchId, row.matchId),
      eq(matches.status, 'waiting'),
      sql`${matches.playerTwo} IS NULL`,
    ))
    .returning()
  return updated ? rowToState(updated) : null
}

export async function getMatch(matchId: string): Promise<MatchState | null> {
  const [row] = await db.select().from(matches).where(eq(matches.matchId, matchId)).limit(1)
  return row ? rowToState(row) : null
}

/**
 * Transition a match to finished. Idempotent and authoritative-state-checked:
 * only an 'active' match transitions, and `winner` (when present) must be one of
 * the two recorded players. Returns the updated state when this call actually
 * transitioned the match, or null on a no-op (already finished / not active /
 * unknown / invalid winner). Callers gate on-chain recording + side-effects on a
 * non-null return so they fire exactly once per match.
 */
export async function finishMatch(matchId: string, winner: string | null): Promise<MatchState | null> {
  const [current] = await db.select().from(matches).where(eq(matches.matchId, matchId)).limit(1)
  if (!current || current.status !== 'active') return null
  if (winner !== null && winner !== current.playerOne && winner !== current.playerTwo) return null

  const now = Date.now()
  const [updated] = await db.update(matches)
    .set({ status: 'finished', winner, finishedAt: now, updatedAt: now })
    .where(and(eq(matches.matchId, matchId), eq(matches.status, 'active')))
    .returning()
  return updated ? rowToState(updated) : null
}

/** Persist the on-chain settlement result (points deltas + tx hash) for a match. */
export async function saveSettlement(
  matchId: string,
  winnerDelta: number,
  loserDelta: number,
  txHash: string | null,
): Promise<void> {
  await db.update(matches)
    .set({ winnerDelta, loserDelta, txHash, updatedAt: Date.now() })
    .where(eq(matches.matchId, matchId))
}

// ── Matchmaking queue ──────────────────────────────────────────────────
export interface QueueResult {
  status: 'waiting' | 'matched'
  matchId?: string
  position?: number
  sharedCategories?: string[]
  playerOne?: string
  ranked?: boolean
  mode?: string
}

function mergeCategories(a: string[] | null, b: string[] | null): string[] | null {
  if (!a || a.length === 0) return b
  if (!b || b.length === 0) return a
  const aSet = new Set(a)
  const intersection = b.filter(c => aSet.has(c))
  if (intersection.length > 0) return intersection
  return Array.from(new Set([...a, ...b]))
}

function parseCategories(raw: string | null): string[] | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) && v.length > 0 ? v as string[] : null
  } catch { return null }
}

export async function enqueue(
  playerId: string,
  mode: string,
  ranked: boolean,
  categories: string[] | null = null,
): Promise<QueueResult> {
  const [existing] = await db.select().from(queue).where(eq(queue.playerId, playerId)).limit(1)
  if (existing) {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(queue)
    return { status: 'waiting', position: count, matchId: pendingMatchByPlayer.get(playerId) }
  }

  // Pair with the oldest waiting candidate in the same mode + ranked pool.
  // Ranked and casual players never match each other.
  const rankedVal = ranked ? 1 : 0
  const candidates = await db.select().from(queue)
    .where(and(eq(queue.mode, mode), eq(queue.ranked, rankedVal)))
    .orderBy(queue.joinedAt)

  const myCats = categories && categories.length > 0 ? categories : null
  for (const candidate of candidates) {
    const claimed = await db.delete(queue).where(eq(queue.playerId, candidate.playerId)).returning()
    if (claimed.length === 0) continue  // someone else grabbed this opponent

    const sharedCategories = mergeCategories(myCats, parseCategories(candidate.categories))
    const now = Date.now()
    const pendingMatchId = pendingMatchByPlayer.get(candidate.playerId)
    pendingMatchByPlayer.delete(candidate.playerId)
    let match: MatchState
    const [reused] = pendingMatchId
      ? await db.update(matches)
          .set({ playerTwo: playerId, status: 'active', updatedAt: now })
          .where(and(eq(matches.matchId, pendingMatchId), eq(matches.status, 'waiting')))
          .returning()
      : [undefined]
    if (reused) {
      match = rowToState(reused)
      if (sharedCategories && sharedCategories.length > 0) {
        categoriesByMatchId.set(match.matchId, { cats: sharedCategories, createdAt: now })
      }
    } else {
      match = await createMatch(candidate.playerId, mode, ranked, sharedCategories)
      await db.update(matches)
        .set({ playerTwo: playerId, status: 'active', updatedAt: now })
        .where(eq(matches.matchId, match.matchId))
    }
    return {
      status: 'matched',
      matchId: match.matchId,
      sharedCategories: sharedCategories ?? [],
      playerOne: candidate.playerId,
      ranked,
      mode,
    }
  }

  await db.insert(queue).values({
    playerId, mode, ranked: rankedVal,
    categories: myCats ? JSON.stringify(myCats) : null,
    joinedAt: Date.now(),
  }).onConflictDoNothing()

  // Pre-create this player's waiting match so the opponent who claims them
  // reuses its matchId (both sides agree on a matchId before connecting).
  const preMatch = await createMatch(playerId, mode, ranked, myCats)
  pendingMatchByPlayer.set(playerId, preMatch.matchId)

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(queue)
  return { status: 'waiting', position: count, matchId: preMatch.matchId }
}

export async function dequeue(playerId: string): Promise<void> {
  await db.delete(queue).where(eq(queue.playerId, playerId))
  const pending = pendingMatchByPlayer.get(playerId)
  if (pending) {
    pendingMatchByPlayer.delete(playerId)
    await db.delete(matches).where(and(eq(matches.matchId, pending), eq(matches.status, 'waiting')))
  }
}

export async function queueLength(): Promise<number> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(queue)
  return count
}

export async function getMatchForPlayer(playerId: string): Promise<MatchState | null> {
  const [row] = await db.select().from(matches)
    .where(and(
      eq(matches.status, 'active'),
      or(eq(matches.playerOne, playerId), eq(matches.playerTwo, playerId)),
    ))
    .orderBy(desc(matches.createdAt))
    .limit(1)
  return row ? rowToState(row) : null
}

// ── Live stats ─────────────────────────────────────────────────────────
export interface LiveStats {
  activeMatches:  number
  waitingMatches: number
  playersRanked:  number
  matchesPlayed:  number
  rankedLast24h:  number
  queueLength:    number
}

export async function getLiveStats(): Promise<LiveStats> {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

  const [stats] = await db.select({
    activeMatches:  sql<number>`count(*) FILTER (WHERE ${matches.status} = 'active')::int`,
    waitingMatches: sql<number>`count(*) FILTER (WHERE ${matches.status} = 'waiting')::int`,
    matchesPlayed:  sql<number>`count(*) FILTER (WHERE ${matches.status} = 'finished')::int`,
    rankedLast24h:  sql<number>`count(*) FILTER (WHERE ${matches.status} = 'finished' AND ${matches.ranked} = 1 AND ${matches.finishedAt} >= ${oneDayAgo})::int`,
  }).from(matches)

  // Distinct players that have completed at least one ranked match.
  const [{ players }] = await db.execute<{ players: number }>(sql`
    SELECT COUNT(DISTINCT addr)::int AS players FROM (
      SELECT player_one AS addr FROM matches WHERE status = 'finished' AND ranked = 1
      UNION
      SELECT player_two AS addr FROM matches WHERE status = 'finished' AND ranked = 1 AND player_two IS NOT NULL
    ) t
  `) as unknown as { players: number }[]

  return {
    activeMatches:  stats.activeMatches,
    waitingMatches: stats.waitingMatches,
    playersRanked:  Number(players ?? 0),
    matchesPlayed:  stats.matchesPlayed,
    rankedLast24h:  stats.rankedLast24h,
    queueLength:    await queueLength(),
  }
}

// ── Leaderboard (DB fallback) & history ────────────────────────────────
export interface LeaderboardRow {
  address: string
  points:  number
  wins:    number
  losses:  number
  winRate: number
}

/**
 * DB-derived leaderboard, used as a fallback when the on-chain roster is
 * unavailable. Points are estimated from the recorded per-match deltas
 * (START 1000 + sum of this player's deltas).
 */
export async function getLeaderboard(limit = 25): Promise<LeaderboardRow[]> {
  const rows = await db.select().from(matches)
    .where(and(eq(matches.status, 'finished'), eq(matches.ranked, 1)))

  const agg = new Map<string, { points: number; wins: number; losses: number }>()
  const ensure = (a: string) => {
    let e = agg.get(a)
    if (!e) { e = { points: 1000, wins: 0, losses: 0 }; agg.set(a, e) }
    return e
  }
  for (const r of rows) {
    const p1 = r.playerOne
    const p2 = r.playerTwo
    if (!p2 || p2 === 'AI') continue
    const w = r.winner
    if (w === null) continue // draw — deltas roughly net out for display
    const loser = w === p1 ? p2 : p1
    const we = ensure(w)
    const le = ensure(loser)
    we.wins += 1; we.points += r.winnerDelta ?? 0
    le.losses += 1; le.points += r.loserDelta ?? 0
  }

  return Array.from(agg.entries())
    .map(([address, e]) => {
      const games = e.wins + e.losses
      return { address, points: e.points, wins: e.wins, losses: e.losses, winRate: games > 0 ? Math.round((e.wins / games) * 100) : 0 }
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
}

export interface HistoryRow {
  matchId:     string
  mode:        string
  ranked:      boolean
  status:      MatchStatus
  result:      'win' | 'loss' | 'draw' | 'pending'
  pointsDelta: number
  opponent:    string | null
  txHash:      string | null
  createdAt:   number
  finishedAt:  number | null
}

export async function getHistoryForPlayer(playerId: string, limit = 50): Promise<HistoryRow[]> {
  const rows = await db.select().from(matches)
    .where(or(eq(matches.playerOne, playerId), eq(matches.playerTwo, playerId)))
    .orderBy(desc(matches.createdAt))
    .limit(limit)

  return rows.map((r): HistoryRow => {
    const isPlayerOne = r.playerOne === playerId
    const opponent    = isPlayerOne ? r.playerTwo : r.playerOne

    let result: HistoryRow['result'] = 'pending'
    let pointsDelta = 0
    if (r.status === 'finished') {
      if (r.winner === playerId) {
        result = 'win'
        pointsDelta = r.winnerDelta ?? 0
      } else if (r.winner === null) {
        result = 'draw'
        pointsDelta = 0
      } else {
        result = 'loss'
        pointsDelta = r.loserDelta ?? 0
      }
    }

    return {
      matchId:     r.matchId,
      mode:        r.mode,
      ranked:      r.ranked === 1,
      status:      r.status as MatchStatus,
      result,
      pointsDelta,
      opponent,
      txHash:      r.txHash,
      createdAt:   r.createdAt,
      finishedAt:  r.finishedAt,
    }
  })
}

// ── Cleanup expired matches (older than 24h waiting) ──────────────────
export async function cleanupExpiredMatches(): Promise<number> {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const deleted = await db.delete(matches)
    .where(and(eq(matches.status, 'waiting'), sql`${matches.createdAt} < ${cutoff}`))
    .returning({ matchId: matches.matchId })
  return deleted.length
}
