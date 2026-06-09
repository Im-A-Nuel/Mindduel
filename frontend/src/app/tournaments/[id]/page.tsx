'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { NavBar } from '@/components/layout/NavBar'
import { getTournamentDetail, type TournamentSummary, type BracketEntry } from '@/lib/api'
import { StateIconAlert, IconTrophySm } from '@/components/ui/StateIcons'

const BLUE  = '#0071E3'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const GREEN_DARK = '#0A7A2D'
const BG = 'var(--mdd-bg)'

function shortAddr(a: string | null): string {
  if (!a) return '—'
  if (a.length <= 9) return a
  return a.slice(0, 4) + '…' + a.slice(-4)
}

export default function BracketViewPage({ params }: { params: { id: string } }) {
  const [tournament, setTournament] = useState<TournamentSummary | null>(null)
  const [bracket, setBracket]       = useState<BracketEntry[] | null>(null)
  const [error, setError]           = useState<string | null>(null)

  async function load() {
    try {
      const data = await getTournamentDetail(params.id)
      setTournament(data.tournament)
      setBracket(data.bracket)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 8000)
    return () => clearInterval(id)
  }, [params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const rounds = bracket
    ? Array.from(new Set(bracket.map(b => b.round))).sort((a, b) => a - b)
    : []

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif", color: INK }}>
      <NavBar active="play" />

      <div className="page-content has-bottom-tab" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        <Link href="/tournaments" style={{ fontSize: 12, color: MUTED, textDecoration: 'none' }}>← All tournaments</Link>

        {error ? (
          <div style={{ background: 'var(--mdd-card)', borderRadius: 16, padding: 48, marginTop: 16, textAlign: 'center' }}>
            <StateIconAlert />
            <div style={{ fontSize: 15, fontWeight: 600 }}>{error}</div>
          </div>
        ) : !tournament || !bracket ? (
          <div style={{ background: 'var(--mdd-card)', borderRadius: 16, padding: 48, marginTop: 16, textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${BLUE}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            <div style={{ fontSize: 13, color: MUTED }}>Loading bracket…</div>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              style={{ marginTop: 12, marginBottom: 24 }}
            >
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, margin: '0 0 4px' }}>{tournament.name}</h1>
              <p style={{ margin: 0, fontSize: 13.5, color: MUTED }}>
                {tournament.size} players · {tournament.stake} {tournament.currency.toUpperCase()} · {tournament.mode}
                <span style={{ marginLeft: 10, padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: tournament.status === 'finished' ? '#E8F7EE' : '#E5F0FD', color: tournament.status === 'finished' ? GREEN_DARK : BLUE }}>
                  {tournament.status === 'finished' ? <><IconTrophySm size={12} color="#8A5A00" />FINISHED</> : tournament.status === 'in_progress' ? 'LIVE' : 'OPEN'}
                </span>
              </p>
              {tournament.champion && (
                <div style={{ marginTop: 14, padding: '12px 16px', background: 'linear-gradient(135deg, #FFD700, #E8B800)', borderRadius: 12, color: '#7A5A00', fontWeight: 700, fontSize: 14, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  <IconTrophySm size={14} color="#8A5A00" />Champion: {shortAddr(tournament.champion)}
                </div>
              )}
            </motion.div>

            <div style={{ position: 'relative' }}>
              <div className="bracket-swipe-hint" style={{ display: 'none', fontSize: 11, fontWeight: 600, color: MUTED, padding: '0 4px 8px', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                Swipe horizontally to see all rounds
              </div>
              <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'flex', gap: 32, minWidth: 'max-content', alignItems: 'stretch' }}>
                {rounds.map(r => (
                  <div key={r} style={{ display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'space-around', minWidth: 200 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' }}>
                      {r === rounds[rounds.length - 1] ? 'Final' : r === rounds[rounds.length - 2] ? 'Semis' : `Round ${r + 1}`}
                    </div>
                    {bracket.filter(b => b.round === r).sort((a, b) => a.position - b.position).map(b => (
                      <BracketCard key={b.bracketId} entry={b} />
                    ))}
                  </div>
                ))}
              </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function BracketCard({ entry }: { entry: BracketEntry }) {
  const winnerHighlight = (player: string | null) => entry.winner && entry.winner === player
  const loserDim = (player: string | null) => entry.winner && entry.winner !== player && player !== null

  function rowStyle(player: string | null): React.CSSProperties {
    return {
      padding: '8px 12px', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, fontWeight: 600,
      color: winnerHighlight(player) ? GREEN_DARK : loserDim(player) ? '#9999A0' : INK,
      background: winnerHighlight(player) ? '#E8F7EE' : 'transparent',
      borderBottom: '0.5px solid rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }
  }

  return (
    <div style={{
      background: 'var(--mdd-card)', borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
      minWidth: 200,
    }}>
      <div style={rowStyle(entry.playerOne)}>
        <span>{shortAddr(entry.playerOne)}</span>
        {winnerHighlight(entry.playerOne) && <span style={{ fontSize: 11, color: GREEN_DARK }}>✓</span>}
      </div>
      <div style={rowStyle(entry.playerTwo)}>
        <span>{shortAddr(entry.playerTwo)}</span>
        {winnerHighlight(entry.playerTwo) && <span style={{ fontSize: 11, color: GREEN_DARK }}>✓</span>}
      </div>
      {entry.matchId && (
        <Link href={`/spectate/${entry.matchId}`} style={{ display: 'block', padding: '6px 12px', fontSize: 10.5, color: BLUE, textDecoration: 'none', fontWeight: 600, textAlign: 'center', background: '#F5F8FF' }}>
          Watch live →
        </Link>
      )}
      {!entry.matchId && entry.status === 'pending' && (
        <div style={{ padding: '6px 12px', fontSize: 10.5, color: MUTED, textAlign: 'center', background: 'var(--mdd-card-alt)' }}>
          Waiting for opponents…
        </div>
      )}
    </div>
  )
}
