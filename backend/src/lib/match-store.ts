import { randomBytes } from 'crypto'
import { eq, and, or, desc, sql } from 'drizzle-orm'
import { db } from './db.js'
import { matches, queue } from './schema.js'

export type MatchStatus = 'waiting' | 'active' | 'finished'
export type MatchCurrency = 'sol' | 'usdc'

/**
 * Public shape kept compatible with the previous in-memory store so
 * the rest of the backend (routes, websocket) does not need changes.
 *
 * The on-chain board / currentPlayer / winner are derived from the
 * Anchor program; for the cache we only store enough metadata for
 * lobby, queue, leaderboard, and per-player history queries.
 */
export interface MatchState {
  matchId:       string
  joinCode:      string
  playerOne:     string
  playerTwo:     string | null
  mode:          string
  stake:         number
  currency:      MatchCurrency
  status:        MatchStatus
  /**
   * Trivia categories the match creator picked. Stored in memory keyed by
   * matchId — see categoriesByMatchId. The DB schema doesn't carry this
   * column to avoid a migration; categories are short-lived (only matter
   * while the match is being played) so an in-memory cache is fine.
   */
  categories?:   string[]
  /** Trivia difficulty the creator selected. Both players should use the same value. */
  difficulty?:   string
  // Board fields kept for type compatibility — not persisted (on-chain authoritative)
  board:         (string | null)[]
  currentPlayer: 'X' | 'O'
  turn:          number
  winner:        string | null
  createdAt:     number
  updatedAt:     number
}

/**
 * In-memory map of matchId → trivia categories chosen by the creator.
 * The joiner reads from this so both players get the same question pool —
 * fixes the bug where P1 picks Math but P2 (joining via code) sees all
 * categories because they had no own selection.
 *
 * GC: drop entries older than 6 hours so the map doesn't grow unbounded.
 */
const categoriesByMatchId = new Map<string, { cats: string[]; difficulty?: string; createdAt: number }>()
setInterval(() => {
  const cutoff = Date.now() - 6 * 60 * 60_000
  for (const [k, v] of categoriesByMatchId) {
    if (v.createdAt < cutoff) categoriesByMatchId.delete(k)
  }
}, 30 * 60_000)

/**
 * Matchmaking pre-created matches, keyed by the waiting player's id. When a
 * player enqueues and finds no opponent, we create their waiting match UP FRONT
 * so they get a matchId to seed the on-chain game PDA nonce with (the PDA seeds
 * are ["game", player_one, nonce] and nonce is derived from matchId, so both
 * players must agree on the matchId BEFORE player_one locks the stake on-chain).
 * The opponent who later claims them reuses this same matchId. In-memory like
 * categoriesByMatchId — lost on restart, which only drops stale queue entries.
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
    stake:         row.stake,
    currency:      row.currency as MatchCurrency,
    status:        row.status as MatchStatus,
    winner:        row.winner,
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
  stake: number,
  currency: MatchCurrency = 'sol',
  categories: string[] | null = null,
  difficulty?: string,
): Promise<MatchState> {
  const matchId = makeId()
  const joinCode = makeCode()
  const now = Date.now()
  const [row] = await db.insert(matches).values({
    matchId, joinCode, playerOne, playerTwo: null,
    mode, stake, currency, status: 'waiting',
    createdAt: now, updatedAt: now,
  }).returning()
  // Persist categories so the joiner picks them up via getMatch / joinByCode
  // (DB doesn't have a column; in-memory is fine for the lifetime of a match).
  if ((categories && categories.length > 0) || difficulty) {
    categoriesByMatchId.set(matchId, { cats: categories ?? [], difficulty, createdAt: now })
  }
  return rowToState(row)
}

export async function joinByCode(joinCode: string, playerTwo: string): Promise<MatchState | null> {
  const [row] = await db.select().from(matches).where(eq(matches.joinCode, joinCode)).limit(1)
  if (!row) return null
  if (row.playerOne === playerTwo) return null

  // Conditional update: only the FIRST joiner wins the seat. Two players racing
  // the same code both read status='waiting' above, but the WHERE clause here
  // (status still 'waiting' AND no playerTwo yet) lets exactly one UPDATE affect
  // a row — the loser gets zero rows back and is told the seat is taken.
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
 * Mark a match finished. Idempotent and authoritative-state-checked:
 *
 *   - Only transitions a match that is currently 'active' (a 'waiting' match was
 *     never played; a 'finished' match must not be re-finished — that's what
 *     lets an attacker replay /match/finish to farm badges / inflate the
 *     leaderboard). The conditional WHERE makes the write a no-op in those cases.
 *   - `winner`, when present, must be one of the two recorded players. A forged
 *     winner is rejected so nobody can credit an unrelated wallet.
 *
 * Returns the updated MatchState when this call actually transitioned the match,
 * or null when it was a no-op (already finished / not active / unknown match /
 * invalid winner). Callers gate side-effects (badge mint, bracket advance) on a
 * non-null return so those fire exactly once per match.
 */
export async function finishMatch(
  matchId: string,
  winner: string | null,
  pot: number,
  fee: number,
  onChainSig: string | null,
): Promise<MatchState | null> {
  const [current] = await db.select().from(matches).where(eq(matches.matchId, matchId)).limit(1)
  if (!current || current.status !== 'active') return null
  if (winner !== null && winner !== current.playerOne && winner !== current.playerTwo) return null

  const now = Date.now()
  const [updated] = await db.update(matches)
    .set({ status: 'finished', winner, pot, fee, onChainSig, finishedAt: now, updatedAt: now })
    .where(and(eq(matches.matchId, matchId), eq(matches.status, 'active')))
    .returning()
  return updated ? rowToState(updated) : null
}

// ── Matchmaking queue ──────────────────────────────────────────────────
export interface QueueResult {
  status: 'waiting' | 'matched'
  matchId?: string
  position?: number
  /** Categories both players agreed on — only present when status='matched'. */
  sharedCategories?: string[]
  /** Wallet pubkey of the player who created the on-chain game — only when matched. */
  playerOne?: string
  stake?: number
  currency?: MatchCurrency
  mode?: string
}

/**
 * Merge two players' category preferences for the matched session. Categories
 * are a *soft preference*, never a hard matching constraint — if both pick
 * different sets, we use the union so questions come from either side's pool.
 * That way we never leave compatible players (same mode/currency/stake) stuck
 * in the queue just because their topics differ.
 *
 * Returns the question pool to use:
 *   - either side empty  → use the non-empty side
 *   - intersection nonempty → use intersection (best: both wanted these)
 *   - intersection empty → use union (everyone gets some questions they like)
 *   - both empty → null (no preference, server picks freely)
 */
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
  stake: number,
  currency: MatchCurrency = 'sol',
  categories: string[] | null = null,
): Promise<QueueResult> {
  // Already in queue? Return the same pre-created matchId so a re-poll is
  // idempotent and the player keeps seeding the on-chain PDA with one nonce.
  const [existing] = await db.select().from(queue).where(eq(queue.playerId, playerId)).limit(1)
  if (existing) {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(queue)
    return { status: 'waiting', position: count, matchId: pendingMatchByPlayer.get(playerId) }
  }

  // Find opponents matching mode + currency + EXACT stake (oldest first).
  // Stake fairness matters: a player who staked 0.05 SOL should never be
  // paired with someone who staked 1.0 SOL.
  const candidates = await db.select().from(queue)
    .where(and(
      eq(queue.mode, mode),
      eq(queue.currency, currency),
      eq(queue.stake, stake),
    ))
    .orderBy(queue.joinedAt)

  // Pair with the oldest waiting candidate — categories are merged (soft
  // preference), never a hard filter. The strict tuple (mode + currency +
  // stake) is the only gate; topic differences shouldn't keep two ready
  // players from connecting.
  //
  // Claiming is atomic: `DELETE ... RETURNING` only yields a row to the caller
  // that actually removed it. Two players racing for the same candidate can't
  // both win — the loser gets zero rows back and tries the next candidate. This
  // closes the TOCTOU race where one waiting player could be paired into two
  // matches simultaneously.
  const myCats = categories && categories.length > 0 ? categories : null
  for (const candidate of candidates) {
    const claimed = await db.delete(queue)
      .where(eq(queue.playerId, candidate.playerId))
      .returning()
    if (claimed.length === 0) continue  // someone else grabbed this opponent

    const sharedCategories = mergeCategories(myCats, parseCategories(candidate.categories))
    // The candidate (P1) pre-created their waiting match when they enqueued, and
    // locked their stake on-chain at that match's PDA. Reuse that SAME matchId so
    // the nonce matches and this joiner (P2) lands on P1's existing game PDA.
    // Fallback: if the pre-created match is gone (server restarted since P1
    // enqueued), create a fresh one — P1 will re-init against it on its next poll.
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
      // Refresh the cached categories to the merged pool for this matchId.
      if (sharedCategories && sharedCategories.length > 0) {
        categoriesByMatchId.set(match.matchId, { cats: sharedCategories, createdAt: now })
      }
    } else {
      match = await createMatch(candidate.playerId, mode, stake, currency, sharedCategories)
      await db.update(matches)
        .set({ playerTwo: playerId, status: 'active', updatedAt: now })
        .where(eq(matches.matchId, match.matchId))
    }
    return {
      status: 'matched',
      matchId: match.matchId,
      sharedCategories: sharedCategories ?? [],
      playerOne: candidate.playerId,
      stake,
      currency,
      mode,
    }
  }

  // No claimable opponent — enqueue self. onConflictDoNothing makes a concurrent
  // double-enqueue from the same player a no-op instead of a duplicate row.
  await db.insert(queue).values({
    playerId, mode, stake, currency,
    categories: myCats ? JSON.stringify(myCats) : null,
    joinedAt: Date.now(),
  }).onConflictDoNothing()

  // Pre-create this player's waiting match so they can lock their stake on-chain
  // NOW against a known matchId — the opponent who eventually claims them reuses
  // it (see the claim branch above). Without an up-front matchId, player_one and
  // player_two couldn't agree on the game PDA nonce.
  const preMatch = await createMatch(playerId, mode, stake, currency, myCats)
  pendingMatchByPlayer.set(playerId, preMatch.matchId)

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(queue)
  return { status: 'waiting', position: count, matchId: preMatch.matchId }
}

export async function dequeue(playerId: string): Promise<void> {
  await db.delete(queue).where(eq(queue.playerId, playerId))
  // Drop the pre-created waiting match too, so leaving the queue doesn't leak a
  // ghost match. Only deletes it while still 'waiting' (an opponent may have
  // already claimed it into 'active', in which case we must keep it).
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
  activeMatches:      number
  waitingMatches:     number
  totalLockedSol:     number
  totalLockedUsdc:    number
  wageredLast24hSol:  number
  wageredLast24hUsdc: number
  finishedTotal:      number
  queueLength:        number
}

export async function getLiveStats(): Promise<LiveStats> {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

  const [stats] = await db.select({
    activeMatches:    sql<number>`count(*) FILTER (WHERE ${matches.status} = 'active')::int`,
    waitingMatches:   sql<number>`count(*) FILTER (WHERE ${matches.status} = 'waiting')::int`,
    finishedTotal:    sql<number>`count(*) FILTER (WHERE ${matches.status} = 'finished')::int`,
    lockedSol:        sql<number>`COALESCE(SUM(${matches.stake} * (CASE WHEN ${matches.playerTwo} IS NULL THEN 1 ELSE 2 END)) FILTER (WHERE ${matches.status} != 'finished' AND ${matches.currency} = 'sol'), 0)::real`,
    lockedUsdc:       sql<number>`COALESCE(SUM(${matches.stake} * (CASE WHEN ${matches.playerTwo} IS NULL THEN 1 ELSE 2 END)) FILTER (WHERE ${matches.status} != 'finished' AND ${matches.currency} = 'usdc'), 0)::real`,
    wagered24Sol:     sql<number>`COALESCE(SUM(${matches.stake} * (CASE WHEN ${matches.playerTwo} IS NULL THEN 1 ELSE 2 END)) FILTER (WHERE ${matches.createdAt} >= ${oneDayAgo} AND ${matches.currency} = 'sol'), 0)::real`,
    wagered24Usdc:    sql<number>`COALESCE(SUM(${matches.stake} * (CASE WHEN ${matches.playerTwo} IS NULL THEN 1 ELSE 2 END)) FILTER (WHERE ${matches.createdAt} >= ${oneDayAgo} AND ${matches.currency} = 'usdc'), 0)::real`,
  }).from(matches)

  const qLen = await queueLength()

  return {
    activeMatches:      stats.activeMatches,
    waitingMatches:     stats.waitingMatches,
    totalLockedSol:     Number(stats.lockedSol),
    totalLockedUsdc:    Number(stats.lockedUsdc),
    wageredLast24hSol:  Number(stats.wagered24Sol),
    wageredLast24hUsdc: Number(stats.wagered24Usdc),
    finishedTotal:      stats.finishedTotal,
    queueLength:        qLen,
  }
}

// ── Leaderboard & history queries ──────────────────────────────────────
export interface LeaderboardRow {
  address:    string
  wins:       number
  matches:    number
  solEarned:  number
  usdcEarned: number
  winRate:    number
}

export async function getLeaderboard(limit = 25): Promise<LeaderboardRow[]> {
  const winnerStats = await db.execute(sql<{ address: string; wins: number; sol_earned: number; usdc_earned: number }>`
    SELECT
      winner AS address,
      COUNT(*)::int AS wins,
      COALESCE(SUM(CASE WHEN currency = 'sol'  THEN COALESCE(pot,0) - COALESCE(fee,0) ELSE 0 END), 0)::real AS sol_earned,
      COALESCE(SUM(CASE WHEN currency = 'usdc' THEN COALESCE(pot,0) - COALESCE(fee,0) ELSE 0 END), 0)::real AS usdc_earned
    FROM matches
    WHERE status = 'finished' AND winner IS NOT NULL
    GROUP BY winner
    ORDER BY wins DESC, sol_earned DESC
    LIMIT ${limit}
  `)

  // Total matches per player for winrate
  const out: LeaderboardRow[] = []
  for (const w of winnerStats as unknown as { address: string; wins: number; sol_earned: number; usdc_earned: number }[]) {
    const [{ total }] = await db.select({
      total: sql<number>`count(*) FILTER (WHERE ${matches.status} = 'finished')::int`,
    }).from(matches).where(or(eq(matches.playerOne, w.address), eq(matches.playerTwo, w.address)))
    out.push({
      address:    w.address,
      wins:       w.wins,
      matches:    total,
      solEarned:  Number(w.sol_earned),
      usdcEarned: Number(w.usdc_earned),
      winRate:    total > 0 ? Math.round((w.wins / total) * 100) : 0,
    })
  }
  return out
}

export interface HistoryRow {
  matchId:    string
  mode:       string
  stake:      number
  currency:   MatchCurrency
  status:     MatchStatus
  result:     'win' | 'loss' | 'draw' | 'pending'
  delta:      number   // SOL/USDC won (+) or lost (-) for this player
  opponent:   string | null
  createdAt:  number
  finishedAt: number | null
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
    let delta = 0
    if (r.status === 'finished') {
      if (r.winner === playerId) {
        result = 'win'
        delta  = (r.pot ?? 0) - (r.fee ?? 0) - r.stake // net gain
      } else if (r.winner === null) {
        result = 'draw'
        delta  = 0
      } else {
        result = 'loss'
        delta  = -r.stake
      }
    }

    return {
      matchId:    r.matchId,
      mode:       r.mode,
      stake:      r.stake,
      currency:   r.currency as MatchCurrency,
      status:     r.status as MatchStatus,
      result,
      delta,
      opponent,
      createdAt:  r.createdAt,
      finishedAt: r.finishedAt,
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
