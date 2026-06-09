import 'dotenv/config'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sql = postgres(url, { prepare: false, max: 1 })

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS matches (
  match_id      TEXT PRIMARY KEY,
  join_code     TEXT NOT NULL UNIQUE,
  player_one    TEXT NOT NULL,
  player_two    TEXT,
  mode          TEXT NOT NULL,
  stake         REAL NOT NULL,
  currency      TEXT NOT NULL,
  status        TEXT NOT NULL,
  winner        TEXT,
  pot           REAL,
  fee           REAL,
  on_chain_sig  TEXT,
  created_at    BIGINT NOT NULL,
  updated_at    BIGINT NOT NULL,
  finished_at   BIGINT
);

CREATE INDEX IF NOT EXISTS idx_matches_p1      ON matches(player_one);
CREATE INDEX IF NOT EXISTS idx_matches_p2      ON matches(player_two);
CREATE INDEX IF NOT EXISTS idx_matches_status  ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at);

CREATE TABLE IF NOT EXISTS queue (
  player_id   TEXT PRIMARY KEY,
  mode        TEXT NOT NULL,
  stake       REAL NOT NULL,
  currency    TEXT NOT NULL,
  categories  TEXT,
  joined_at   BIGINT NOT NULL
);
ALTER TABLE queue ADD COLUMN IF NOT EXISTS categories TEXT;

CREATE TABLE IF NOT EXISTS badges (
  id          TEXT PRIMARY KEY,
  player      TEXT NOT NULL,
  type        TEXT NOT NULL,
  mint_addr   TEXT,
  tx_sig      TEXT,
  earned_at   BIGINT NOT NULL,
  UNIQUE(player, type)
);

CREATE INDEX IF NOT EXISTS idx_badges_player ON badges(player);
CREATE INDEX IF NOT EXISTS idx_badges_type   ON badges(type);

CREATE TABLE IF NOT EXISTS tournaments (
  tournament_id  TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  size           INTEGER NOT NULL,
  stake          REAL NOT NULL,
  currency       TEXT NOT NULL,
  mode           TEXT NOT NULL,
  status         TEXT NOT NULL,
  champion       TEXT,
  created_by     TEXT NOT NULL,
  created_at     BIGINT NOT NULL,
  started_at     BIGINT,
  finished_at    BIGINT
);
CREATE INDEX IF NOT EXISTS idx_tour_status  ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tour_created ON tournaments(created_at);

CREATE TABLE IF NOT EXISTS tournament_players (
  tournament_id  TEXT NOT NULL,
  player         TEXT NOT NULL,
  seed           INTEGER,
  eliminated     INTEGER NOT NULL DEFAULT 0,
  joined_at      BIGINT NOT NULL,
  PRIMARY KEY (tournament_id, player)
);
CREATE INDEX IF NOT EXISTS idx_tp_tour   ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tp_player ON tournament_players(player);

CREATE TABLE IF NOT EXISTS brackets (
  bracket_id     TEXT PRIMARY KEY,
  tournament_id  TEXT NOT NULL,
  round          INTEGER NOT NULL,
  position       INTEGER NOT NULL,
  player_one     TEXT,
  player_two     TEXT,
  match_id       TEXT,
  winner         TEXT,
  feeder_a       TEXT,
  feeder_b       TEXT,
  status         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_br_tour  ON brackets(tournament_id);
CREATE INDEX IF NOT EXISTS idx_br_round ON brackets(round);
`

console.log('Connecting to Neon...')
try {
  await sql.unsafe(SCHEMA_SQL)
  console.log('✓ Schema applied successfully')

  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public'`
  console.log('Tables in public schema:', tables.map(r => r.tablename).join(', '))
} catch (e) {
  console.error('Migration failed:', e)
  process.exit(1)
} finally {
  await sql.end()
}
