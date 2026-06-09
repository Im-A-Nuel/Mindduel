import { randomBytes } from 'crypto'
import { eq, and, desc, asc, sql } from 'drizzle-orm'
import { db } from './db.js'
import { tournaments, tournamentPlayers, brackets, type Tournament, type Bracket } from './schema.js'
import { createMatch, finishMatch as finishMatchRow } from './match-store.js'

function makeId(prefix: string): string {
  return `${prefix}_${randomBytes(5).toString('hex').toUpperCase()}`
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

export async function createTournament(args: {
  name:      string
  size:      4 | 8
  stake:     number
  currency:  'sol' | 'usdc'
  mode:      string
  createdBy: string
}): Promise<TournamentSummary> {
  const id = makeId('TRN')
  await db.insert(tournaments).values({
    tournamentId: id,
    name:         args.name,
    size:         args.size,
    stake:        args.stake,
    currency:     args.currency,
    mode:         args.mode,
    status:       'open',
    champion:     null,
    createdBy:    args.createdBy,
    createdAt:    Date.now(),
  })
  // Auto-register the creator
  await db.insert(tournamentPlayers).values({
    tournamentId: id,
    player:       args.createdBy,
    joinedAt:     Date.now(),
  })
  const summary = await getTournament(id)
  if (!summary) throw new Error('Failed to create tournament')
  return summary
}

export async function getTournament(id: string): Promise<TournamentSummary | null> {
  const [row] = await db.select().from(tournaments).where(eq(tournaments.tournamentId, id)).limit(1)
  if (!row) return null
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(tournamentPlayers).where(eq(tournamentPlayers.tournamentId, id))
  return rowToSummary(row, count)
}

function rowToSummary(row: Tournament, registered: number): TournamentSummary {
  return {
    tournamentId: row.tournamentId,
    name:         row.name,
    size:         row.size,
    stake:        row.stake,
    currency:     row.currency as 'sol' | 'usdc',
    mode:         row.mode,
    status:       row.status as 'open' | 'in_progress' | 'finished',
    champion:     row.champion,
    createdBy:    row.createdBy,
    registered,
    createdAt:    row.createdAt,
  }
}

export async function listOpenTournaments(): Promise<TournamentSummary[]> {
  const rows = await db.select().from(tournaments)
    .where(eq(tournaments.status, 'open'))
    .orderBy(desc(tournaments.createdAt))
    .limit(20)
  const out: TournamentSummary[] = []
  for (const r of rows) {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(tournamentPlayers).where(eq(tournamentPlayers.tournamentId, r.tournamentId))
    out.push(rowToSummary(r, count))
  }
  return out
}

export async function joinTournament(id: string, player: string): Promise<{ ok: boolean; reason?: string; started?: boolean }> {
  const t = await getTournament(id)
  if (!t) return { ok: false, reason: 'Tournament not found' }
  if (t.status !== 'open') return { ok: false, reason: 'Registration closed' }

  const [existing] = await db.select().from(tournamentPlayers)
    .where(and(eq(tournamentPlayers.tournamentId, id), eq(tournamentPlayers.player, player)))
    .limit(1)
  if (existing) return { ok: false, reason: 'Already registered' }

  if (t.registered >= t.size) return { ok: false, reason: 'Bracket full' }

  await db.insert(tournamentPlayers).values({
    tournamentId: id, player, joinedAt: Date.now(),
  })

  const newCount = t.registered + 1
  // Auto-start when full
  if (newCount === t.size) {
    await startTournament(id)
    return { ok: true, started: true }
  }
  return { ok: true, started: false }
}

/**
 * Generate the bracket: shuffle players, assign seeds, create round-0 slots.
 * For size 4: 2 round-0 slots (semis) + 1 round-1 slot (final).
 * For size 8: 4 round-0 + 2 round-1 + 1 round-2.
 */
async function startTournament(id: string): Promise<void> {
  const t = await getTournament(id)
  if (!t) throw new Error('Tournament not found')

  const playersRows = await db.select().from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, id))
  const players = playersRows.map(p => p.player)
  // Fisher–Yates shuffle for seeding
  for (let i = players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[players[i], players[j]] = [players[j], players[i]]
  }

  // Assign seeds
  for (let i = 0; i < players.length; i++) {
    await db.update(tournamentPlayers)
      .set({ seed: i + 1 })
      .where(and(eq(tournamentPlayers.tournamentId, id), eq(tournamentPlayers.player, players[i])))
  }

  // Build bracket structure
  const rounds = Math.log2(t.size) // 4 → 2 rounds, 8 → 3 rounds
  const allBrackets: Bracket[] = []

  // Round 0: pair up shuffled players
  for (let pos = 0; pos < t.size / 2; pos++) {
    const bid = makeId('BR')
    await db.insert(brackets).values({
      bracketId:    bid,
      tournamentId: id,
      round:        0,
      position:     pos,
      playerOne:    players[pos * 2],
      playerTwo:    players[pos * 2 + 1],
      status:       'ready',
    })
    allBrackets.push({ bracketId: bid, tournamentId: id, round: 0, position: pos, playerOne: players[pos * 2], playerTwo: players[pos * 2 + 1], matchId: null, winner: null, feederA: null, feederB: null, status: 'ready' })
  }

  // Higher rounds: empty slots, feeders pointing to previous-round slots
  for (let r = 1; r < rounds; r++) {
    const slotsThisRound = t.size / Math.pow(2, r + 1)
    for (let pos = 0; pos < slotsThisRound; pos++) {
      const feederA = allBrackets.find(b => b.round === r - 1 && b.position === pos * 2)!
      const feederB = allBrackets.find(b => b.round === r - 1 && b.position === pos * 2 + 1)!
      const bid = makeId('BR')
      await db.insert(brackets).values({
        bracketId:    bid,
        tournamentId: id,
        round:        r,
        position:     pos,
        playerOne:    null,
        playerTwo:    null,
        feederA:      feederA.bracketId,
        feederB:      feederB.bracketId,
        status:       'pending',
      })
      allBrackets.push({ bracketId: bid, tournamentId: id, round: r, position: pos, playerOne: null, playerTwo: null, matchId: null, winner: null, feederA: feederA.bracketId, feederB: feederB.bracketId, status: 'pending' })
    }
  }

  // For each round-0 ready bracket, create the underlying match record so players can join in lobby flow.
  for (const b of allBrackets.filter(x => x.round === 0)) {
    if (b.playerOne && b.playerTwo) {
      const m = await createMatch(b.playerOne, t.mode, t.stake, t.currency)
      // Auto-set playerTwo since they're already paired
      await db.update(brackets).set({ matchId: m.matchId, status: 'live' }).where(eq(brackets.bracketId, b.bracketId))
      // Mark match as having known opponents (frontend will broadcast/start)
    }
  }

  await db.update(tournaments)
    .set({ status: 'in_progress', startedAt: Date.now() })
    .where(eq(tournaments.tournamentId, id))
}

export async function getBracket(id: string): Promise<Bracket[]> {
  return await db.select().from(brackets)
    .where(eq(brackets.tournamentId, id))
    .orderBy(asc(brackets.round), asc(brackets.position))
}

/**
 * After a match settles, propagate the winner up the bracket.
 */
export async function recordTournamentMatchResult(args: {
  bracketId: string
  winner:    string
}): Promise<void> {
  const [b] = await db.select().from(brackets).where(eq(brackets.bracketId, args.bracketId)).limit(1)
  if (!b) return

  await db.update(brackets)
    .set({ winner: args.winner, status: 'done' })
    .where(eq(brackets.bracketId, args.bracketId))

  // Mark loser as eliminated
  const loser = b.playerOne === args.winner ? b.playerTwo : b.playerOne
  if (loser) {
    await db.update(tournamentPlayers)
      .set({ eliminated: 1 })
      .where(and(eq(tournamentPlayers.tournamentId, b.tournamentId), eq(tournamentPlayers.player, loser)))
  }

  // Find next-round bracket fed by this one
  const [next] = await db.select().from(brackets)
    .where(and(
      eq(brackets.tournamentId, b.tournamentId),
      sql`(${brackets.feederA} = ${args.bracketId} OR ${brackets.feederB} = ${args.bracketId})`,
    )).limit(1)

  if (!next) {
    // No further round → tournament champion
    await db.update(tournaments)
      .set({ status: 'finished', champion: args.winner, finishedAt: Date.now() })
      .where(eq(tournaments.tournamentId, b.tournamentId))
    return
  }

  // Slot the winner into the next bracket
  const isFeederA = next.feederA === args.bracketId
  await db.update(brackets)
    .set(isFeederA ? { playerOne: args.winner } : { playerTwo: args.winner })
    .where(eq(brackets.bracketId, next.bracketId))

  // If both players are now decided, promote to ready + create the match
  const [updated] = await db.select().from(brackets).where(eq(brackets.bracketId, next.bracketId)).limit(1)
  if (updated && updated.playerOne && updated.playerTwo && updated.status === 'pending') {
    const t = await getTournament(b.tournamentId)
    if (t) {
      const m = await createMatch(updated.playerOne, t.mode, t.stake, t.currency)
      await db.update(brackets)
        .set({ status: 'live', matchId: m.matchId })
        .where(eq(brackets.bracketId, next.bracketId))
    }
  }
}

/**
 * Look up the bracket entry for a given match (so when /match/finish fires
 * we know which tournament slot to update).
 */
export async function findBracketByMatchId(matchId: string): Promise<Bracket | null> {
  const [row] = await db.select().from(brackets).where(eq(brackets.matchId, matchId)).limit(1)
  return row ?? null
}
