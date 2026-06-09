# Real-time Sync

Real-time UI in MindDuel runs on **two parallel channels**, each with its own role:

| Channel | Source | Role |
|---|---|---|
| Solana RPC `accountSubscribe` | `useGameState` hook | Authoritative on-chain state — board, status, current_turn, drama_score |
| Backend WebSocket `/ws/:matchId` | `useWebSocket` hook | Low-latency UX events — board flashes, viewer counts, animations |

The chain is the source of truth. The WebSocket relay is a UX accelerator that gives the opponent's screen something to animate before the next chain confirmation lands.

## Solana account subscription

The frontend opens an RPC WebSocket and calls `accountSubscribe` on the `GameAccount` PDA. Every time the account is mutated (commit, reveal, hint, settle), the subscription fires and the frontend re-decodes the account.

```typescript
connection.onAccountChange(gameAccountPda, (accountInfo) => {
  const game = program.coder.accounts.decode('GameAccount', accountInfo.data)
  setGameState(game)
})
```

This is what drives:

- The board mark appearing after a successful reveal.
- The "your turn" indicator switching.
- The drama score / round counter updating.
- The settle button enabling when terminal conditions are met.

If the backend is offline, the game still updates correctly off this channel alone.

## Backend WebSocket protocol

`WS /ws/:matchId` is a Fastify WebSocket route. Each match has its own in-memory room.

### Connection

```javascript
// Player
const ws = new WebSocket('wss://api.mindduel.app/ws/AB12CD')

// Spectator (read-only)
const ws = new WebSocket('wss://api.mindduel.app/ws/AB12CD?role=spectator')
```

### Server -> client messages

| `type` | Payload | When |
|---|---|---|
| `state` | `{ match }` | Sent immediately on connect — full match metadata snapshot |
| `board_updated` | `{ board, currentPlayer, winLine, correct }` | Broadcast after any player reports a successful reveal |
| `viewer_count` | `{ count }` | Sent on connect and whenever a spectator joins or leaves |
| `ping` | `{ t }` | Heartbeat — client must reply with `{ type: "pong" }` |

### Client -> server messages

| `type` | Payload | Notes |
|---|---|---|
| `board_updated` | `{ board, currentPlayer, winLine, correct }` | Only accepted from player connections |
| `pong` | — | Heartbeat reply |

Spectator outbound messages are silently dropped.

## Connection limits

| Limit | Value | Why |
|---|---|---|
| Max payload | 4 KB | Prevent abuse |
| Rate limit | 60 messages per 30 seconds per connection | Genuine play uses ~1 msg per 2s |
| Idle timeout | 90 seconds | Force-disconnect ghost connections |
| Heartbeat | Server `ping` every 30 seconds | Detects dead clients |

Larger messages are dropped. Excessive senders are throttled.

## Late-join replay

When a new client joins a room that already has activity, the server replays the **last cached `board_updated`** event immediately. So a spectator who arrives mid-match sees the current board without having to wait for the next move.

The room entry is deleted when the last socket disconnects.

## Why two channels

This design is intentional:

- **Solana subscription** = authoritative, slightly higher latency (one slot ~ 400ms).
- **WebSocket relay** = best-effort, low latency, used for UX polish and spectator counts.

If the WebSocket layer is down, the game still works — the chain subscription alone drives correct state. If the chain subscription is slow, the WebSocket gives the UI something to render in the meantime.

The frontend reconciles both: when a `board_updated` from WebSocket and a chain account update disagree, the chain wins. The WebSocket is never trusted for win/draw/turn state.

## Source

- Backend: `backend/src/routes/ws.ts`
- Frontend: `frontend/src/hooks/useGameState.ts` (chain subscription) and the WebSocket client used by the game room page.
