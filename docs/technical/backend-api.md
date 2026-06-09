# Backend API

The backend is a single Fastify (Node/TS) process. Route inputs are validated with Zod. The chain is the source of truth for rankings — the backend serves trivia questions, drives the match lifecycle and matchmaking, mirrors results into Postgres, relays WebSocket events, and acts as the **relayer** that records ranked PvP results on Celo.

| | |
|---|---|
| **Framework** | Fastify + Zod |
| **Database** | Postgres via Drizzle ORM |
| **Chain** | Celo mainnet (chainId `42220`), RPC `https://forno.celo.org` |
| **Relayer** | `backend/src/lib/chain.ts` (viem) — contract owner, pays CELO gas |

All routes are under `/api` unless noted.

## Health

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Status + version + timestamp |

## Trivia (`backend/src/routes/trivia.ts`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/trivia/question` | Fetch a random question (no correct index); creates a commit-reveal session |
| POST | `/api/trivia/reveal` | Reveal whether the player's submitted answer was correct |
| GET | `/api/trivia/peek` | Hint payload (e.g. eliminate two wrong indices, first letter) |
| GET | `/api/trivia/categories` | List of categories with question counts |
| GET | `/api/trivia/stats` | Question bank stats by category and difficulty |

Questions use a server-side commit-reveal (SHA-256) so the answer is never exposed before the player commits.

## Match (`backend/src/routes/match.ts`)

| Method | Path | Body / Returns |
|---|---|---|
| POST | `/api/match/create` | `{ playerOne, mode, ranked, categories?, difficulty? }` → `{ matchId, joinCode, status }` |
| POST | `/api/match/join` | `{ joinCode, playerTwo }` → `{ matchId, status, mode, ranked, playerOne, categories, difficulty? }` |
| POST | `/api/match/queue` | `{ playerId, mode, ranked, categories? }` — enter the matchmaking queue (auto-pair) |
| DELETE | `/api/match/queue` | `{ playerId }` — leave the queue |
| GET | `/api/match/queue/status` | Current queue state |
| GET | `/api/match/:matchId` | Full match metadata snapshot |
| GET | `/api/match/player/:playerId` | Find active match for a player |
| POST | `/api/match/finish` | `{ matchId, winner, ranked }` — see below |
| POST | `/api/match/vsai` | `{ player, mode, result }` — record a vs-AI practice result |

### `POST /api/match/finish`

For a ranked PvP match, this triggers the relayer to record the result on-chain via `recordMatch`, then returns the resulting deltas and points:

```json
{
  "ok": true,
  "winnerDelta": 16,
  "loserDelta": -16,
  "winnerPoints": 1016,
  "loserPoints": 984,
  "txHash": "0x…",
  "earnedBadges": []
}
```

If the chain is not configured (local dev), the result is still recorded in Postgres and `txHash` is `null`.

## Leaderboard / History / Stats / Badges (`backend/src/routes/stats.ts`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/leaderboard` | Ranked players by points. Supports `period`. Entries: `{ rank, address, points, wins, losses, winRate }` |
| GET | `/api/history/:player` | Match history for a wallet. Rows include `{ pointsDelta, ranked, txHash, … }` |
| GET | `/api/badges/:player` | Earned badge collection for a wallet |
| GET | `/api/stats` | Live aggregate counters (matches, players) |

The leaderboard reflects on-chain points read from `MindDuelRanking`.

## Tournament (`backend/src/routes/tournament.ts`)

Tournament endpoints live under `/api/tournament/*` (bracket create / list / details / join lifecycle).

## WebSocket (`backend/src/routes/ws.ts`)

| Path | Purpose |
|---|---|
| `WS /ws/:matchId` | Per-match room. `?role=spectator` for read-only |

See [Real-time Sync](./realtime-sync.md) for the full message protocol.

## Error response shape

All REST errors:

```json
{ "error": "Human-readable message", "details": { } }
```

`details` is only included for Zod validation errors and contains the full `flatten()` output.

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Invalid body or query |
| 404 | Not found |
| 410 | Session expired (trivia reveal / peek) |
| 500 | Internal error |

## CORS

CORS origins are restricted to the local dev origin, the production domain, and Vercel preview deployments when `ALLOW_VERCEL_PREVIEW=1` is set.
