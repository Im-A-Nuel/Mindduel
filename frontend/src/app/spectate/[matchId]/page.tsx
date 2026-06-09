'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BoardRenderer, type CellValue, type WinLine } from '@/components/game/BoardRenderer'
import { WS_URL } from '@/lib/api'
import { StateIconAlert } from '@/components/ui/StateIcons'
import { IconViewers } from '@/components/ui/StateIcons'

const BLUE = '#0071E3'
const RED  = '#FF3B30'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const GREEN = '#34C759'
const BG = 'var(--mdd-bg)'

interface SpectateState {
  board:         CellValue[]
  boardSize:     number
  currentPlayer: 'X' | 'O'
  winLine:       WinLine
  winner:        'X' | 'O' | 'draw' | null
}

export default function SpectatePage({ params }: { params: { matchId: string } }) {
  const [state, setState]           = useState<SpectateState>({
    board: Array(9).fill(null),
    boardSize: 3,
    currentPlayer: 'X',
    winLine: null,
    winner: null,
  })
  const [viewerCount, setViewerCount] = useState(0)
  const [connected, setConnected]     = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    const ws = new WebSocket(`${WS_URL}/ws/${params.matchId}?role=spectator`)
    wsRef.current = ws

    ws.onopen  = () => { if (alive) setConnected(true) }
    ws.onerror = () => { if (alive) setError('Connection failed. Match may not exist or backend is offline.') }
    ws.onclose = () => { if (alive) setConnected(false) }

    ws.onmessage = (e) => {
      if (!alive) return
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'board_updated') {
          setState(s => ({
            ...s,
            board:         msg.board ?? s.board,
            boardSize:     msg.boardSize ?? s.boardSize,
            currentPlayer: msg.nextPlayer ?? s.currentPlayer,
            winLine:       msg.winLine ?? s.winLine,
            winner:        msg.winner ?? s.winner,
          }))
        } else if (msg.type === 'state' && msg.match) {
          setState(s => ({
            ...s,
            board:         msg.match.board ?? s.board,
            boardSize:     msg.match.boardSize ?? s.boardSize,
            currentPlayer: msg.match.currentPlayer ?? s.currentPlayer,
          }))
        } else if (msg.type === 'viewer_count' && typeof msg.count === 'number') {
          setViewerCount(msg.count)
        }
      } catch {}
    }

    return () => {
      alive = false
      ws.close()
      wsRef.current = null
    }
  }, [params.matchId])

  function copyShareLink() {
    if (typeof window === 'undefined') return
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif", color: INK }}>
      {/* ── Top bar ───────────────────────────────────────────────── */}
      <nav className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, color: INK, fontWeight: 700, fontSize: 16 }}>
            ← MindDuel
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: connected ? '#E8F7EE' : '#FDECEB', color: connected ? '#0A7A2D' : '#A81C13', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: connected ? GREEN : RED, animation: connected ? 'liveDotPulse 1.6s ease-in-out infinite' : 'none' }} />
              {connected ? 'LIVE' : 'CONNECTING…'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--mdd-bg)', color: INK, borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
              <IconViewers size={13} color="#1D1D1F" /> {viewerCount} watching
            </span>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ marginBottom: 20 }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Spectator Mode</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, margin: '0 0 4px' }}>Match in progress</h1>
          <p style={{ fontSize: 13, color: MUTED, margin: 0, fontFamily: 'ui-monospace, Menlo, monospace' }}>
            ID: {params.matchId.slice(0, 12)}…
          </p>
        </motion.div>

        {error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '60px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}
          >
            <StateIconAlert />
            <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>Cannot watch this match</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6, maxWidth: 320, margin: '6px auto 0' }}>{error}</div>
          </motion.div>
        ) : (
          <>
            {/* Board (read-only) */}
            <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', marginBottom: 16 }}>
              <BoardRenderer
                board={state.board}
                onCellClick={() => { /* read-only */ }}
                currentPlayer={state.currentPlayer}
                myMark="X"
                winLine={state.winLine}
                pendingCell={null}
                disabled
              />
            </div>

            {/* Status / share */}
            <div style={{ background: 'var(--mdd-card)', borderRadius: 16, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {state.winner ? 'Final' : 'Status'}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginTop: 2 }}>
                  {state.winner === 'draw' ? 'Draw' : state.winner ? `${state.winner} wins!` : `${state.currentPlayer}'s turn`}
                </div>
              </div>
              <button
                onClick={copyShareLink}
                style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)', background: 'var(--mdd-card)', color: INK, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {copied ? '✓ Link copied' : '🔗 Share watch link'}
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: 11.5, color: MUTED, marginTop: 18, lineHeight: 1.5 }}>
              You&apos;re watching this duel as a spectator. You can&apos;t make moves.<br />
              Share this URL — anyone can watch live, no wallet required.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
