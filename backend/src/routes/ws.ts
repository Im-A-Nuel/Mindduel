import type { FastifyInstance } from 'fastify'
import { getMatch } from '../lib/match-store.js'

type WsClient = { send: (data: string) => void; readyState: number }
type Role = 'player' | 'spectator'

interface RoomMember {
  socket: WsClient
  role:   Role
}

const rooms = new Map<string, Set<RoomMember>>()

// Cache the most recent `board_updated` event per match so a player who
// connects late (e.g. WS opened after the opponent's first move was
// broadcast) can replay the latest turn-flip on connect. Without this,
// the BE only has the stale DB record (currentPlayer never updates
// per-turn) and the late client gets stuck.
const lastEvent = new Map<string, string>()

function getRoom(matchId: string): Set<RoomMember> {
  let r = rooms.get(matchId)
  if (!r) { r = new Set(); rooms.set(matchId, r) }
  return r
}

function spectatorCount(matchId: string): number {
  let n = 0
  for (const m of rooms.get(matchId) ?? []) if (m.role === 'spectator') n++
  return n
}

function broadcastViewerCount(matchId: string) {
  const payload = JSON.stringify({ type: 'viewer_count', count: spectatorCount(matchId) })
  for (const m of rooms.get(matchId) ?? []) {
    if (m.socket.readyState === 1) m.socket.send(payload)
  }
}

function broadcastFromPlayer(matchId: string, payload: string, sender: WsClient) {
  // Player events go to ALL members (other players + spectators)
  for (const m of rooms.get(matchId) ?? []) {
    if (m.socket !== sender && m.socket.readyState === 1) m.socket.send(payload)
  }
}

export function broadcastToMatch(matchId: string, event: unknown) {
  const payload = JSON.stringify(event)
  for (const m of rooms.get(matchId) ?? []) {
    if (m.socket.readyState === 1) m.socket.send(payload)
  }
}

export async function wsRoutes(app: FastifyInstance) {
  app.get('/ws/:matchId', { websocket: true }, (connection, request) => {
    const { matchId } = request.params as { matchId: string }
    const url = (request.raw.url ?? '')
    const role: Role = url.includes('role=spectator') ? 'spectator' : 'player'
    const socket = connection.socket as unknown as WsClient

    const member: RoomMember = { socket, role }
    getRoom(matchId).add(member)

    // Send current state on connect
    void getMatch(matchId).then(match => {
      if (match) socket.send(JSON.stringify({ type: 'state', match }))
      // Replay the latest live turn-flip so a late joiner doesn't miss it.
      const cached = lastEvent.get(matchId)
      if (cached) socket.send(cached)
      socket.send(JSON.stringify({ type: 'viewer_count', count: spectatorCount(matchId) }))
    }).catch(() => {})

    // Tell everyone the viewer count changed
    broadcastViewerCount(matchId)

    // Heartbeat: server pings every 30s. If the client drops without a
    // graceful close (e.g. lid closed, network drop) the ping write fails
    // and we close from our side, freeing the slot. Clients reply `pong`
    // so we know they're alive — last-seen tracked for diagnostics.
    let lastSeen = Date.now()
    const pingInterval = setInterval(() => {
      if (socket.readyState !== 1) {
        clearInterval(pingInterval)
        return
      }
      try {
        socket.send(JSON.stringify({ type: 'ping', t: Date.now() }))
      } catch {
        clearInterval(pingInterval)
      }
      // If we haven't heard from the client in 90s, force-close the socket.
      if (Date.now() - lastSeen > 90_000) {
        clearInterval(pingInterval)
        try { (connection.socket as unknown as { close: () => void }).close() } catch {}
      }
    }, 30_000)

    // Reject oversized payloads — game events fit comfortably in 4KB
    // (board state + winLine + a few enums). Anything larger is either
    // a misbehaving client or an abuse attempt; we don't want to
    // amplify it across the room.
    const MAX_PAYLOAD_BYTES = 4 * 1024
    // Per-connection rate limit: max 60 messages per 30-second window.
    // Genuine play is ~1 msg/turn, so this is 60× headroom. A flood
    // would consume CPU and broadcast spam to the room without this cap.
    const WS_RATE_WINDOW_MS  = 30_000
    const WS_RATE_LIMIT      = 60
    let wsMsgCount  = 0
    let wsWindowStart = Date.now()
    ;(connection.socket as unknown as { on: (event: string, cb: (data: unknown) => void) => void }).on('message', (raw) => {
      lastSeen = Date.now()
      if (role === 'spectator') return  // spectators are read-only
      // Sliding-window rate check
      const now2 = Date.now()
      if (now2 - wsWindowStart > WS_RATE_WINDOW_MS) {
        wsMsgCount = 0
        wsWindowStart = now2
      }
      wsMsgCount++
      if (wsMsgCount > WS_RATE_LIMIT) return  // drop — flood protection
      try {
        const payload = raw!.toString()
        if (payload.length > MAX_PAYLOAD_BYTES) return  // drop oversized
        try {
          const parsed = JSON.parse(payload) as { type?: string }
          if (parsed.type === 'pong') return  // heartbeat reply, don't broadcast
          if (parsed.type === 'board_updated') lastEvent.set(matchId, payload)
        } catch {
          return  // malformed JSON — drop instead of broadcast
        }
        broadcastFromPlayer(matchId, payload, socket)
      } catch {}
    })

    ;(connection.socket as unknown as { on: (event: string, cb: () => void) => void }).on('close', () => {
      clearInterval(pingInterval)
      const room = rooms.get(matchId)
      if (!room) return
      room.delete(member)
      if (room.size === 0) {
        rooms.delete(matchId)
        lastEvent.delete(matchId)
      } else {
        broadcastViewerCount(matchId)
      }
    })
  })
}
