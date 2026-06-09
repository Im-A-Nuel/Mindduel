# Tournaments

Tournaments let players compete in a single-elimination bracket. Brackets are 4-player or 8-player; the bracket is generated server-side and the underlying matches are real MindDuel games. There is **no stake and no entry fee** — tournaments are pure skill brackets.

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
| `type` | `ranked` or `casual` |

A **Ranked** tournament's matches feed the on-chain Elo ladder (wins raise points, losses lower them). A **Casual** tournament runs the same brackets without affecting rankings.

## Lifecycle

1. **Create** — anyone calls `POST /api/tournament/create` with the config. Status starts as `open`.
2. **Join** — players call `POST /api/tournament/:id/join` until the bracket fills. Each join updates the participant list.
3. **Start (auto)** — when the last seat is filled, the first round of matches is generated automatically. The endpoint response includes `started: true` for the player whose join filled the bracket.
4. **Play** — each bracket match is a normal MindDuel game with the configured mode. If the tournament is Ranked, each match settles to the ranking contract just like any ranked 1v1.
5. **Advance** — winners advance up the bracket. Subsequent rounds are generated from prior round results.
6. **Final** — the last match decides the champion, which is recorded for the tournament.

## API surface

| Endpoint | Purpose |
|---|---|
| `POST /api/tournament/create` | Create a new bracket |
| `GET /api/tournament/list` | List open tournaments |
| `GET /api/tournament/:id` | Get full tournament state |
| `GET /api/tournament/:id/bracket` | Get the bracket structure (rounds, match pairings, winners) |
| `POST /api/tournament/:id/join` | Join an open tournament |

See [Backend API](../technical/backend-api.md) for request/response schemas.

## What lives where

| Component | Where it lives |
|---|---|
| Tournament metadata (name, participants, bracket, champion) | Backend (Postgres via `tournament-store`) |
| Ranked match results (points, W/L/D) | On-chain via `MindDuelRanking` |
| Bracket advancement logic | Backend — reads each match's result |

The tournament layer is convenience. In a Ranked tournament each underlying match still settles to the same on-chain ranking ladder as a standalone ranked game.

## Frontend pages

| Path | Purpose |
|---|---|
| `/tournaments` | List of open tournaments |
| `/tournaments/[id]` | Bracket view + join button |

## Roadmap notes

Tournaments are live. Future expansions tracked on the [Roadmap](../resources/roadmap.md):

- Larger brackets (16, 32 players).
- Pre-match category selection per tournament.
- Seeded brackets based on current rank tier.
