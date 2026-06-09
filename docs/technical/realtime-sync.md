# Real-time Sync

Live gameplay in MindDuel is driven by a single backend WebSocket channel. The two players (and any spectators) join a per-match room and exchange board updates with low latency. Ranked settlement is a separate, one-shot step that happens on the chain **after** the game ends — it is not part of the realtime loop.

| Channel | Source | Role |
|---|---|---|
| Backend WebSocket `/ws/:matchId` | per-match room | Real-time board state, turn handoff, spectator counts, animations |

The trivia answer flow uses a server-side commit-reveal (SHA-256) so an answer is never exposed before the player commits. Once a match ends, the backend relayer records the ranked result on Celo via `recordMatch` — see [Backend API](./backend-api.md) and [Smart Contracts](./smart-contracts.md).

## Backend WebSocket protocol

`WS /ws/:matchId` is a Fastify WebSocket route. Each match has its own in-memory room.

### Connection

```javascript
// Player
const ws = new WebSocket('wss://<backend-host>/ws/AB12CD')

// Spectator (read-only)
const ws = new WebSocket('wss://<backend-host>/ws/AB12CD?role=spectator')
```

### Server -> client messages

| `type` | Payload | When |
|---|---|---|
| `state` | `{ match }` incl. `playerOne` / `playerTwo` addresses | Sent immediately on connect — full match snapshot; each client derives its own mark (X/O) from these addresses |
| `board_updated` | `{ board, currentPlayer, winLine, correct }` | Broadcast after any player reports a successful reveal |
| `viewer_count` | `{ count }` | On connect and whenever a spectator joins or leaves |
| `ping` | `{ t }` | Heartbeat — client must reply with `{ type: "pong" }` |

The `state` message carries the `playerOne` and `playerTwo` wallet addresses so each connected client can work out whether it is X or O without trusting any extra input.

### Client -> server messages

| `type` | Payload | Notes |
|---|---|---|
| `board_updated` | `{ board, currentPlayer, winLine, correct }` | Only accepted from player connections |
| `pong` | — | Heartbeat reply |

Spectator outbound messages are silently dropped.

## Heartbeat & late-join replay

- **Heartbeat.** The server sends `ping` periodically; clients must reply `pong`. Dead connections are dropped.
- **Late-join replay.** When a new client joins a room that already has activity, the server replays the cached `state` / last `board_updated` immediately, so a spectator arriving mid-match sees the current board without waiting for the next move.
- The room entry is deleted when the last socket disconnects.

## Commit-reveal (anti-cheat)

Trivia answers use a server-side commit-reveal scheme based on SHA-256:

1. `GET /api/trivia/question` returns the question and options but **not** the correct index, and opens a session.
2. The player submits their answer to `POST /api/trivia/reveal`.
3. The server verifies against the committed hash and returns whether it was correct.

This prevents a client from learning the answer before committing. It is the same scheme as before — only the on-chain settlement step has changed (now a single relayer `recordMatch` after the game, instead of per-turn on-chain commits).

## Source

- Backend: `backend/src/routes/ws.ts`
- Frontend: the WebSocket client used by the game room page (`/game/[matchId]`)
