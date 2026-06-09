import { pgTable, text, integer, bigint, index } from 'drizzle-orm/pg-core'

/**
 * MindDuel matches table (Celo edition).
 *
 * There is no staking on Celo — ranked matches are a pure skill ladder. The
 * authoritative points/ranking live in the MindDuelRanking contract; this DB
 * caches match metadata for fast lobby / history / leaderboard queries and
 * records the points deltas + tx hash returned by the on-chain recordMatch.
 */
export const matches = pgTable('matches', {
  matchId:     text('match_id').primaryKey(),
  joinCode:    text('join_code').notNull().unique(),
  playerOne:   text('player_one').notNull(),
  playerTwo:   text('player_two'),
  mode:        text('mode').notNull(),
  /** 1 = ranked (recorded on-chain), 0 = casual / practice. */
  ranked:      integer('ranked').notNull().default(0),
  status:      text('status').notNull(),   // 'waiting' | 'active' | 'finished'
  winner:      text('winner'),             // address of winner, null = draw or unfinished
  /** Points the winner gained / loser dropped on-chain (filled at settle). */
  winnerDelta: integer('winner_delta'),
  loserDelta:  integer('loser_delta'),
  /** Celo tx hash of the recordMatch call (ranked only). */
  txHash:      text('tx_hash'),
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
 * Matchmaking queue — players waiting for an opponent.
 */
export const queue = pgTable('queue', {
  playerId:   text('player_id').primaryKey(),
  mode:       text('mode').notNull(),
  ranked:     integer('ranked').notNull().default(0),
  /** JSON array of trivia category strings. NULL/[] = no preference. */
  categories: text('categories'),
  joinedAt:   bigint('joined_at', { mode: 'number' }).notNull(),
})

export type QueueEntry  = typeof queue.$inferSelect

/**
 * Achievement badges (DB-only on Celo — no NFT mint).
 * One row per (player, type) so a badge can only be earned once per wallet.
 */
export const badges = pgTable('badges', {
  id:        text('id').primaryKey(),
  player:    text('player').notNull(),
  type:      text('type').notNull(), // 'first_win' | 'streak_3' | 'streak_5' | 'streak_10' | 'high_rank' | 'flawless'
  earnedAt:  bigint('earned_at', { mode: 'number' }).notNull(),
}, (table) => ({
  byPlayer: index('idx_badges_player').on(table.player),
  byType:   index('idx_badges_type').on(table.type),
}))

export type Badge       = typeof badges.$inferSelect
export type BadgeInsert = typeof badges.$inferInsert

/**
 * Tournament — single-elimination bracket of 4 or 8 players.
 */
export const tournaments = pgTable('tournaments', {
  tournamentId:  text('tournament_id').primaryKey(),
  name:          text('name').notNull(),
  size:          integer('size').notNull(),         // 4 or 8
  ranked:        integer('ranked').notNull().default(0),
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
 * Bracket nodes — every match slot in the tournament.
 */
export const brackets = pgTable('brackets', {
  bracketId:     text('bracket_id').primaryKey(),
  tournamentId:  text('tournament_id').notNull(),
  round:         integer('round').notNull(),
  position:      integer('position').notNull(),
  playerOne:     text('player_one'),
  playerTwo:     text('player_two'),
  matchId:       text('match_id'),
  winner:        text('winner'),
  feederA:       text('feeder_a'),
  feederB:       text('feeder_b'),
  status:        text('status').notNull(),            // 'pending' | 'ready' | 'live' | 'done'
}, (table) => ({
  byTour:  index('idx_br_tour').on(table.tournamentId),
  byRound: index('idx_br_round').on(table.round),
}))

export type Bracket       = typeof brackets.$inferSelect
export type BracketInsert = typeof brackets.$inferInsert
