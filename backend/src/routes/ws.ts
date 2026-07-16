import type { FastifyInstance } from 'fastify'
import { getMatch } from '../lib/match-store.js'

type WsClient = { send: (data: string) => void; readyState: number }
type Role = 'player' | 'spectator'

interface RoomMember {
  socket: WsClient
  role:   Role
  /** Lowercased wallet address, from `?player=` on the socket URL. Players only. */
  player: string | null
}

const rooms = new Map<string, Set<RoomMember>>()

// Cache the most recent `board_updated` event per match so a player who
// connects late (e.g. WS opened after the opponent's first move was
// broadcast) can replay the latest turn-flip on connect. Without this,
// the BE only has the stale DB record (currentPlayer never updates
// per-turn) and the late client gets stuck.
const lastEvent = new Map<string, string>()

// Ready-check state per match (PvP only). Both players must mark themselves
// ready before either client starts the game, so a player who is still
// loading/connecting can never miss the opponent's opening move.
//
// This lives server-side rather than being relayed peer-to-peer because a
// `player_ready` sent before the opponent's socket opens would otherwise be
// lost forever (broadcastFromPlayer only reaches CURRENTLY connected members).
// Keeping it here lets us replay the set to late joiners and reconnects.
//
// NOT cleared when the room empties: a brief network blip on both sides would
// otherwise reset an in-progress match back to the waiting room. GC'd by age.
const readyByMatch = new Map<string, { players: Set<string>; touchedAt: number }>()

setInterval(() => {
  const cutoff = Date.now() - 6 * 60 * 60_000
  for (const [k, v] of readyByMatch) {
    if (v.touchedAt < cutoff) readyByMatch.delete(k)
  }
}, 30 * 60_000)

function readyList(matchId: string): string[] {
  return [...(readyByMatch.get(matchId)?.players ?? [])]
}

function markReady(matchId: string, player: string) {
  const entry = readyByMatch.get(matchId) ?? { players: new Set<string>(), touchedAt: Date.now() }
  entry.players.add(player.toLowerCase())
  entry.touchedAt = Date.now()
  readyByMatch.set(matchId, entry)
}

function readyPayload(matchId: string): string {
  return JSON.stringify({ type: 'ready_state', ready: readyList(matchId) })
}

/**
 * Who is currently holding an open player socket in this room. Lets each
 * client tell whether its opponent is still present, so a player who closes
 * the tab or drops offline mid-match is visible to the other side instead of
 * looking like they are simply thinking for a very long time.
 */
function presentPlayers(matchId: string): string[] {
  const out = new Set<string>()
  for (const m of rooms.get(matchId) ?? []) {
    if (m.role === 'player' && m.player && m.socket.readyState === 1) out.add(m.player)
  }
  return [...out]
}

function broadcastPresence(matchId: string) {
  const payload = JSON.stringify({ type: 'presence', players: presentPlayers(matchId) })
  for (const m of rooms.get(matchId) ?? []) {
    if (m.socket.readyState === 1) m.socket.send(payload)
  }
}

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

    // `?player=<addr>` identifies which side this socket belongs to, so the
    // room can report presence. Absent for spectators and legacy clients.
    let player: string | null = null
    if (role === 'player') {
      try {
        const p = new URL(url, 'http://localhost').searchParams.get('player')
        if (p) player = p.toLowerCase()
      } catch { /* malformed url - presence just stays unknown */ }
    }

    const member: RoomMember = { socket, role, player }
    getRoom(matchId).add(member)

    // Replay in-memory state IMMEDIATELY — none of it needs the database, so
    // it must not be serialized behind the getMatch() roundtrip below. The
    // ready-check set especially: gating it on a slow DB reply would leave a
    // client showing a stale "opponent not ready" for the length of the query.
    //
    // Replays the latest live turn-flip so a late joiner doesn't miss it, and
    // the ready set so a client connecting after the opponent hit Ready still
    // sees them as ready.
    const cached = lastEvent.get(matchId)
    if (cached) socket.send(cached)
    socket.send(readyPayload(matchId))
    socket.send(JSON.stringify({ type: 'viewer_count', count: spectatorCount(matchId) }))

    // Match metadata is the only part that needs a DB read.
    void getMatch(matchId).then(match => {
      if (match) socket.send(JSON.stringify({ type: 'state', match }))
    }).catch(() => {})

    // Tell everyone the viewer count changed
    broadcastViewerCount(matchId)
    // ...and that this player is now present (also seeds the joiner's own view).
    broadcastPresence(matchId)

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
          const parsed = JSON.parse(payload) as { type?: string; player?: unknown }
          if (parsed.type === 'pong') return  // heartbeat reply, don't broadcast
          if (parsed.type === 'player_ready') {
            // Ready-check: record server-side and fan the full set out to the
            // WHOLE room (sender included) so every client converges on one
            // authoritative view instead of tracking its own peer's state.
            if (typeof parsed.player === 'string' && parsed.player.length > 0) {
              markReady(matchId, parsed.player)
              const out = readyPayload(matchId)
              for (const m of rooms.get(matchId) ?? []) {
                if (m.socket.readyState === 1) m.socket.send(out)
              }
            }
            return  // never relay the raw player_ready
          }
          if (parsed.type === 'identify') {
            // The socket opens before the wallet has necessarily settled, so
            // `?player=` can be missing on the initial connect. This lets the
            // client name itself as soon as it knows, without socket churn.
            if (role === 'player' && typeof parsed.player === 'string' && parsed.player.length > 0) {
              const next = parsed.player.toLowerCase()
              if (member.player !== next) {
                member.player = next
                broadcastPresence(matchId)
              }
            }
            return  // never relay
          }
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
        // Let the remaining player see that their opponent dropped.
        broadcastPresence(matchId)
      }
    })
  })
}
