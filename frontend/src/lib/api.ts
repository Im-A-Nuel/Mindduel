const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'
export const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001').replace(/\/+$/, '')

// Default timeout for backend calls — slow network shouldn't hang the UI forever.
const DEFAULT_TIMEOUT_MS = 12_000

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You are offline')
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export interface TriviaQuestion {
  id: string
  question: string
  options: string[]
  category: string
  difficulty: string
  timeLimit: number
}

export interface TriviaFetchResponse {
  sessionId: string
  commitHash: string
  question: TriviaQuestion
}

export interface RevealResponse {
  correct: boolean
  correctIndex: number
}

export interface MatchCreateResponse {
  matchId: string
  joinCode: string
  status: string
}

export type MatchCurrency = 'sol' | 'usdc'

export interface MatchJoinResponse {
  matchId: string
  status: string
  mode: string
  stake: number
  currency: MatchCurrency
  playerOne: string
  /** Categories the creator picked. Joiner inherits these for trivia fetch. */
  categories: string[]
  /** Difficulty the creator selected. Joiner should use the same level. */
  difficulty?: string
}

export interface QueueResponse {
  status: 'waiting' | 'matched'
  matchId?: string
  position?: number
  queueLength: number
  playerOne?: string
  stake?: number
  currency?: MatchCurrency
  mode?: string
  sharedCategories?: string[]
}

export interface LeaderboardEntry {
  rank: number
  address: string
  wins: number
  losses: number
  solEarned: number
  winRate: number
}

export interface LeaderboardResponse {
  period: string
  entries: LeaderboardEntry[]
}

export function getGuestId(): string {
  if (typeof window === 'undefined') return 'guest-ssr'
  let id = localStorage.getItem('mddGuestId')
  if (!id) {
    id = 'guest-' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('mddGuestId', id)
  }
  return id
}

export async function fetchTrivia(categories?: string[], difficulty?: string, player?: string, matchId?: string): Promise<TriviaFetchResponse> {
  const params = new URLSearchParams()
  if (categories?.length) params.set('categories', categories.join(','))
  if (difficulty) params.set('difficulty', difficulty)
  // player id: per-player ring buffer prevents the same player from seeing the same Q twice.
  if (player) params.set('player', player)
  // matchId: per-match deduplication prevents both players from receiving the same Q in the same match.
  if (matchId) params.set('matchId', matchId)
  const res = await fetchWithTimeout(`${API}/api/trivia/question?${params}`)
  if (!res.ok) throw new Error('Failed to fetch trivia')
  return res.json()
}

export interface PeekEliminate { type: 'eliminate2'; wrongIndices: number[] }
export interface PeekFirstLetter { type: 'first-letter'; firstLetter: string }
export type PeekResponse = PeekEliminate | PeekFirstLetter

/**
 * Tell the backend to remove this player from the matchmaking queue.
 * Used as a cleanup when the user navigates away or cancels mid-search,
 * so the queue doesn't accumulate orphaned entries.
 */
export async function leaveQueue(playerId: string): Promise<void> {
  try {
    await fetchWithTimeout(`${API}/api/match/queue`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
  } catch {
    // Best-effort — if BE is down or net dropped, the queue's own GC will
    // eventually evict the entry. Don't throw on cleanup paths.
  }
}

export async function peekTrivia(
  sessionId: string,
  type: 'eliminate2' | 'first-letter',
): Promise<PeekResponse> {
  const params = new URLSearchParams({ sessionId, type })
  const res = await fetchWithTimeout(`${API}/api/trivia/peek?${params}`)
  if (!res.ok) throw new Error('Hint reveal failed')
  return res.json()
}

export class TriviaSessionExpiredError extends Error {
  constructor() { super('Trivia session expired'); this.name = 'TriviaSessionExpiredError' }
}

export async function revealTrivia(sessionId: string, answerIndex: number): Promise<RevealResponse> {
  const res = await fetchWithTimeout(`${API}/api/trivia/reveal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, answerIndex }),
  })
  if (res.status === 410) throw new TriviaSessionExpiredError()
  if (!res.ok) throw new Error('Reveal failed')
  return res.json()
}

export async function createMatch(
  playerOne: string,
  mode: string,
  stake: number,
  currency: MatchCurrency = 'sol',
  categories?: string[],
  difficulty?: string,
): Promise<MatchCreateResponse> {
  const res = await fetchWithTimeout(`${API}/api/match/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerOne, mode, stake, currency, categories, difficulty }),
  })
  if (!res.ok) throw new Error('Failed to create match')
  return res.json()
}

export async function joinMatch(joinCode: string, playerTwo: string): Promise<MatchJoinResponse | null> {
  const res = await fetchWithTimeout(`${API}/api/match/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ joinCode, playerTwo }),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to join match')
  return res.json()
}

export async function queueMatch(
  playerId: string,
  mode: string,
  stake: number,
  currency: MatchCurrency = 'sol',
  categories?: string[],
): Promise<QueueResponse> {
  const res = await fetchWithTimeout(`${API}/api/match/queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, mode, stake, currency, categories }),
  })
  if (!res.ok) throw new Error('Queue failed')
  return res.json()
}

export async function getMatchForPlayer(playerId: string): Promise<{ matchId: string; status: string; categories?: string[]; difficulty?: string } | null> {
  const res = await fetchWithTimeout(`${API}/api/match/player/${encodeURIComponent(playerId)}`)
  if (res.status === 404) return null
  if (!res.ok) return null
  return res.json()
}

export async function fetchLeaderboard(period: string): Promise<LeaderboardResponse> {
  const res = await fetchWithTimeout(`${API}/api/leaderboard?period=${period}`)
  if (!res.ok) throw new Error('Failed to fetch leaderboard')
  return res.json()
}

export interface HistoryEntry {
  matchId:    string
  mode:       string
  stake:      number
  currency:   MatchCurrency
  status:     'waiting' | 'active' | 'finished'
  result:     'win' | 'loss' | 'draw' | 'pending'
  delta:      number
  opponent:   string | null
  createdAt:  number
  finishedAt: number | null
}

export async function fetchHistory(player: string, limit = 50): Promise<HistoryEntry[]> {
  const res = await fetchWithTimeout(`${API}/api/history/${encodeURIComponent(player)}?limit=${limit}`, {}, 8_000)
  if (!res.ok) throw new Error('Failed to fetch history')
  const body = await res.json() as { matches: HistoryEntry[] }
  return body.matches
}

export async function reportVsAiResult(args: {
  player: string
  mode:   string
  result: 'win' | 'loss' | 'draw'
}): Promise<void> {
  await fetchWithTimeout(`${API}/api/match/vsai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  }, 8_000).catch(() => { /* best-effort */ })
}

export async function reportMatchFinish(args: {
  matchId:    string
  winner:     string | null
  pot:        number
  fee:        number
  onChainSig: string | null
}): Promise<void> {
  await fetchWithTimeout(`${API}/api/match/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  }, 8_000).catch(() => { /* best-effort, not blocking UX */ })
}

export interface BadgeRow {
  id:          string
  type:        string
  name:        string
  symbol:      string
  description: string
  image:       string
  mintAddr:    string | null
  txSig:       string | null
  earnedAt:    number
  status:      'minted' | 'pending'
}

export interface TournamentSummary {
  tournamentId: string
  name:         string
  size:         number
  stake:        number
  currency:     'sol' | 'usdc'
  mode:         string
  status:       'open' | 'in_progress' | 'finished'
  champion:     string | null
  createdBy:    string
  registered:   number
  createdAt:    number
}

export interface BracketEntry {
  bracketId:    string
  tournamentId: string
  round:        number
  position:     number
  playerOne:    string | null
  playerTwo:    string | null
  matchId:      string | null
  winner:       string | null
  feederA:      string | null
  feederB:      string | null
  status:       string
}

export async function listTournaments(): Promise<TournamentSummary[]> {
  const res = await fetchWithTimeout(`${API}/api/tournament/list`, {}, 8_000)
  if (!res.ok) throw new Error('Failed to fetch tournaments')
  const body = await res.json() as { tournaments: TournamentSummary[] }
  return body.tournaments
}

export async function getTournamentDetail(id: string): Promise<{ tournament: TournamentSummary; bracket: BracketEntry[] }> {
  const [tRes, bRes] = await Promise.all([
    fetchWithTimeout(`${API}/api/tournament/${id}`, {}, 8_000),
    fetchWithTimeout(`${API}/api/tournament/${id}/bracket`, {}, 8_000),
  ])
  if (!tRes.ok || !bRes.ok) throw new Error('Failed to load tournament')
  const tournament = await tRes.json() as TournamentSummary
  const { bracket } = await bRes.json() as { bracket: BracketEntry[] }
  return { tournament, bracket }
}

export async function createTournament(args: {
  name: string; size: 4 | 8; stake: number; currency: 'sol' | 'usdc'; mode: string; createdBy: string
}): Promise<TournamentSummary> {
  const res = await fetchWithTimeout(`${API}/api/tournament/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  }, 8_000)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? 'Failed to create tournament')
  }
  return res.json()
}

export async function joinTournamentApi(id: string, player: string): Promise<{ ok: boolean; started: boolean; tournament: TournamentSummary }> {
  const res = await fetchWithTimeout(`${API}/api/tournament/${id}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player }),
  }, 8_000)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? 'Failed to join tournament')
  }
  return res.json()
}

export async function fetchBadges(player: string): Promise<BadgeRow[]> {
  const res = await fetchWithTimeout(`${API}/api/badges/${encodeURIComponent(player)}`, {}, 8_000)
  if (!res.ok) throw new Error('Failed to fetch badges')
  const body = await res.json() as { badges: BadgeRow[] }
  return body.badges
}

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

// ── Sponsored transactions ────────────────────────────────────────────
// Backend pays gas + rent on behalf of the user. Frontend builds the tx
// with feePayer = sponsor pubkey, sends here for partial-sign, then has
// the user sign and submits. Sponsor only signs as fee payer; instruction
// authority still requires user signature, so a malicious user cannot use
// this endpoint to drain anything.

let sponsorPubkeyCache: string | null = null

export async function fetchSponsorPubkey(): Promise<string | null> {
  if (sponsorPubkeyCache) return sponsorPubkeyCache
  try {
    const res = await fetchWithTimeout(`${API}/api/sponsor/pubkey`, {}, 5_000)
    if (!res.ok) return null
    const body = await res.json() as { pubkey?: string }
    if (body.pubkey) sponsorPubkeyCache = body.pubkey
    return body.pubkey ?? null
  } catch { return null }
}

export async function signTxWithSponsor(txBase64: string): Promise<string> {
  const res = await fetchWithTimeout(`${API}/api/sponsor/sign-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx: txBase64 }),
  }, 8_000)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? 'Sponsor sign failed')
  }
  const body = await res.json() as { tx: string }
  return body.tx
}

export async function fetchLiveStats(): Promise<LiveStats> {
  const res = await fetchWithTimeout(`${API}/api/stats`, {}, 6_000)
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

export interface OracleSettleProof {
  /** Base58 oracle pubkey (== on-chain ORACLE_PUBKEY / treasury). */
  oraclePubkey: string
  /** Base58 game PDA the oracle signed for. */
  gamePubkey: string
  /** Base64 signed message: game pubkey (32) || winner pubkey (32). */
  message: string
  /** Base64 64-byte Ed25519 signature over `message`. */
  signature: string
}

/**
 * Ask the backend oracle to sign the recorded winner of a finished match. The
 * winner submits this proof to `settle_with_proof` to claim the pot without the
 * loser having to resign. The oracle only signs the authoritative recorded
 * winner, so the proof cannot be obtained for an arbitrary address.
 */
export async function fetchOracleSettleProof(matchId: string, winner: string): Promise<OracleSettleProof> {
  const res = await fetchWithTimeout(`${API}/api/oracle/settle-proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, winner }),
  }, 8_000)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? 'Oracle proof request failed')
  }
  return res.json()
}
