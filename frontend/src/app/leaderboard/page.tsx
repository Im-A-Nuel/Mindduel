'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { NavBar } from '@/components/layout/NavBar'
import { fetchLeaderboard } from '@/lib/api'
import { SkeletonRows } from '@/components/ui/SkeletonRow'
import { StateIconAlert, StateIconTrophy, IconFlame } from '@/components/ui/StateIcons'

const BLUE       = '#0071E3'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const GREEN      = '#34C759'
const GREEN_DARK = '#0A7A2D'
const RED        = '#FF3B30'
const BG = 'var(--mdd-bg)'

type Period = 'alltime' | 'week' | 'today'

interface LeaderboardRow {
  rank: number
  addr: string
  wins: number
  sol: number
  rate: number
  streak: number
  self: boolean
}

function Identicon({ seed, size = 40, radius = 10 }: { seed: string; size?: number; radius?: number }) {
  const { cells, color1, color2 } = useMemo(() => {
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
    let s = Math.abs(h) || 1
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    const hue1 = Math.floor(rand() * 360)
    const hue2 = (hue1 + 30 + Math.floor(rand() * 60)) % 360
    const grid = []
    for (let y = 0; y < 5; y++) {
      const row: boolean[] = []
      for (let x = 0; x < 3; x++) row.push(rand() > 0.5)
      grid.push([...row, row[1], row[0]])
    }
    return { cells: grid, color1: `hsl(${hue1}, 70%, 55%)`, color2: `hsl(${hue2}, 75%, 45%)` }
  }, [seed])

  const cell = size / 6
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: `linear-gradient(135deg, ${color1}, ${color2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(5, ${cell}px)`, gridTemplateRows: `repeat(5, ${cell}px)` }}>
        {cells.flatMap((row, y) => row.map((on, x) => (
          <div key={`${x}-${y}`} style={{ width: cell, height: cell, background: on ? 'rgba(255,255,255,0.92)' : 'transparent', borderRadius: 1 }} />
        )))}
      </div>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, { bg: string; color: string; label: string }> = {
    1: { bg: 'linear-gradient(135deg, #FFD700, #E8B800)', color: '#7A5A00', label: '🥇' },
    2: { bg: 'linear-gradient(135deg, #E8E8E8, #C0C0C0)', color: '#555',    label: '🥈' },
    3: { bg: 'linear-gradient(135deg, #F0A060, #CD7F32)', color: '#6B3A00', label: '🥉' },
  }
  if (medals[rank]) {
    return (
      <div style={{ width: 32, height: 32, borderRadius: 10, background: medals[rank].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
        {medals[rank].label}
      </div>
    )
  }
  return (
    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--mdd-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>{rank}</span>
    </div>
  )
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('alltime')
  const [apiRows, setApiRows] = useState<LeaderboardRow[] | null>(null)
  const [fetchState, setFetchState] = useState<'loading' | 'loaded' | 'error'>('loading')

  useEffect(() => {
    setFetchState('loading')
    fetchLeaderboard(period)
      .then(data => {
        setApiRows(data.entries.map(e => ({
          rank: e.rank,
          addr: e.address,
          wins: e.wins,
          sol: e.solEarned,
          rate: e.winRate,
          streak: 0,
          self: false,
        })))
        setFetchState('loaded')
      })
      .catch(() => {
        setApiRows(null)
        setFetchState('error')
      })
  }, [period])

  const rows = apiRows ?? []
  const isEmpty = fetchState === 'loaded' && rows.length === 0

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif", color: INK }}>

      <NavBar active="leaderboard" />

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="page-content has-bottom-tab" style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 80px' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, margin: 0 }}>Leaderboard</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 999, background: '#E8F7EE' }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: GREEN, animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: GREEN_DARK, letterSpacing: 0.3 }}>LIVE</span>
              </div>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: MUTED }}>Top players ranked by total wins</p>
          </div>

          {/* Period filter */}
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 10 }}>
            {([['alltime', 'All Time'], ['week', 'This Week'], ['today', 'Today']] as [Period, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setPeriod(id)}
                style={{ appearance: 'none', border: 'none', padding: '7px 14px', borderRadius: 8, background: period === id ? 'var(--mdd-card)' : 'transparent', color: period === id ? INK : MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: period === id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 120ms ease' }}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Loading / empty / error states */}
        {fetchState === 'loading' && (
          <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '20px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', marginBottom: 28 }}>
            <SkeletonRows rows={6} gap={4} />
          </div>
        )}
        {fetchState === 'error' && (
          <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '60px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', marginBottom: 28 }}>
            <StateIconAlert />
            <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>Couldn&apos;t load leaderboard</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Backend stats service is unreachable.</div>
          </div>
        )}
        {isEmpty && (
          <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '60px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', marginBottom: 28 }}>
            <StateIconTrophy />
            <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>No rankings yet</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 4, maxWidth: 320, margin: '4px auto 0' }}>Be the first to win a match — your wallet will appear at the top of the all-time leaderboard.</div>
          </div>
        )}

        {/* Podium (top 3) */}
        {rows.length >= 3 && <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="lb-podium"
          style={{ display: 'flex', gap: 16, marginBottom: 28, alignItems: 'flex-end' }}
        >
          {rows.slice(0, 3).map((entry, i) => {
            const podiumOrder = [1, 0, 2]
            const e = rows[podiumOrder[i]]
            const accentBgs = [
              'linear-gradient(135deg, #E8E8E8, #D4D4D4)',
              'linear-gradient(135deg, #FFD700 0%, #E8B800 100%)',
              'linear-gradient(135deg, #F0A060, #CD7F32)',
            ]
            const labels = ['2nd', '1st', '3rd']
            const isFirst = podiumOrder[i] === 0
            const podiumPaddingTop = [24, 40, 16][i]
            return (
              <motion.div
                key={e.rank}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className={`lb-podium-card ${isFirst ? 'is-first' : ''}`}
                style={{ flex: 1, minWidth: 0, background: e.self ? '#EEF5FF' : 'var(--mdd-card)', borderRadius: 20, paddingTop: podiumPaddingTop, paddingRight: 14, paddingBottom: 20, paddingLeft: 14, boxShadow: e.self ? `0 1px 3px rgba(0,0,0,0.04), 0 0 0 2px ${BLUE}` : '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 0.4, textTransform: 'uppercase' }}>{labels[i]}</div>
                <div style={{ position: 'relative' }}>
                  <Identicon seed={e.addr} size={isFirst ? 60 : 48} radius={isFirst ? 15 : 12} />
                  <div style={{ position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: 7, background: accentBgs[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, boxShadow: '0 2px 4px rgba(0,0,0,0.12)' }}>
                    {e.rank}
                  </div>
                </div>
                <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, fontWeight: 600, color: INK, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.addr}</div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5, color: isFirst ? '#7A5A00' : INK, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{e.wins}<span style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginLeft: 4 }}>wins</span></div>
                {e.self && <div style={{ fontSize: 10, fontWeight: 700, color: BLUE, letterSpacing: 0.3, textTransform: 'uppercase' }}>You</div>}
              </motion.div>
            )
          })}
        </motion.div>}

        {/* Full table */}
        {rows.length > 0 && <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="table-scroll"
          style={{ background: 'var(--mdd-card)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}
        >
          {/* Table header */}
          <div className="lb-table-row" style={{ display: 'flex', alignItems: 'center', padding: '14px 20px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
            <div style={{ width: 44, fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>#</div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>Player</div>
            <div style={{ width: 70, textAlign: 'right', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>Wins</div>
            <div style={{ width: 100, textAlign: 'right', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0, whiteSpace: 'nowrap' }}>SOL</div>
            <div className="lb-col-winrate" style={{ width: 90, textAlign: 'right', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0, whiteSpace: 'nowrap' }}>Win Rate</div>
            <div className="lb-col-streak" style={{ width: 80, textAlign: 'right', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>Streak</div>
          </div>

          {rows.map((entry, i) => (
            <motion.div
              key={entry.addr}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.12 + i * 0.03 }}
              className="lb-table-row"
              style={{ display: 'flex', alignItems: 'center', padding: '13px 20px', background: entry.self ? '#EEF5FF' : i % 2 === 1 ? 'var(--mdd-card-alt)' : 'transparent', borderBottom: i < rows.length - 1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none', transition: 'background 120ms ease' }}
              onMouseEnter={e => { if (!entry.self) (e.currentTarget as HTMLDivElement).style.background = 'var(--mdd-bg-soft)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = entry.self ? '#EEF5FF' : i % 2 === 1 ? 'var(--mdd-card-alt)' : 'transparent' }}
            >
              {/* Rank */}
              <div style={{ width: 44, display: 'flex', flexShrink: 0 }}>
                <RankBadge rank={entry.rank} />
              </div>

              {/* Player */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Identicon seed={entry.addr} size={32} radius={8} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, fontWeight: 600, color: INK, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.addr}</span>
                    {entry.self && <span style={{ fontSize: 10, fontWeight: 700, color: BLUE, background: '#E5F0FD', padding: '2px 6px', borderRadius: 999, letterSpacing: 0.3, flexShrink: 0 }}>YOU</span>}
                  </div>
                </div>
              </div>

              {/* Wins */}
              <div style={{ width: 70, textAlign: 'right', fontSize: 14, fontWeight: 600, color: INK, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{entry.wins}</div>

              {/* SOL */}
              <div style={{ width: 100, textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: GREEN_DARK, fontVariantNumeric: 'tabular-nums', flexShrink: 0, whiteSpace: 'nowrap' }}>{entry.sol.toFixed(2)} SOL</div>

              {/* Win Rate */}
              <div className="lb-col-winrate" style={{ width: 90, textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: entry.rate >= 70 ? GREEN_DARK : entry.rate >= 60 ? BLUE : MUTED, fontVariantNumeric: 'tabular-nums' }}>{entry.rate}%</span>
                  <div style={{ width: 48, height: 3, borderRadius: 2, background: '#E5E5EA', overflow: 'hidden' }}>
                    <div style={{ width: `${entry.rate}%`, height: '100%', background: entry.rate >= 70 ? GREEN : entry.rate >= 60 ? BLUE : MUTED, borderRadius: 2 }} />
                  </div>
                </div>
              </div>

              {/* Streak */}
              <div className="lb-col-streak" style={{ width: 80, textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: entry.streak >= 5 ? '#FF6A00' : entry.streak > 0 ? INK : MUTED, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {entry.streak > 0 ? <span style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>{entry.streak}<IconFlame size={13} color="#FF6A00" /></span> : '—'}
              </div>
            </motion.div>
          ))}
        </motion.div>}

        {/* Footer note */}
        {rows.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginTop: 24 }}>
            Rankings derived from settled on-chain matches · Devnet
          </p>
        )}
      </div>

    </div>
  )
}
