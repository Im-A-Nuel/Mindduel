'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import { NavBar } from '@/components/layout/NavBar'
import { fetchHistory, type HistoryEntry } from '@/lib/api'
import { SkeletonRows } from '@/components/ui/SkeletonRow'
import { StateIconAlert, StateIconWallet } from '@/components/ui/StateIcons'

const BLUE       = '#0071E3'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const GREEN_DARK = '#0A7A2D'
const RED        = '#FF3B30'
const BG = 'var(--mdd-bg)'

type ResultFilter = 'all' | 'wins' | 'losses'
type ModeFilter   = 'all' | 'classic' | 'shifting' | 'vsai' | 'blitz'

interface Match {
  opp: string
  mode: string
  modeId: ModeFilter
  win: boolean
  delta: number
  currency: 'sol' | 'usdc'
  date: string
  questions: number
  correct: number
  pending?: boolean
}

function shortAddr(a: string | null): string {
  if (!a) return '—'
  if (a.length <= 9) return a
  return a.slice(0, 4) + '…' + a.slice(-4)
}

function formatDate(ts: number): string {
  const diffMs = Date.now() - ts
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function modeIdOf(mode: string): ModeFilter {
  if (mode === 'vs-ai') return 'vsai'
  if (mode === 'shifting') return 'shifting'
  if (mode === 'scaleup') return 'classic'
  if (mode === 'blitz') return 'blitz'
  return 'classic'
}

function modeLabelOf(mode: string): string {
  if (mode === 'vs-ai') return 'vs AI'
  if (mode === 'shifting') return 'Shifting Board'
  if (mode === 'scaleup') return 'Scale Up'
  if (mode === 'blitz') return 'Blitz'
  return 'Classic Duel'
}

function entryToMatch(e: HistoryEntry, myWallet: string): Match {
  return {
    opp:       shortAddr(e.opponent),
    mode:      modeLabelOf(e.mode),
    modeId:    modeIdOf(e.mode),
    win:       e.result === 'win',
    delta:     e.delta,
    currency:  e.currency,
    date:      formatDate(e.finishedAt ?? e.createdAt),
    questions: 0, // not tracked in DB
    correct:   0,
    pending:   e.result === 'pending',
  }
}

function StatCard({ value, unit, label, accent }: { value: string; unit?: string; label: string; accent?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: 'var(--mdd-card)', borderRadius: 16, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, color: accent ?? INK, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6 }}>{value}</span>
        {unit && <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, letterSpacing: 0.3 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginTop: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
    </div>
  )
}

function AccuracyBar({ correct, total }: { correct: number; total: number }) {
  const pct = total > 0 ? (correct / total) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 40, height: 3, borderRadius: 2, background: '#E5E5EA', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#34C759' : pct >= 50 ? BLUE : RED, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>{correct}/{total}</span>
    </div>
  )
}

export default function HistoryPage() {
  const { publicKey } = useWallet()
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [modeFilter, setModeFilter]     = useState<ModeFilter>('all')
  const [matches, setMatches]           = useState<Match[]>([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    if (!publicKey) {
      setMatches([])
      return
    }
    const addr = publicKey.toBase58()
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchHistory(addr, 100)
      .then(list => {
        if (cancelled) return
        setMatches(list.map(e => entryToMatch(e, addr)))
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load history')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [publicKey])

  const filtered = matches.filter(m => {
    if (resultFilter === 'wins'   && !m.win) return false
    if (resultFilter === 'losses' &&  m.win) return false
    if (modeFilter !== 'all' && m.modeId !== modeFilter) return false
    return true
  })

  const totalMatches = matches.length
  const wins         = matches.filter(m => m.win).length
  const winRate      = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
  const solEarned    = matches.filter(m => m.delta > 0 && m.currency === 'sol').reduce((acc, m) => acc + m.delta, 0)
  const usdcEarned   = matches.filter(m => m.delta > 0 && m.currency === 'usdc').reduce((acc, m) => acc + m.delta, 0)
  const bestStreak   = (() => {
    let best = 0, cur = 0
    for (const m of matches) { cur = m.win ? cur + 1 : 0; best = Math.max(best, cur) }
    return best
  })()

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif", color: INK }}>

      <NavBar active="history" />

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="page-content has-bottom-tab" style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 80px' }}>

        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 24 }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, margin: '0 0 4px' }}>Match History</h1>
          <p style={{ margin: 0, fontSize: 14, color: MUTED }}>All your duels, wins, and losses</p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="stat-grid-4"
          style={{ display: 'flex', gap: 14, marginBottom: 28 }}
        >
          <StatCard value={String(totalMatches)} label="Total Matches" />
          <StatCard value={`${winRate}%`}        label="Win Rate"      accent={BLUE} />
          <StatCard value={`${solEarned.toFixed(3)}`}  unit="SOL"  label="SOL Earned"  accent="#9945FF" />
          <StatCard value={`${usdcEarned.toFixed(2)}`} unit="USDC" label="USDC Earned" accent="#2775CA" />
          <StatCard value={`${bestStreak}`}      unit="wins" label="Best Streak"  accent="#FF6A00" />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}
        >
          {/* Result filter */}
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 10 }}>
            {([['all', 'All'], ['wins', 'Wins'], ['losses', 'Losses']] as [ResultFilter, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setResultFilter(id)}
                style={{ appearance: 'none', border: 'none', padding: '7px 14px', borderRadius: 8, background: resultFilter === id ? 'var(--mdd-card)' : 'transparent', color: resultFilter === id ? INK : MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: resultFilter === id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 120ms ease' }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ width: 0.5, height: 28, background: 'rgba(0,0,0,0.1)' }} />

          {/* Mode filter */}
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 10 }}>
            {([['all', 'All Modes'], ['classic', 'Classic'], ['shifting', 'Shifting'], ['vsai', 'vs AI'], ['blitz', 'Blitz']] as [ModeFilter, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setModeFilter(id)}
                style={{ appearance: 'none', border: 'none', padding: '7px 12px', borderRadius: 8, background: modeFilter === id ? 'var(--mdd-card)' : 'transparent', color: modeFilter === id ? INK : MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: modeFilter === id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 120ms ease' }}
              >
                {label}
              </button>
            ))}
          </div>

          <span style={{ fontSize: 13, color: MUTED, marginLeft: 'auto' }}>{filtered.length} match{filtered.length !== 1 ? 'es' : ''}</span>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="table-scroll"
          style={{ background: 'var(--mdd-card)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}
        >
          {/* Table header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', minWidth: 380 }}>
            <div style={{ width: 40, fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>Result</div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, paddingLeft: 12 }}>Opponent · Mode</div>
            <div style={{ width: 100, textAlign: 'right', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>Δ Stake</div>
            <div style={{ width: 90, textAlign: 'right', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>When</div>
          </div>

          <AnimatePresence mode="popLayout">
            {!publicKey ? (
              <motion.div
                key="no-wallet"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ padding: '48px 20px', textAlign: 'center' }}
              >
                <StateIconWallet />
                <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>Connect your wallet</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Match history is tied to your wallet address.</div>
              </motion.div>
            ) : loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ padding: '8px 4px 12px' }}
              >
                <SkeletonRows rows={6} gap={6} />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ padding: '48px 20px', textAlign: 'center' }}
              >
                <StateIconAlert />
                <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>Couldn&apos;t load history</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{error}</div>
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ padding: '48px 20px', textAlign: 'center' }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 16, background: '#E5F0FD', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="6" y1="3" x2="6" y2="21"/>
                    <line x1="18" y1="3" x2="18" y2="21"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                    <path d="M7 7l4 4M11 7l-4 4" strokeOpacity="0.55"/>
                    <circle cx="17" cy="17" r="2.2" strokeOpacity="0.55"/>
                  </svg>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>{matches.length === 0 ? 'No matches yet' : 'No matches found'}</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{matches.length === 0 ? 'Create or join a match to start your history.' : 'Try adjusting the filters'}</div>
              </motion.div>
            ) : (
              filtered.map((m, i) => (
                <motion.div
                  key={`${m.opp}-${m.date}-${i}`}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', minWidth: 380, background: i % 2 === 1 ? 'var(--mdd-card-alt)' : 'transparent', borderBottom: i < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none', cursor: 'default', transition: 'background 120ms ease' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--mdd-bg-soft)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = i % 2 === 1 ? 'var(--mdd-card-alt)' : 'transparent' }}
                >
                  {/* Result badge */}
                  <div style={{ width: 40, display: 'flex', flexShrink: 0 }}>
                    {m.pending ? (
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#FFF4E0', color: '#8A5A00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>…</div>
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: m.win ? '#E8F7EE' : (m.delta === 0 ? 'var(--mdd-bg)' : '#FDECEB'), color: m.win ? '#0A7A2D' : (m.delta === 0 ? MUTED : '#A81C13'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                        {m.win ? 'W' : (m.delta === 0 ? 'D' : 'L')}
                      </div>
                    )}
                  </div>

                  {/* Opponent + mode */}
                  <div style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
                    <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13.5, fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>vs {m.opp}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{m.mode}</div>
                  </div>

                  {/* Δ */}
                  <div style={{ width: 100, textAlign: 'right', fontSize: 14, fontWeight: 600, color: m.delta > 0 ? GREEN_DARK : m.delta < 0 ? RED : MUTED, fontVariantNumeric: 'tabular-nums', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {m.pending ? '—' : m.delta > 0 ? `+${m.delta.toFixed(3)}` : m.delta < 0 ? `−${Math.abs(m.delta).toFixed(3)}` : '—'}
                  </div>

                  {/* When */}
                  <div style={{ width: 90, textAlign: 'right', fontSize: 12.5, color: MUTED, flexShrink: 0 }}>{m.date}</div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>

        {publicKey && filtered.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginTop: 20 }}>
            Showing {filtered.length} of {matches.length} matches
          </p>
        )}
      </div>
    </div>
  )
}
