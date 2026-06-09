# Backend API

The backend is a single Fastify (Node 20) process. Every route input is validated by Zod. The chain is the source of truth — the backend serves trivia questions, mirrors finished match results into Postgres, relays WebSocket events between clients, and optionally signs as fee payer.

| | |
|---|---|
| **Framework** | Fastify + Zod |
| **Database** | Neon Postgres via Drizzle ORM |
| **Local base URL** | `http://localhost:3001` |
| **Live base URL** | `https://mindduel-production.up.railway.app` |

## Health

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Status + version + timestamp |

Live probe: [https://mindduel-production.up.railway.app/health](https://mindduel-production.up.railway.app/health)

## Trivia (`backend/src/routes/trivia.ts`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/trivia/question` | Fetch a random question (no correct index); creates a 10-min session |
| POST | `/api/trivia/reveal` | Reveal whether the player's submitted answer was correct |
| GET | `/api/trivia/peek` | Hint payload: `eliminate2` returns two wrong indices, `first-letter` returns the first letter |
| GET | `/api/trivia/categories` | List of categories with question counts |
| GET | `/api/trivia/stats` | Question bank stats by category and difficulty |

Sessions expire after 10 minutes. Each peek type can be used once per session.

## Match (`backend/src/routes/match.ts`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/match/create` | Create private match with `MNDL-XXXXXX` join code |
| POST | `/api/match/join` | Join via join code |
| GET | `/api/match/:matchId` | Full match metadata snapshot |
| POST | `/api/match/queue` | Enter the matchmaking queue (auto-pair) |
| DELETE | `/api/match/queue` | Leave the queue |
| GET | `/api/match/queue/status` | Current queue depth |
| GET | `/api/match/player/:playerId` | Find active match for a player |

Stake / mode / currency are validated against fixed enums (`classic`, `shifting`, `scaleup`, `blitz`, `vs-ai`; `sol` or `usdc`). Join codes match `^MNDL-[A-F0-9]{6}$`.

## Stats / Leaderboard / History / Badges (`backend/src/routes/stats.ts`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/stats` | Live aggregate counters (matches, players, volume) |
| GET | `/api/leaderboard` | Top players by wins. `period` (`alltime`/`weekly`/`daily`), `limit` (max 50) |
| GET | `/api/history/:player` | Match history for a wallet (max 100 rows) |
| GET | `/api/badges/:player` | Earned badge collection for a wallet |
| POST | `/api/match/finish` | Report finished match (winner, pot, fee, on-chain signature) — triggers badge evaluation |
| POST | `/api/match/vsai` | Record a vs-AI practice match result |

`POST /api/match/finish` returns `{ ok, earnedBadges }`.

## Tournament (`backend/src/routes/tournament.ts`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/tournament/create` | Create 4 or 8-player bracket |
| GET | `/api/tournament/list` | List open tournaments |
| GET | `/api/tournament/:id` | Tournament details + participants |
| GET | `/api/tournament/:id/bracket` | Bracket structure (rounds, pairings, winners) |
| POST | `/api/tournament/:id/join` | Join open tournament; auto-starts when full |

Modes restricted to `classic`, `shifting`, `scaleup`, `blitz`. Sizes: `4` or `8`.

## Sponsor (`backend/src/routes/sponsor.ts`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/sponsor/pubkey` | Get sponsor fee-payer pubkey (or 503 if unconfigured) |
| POST | `/api/sponsor/sign-tx` | Partial-sign an unsigned transaction as fee payer |

Hard guards: program allowlist, sponsor must equal `feePayer`, sponsor cannot be a required signer of any instruction, 30 req/min per IP. See [Sponsored Gas](../features/sponsored-gas.md).

## Faucet (`backend/src/routes/faucet.ts`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/faucet` | Devnet-only mock USDC faucet, 100 USDC per wallet per 24h |

Returns `429` if rate-limited.

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
| 429 | Rate limited (faucet, sponsor) |
| 500 | Internal error |
| 503 | Sponsor not configured |

## CORS

CORS origins are restricted to `localhost:3000`, the production domain, and Vercel preview deployments when `ALLOW_VERCEL_PREVIEW=1` is set.
