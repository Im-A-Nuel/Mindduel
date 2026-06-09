'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { WalletButton } from '@/components/wallet/WalletButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { IconRobot, IconCrosshair, IconBolt, IconHandshake } from '@/components/ui/StateIcons'

const BLUE       = '#0071E3'
const RED        = '#FF3B30'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const GREEN      = '#34C759'
const GREEN_DARK = '#0A7A2D'
const BG = 'var(--mdd-bg)'

type ResultKind = 'win' | 'lose' | 'draw'

interface LogEntry { q: string; correct: boolean; time: number }

interface SessionMatchData {
  result:   ResultKind
  opponent: string
  mode:     string
  isVsAI:  boolean
  stake:    number
  currency?: 'sol' | 'usdc'
  log:      LogEntry[]
}


// ── Confetti ──────────────────────────────────────────────────────────
type ConfettiPiece = { left: number; top: number; rot: number; size: number; color: string; delay: number; dur: number }

function Confetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])
  useEffect(() => {
    setPieces(Array.from({ length: 36 }, (_, i) => ({
      left:  Math.random() * 100,
      top:   -(Math.random() * 30),
      rot:   Math.random() * 360,
      size:  6 + Math.random() * 8,
      color: ['#0071E3', '#34C759', '#FF9500', '#FF3B30', '#AF52DE'][i % 5],
      delay: Math.random() * 2.5,
      dur:   4 + Math.random() * 2,
    })))
  }, [])
  if (pieces.length === 0) return null
  return (
    <>
      <style>{`@keyframes cfFall { 0%{transform:translateY(-40px) rotate(0deg);opacity:0} 8%{opacity:1} 100%{transform:translateY(120vh) rotate(720deg);opacity:0} }`}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {pieces.map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size * 0.4, background: p.color, borderRadius: 2, transform: `rotate(${p.rot}deg)`, animation: `cfFall ${p.dur}s ${p.delay}s linear infinite` }} />
        ))}
      </div>
    </>
  )
}

// ── Result Icon ───────────────────────────────────────────────────────
function ResultIcon({ kind }: { kind: ResultKind }) {
  const iconBg    = kind === 'win' ? '#E8F7EE' : kind === 'draw' ? '#E5F0FD' : '#FDECEB'
  const circleBg  = kind === 'win' ? GREEN : kind === 'draw' ? BLUE : RED
  const glow      = kind === 'win' ? 'rgba(52,199,89,0.32)' : kind === 'draw' ? 'rgba(0,113,227,0.28)' : 'rgba(255,59,48,0.28)'
  return (
    <div style={{ width: 88, height: 88, borderRadius: 44, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
      <div style={{ width: 64, height: 64, borderRadius: 32, background: circleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${glow}` }}>
        {kind === 'win' ? (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 16.5L13.5 22L24 11" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : kind === 'draw' ? (
          <span style={{ fontSize: 28, color: '#fff', fontWeight: 700 }}>=</span>
        ) : (
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M8 8L20 20M20 8L8 20" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/></svg>
        )}
      </div>
    </div>
  )
}

// ── Result Row ────────────────────────────────────────────────────────
function ResultRow({ label, value, color, big, badge }: { label: string; value: string; color?: string; big?: boolean; badge?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
      <span style={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: big ? 18 : 14, fontWeight: big ? 700 : 600, color: color ?? INK, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: 6 }}>
        {value}{badge}
      </span>
    </div>
  )
}

// ── Match Stats Panel ─────────────────────────────────────────────────
function MatchStats({ log }: { log: LogEntry[] }) {
  const correct = log.filter(q => q.correct).length
  const total   = log.length
  const avg     = total > 0 ? (log.reduce((a, q) => a + q.time, 0) / total).toFixed(1) : '—'
  return (
    <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>Match Stats</span>
        <span style={{ fontSize: 12, color: MUTED }}>{correct}/{total} correct · avg {avg}s</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {log.map((q, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, background: q.correct ? '#E8F7EE' : '#FDECEB', color: q.correct ? GREEN_DARK : '#A81C13', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {q.correct ? '✓' : '✕'}
            </div>
            <span style={{ fontSize: 12, color: MUTED, fontWeight: 600, width: 22, fontVariantNumeric: 'tabular-nums' }}>Q{i + 1}</span>
            <span style={{ flex: 1, fontSize: 13, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.q}</span>
            <span style={{ fontSize: 12, color: q.time > 12 ? RED : MUTED, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{q.time}s</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Nav Logo ──────────────────────────────────────────────────────────
function NavLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Image src="/icon-192.png" alt="MindDuel" width={28} height={28} style={{ borderRadius: 8 }} />
      <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.4 }}>MindDuel</span>
    </div>
  )
}

// ── Result Content ────────────────────────────────────────────────────
function ResultContent({ kind, matchData }: { kind: ResultKind; matchData: SessionMatchData | null }) {
  const win  = kind === 'win'
  const draw = kind === 'draw'

  const opponent = matchData?.opponent ?? '—'
  const mode     = matchData?.mode ?? 'Classic Duel'
  const stake    = matchData?.stake ?? 0
  const log      = matchData?.log ?? []
  const currency = matchData?.currency ?? 'sol'
  const unit     = currency.toUpperCase()

  const potClaimed  = `+${(stake * 2 * 0.975).toFixed(3)} ${unit}`
  const platformFee = `−${(stake * 2 * 0.025).toFixed(4)} ${unit}`
  const stakeLost   = `−${stake.toFixed(3)} ${unit}`
  const splitAmount = `+${(stake * 0.975).toFixed(3)} ${unit}`
  const lostLabel   = `${unit} Lost`
  const returnedLabel = `${unit} Returned`

  const correct = log.filter(q => q.correct).length
  const total   = log.length

  const bgColor = win ? BG : draw ? '#EEF5FF' : '#EEEEF0'

  return (
    <div style={{ minHeight: '100vh', background: bgColor, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif", color: INK, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

      {win && <Confetti />}

      {/* Nav */}
      <nav className="glass-nav" style={{ height: 64, flexShrink: 0, zIndex: 2 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <NavLogo />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="has-bottom-tab" style={{ flex: 1, padding: '32px 20px', display: 'flex', justifyContent: 'center', gap: 24, position: 'relative', zIndex: 1, overflow: 'auto', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <div className="page-cols" style={{ width: '100%', maxWidth: 1100, display: 'flex', gap: 24, flexWrap: 'wrap' }}>

          {/* Left panel */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            {/* Hero */}
            <div style={{ textAlign: 'center', padding: '8px 0 6px' }}>
              <ResultIcon kind={kind} />
              <h1 style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1.5, margin: '18px 0 6px', lineHeight: 1.05 }}>
                {win ? 'You Won!' : draw ? "It's a Draw!" : 'You Lost'}
              </h1>
              <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>
                vs {opponent} · {mode} · {total} questions
              </p>
            </div>

            {/* Stats card */}
            <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '6px 22px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}>
              {win ? (
                <>
                  {stake > 0 && (
                    <>
                      <ResultRow label="Pot Claimed"  value={potClaimed}  color={GREEN_DARK} big />
                      <ResultRow label="Platform Fee" value={platformFee} color={MUTED} />
                    </>
                  )}
                  <ResultRow label="Correct" value={`${correct}/${total}`} />
                </>
              ) : draw ? (
                <>
                  {stake > 0 && (
                    <ResultRow label={returnedLabel} value={splitAmount} color={BLUE} big />
                  )}
                  <ResultRow label="Correct" value={`${correct}/${total}`} />
                </>
              ) : (
                <>
                  {stake > 0 && (
                    <ResultRow label={lostLabel} value={stakeLost} color={RED} big />
                  )}
                  <ResultRow label="Correct" value={`${correct}/${total}`} />
                </>
              )}
            </div>

            {/* Match Stats */}
            <MatchStats log={log} />

            {/* Epic banner (win-staked) / Practice banner (win-free) / Draw / Lose banner */}
            {win && stake > 0 ? (
              <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '18px 22px', border: '1.5px solid #E8B844', boxShadow: '0 6px 20px rgba(232,184,68,0.15)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <IconBolt size={24} color="#fff" bg="linear-gradient(135deg, #FFD66B, #E8B844)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>Epic Game!</div>
                  <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.4, marginTop: 2 }}>This match scored high on drama. Mint it as an NFT.</div>
                </div>
                <button style={{ appearance: 'none', border: 'none', padding: '10px 16px', background: 'var(--mdd-dark-surface)', color: '#fff', borderRadius: 12, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Mint for 0.01 SOL</button>
                <button style={{ appearance: 'none', border: 'none', background: 'transparent', color: MUTED, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Skip</button>
              </div>
            ) : win ? (
              <div style={{ background: '#E5F0FD', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                {matchData?.isVsAI
                  ? <IconRobot size={20} color="#0071E3" bg="var(--mdd-card)" />
                  : <IconCrosshair size={20} color="#0071E3" bg="var(--mdd-card)" />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{matchData?.isVsAI ? 'Practice round won!' : 'Free play victory!'}</div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>Try a real staked match for SOL/USDC rewards.</div>
                </div>
              </div>
            ) : draw ? (
              <div style={{ background: '#E5F0FD', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <IconHandshake size={20} color="#0071E3" bg="var(--mdd-card)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>Evenly matched!</div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{stake > 0 ? `Your ${unit} has been returned.` : 'Practice round tied.'} Challenge them again to settle the score.</div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#E5F0FD', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--mdd-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none"><path d="M9 2L11 6.5L16 7L12.5 10.5L13.5 15.5L9 13L4.5 15.5L5.5 10.5L2 7L7 6.5L9 2Z" fill={BLUE}/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>You answered {correct} of {total} correctly</div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>Top 30% performance for this match. The questions get easier with practice.</div>
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className={win || draw ? undefined : 'result-ctas-lose'} style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              <a href="/lobby" style={{ flex: 1, minWidth: 140 }}>
                <button style={{ appearance: 'none', border: 'none', width: '100%', padding: '14px', background: BLUE, color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,113,227,0.25)' }}>
                  {win ? 'Play Again' : draw ? 'Rematch' : 'Rematch'}
                </button>
              </a>
              <a href="/lobby" className={win || draw ? undefined : 'result-back-btn-lose'} style={{ display: 'block' }}>
                <button style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)', padding: '14px 22px', background: 'var(--mdd-card)', color: INK, borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Back to Lobby
                </button>
              </a>
              {win && stake > 0 && (
                <button
                  onClick={() => {
                    const text = `Just won ${stake.toFixed(3)} ${(matchData?.currency ?? 'sol').toUpperCase()} on @MindDuelApp\nTrivia + on-chain Tic-Tac-Toe on @solana devnet.\nProve your mind, win on-chain.`
                    const url = typeof window !== 'undefined' ? window.location.origin : 'https://mindduel.app'
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer')
                  }}
                  style={{ appearance: 'none', border: '1.5px solid #1DA1F2', padding: '14px 18px', background: 'var(--mdd-card)', color: '#1DA1F2', borderRadius: 14, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
                  title="Share win on Twitter"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Share win
                </button>
              )}
            </div>
          </motion.div>

        </div>
      </div>

      <BottomTabBar active="play" />
    </div>
  )
}

// ── Inner component that reads URL param + sessionStorage ─────────────
function ResultPageInner() {
  const searchParams = useSearchParams()
  const [matchData, setMatchData] = useState<SessionMatchData | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('mddLastMatch')
    if (!stored) return
    try { setMatchData(JSON.parse(stored) as SessionMatchData) } catch { /* invalid */ }
  }, [])

  const raw = searchParams.get('r')
  const kind: ResultKind = matchData?.result ?? (raw === 'lose' ? 'lose' : raw === 'draw' ? 'draw' : 'win')

  return <ResultContent kind={kind} matchData={matchData} />
}

// ── Page export (Suspense required for useSearchParams in Next.js 14) ─
export default function ResultPage() {
  return (
    <Suspense>
      <ResultPageInner />
    </Suspense>
  )
}
