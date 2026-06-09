# Tournaments

Tournaments let players compete in a single-elimination bracket for a stacked prize pool. Brackets are 4-player or 8-player; the bracket is generated server-side and the underlying matches are real on-chain games.

## Bracket sizes

| Size | Rounds | Total matches |
|---|---|---|
| 4 | 2 (semis + final) | 3 |
| 8 | 3 (quarters + semis + final) | 7 |

Tournaments are configurable per creation:

| Field | Options |
|---|---|
| `name` | 2 to 60 characters |
| `size` | 4 or 8 |
| `mode` | `classic`, `shifting`, `scaleup`, `blitz` |
| `currency` | `sol` or `usdc` |
| `stake` | per-match stake (number, in SOL or USDC) |

## Lifecycle

1. **Create** — anyone calls `POST /api/tournament/create` with the config. Status starts as `open`.
2. **Join** — players call `POST /api/tournament/:id/join` until the bracket fills. Each join updates the participant list.
3. **Start (auto)** — when the last seat is filled, the first round of matches is generated automatically. The endpoint response includes `started: true` for the player whose join filled the bracket.
4. **Play** — each bracket match is a normal MindDuel game with the configured mode and stake. Settlement happens on-chain, identical to a 1v1 lobby match.
5. **Advance** — winners advance up the bracket. Subsequent rounds are generated from prior round results.
6. **Final** — last match decides the tournament winner.

## API surface

| Endpoint | Purpose |
|---|---|
| `POST /api/tournament/create` | Create a new bracket |
| `GET /api/tournament/list` | List open tournaments |
| `GET /api/tournament/:id` | Get full tournament state |
| `GET /api/tournament/:id/bracket` | Get the bracket structure (rounds, match pairings, winners) |
| `POST /api/tournament/:id/join` | Join an open tournament |

See [Backend API](../technical/backend-api.md) for request/response schemas.

## What is on-chain vs off-chain

| Component | Where it lives |
|---|---|
| Tournament metadata (name, participants, bracket) | Backend (Postgres via `tournament-store`) |
| Each bracket match's stake, board, settlement | On-chain — same as any 1v1 match |
| Bracket advancement logic | Backend — reads on-chain settlement results |

The tournament layer is convenience. Each underlying match is fully on-chain — your stake is in the same kind of escrow PDA as a casual game.

## Frontend pages

| Path | Purpose |
|---|---|
| `/tournaments` | List of open tournaments |
| `/tournaments/[id]` | Bracket view + join button |

## Roadmap notes

Tournaments are V1.0 (live). Future expansions tracked on the [Roadmap](../resources/roadmap.md):

- Larger brackets (16, 32 players).
- Pre-match category selection per tournament.
- Reward-pool tournaments where the prize is sponsored, not staked.
