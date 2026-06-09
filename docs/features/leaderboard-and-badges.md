# Leaderboard and Badges

MindDuel ranks players by their on-chain points from the `MindDuelRanking` contract on Celo mainnet. The contract is the source of truth; the backend reads it via viem and keeps a Postgres mirror (Neon, via Drizzle ORM) for fast queries, with a DB fallback if the chain read fails.

## Ranking system

Ranked matches feed an integer Elo ladder enforced by `MindDuelRanking.sol`:

- Every player starts at **1000** points.
- Each ranked result is **zero-sum** with **K = 32**: the points the winner gains equal the points the loser drops.
- Points are **floored at 0** — you can never go negative.
- The contract tracks **wins / losses / draws** per player alongside the point total.

### Rank tiers

| Tier | Points |
|---|---|
| Bronze | 0 |
| Silver | 1000 |
| Gold | 1200 |
| Platinum | 1400 |
| Diamond | 1600 |
| Master | 1850 |

## Leaderboard

Available via `GET /api/leaderboard`. Players are ranked by **on-chain points**, with a database fallback if the on-chain read is unavailable.

### Query parameters

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `period` | `string` | `alltime` | `alltime`, `weekly`, or `daily` (display label only for now) |
| `limit` | `number` | `25` | Max 50 |

### Response shape

```json
{
  "period": "alltime",
  "entries": [
    {
      "rank": 1,
      "address": "0xAbC...",
      "points": 1685,
      "tier": "Diamond",
      "wins": 42,
      "matches": 55,
      "losses": 13,
      "draws": 0,
      "winRate": 0.764
    }
  ]
}
```

Practice (`vs-ai`) results never reach the ranking contract, so they never appear on the leaderboard — only ranked matches between real wallets count.

## Match history

`GET /api/history/:player` returns the most recent matches for a wallet, including mode, opponent, result (win/loss/draw), and the points change.

This is the data behind the **History** tab in the frontend.

## Live stats

`GET /api/stats` returns aggregate counters across all matches:

- `totalMatches`
- `activeMatches`
- `totalPlayers`

These power the lobby's "live ticker."

## Badges

Badges are awarded after a ranked match and stored in the `badges` table tied to the player's wallet. Badges are **DB-only** — they are records in the database, not minted tokens.

`GET /api/badges/:player` returns the player's badge collection:

```json
{
  "player": "0xAbC...",
  "count": 3,
  "badges": [
    {
      "id": 1,
      "type": "first_win",
      "name": "First Blood",
      "description": "Won your first MindDuel match",
      "earnedAt": 1746000000000
    }
  ]
}
```

### Badge types

| Type | Name | Condition |
|---|---|---|
| `first_win` | First Blood | Won your first MindDuel match |
| `streak_3` | Triple Threat | Won 3 ranked matches in a row |
| `streak_5` | Pentakill | Won 5 ranked matches in a row |
| `streak_10` | Decimator | Won 10 ranked matches in a row |
| `high_rank` | Gold Rank | Reached 1200 points (Gold tier) |
| `flawless` | Flawless | 100% accuracy over 5+ questions in a match |

Badge type metadata lives in `backend/src/lib/badges.ts`.

## Database schema (high level)

| Table | Purpose |
|---|---|
| `matches` | One row per finished match: players, mode, winner, result, point changes, timestamps |
| `badges` | One row per earned badge: type, owner, earned timestamp |
| `tournaments` | Tournament metadata + bracket state |

Defined in `backend/src/lib/schema.ts`, accessed via Drizzle ORM. The on-chain `MindDuelRanking` contract remains the authority for points; the database mirrors it for display.
