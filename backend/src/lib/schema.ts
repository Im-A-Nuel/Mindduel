import { pgTable, text, real, integer, bigint, index } from 'drizzle-orm/pg-core'

/**
 * MindDuel matches table.
 * Source of truth is on-chain Solana — this DB caches state for fast
 * leaderboard / history queries the frontend needs.
 */
export const matches = pgTable('matches', {
  matchId:     text('match_id').primaryKey(),
  joinCode:    text('join_code').notNull().unique(),
  playerOne:   text('player_one').notNull(),
  playerTwo:   text('player_two'),
  mode:        text('mode').notNull(),
  stake:       real('stake').notNull(),
  currency:    text('currency').notNull(), // 'sol' | 'usdc'
  status:      text('status').notNull(),   // 'waiting' | 'active' | 'finished'
  winner:      text('winner'),             // pubkey of winner, null = draw or unfinished
  pot:         real('pot'),
  fee:         real('fee'),
  onChainSig:  text('on_chain_sig'),       // settle transaction signature
  createdAt:   bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt:   bigint('updated_at', { mode: 'number' }).notNull(),
  finishedAt:  bigint('finished_at', { mode: 'number' }),
}, (table) => ({
  byPlayerOne:  index('idx_matches_p1').on(table.playerOne),
  byPlayerTwo:  index('idx_matches_p2').on(table.playerTwo),
  byStatus:     index('idx_matches_status').on(table.status),
  byCreatedAt:  index('idx_matches_created').on(table.createdAt),
}))

export type Match       = typeof matches.$inferSelect
export type MatchInsert = typeof matches.$inferInsert

/**
 * Matchmaking queue — players waiting for opponent.
 * Persisted so server restart doesn't drop the queue.
 */
export const queue = pgTable('queue', {
  playerId:   text('player_id').primaryKey(),
  mode:       text('mode').notNull(),
  stake:      real('stake').notNull(),
  currency:   text('currency').notNull(),
  /** JSON array of trivia category strings. NULL/[] = no preference. */
  categories: text('categories'),
  joinedAt:   bigint('joined_at', { mode: 'number' }).notNull(),
})

export type QueueEntry  = typeof queue.$inferSelect

/**
 * Achievement badges minted as NFTs (soulbound — no transfer instruction issued).
 * One row per (player, type) so a badge can only be earned once per wallet.
 */
export const badges = pgTable('badges', {
  id:        text('id').primaryKey(),
  player:    text('player').notNull(),
  type:      text('type').notNull(), // 'first_win' | 'streak_3' | 'streak_5' | 'streak_10' | 'whale' | 'flawless'
  mintAddr:  text('mint_addr'),       // null until on-chain mint succeeds
  txSig:     text('tx_sig'),
  earnedAt:  bigint('earned_at', { mode: 'number' }).notNull(),
}, (table) => ({
  byPlayer: index('idx_badges_player').on(table.player),
  byType:   index('idx_badges_type').on(table.type),
}))

export type Badge       = typeof badges.$inferSelect
export type BadgeInsert = typeof badges.$inferInsert

/**
 * Tournament — single-elimination bracket of 4 or 8 players.
 *
 * Each tournament owns N matches (linked via tournament_id on the matches
 * table is NOT done — instead we use the bracket table below to track
 * per-tournament match progression so the matches table stays simple).
 */
export const tournaments = pgTable('tournaments', {
  tournamentId:  text('tournament_id').primaryKey(),
  name:          text('name').notNull(),
  size:          integer('size').notNull(),         // 4 or 8
  stake:         real('stake').notNull(),
  currency:      text('currency').notNull(),         // 'sol' | 'usdc'
  mode:          text('mode').notNull(),             // 'classic' | etc
  status:        text('status').notNull(),           // 'open' | 'in_progress' | 'finished'
  champion:      text('champion'),                   // wallet of winner once finished
  createdBy:     text('created_by').notNull(),
  createdAt:     bigint('created_at', { mode: 'number' }).notNull(),
  startedAt:     bigint('started_at', { mode: 'number' }),
  finishedAt:    bigint('finished_at', { mode: 'number' }),
}, (table) => ({
  byStatus:    index('idx_tour_status').on(table.status),
  byCreatedAt: index('idx_tour_created').on(table.createdAt),
}))

export type Tournament       = typeof tournaments.$inferSelect
export type TournamentInsert = typeof tournaments.$inferInsert

/**
 * Tournament participants. One row per (tournament, player) at registration time.
 * `seed` is assigned 1..N when the bracket is generated.
 */
export const tournamentPlayers = pgTable('tournament_players', {
  tournamentId: text('tournament_id').notNull(),
  player:       text('player').notNull(),
  seed:         integer('seed'),                     // null until bracket generated
  eliminated:   integer('eliminated').notNull().default(0), // 0 = alive, 1 = out
  joinedAt:     bigint('joined_at', { mode: 'number' }).notNull(),
}, (table) => ({
  byTour:    index('idx_tp_tour').on(table.tournamentId),
  byPlayer:  index('idx_tp_player').on(table.player),
}))

export type TournamentPlayer = typeof tournamentPlayers.$inferSelect

/**
 * Bracket nodes — every match slot in the tournament. round=0 is the first
 * round (quarterfinals or semis depending on size). Higher rounds happen later.
 *
 * `match_id` links to the matches table once the actual game starts. Until
 * both players are determined (winners of feeder slots), match_id is null.
 */
export const brackets = pgTable('brackets', {
  bracketId:     text('bracket_id').primaryKey(),
  tournamentId:  text('tournament_id').notNull(),
  round:         integer('round').notNull(),
  position:      integer('position').notNull(),       // 0..(size/2)-1 in round 0
  playerOne:     text('player_one'),
  playerTwo:     text('player_two'),
  matchId:       text('match_id'),                    // matches.match_id or null
  winner:        text('winner'),                       // wallet or null
  feederA:       text('feeder_a'),                    // bracketId producing playerOne (round>0)
  feederB:       text('feeder_b'),                    // bracketId producing playerTwo (round>0)
  status:        text('status').notNull(),            // 'pending' | 'ready' | 'live' | 'done'
}, (table) => ({
  byTour:  index('idx_br_tour').on(table.tournamentId),
  byRound: index('idx_br_round').on(table.round),
}))

export type Bracket       = typeof brackets.$inferSelect
export type BracketInsert = typeof brackets.$inferInsert
