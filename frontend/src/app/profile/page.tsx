'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { useRanking } from '@/hooks/useRanking'
import { NavBar } from '@/components/layout/NavBar'
import { EditProfileModal, EditableProfile } from '@/components/profile/EditProfileModal'
import { fetchBadges, fetchHistory, type BadgeRow, type HistoryEntry } from '@/lib/api'
import { SkeletonBadgeGrid } from '@/components/ui/SkeletonRow'
import { useToast } from '@/components/ui/Toast'
import { IconFlame, IconMedal, StateIconWallet } from '@/components/ui/StateIcons'
import { CELO_EXPLORER, RANK_TIERS, START_POINTS, tierForPoints } from '@/lib/constants'

const PROFILE_STORAGE_PREFIX = 'mddProfile:'

function loadStoredProfile(addr: string | undefined, fallbackSeed: string): EditableProfile {
  if (typeof window === 'undefined' || !addr) return { displayName: '', bio: '', avatarSeed: fallbackSeed }
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_PREFIX + addr)
    if (!raw) return { displayName: '', bio: '', avatarSeed: fallbackSeed }
    const parsed = JSON.parse(raw) as Partial<EditableProfile>
    return {
      displayName: parsed.displayName ?? '',
      bio:         parsed.bio         ?? '',
      avatarSeed:  parsed.avatarSeed  ?? fallbackSeed,
    }
  } catch {
    return { displayName: '', bio: '', avatarSeed: fallbackSeed }
  }
}

function saveStoredProfile(addr: string, p: EditableProfile) {
  try { localStorage.setItem(PROFILE_STORAGE_PREFIX + addr, JSON.stringify(p)) } catch {}
}

const BLUE       = '#0071E3'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const GREEN      = '#34C759'
const GREEN_DARK = '#0A7A2D'
const RED        = '#FF3B30'
const BG = 'var(--mdd-bg)'

type Tab = 'badges' | 'history' | 'ranking'

const PROFILE = {
  addr:   '-',
  seed:   'default',
  joined: '-',
  wins:   0,
  losses: 0,
  draws:  0,
  rate:   0,
  streak: 0,
  best:   0,
}

// ── Helpers ───────────────────────────────────────────────────────────
function toMs(ts: number): number {
  return ts < 2_000_000_000 ? ts * 1000 : ts
}

function relativeTime(ts: number | null): string {
  if (!ts) return '-'
  const diffMs = Date.now() - toMs(ts)
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(toMs(ts)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function joinedLabel(ts: number): string {
  return new Date(toMs(ts)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function shortAddr(addr: string | null): string {
  if (!addr) return 'Unknown'
  if (addr.length <= 10) return addr
  return addr.slice(0, 4) + '…' + addr.slice(-4)
}

// ── Identicon ─────────────────────────────────────────────────────────
function Identicon({ seed, size = 56, radius = 14 }: { seed: string; size?: number; radius?: number }) {
  const { cells, color1, color2 } = useMemo(() => {
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
    let s = Math.abs(h) || 1
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    const hue1 = Math.floor(rand() * 360)
    const hue2 = (hue1 + 30 + Math.floor(rand() * 60)) % 360
    const grid: boolean[][] = []
    for (let y = 0; y < 5; y++) {
      const row: boolean[] = []
      for (let x = 0; x < 3; x++) row.push(rand() > 0.5)
      grid.push([...row, row[1], row[0]])
    }
    return { cells: grid, color1: `hsl(${hue1}, 70%, 55%)`, color2: `hsl(${hue2}, 75%, 45%)` }
  }, [seed])

  const cell = size / 6
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: `linear-gradient(135deg, ${color1}, ${color2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(5, ${cell}px)`, gridTemplateRows: `repeat(5, ${cell}px)` }}>
        {cells.flatMap((row, y) => row.map((on, x) => (
          <div key={`${x}-${y}`} style={{ width: cell, height: cell, background: on ? 'rgba(255,255,255,0.92)' : 'transparent', borderRadius: 1 }} />
        )))}
      </div>
    </div>
  )
}

// ── Rank ladder ───────────────────────────────────────────────────────
function RankLadder({ points }: { points: number }) {
  const current = tierForPoints(points)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[...RANK_TIERS].reverse().map(t => {
        const active = t.id === current.id
        const reached = points >= t.min
        return (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', borderRadius: 16,
              background: active ? 'var(--mdd-bg-soft)' : 'transparent',
              border: active ? `1.5px solid ${t.color}` : '0.5px solid rgba(0,0,0,0.06)',
              opacity: reached ? 1 : 0.5,
            }}
          >
            <span style={{ width: 14, height: 14, borderRadius: 7, background: t.color, flexShrink: 0, boxShadow: active ? `0 0 0 4px ${t.color}33` : 'none' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: INK }}>{t.label}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{t.min}+ points</div>
            </div>
            {active && (
              <span style={{ padding: '3px 10px', borderRadius: 999, background: t.color, color: '#fff', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {points} pts
              </span>
            )}
            {!active && reached && (
              <span style={{ fontSize: 12, fontWeight: 600, color: GREEN_DARK }}>✓</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { address } = useWallet()
  const { ranking } = useRanking(address)
  const toast = useToast()
  const [tab, setTab]     = useState<Tab>('history')
  const [profile, setProfile] = useState(PROFILE)
  const [editable, setEditable] = useState<EditableProfile>({ displayName: '', bio: '', avatarSeed: PROFILE.seed })
  const [editOpen, setEditOpen] = useState(false)
  const [badges, setBadges]     = useState<BadgeRow[]>([])
  const [badgesLoading, setBadgesLoading] = useState(false)
  const [historyRows, setHistoryRows] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const walletAddr = address
  const defaultSeed = walletAddr ? walletAddr.slice(0, 10) : PROFILE.seed

  // On-chain ranking drives the headline stats; fall back to defaults pre-connect.
  const points = ranking?.points ?? START_POINTS
  const tier   = tierForPoints(points)
  const wins   = ranking?.wins ?? profile.wins
  const losses = ranking?.losses ?? profile.losses
  const draws  = ranking?.draws ?? profile.draws
  const totalRanked = wins + losses + draws
  const winRate = totalRanked > 0 ? Math.round((wins / totalRanked) * 100) : 0

  useEffect(() => {
    if (!address) return
    const short = address.slice(0, 6) + '…' + address.slice(-4)
    setProfile(p => ({ ...p, addr: short, seed: address.slice(0, 10) }))
    setEditable(loadStoredProfile(address, address.slice(0, 10)))
  }, [address])

  function handleSaveProfile(next: EditableProfile) {
    setEditable(next)
    if (walletAddr) saveStoredProfile(walletAddr, next)
    setEditOpen(false)
    toast('Profile saved ✓', 'success')
  }

  // Fetch real badges for the connected wallet
  useEffect(() => {
    if (!walletAddr) { setBadges([]); return }
    let cancelled = false
    setBadgesLoading(true)
    fetchBadges(walletAddr)
      .then(b => { if (!cancelled) setBadges(b) })
      .catch(() => { if (!cancelled) setBadges([]) })
      .finally(() => { if (!cancelled) setBadgesLoading(false) })
    return () => { cancelled = true }
  }, [walletAddr])

  // Fetch match history - drives the History tab + streaks + joined date.
  useEffect(() => {
    if (!walletAddr) {
      setHistoryRows([])
      setProfile(p => ({ ...p, wins: 0, losses: 0, draws: 0, rate: 0, streak: 0, best: 0 }))
      return
    }
    let cancelled = false
    setHistoryLoading(true)
    fetchHistory(walletAddr, 200)
      .then(rows => {
        if (cancelled) return
        setHistoryRows(rows)

        const finished = rows.filter(r => r.result === 'win' || r.result === 'loss' || r.result === 'draw')
        const total    = finished.length
        const w        = finished.filter(r => r.result === 'win').length
        const l        = finished.filter(r => r.result === 'loss').length
        const d        = finished.filter(r => r.result === 'draw').length

        // history ordered newest-first
        let streak = 0
        for (const r of finished) {
          if (r.result === 'win') streak++
          else break
        }
        const chrono = [...finished].reverse()
        let best = 0, cur = 0
        for (const r of chrono) {
          cur = r.result === 'win' ? cur + 1 : 0
          best = Math.max(best, cur)
        }

        // oldest row = last element (rows are newest-first)
        const oldestTs = rows.length > 0 ? rows[rows.length - 1].createdAt : null

        setProfile(p => ({
          ...p,
          wins: w, losses: l, draws: d,
          rate:   total > 0 ? Math.round((w / total) * 100) : 0,
          streak, best,
          joined: oldestTs ? joinedLabel(oldestTs) : p.joined,
        }))
      })
      .catch(() => { /* keep last good values */ })
      .finally(() => { if (!cancelled) setHistoryLoading(false) })
    return () => { cancelled = true }
  }, [walletAddr])

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif", color: INK }}>

      <NavBar active="profile" />

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="page-content has-bottom-tab" style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 80px' }}>
        <div className="page-cols" style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

          {/* ── Sidebar ────────────────────────────────────────────── */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mobile-full"
            style={{ width: 300, flexShrink: 0 }}
          >
            <div style={{ background: 'var(--mdd-card)', borderRadius: 24, padding: '28px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Identicon seed={editable.avatarSeed || profile.seed} size={96} radius={22} />

              {editable.displayName && (
                <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.3, marginTop: 16, color: INK }}>
                  {editable.displayName}
                </div>
              )}

              <div style={{ fontSize: editable.displayName ? 13 : 17, fontWeight: editable.displayName ? 500 : 700, letterSpacing: -0.3, marginTop: editable.displayName ? 4 : 16, fontFamily: 'ui-monospace, Menlo, monospace', color: editable.displayName ? MUTED : INK }}>
                {profile.addr}
              </div>

              {editable.bio && (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.5, maxWidth: 240 }}>
                  {editable.bio}
                </p>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 999, background: `${tier.color}1A`, color: tier.color, fontSize: 12, fontWeight: 700 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: tier.color }} />
                  {tier.label} · {points} pts
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: '#E8F7EE', color: GREEN_DARK, fontSize: 11, fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: GREEN }} />
                  Celo
                </span>
                <span style={{ padding: '3px 9px', borderRadius: 999, background: 'var(--mdd-bg)', color: MUTED, fontSize: 11, fontWeight: 600 }}>
                  Joined {profile.joined}
                </span>
              </div>

              {/* Stats list */}
              <div style={{ width: '100%', marginTop: 22, paddingTop: 18, borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Rank Points',     value: `${points}`,                 color: tier.color },
                  { label: 'Wins / Losses',   value: `${wins} / ${losses}`,       color: INK },
                  { label: 'Draws',           value: String(draws),               color: MUTED },
                  { label: 'Win Rate',        value: `${winRate}%`,               color: BLUE },
                  { label: 'Current Streak',  value: profile.streak > 0 ? `${profile.streak} wins` : '-', color: '#FF6A00', flame: profile.streak > 0 },
                  { label: 'Best Streak',     value: `${profile.best} wins`,      color: INK },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: MUTED }}>{s.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: s.color, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {s.value}
                      {'flame' in s && s.flame && <IconFlame size={13} color="#FF6A00" />}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setEditOpen(true)}
                disabled={!walletAddr}
                style={{
                  appearance: 'none', border: 'none',
                  background: walletAddr ? BLUE : 'var(--mdd-card)',
                  color: walletAddr ? '#fff' : MUTED,
                  padding: '12px 14px', borderRadius: 14,
                  width: '100%', marginTop: 22,
                  fontSize: 13.5, fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: walletAddr ? 'pointer' : 'not-allowed',
                  boxShadow: walletAddr ? '0 4px 14px rgba(0,113,227,0.25)' : 'none',
                  transition: 'transform 120ms ease, box-shadow 160ms ease',
                  opacity: walletAddr ? 1 : 0.6,
                }}
                onMouseEnter={e => { if (walletAddr) e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                title={walletAddr ? 'Edit your profile' : 'Connect wallet to edit profile'}
              >
                {walletAddr ? 'Edit Profile' : 'Connect wallet to edit'}
              </button>
            </div>
          </motion.aside>

          <EditProfileModal
            open={editOpen}
            initial={editable}
            defaultSeed={defaultSeed}
            onClose={() => setEditOpen(false)}
            onSave={handleSaveProfile}
          />

          {/* ── Main ───────────────────────────────────────────────── */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            {/* Tab control */}
            <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 10, width: 'fit-content' }}>
              {([['badges', 'Badges'], ['history', 'Match History'], ['ranking', 'Ranking']] as [Tab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{ appearance: 'none', border: 'none', padding: '7px 18px', borderRadius: 8, background: tab === id ? 'var(--mdd-card)' : 'transparent', color: tab === id ? INK : MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: tab === id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 120ms ease' }}
                >
                  {label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">

              {/* ── Badges ─────────────────────────────────────────── */}
              {tab === 'badges' && (
                <motion.div key="badges" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                  style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '26px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>Achievements</span>
                    <span style={{ fontSize: 12, color: MUTED }}>{badges.length} earned</span>
                  </div>

                  {!walletAddr ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                      <StateIconWallet size={56} />
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Connect wallet to see your badges</div>
                    </div>
                  ) : badgesLoading ? (
                    <SkeletonBadgeGrid count={6} />
                  ) : badges.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                      <IconMedal size={24} />
                      <div style={{ fontSize: 14, fontWeight: 600 }}>No badges yet</div>
                      <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4, maxWidth: 340, margin: '4px auto 0', lineHeight: 1.5 }}>
                        Win your first ranked match to earn the <strong>First Blood</strong> badge.
                      </div>
                    </div>
                  ) : (
                    <div className="badge-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px 14px' }}>
                      {badges.map(b => (
                        <div
                          key={b.id}
                          title={b.description}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
                        >
                          <div style={{ width: 72, height: 72, borderRadius: 18, position: 'relative', overflow: 'hidden', boxShadow: '0 6px 16px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                            {b.image && b.image.startsWith('data:') ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={b.image} alt={b.name} style={{ width: '100%', height: '100%' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: '#9B5DE5' }} />
                            )}
                          </div>
                          <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: INK }}>{b.name}</div>
                            <div style={{ fontSize: 10.5, color: MUTED, marginTop: 2 }}>
                              {relativeTime(b.earnedAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Match History ───────────────────────────────────── */}
              {tab === 'history' && (
                <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                  className="table-scroll"
                  style={{ background: 'var(--mdd-card)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}
                >
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ width: 40, fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>Result</div>
                    <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, paddingLeft: 12 }}>Opponent · Mode</div>
                    <div style={{ width: 110, textAlign: 'right', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>Points</div>
                    <div style={{ width: 90, textAlign: 'right', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>When</div>
                  </div>

                  {!walletAddr ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <StateIconWallet size={48} />
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>Connect wallet to see match history</div>
                    </div>
                  ) : historyLoading ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: MUTED, fontSize: 13 }}>Loading…</div>
                  ) : historyRows.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>No matches yet</div>
                      <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>Play your first game to see history here.</div>
                    </div>
                  ) : (
                    historyRows.map((m, i) => {
                      const isWin  = m.result === 'win'
                      const isDraw = m.result === 'draw'
                      const isPending = m.result === 'pending'
                      const label  = isPending ? '…' : isWin ? 'W' : isDraw ? 'D' : 'L'
                      const bg     = isWin ? '#E8F7EE' : isDraw ? '#E5F0FD' : isPending ? '#FFF4E0' : '#FDECEB'
                      const fg     = isWin ? '#0A7A2D' : isDraw ? BLUE : isPending ? '#8A5A00' : '#A81C13'
                      const deltaColor = m.pointsDelta > 0 ? GREEN_DARK : m.pointsDelta < 0 ? RED : MUTED
                      const deltaText  = isPending ? '-'
                        : !m.ranked ? '0'
                        : m.pointsDelta > 0 ? `+${m.pointsDelta}`
                        : m.pointsDelta < 0 ? `−${Math.abs(m.pointsDelta)}`
                        : '±0'
                      return (
                        <div
                          key={m.matchId}
                          style={{ display: 'flex', alignItems: 'center', padding: '13px 20px', background: i % 2 === 1 ? 'var(--mdd-card-alt)' : 'transparent', borderBottom: i < historyRows.length - 1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none', transition: 'background 120ms ease', cursor: 'default' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--mdd-bg-soft)')}
                          onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'var(--mdd-card-alt)' : 'transparent')}
                        >
                          <div style={{ width: 40, display: 'flex' }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                              {label}
                            </div>
                          </div>
                          <div style={{ flex: 1, paddingLeft: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13.5, fontWeight: 600, color: INK }}>vs {shortAddr(m.opponent)}</span>
                              <span style={{ padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', background: m.ranked ? '#E5F0FD' : 'var(--mdd-bg)', color: m.ranked ? BLUE : MUTED }}>
                                {m.ranked ? 'Ranked' : 'Casual'}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: MUTED, marginTop: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{m.mode}</span>
                              {m.txHash && (
                                <a href={`${CELO_EXPLORER}/tx/${m.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>
                                  Celoscan ↗
                                </a>
                              )}
                            </div>
                          </div>
                          <div style={{ width: 110, textAlign: 'right', fontSize: 14, fontWeight: 600, color: isPending || !m.ranked ? MUTED : deltaColor, fontVariantNumeric: 'tabular-nums' }}>
                            {deltaText}{!isPending && m.ranked ? ' pts' : ''}
                          </div>
                          <div style={{ width: 90, textAlign: 'right', fontSize: 12.5, color: MUTED }}>{relativeTime(m.finishedAt ?? m.createdAt)}</div>
                        </div>
                      )
                    })
                  )}
                </motion.div>
              )}

              {/* ── Ranking ─────────────────────────────────────────── */}
              {tab === 'ranking' && (
                <motion.div key="ranking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  {/* Headline */}
                  <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      <span style={{ width: 16, height: 16, borderRadius: 8, background: tier.color, display: 'inline-block' }} />
                      Current Rank
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1, marginTop: 6, fontVariantNumeric: 'tabular-nums', color: tier.color }}>
                      {tier.label} <span style={{ fontSize: 16, color: MUTED, fontWeight: 600 }}>· {points} pts</span>
                    </div>
                    <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
                      <div><div style={{ fontSize: 18, fontWeight: 700, color: GREEN_DARK }}>{wins}</div><div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.3 }}>Wins</div></div>
                      <div><div style={{ fontSize: 18, fontWeight: 700, color: RED }}>{losses}</div><div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.3 }}>Losses</div></div>
                      <div><div style={{ fontSize: 18, fontWeight: 700, color: MUTED }}>{draws}</div><div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.3 }}>Draws</div></div>
                      <div><div style={{ fontSize: 18, fontWeight: 700, color: BLUE }}>{winRate}%</div><div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.3 }}>Win Rate</div></div>
                    </div>
                    {!ranking?.exists && walletAddr && (
                      <div style={{ fontSize: 12.5, color: MUTED, marginTop: 14 }}>Play a ranked match to register on the Celo ladder. New players start at {START_POINTS} points.</div>
                    )}
                  </div>

                  {/* Ladder */}
                  <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Rank Ladder</div>
                    <RankLadder points={points} />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.main>
        </div>
      </div>
      <style>{`
        @media (max-width: 767px) {
          .badge-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .profile-history-row { min-width: 420px; }
          .profile-history-header { min-width: 420px; }
        }
      `}</style>
    </div>
  )
}
