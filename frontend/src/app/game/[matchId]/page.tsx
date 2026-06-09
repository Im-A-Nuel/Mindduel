'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useToast } from '@/components/ui/Toast'
import { getAIMove, type AIDifficulty } from '@/lib/ai'
import { sounds } from '@/lib/sounds'
import { WalletButton } from '@/components/wallet/WalletButton'
import { fetchTrivia, revealTrivia, peekTrivia, TriviaSessionExpiredError, WS_URL, type TriviaQuestion } from '@/lib/api'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useAnchorClient } from '@/hooks/useAnchorClient'
import { resignGame, resignGameUsdc, settleWithProof, fetchOpenGame, payHintOffchain, getUsdcBalance, type HintId } from '@/lib/anchor-client'
import { reportMatchFinish, reportVsAiResult } from '@/lib/api'
import { SoundToggle } from '@/components/SoundToggle'
import { IconRobot, IconCrosshair } from '@/components/ui/StateIcons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ThemeToggle } from '@/components/ThemeToggle'
import { EXTRA_TIME_HINT_SECONDS } from '@/lib/constants'
import { TRIVIA_BANK } from '@/lib/trivia-bank'

// ── Design tokens ────────────────────────────────────────────────────
const BLUE       = '#0071E3'
const RED        = '#FF3B30'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const FAINT      = 'var(--mdd-faint)'
const BG = 'var(--mdd-bg)'
const GREEN      = '#34C759'
const GREEN_DARK = '#0A7A2D'
const ORANGE     = '#FF9500'

// ── Hint metadata (mirrors lib/constants.ts HINTS) ───────────────────
const HINT_LABEL: Record<HintId, string> = {
  'eliminate2':   'Eliminate 2',
  'category':     'Category Reveal',
  'extra-time':   'Extra Time',
  'first-letter': 'First Letter',
  'skip':         'Skip Question',
}
const HINT_PRICE: Record<HintId, string> = {
  'eliminate2':   '0.002',
  'category':     '0.001',
  'extra-time':   '0.003',
  'first-letter': '0.001',
  'skip':         '0.005',
}
const HINT_PRICE_USDC: Record<HintId, string> = {
  'eliminate2':   '0.40',
  'category':     '0.20',
  'extra-time':   '0.60',
  'first-letter': '0.20',
  'skip':         '1.00',
}
const HINT_DESCRIPTION: Record<HintId, string> = {
  'eliminate2':   'Removes 2 wrong answer choices.',
  'category':     'Reveals the question category.',
  'extra-time':   `Adds ${EXTRA_TIME_HINT_SECONDS} seconds to the trivia timer.`,
  'first-letter': "Reveals the first letter of the correct answer.",
  'skip':         'Skip this question (turn ends).',
}

// ── Types ────────────────────────────────────────────────────────────
type CellValue  = 'X' | 'O' | null
type WinLine    = number[] | null
type GameWinner = 'X' | 'O' | 'draw'

interface Question {
  id: string
  question: string
  options: string[]
  correctIndex: number
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  timeLimit: number
}

type DisplayQuestion = { id: string; question: string; options: string[]; timeLimit: number }

// ── Local trivia pool (vs-AI) ─────────────────────────────────────────
// Mirrors the full backend bank (129 questions) so practice/vs-AI rounds are
// as varied and category-balanced as staked PvP. See lib/trivia-bank.ts.
const TRIVIA_POOL: Question[] = TRIVIA_BANK as Question[]

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ── Game logic helpers ────────────────────────────────────────────────
function generateWinLines(size: number): number[][] {
  const lines: number[][] = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c <= size - 3; c++)
      lines.push([r*size+c, r*size+c+1, r*size+c+2])
  for (let c = 0; c < size; c++)
    for (let r = 0; r <= size - 3; r++)
      lines.push([r*size+c, (r+1)*size+c, (r+2)*size+c])
  for (let r = 0; r <= size - 3; r++)
    for (let c = 0; c <= size - 3; c++)
      lines.push([r*size+c, (r+1)*size+c+1, (r+2)*size+c+2])
  for (let r = 0; r <= size - 3; r++)
    for (let c = 2; c < size; c++)
      lines.push([r*size+c, (r+1)*size+c-1, (r+2)*size+c-2])
  return lines
}

function checkWinner(board: CellValue[], size: number): number[] | null {
  for (const line of generateWinLines(size)) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line
  }
  return null
}

function expandBoard(board: CellValue[], oldSize: number): CellValue[] {
  const newSize = oldSize + 1
  const next: CellValue[] = Array(newSize * newSize).fill(null)
  for (let r = 0; r < oldSize; r++)
    for (let c = 0; c < oldSize; c++)
      next[r * newSize + c] = board[r * oldSize + c]
  return next
}

function shiftBoardCells(board: CellValue[], shiftIdx: number, size: number): CellValue[] {
  const next = [...board]
  const target = shiftIdx % (size * 2)
  const right = shiftIdx % 2 === 0

  if (target < size) {
    const r = target
    const row = Array.from({ length: size }, (_, c) => next[r * size + c])
    if (right) {
      next[r * size] = row[size - 1]
      for (let c = 1; c < size; c++) next[r * size + c] = row[c - 1]
    } else {
      next[r * size + size - 1] = row[0]
      for (let c = 0; c < size - 1; c++) next[r * size + c] = row[c + 1]
    }
  } else {
    const col = target - size
    const column = Array.from({ length: size }, (_, r) => next[r * size + col])
    if (right) {
      next[col] = column[size - 1]
      for (let r = 1; r < size; r++) next[r * size + col] = column[r - 1]
    } else {
      next[(size - 1) * size + col] = column[0]
      for (let r = 0; r < size - 1; r++) next[r * size + col] = column[r + 1]
    }
  }
  return next
}

// ── WinLine overlay (dynamic) ─────────────────────────────────────────
function WinLineOverlay({ winLine, winner, boardSize }: { winLine: number[]; winner: GameWinner; boardSize: number }) {
  const color = winner === 'X' ? BLUE : RED
  const pct = 100 / boardSize
  const pts = winLine.map(idx => ({
    x: (idx % boardSize) * pct + pct / 2,
    y: Math.floor(idx / boardSize) * pct + pct / 2,
  }))
  const d = `M ${pts[0].x} ${pts[0].y} L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, borderRadius: 24 }}>
      <motion.path d={d} stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.9 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
      />
    </svg>
  )
}

// ── Board cell ────────────────────────────────────────────────────────
function BoardCell({ value, isPending, isEmpty, isWin, isShifting, onClick }: {
  value: CellValue; isPending: boolean; isEmpty: boolean; isWin: boolean; isShifting: boolean; onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  const winBg = value === 'X' ? '#E5F0FD' : '#FFE5E2'
  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      layout
      animate={isShifting ? { scale: 0.92, opacity: 0.6 } : isWin ? { scale: 1.05 } : { scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={{
        borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isWin ? winBg : isEmpty ? (hover && !isPending ? '#EEF4FF' : 'var(--mdd-card-alt)') : 'var(--mdd-card)',
        border: isWin ? 'none' : isEmpty ? (isPending ? `1.5px solid ${BLUE}` : `1.5px solid ${hover ? BLUE + '40' : 'rgba(0,0,0,0.07)'}`) : 'none',
        boxShadow: isWin ? `0 4px 14px ${value === 'X' ? 'rgba(0,113,227,0.22)' : 'rgba(255,59,48,0.22)'}` : isEmpty ? (isPending ? `0 0 0 4px ${BLUE}1A` : 'none') : '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)',
        cursor: isEmpty ? 'pointer' : 'default',
        transition: 'background 160ms ease, border-color 160ms ease',
        position: 'relative', zIndex: isWin ? 1 : 0,
      }}
    >
      {value && (
        <>
          <motion.span
            key={value}
            initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 20 }}
            style={{ fontSize: 'min(52px, 11vw)', fontWeight: 700, lineHeight: 1, letterSpacing: -1, color: value === 'X' ? BLUE : RED }}
          >
            {value}
          </motion.span>
          {/* Burst ring fired once on placement — expands and fades */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0.55 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            style={{
              position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none',
              border: `2px solid ${value === 'X' ? BLUE : RED}`,
            }}
          />
        </>
      )}
    </motion.div>
  )
}

function PlayerChip({ color, label, addr, mark, active }: { color: string; label: string; addr: string; mark: 'X' | 'O'; active: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '7px 14px 7px 7px',
      background: 'var(--mdd-card)', borderRadius: 999,
      boxShadow: active
        ? `0 0 0 2px ${color}, 0 4px 12px ${color}22`
        : '0 0 0 0.5px rgba(0,0,0,0.08)',
      transition: 'all 200ms ease',
      minWidth: 0, maxWidth: 200,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 14,
        background: color === BLUE ? '#E5F0FD' : '#FFE5E2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color, flexShrink: 0,
      }}>{mark}</div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0, overflow: 'hidden' }}>
        <span style={{ fontSize: 10, color: MUTED, fontWeight: 600, letterSpacing: 0.3 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{addr}</span>
      </div>
    </div>
  )
}

function HintIcon({ id }: { id: HintId }) {
  // 14×14 stroke-based glyphs — visually consistent with the rest of the iOS-y UI.
  switch (id) {
    case 'eliminate2':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2.2" y="2.4" width="9.6" height="3.1" rx="1" />
          <rect x="2.2" y="8.5" width="9.6" height="3.1" rx="1" opacity="0.45" />
          <line x1="3.4" y1="11.4" x2="10.6" y2="8.7" strokeWidth="1.4" />
        </svg>
      )
    case 'category':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.2 2.4h4.5l5.1 5.1-4.5 4.5-5.1-5.1z" />
          <circle cx="4.6" cy="4.8" r="0.85" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'first-letter':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.6 11.3 5.6 3.2l3 8.1" />
          <path d="M3.6 8.6h4" />
          <line x1="10.5" y1="9.6" x2="12.4" y2="11.5" strokeWidth="1.3" />
          <line x1="10.5" y1="11.5" x2="12.4" y2="9.6" strokeWidth="1.3" opacity="0.55" />
        </svg>
      )
    case 'extra-time':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="6" cy="7.6" r="4.2" />
          <path d="M6 5.5v2.3l1.5 1" />
          <line x1="11.4" y1="2.8" x2="11.4" y2="5.4" />
          <line x1="10.1" y1="4.1" x2="12.7" y2="4.1" />
        </svg>
      )
    case 'skip':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
          <path d="M2.6 3.4v7.2L7.4 7z" />
          <path d="M7.2 3.4v7.2L12 7z" />
        </svg>
      )
  }
}

function HintPill({ id, label, cost, currency = 'SOL', onClick, disabled, loading = false }: { id: HintId; label: string; cost: string; currency?: 'SOL' | 'USDC'; onClick: () => void; disabled: boolean; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ appearance: 'none', border: 'none', background: 'var(--mdd-card)', borderRadius: 999, padding: '6px 11px 6px 7px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, fontFamily: 'inherit', transition: 'all 140ms ease' }}>
      <span style={{ width: 22, height: 22, borderRadius: 11, background: 'var(--mdd-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: BLUE }}>
        {loading
          ? <span style={{ width: 10, height: 10, borderRadius: '50%', border: `1.5px solid ${BLUE}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          : <HintIcon id={id} />}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>{cost} {currency}</span>
    </button>
  )
}

function AnswerBtn({ label, letterLabel, state, onClick, eliminated }: { label: string; letterLabel: string; state: 'default' | 'selected' | 'correct' | 'wrong'; onClick: () => void; eliminated: boolean }) {
  const colorMap = {
    default:  { bg: '#F5F5F7', border: 'transparent', color: INK,       circleBg: '#fff',  circleColor: MUTED },
    selected: { bg: '#E5F0FD', border: BLUE,          color: BLUE,      circleBg: BLUE,    circleColor: '#fff' },
    correct:  { bg: '#E8F7EE', border: GREEN,         color: GREEN_DARK, circleBg: GREEN,  circleColor: '#fff' },
    wrong:    { bg: '#FDECEB', border: RED,           color: '#A81C13', circleBg: RED,     circleColor: '#fff' },
  }
  const c = colorMap[state]
  return (
    <button onClick={onClick} disabled={eliminated} style={{ appearance: 'none', border: `1.5px solid ${c.border}`, background: c.bg, color: c.color, opacity: eliminated ? 0.32 : 1, padding: '12px 14px', borderRadius: 14, fontSize: 14, fontWeight: 600, textAlign: 'left', cursor: eliminated ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 140ms ease', textDecoration: eliminated ? 'line-through' : 'none', width: '100%' }}>
      <span style={{ width: 22, height: 22, borderRadius: 11, background: c.circleBg, color: c.circleColor, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: state === 'default' ? '0 0 0 0.5px rgba(0,0,0,0.08)' : 'none' }}>
        {state === 'correct' ? '✓' : state === 'wrong' ? '✕' : letterLabel}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  )
}

// ── TriviaCard — controlled ───────────────────────────────────────────
function TriviaCard({ question, selectedIdx, correctIdx, onPickAnswer, onTimeout, disabled, eliminated, timeKey, extraTimeBumps, firstLetterHint, categoryHint }: {
  question: DisplayQuestion
  selectedIdx: number | null
  correctIdx: number | null
  onPickAnswer: (i: number) => void
  onTimeout: () => void
  disabled: boolean
  eliminated: number[]
  timeKey: number
  extraTimeBumps: number
  firstLetterHint: string | null
  categoryHint: string | null
}) {
  const [timeLeft, setTimeLeft] = useState(question.timeLimit)
  const revealed = correctIdx !== null
  const lastBumpsRef = useRef(0)

  useEffect(() => {
    setTimeLeft(question.timeLimit)
    lastBumpsRef.current = 0
  }, [question.id, timeKey, question.timeLimit])

  useEffect(() => {
    if (extraTimeBumps > lastBumpsRef.current) {
      const delta = extraTimeBumps - lastBumpsRef.current
      lastBumpsRef.current = extraTimeBumps
      setTimeLeft(t => t + delta * EXTRA_TIME_HINT_SECONDS)
    }
  }, [extraTimeBumps])

  useEffect(() => {
    if (disabled || revealed) return
    if (timeLeft <= 0) { onTimeout(); return }
    if (timeLeft <= 5) sounds.tick()
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, disabled, revealed, onTimeout])

  function pick(i: number) {
    if (selectedIdx !== null || eliminated.includes(i) || disabled) return
    onPickAnswer(i)
  }

  const timerPct = Math.max(0, Math.min(100, (timeLeft / question.timeLimit) * 100))
  const urgent = timeLeft <= 5

  return (
    <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.5 }}>ANSWER TO CLAIM CELL</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: urgent ? RED : MUTED, fontVariantNumeric: 'tabular-nums' }}>{timeLeft.toFixed(0)}s</span>
      </div>
      <div style={{ height: 4, background: 'var(--mdd-bg-soft)', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ width: `${timerPct}%`, height: '100%', background: urgent ? RED : BLUE, transition: 'width 0.9s linear, background 200ms ease', borderRadius: 999 }} />
      </div>
      {(categoryHint || firstLetterHint) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {categoryHint && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#7C3AED', background: '#EDE9FE', padding: '3px 8px', borderRadius: 999, letterSpacing: 0.2 }}>
              📚 {categoryHint}
            </span>
          )}
          {firstLetterHint && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#06B6D4', background: '#CFFAFE', padding: '3px 8px', borderRadius: 999, letterSpacing: 0.2, fontFamily: 'monospace' }}>
              starts with &ldquo;{firstLetterHint}&rdquo;
            </span>
          )}
        </div>
      )}
      <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.35, color: INK, margin: '0 0 14px', letterSpacing: -0.3 }}>{question.question}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {question.options.map((opt, i) => {
          let state: 'default' | 'selected' | 'correct' | 'wrong' = 'default'
          if (revealed) {
            if (i === correctIdx) state = 'correct'
            else if (i === selectedIdx) state = 'wrong'
          } else if (i === selectedIdx) state = 'selected'
          return <AnswerBtn key={i} label={opt} letterLabel={String.fromCharCode(65 + i)} state={state} onClick={() => pick(i)} eliminated={eliminated.includes(i)} />
        })}
      </div>
      {selectedIdx !== null && !revealed && (
        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: BLUE }}>Checking…</div>
      )}
    </div>
  )
}

// ── Mode badge ────────────────────────────────────────────────────────
const MODE_META: Record<string, { label: string; color: string; bg: string }> = {
  classic:  { label: 'Classic',        color: INK,        bg: '#F5F5F7' },
  shifting: { label: 'Shifting Board', color: '#7C3AED',  bg: '#EDE9FE' },
  scaleup:  { label: 'Scale Up',       color: '#A81C13',  bg: '#FDECEB' },
  blitz:    { label: 'Blitz',          color: '#8A5A00',  bg: '#FFF4E0' },
  'vs-ai':  { label: 'vs AI',          color: BLUE,       bg: '#E5F0FD' },
}

// ── Mode event banner ─────────────────────────────────────────────────
function ModeBanner({ msg }: { msg: string }) {
  return (
    <motion.div
      key={msg}
      initial={{ opacity: 0, y: -12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: 'var(--mdd-dark-surface)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 14, fontWeight: 700, letterSpacing: -0.2, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', whiteSpace: 'nowrap' }}
    >
      {msg}
    </motion.div>
  )
}

// ── Leaderboard (static sidebar) ──────────────────────────────────────
const LEADERBOARD = [
  { rank: 1, addr: '0x9f…c2', wins: 142, sol: '+12.4' },
  { rank: 2, addr: '0xa1…7d', wins: 128, sol: '+9.8' },
  { rank: 3, addr: '0x3f…a9', wins: 121, sol: '+8.1', opponent: true },
  { rank: 4, addr: '0xbe…04', wins: 117, sol: '+7.6' },
  { rank: 5, addr: '0x44…8e', wins: 99,  sol: '+5.2', you: true },
]

// ── Game Over Modal ───────────────────────────────────────────────────
function GameOverModal({ winner, isVsAI, myMark, stake, currency }: { winner: GameWinner; isVsAI: boolean; myMark: 'X' | 'O'; stake: number; currency: 'sol' | 'usdc' }) {
  const iWon  = winner === myMark
  const isDraw = winner === 'draw'
  const unit = currency.toUpperCase()
  const isFreePlay = stake <= 0
  const winAmount = (stake * 2 * 0.975).toFixed(3)

  // Subtitle copy: avoid leaking "+0.000 SOL" / "Pot split 50/50" text in
  // free-play and vs-AI rounds where there's no real money on the line.
  const subtitle = (() => {
    if (iWon) {
      if (isVsAI) return 'Practice round complete'
      if (isFreePlay) return 'Nice match — no stake on this one'
      return `+${winAmount} ${unit} sent to your wallet`
    }
    if (isDraw) {
      if (isVsAI || isFreePlay) return "Stalemate — neither side won"
      return 'Pot split 50/50'
    }
    if (isVsAI) return 'The AI was too strong this time'
    if (isFreePlay) return 'Tough luck — try again'
    return 'Better luck next time'
  })()
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)' }}>
      <motion.div initial={{ scale: 0.82, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.06 }} style={{ width: '100%', maxWidth: 360, background: 'var(--mdd-card)', borderRadius: 24, padding: 32, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ width: 88, height: 88, borderRadius: 44, background: iWon ? '#E8F7EE' : isDraw ? '#E5F0FD' : '#FDECEB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: iWon ? GREEN : isDraw ? BLUE : RED, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${iWon ? 'rgba(52,199,89,0.32)' : isDraw ? 'rgba(0,113,227,0.28)' : 'rgba(255,59,48,0.28)'}` }}>
            {iWon ? (<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 16.5L13.5 22L24 11" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>)
              : isDraw ? (<span style={{ fontSize: 28, color: '#fff', fontWeight: 700 }}>=</span>)
              : (<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M8 8L20 20M20 8L8 20" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/></svg>)}
          </div>
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, margin: '0 0 6px', color: INK }}>{iWon ? 'You Won!' : isDraw ? "It's a Draw!" : 'You Lost'}</h2>
        <p style={{ fontSize: 14, color: MUTED, margin: '0 0 24px', lineHeight: 1.4 }}>
          {subtitle}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a href="/lobby" style={{ display: 'block' }}>
            <button style={{ appearance: 'none', border: 'none', width: '100%', padding: '14px', background: BLUE, color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,113,227,0.25)' }}>Play Again</button>
          </a>
          <a href={`/result?r=${iWon ? 'win' : isDraw ? 'draw' : 'lose'}`} style={{ display: 'block' }}>
            <button style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)', width: '100%', padding: '13px', background: 'var(--mdd-card)', color: INK, borderRadius: 14, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>View Result</button>
          </a>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface LogEntry { q: string; correct: boolean; time: number }

// ── Main Page ─────────────────────────────────────────────────────────
export default function GamePage({ params }: { params: { matchId: string } }) {
  const toast = useToast()
  const { publicKey } = useWallet()
  const anchorClient  = useAnchorClient()

  const playerOnePubkeyRef = useRef<PublicKey | null>(null)
  const playerTwoPubkeyRef = useRef<PublicKey | null>(null)
  const publicKeyRef        = useRef<PublicKey | null>(null)

  const [isVsAI, setIsVsAI]         = useState(false)
  const [myMark, setMyMark]         = useState<'X' | 'O'>('X')
  const [difficulty, setDifficulty] = useState<AIDifficulty>('hard')
  const [isLoading, setIsLoading]   = useState(true)
  const [gameModeStr, setGameModeStr] = useState('classic')

  // Board state — dynamic size
  const [boardSize, setBoardSize]         = useState(3)
  const [board, setBoard]                 = useState<CellValue[]>(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X')
  const [winLine, setWinLine]             = useState<WinLine>(null)
  const [winner, setWinner]               = useState<GameWinner | null>(null)

  // Trivia state
  const [pendingCell, setPendingCell]       = useState<number | null>(null)
  const [questionIndex, setQuestionIndex]   = useState(0)
  const [eliminated, setEliminated]         = useState<number[]>([])
  const [timeKey, setTimeKey]               = useState(0)
  const [triviaSelectedIdx, setTriviaSelectedIdx] = useState<number | null>(null)
  const [triviaCorrectIdx, setTriviaCorrectIdx]   = useState<number | null>(null)
  const [apiQuestion, setApiQuestion]       = useState<TriviaQuestion | null>(null)
  const [apiSessionId, setApiSessionId]     = useState<string | null>(null)
  const [triviaFetching, setTriviaFetching] = useState(false)
  // optPerm[displayIdx] = originalIdx — reshuffled for every new question
  const [optPerm, setOptPerm] = useState<number[]>([0, 1, 2, 3])

  // Hint state — local effects of purchased hints. The on-chain ledger
  // (per-match) prevents buying the same hint twice within a match; we reset
  // these visual effects when the question changes.
  // Persisted per-match so a page refresh / WS reconnect mid-match doesn't reset
  // the set and let the player re-buy (and re-pay for) hints they already own.
  // The on-chain HintLedger is bypassed in off-chain mode, so this client store
  // is the only double-spend guard for the player's own wallet.
  const usedHintsKey = `mddUsedHints:${params.matchId}`
  const [usedHints, setUsedHints]               = useState<Set<HintId>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = sessionStorage.getItem(`mddUsedHints:${params.matchId}`)
      return raw ? new Set(JSON.parse(raw) as HintId[]) : new Set()
    } catch { return new Set() }
  })
  const [purchasingHint, setPurchasingHint]     = useState<HintId | null>(null)
  const [hintToConfirm, setHintToConfirm]       = useState<HintId | null>(null)
  const [extraTimeBumps, setExtraTimeBumps]     = useState(0)
  const [firstLetterHint, setFirstLetterHint]   = useState<string | null>(null)
  const [categoryHint, setCategoryHint]         = useState<string | null>(null)

  // Mode-specific state
  const [isShifting, setIsShifting] = useState(false)
  const [modeMsg, setModeMsg]       = useState('')

  // Spectator viewer count (from server)
  const [viewerCount, setViewerCount] = useState(0)

  // Resign / forfeit-match confirm
  const [confirmResign, setConfirmResign] = useState(false)

  // Stake + currency are read from sessionStorage after mount to avoid
  // SSR/CSR hydration mismatch (server has no sessionStorage).
  const [stake, setStake] = useState(0)
  const [currency, setCurrency] = useState<'sol' | 'usdc'>('sol')
  useEffect(() => {
    setStake(parseFloat(sessionStorage.getItem('mddStake') ?? '0.05'))
    const c = sessionStorage.getItem('mddCurrency')
    setCurrency(c === 'usdc' ? 'usdc' : 'sol')
  }, [])
  const currencyLabel = currency.toUpperCase()

  const gameOver = winner !== null

  // Refs for sync access in closures
  const boardRef         = useRef(board)
  const boardSizeRef     = useRef(3)
  const gameModeRef      = useRef('classic')
  const roundCountRef    = useRef(0)
  const shiftCountRef    = useRef(0)
  const activePoolRef    = useRef<Question[]>(TRIVIA_POOL)
  const matchLogRef      = useRef<LogEntry[]>([])
  const questionStartRef = useRef<number>(Date.now())
  const wsRef            = useRef<WebSocket | null>(null)
  const wsQueueRef       = useRef<string[]>([])
  // Mirror of `currentPlayer` for use inside closures that aren't re-created
  // on every render (e.g. the memoized handlePickAnswer → advanceTurn chain).
  // Reading state directly there can capture a stale value and place a piece
  // for the wrong mark / broadcast the wrong nextPlayer.
  const currentPlayerRef = useRef(currentPlayer)
  // Mirror of `winner` so the WS onclose handler can decide whether to keep
  // reconnecting without `winner` being in the effect's dependency array
  // (which would tear down + rebuild the socket on every winner change and
  // reset the live-event guard).
  const winnerRef = useRef<GameWinner | null>(null)

  useEffect(() => { boardRef.current = board }, [board])
  useEffect(() => { currentPlayerRef.current = currentPlayer }, [currentPlayer])
  useEffect(() => { winnerRef.current = winner }, [winner])
  useEffect(() => {
    try { sessionStorage.setItem(usedHintsKey, JSON.stringify(Array.from(usedHints))) } catch {}
  }, [usedHints, usedHintsKey])

  // Reset visual hint effects when the question changes — used hints stay
  // tracked in `usedHints` state across questions because the on-chain
  // ledger blocks repeats per match.
  useEffect(() => {
    setFirstLetterHint(null)
    setCategoryHint(null)
    setExtraTimeBumps(0)
  }, [questionIndex, timeKey])

  const localQ = activePoolRef.current[questionIndex % activePoolRef.current.length]
  const displayQ: DisplayQuestion = isVsAI || !apiQuestion ? localQ : apiQuestion

  // Reshuffle answer order whenever the question changes
  useEffect(() => {
    setOptPerm(shuffle([0, 1, 2, 3]))
    setEliminated([])
  }, [displayQ.id, displayQ.question])

  // Apply the per-question option permutation for display
  const shuffledQ: DisplayQuestion = {
    ...displayQ,
    options: optPerm.map(origIdx => displayQ.options[origIdx]),
  }

  // Blitz: force 5s time limit
  const effectiveQ: DisplayQuestion = gameModeStr === 'blitz'
    ? { ...shuffledQ, timeLimit: 5 }
    : shuffledQ

  // ── Blitz pick-cell timer ──────────────────────────────────────────────
  // In Blitz mode the trivia panel only renders after the player clicks a
  // cell. To prevent stalling, give them a hard 8-second window to click
  // SOMETHING after their turn starts; if they don't, auto-forfeit so the
  // match keeps moving (and the opponent's screen unblocks).
  const [blitzPickLeft, setBlitzPickLeft] = useState<number | null>(null)
  useEffect(() => {
    if (gameModeStr !== 'blitz' || isVsAI) { setBlitzPickLeft(null); return }
    if (gameOver || pendingCell !== null) { setBlitzPickLeft(null); return }
    if (currentPlayer !== myMark) { setBlitzPickLeft(null); return }

    setBlitzPickLeft(8)
    const id = setInterval(() => {
      setBlitzPickLeft(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(id)
          // Defer to next tick so we don't setState during render
          setTimeout(() => {
            toast('Blitz: no cell picked in time — turn forfeited.', 'warning')
            forfeitTurnWithoutPlacement()
          }, 0)
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameModeStr, isVsAI, gameOver, pendingCell, currentPlayer, myMark, timeKey])

  // ── Config + WS setup ───────────────────────────────────────────────
  useEffect(() => {
    const vsAI = sessionStorage.getItem('mddVsAI') === '1'
    const diff = (sessionStorage.getItem('mddDifficulty') ?? 'hard') as AIDifficulty
    const mark = (sessionStorage.getItem('mddMyMark') ?? 'X') as 'X' | 'O'
    const mode = sessionStorage.getItem('mddMode') ?? 'classic'

    setIsVsAI(vsAI)
    setDifficulty(diff)
    setMyMark(mark)
    setGameModeStr(mode)
    gameModeRef.current = mode

    try {
      const p1 = sessionStorage.getItem('mddPlayerOnePubkey')
      const p2 = sessionStorage.getItem('mddPlayerTwoPubkey')
      if (p1) playerOnePubkeyRef.current = new PublicKey(p1)
      if (p2) playerTwoPubkeyRef.current = new PublicKey(p2)
    } catch {}

    const savedCats = JSON.parse(sessionStorage.getItem('mddCategories') ?? '[]') as string[]
    const savedDiff = (sessionStorage.getItem('mddDifficulty') ?? 'hard') as 'easy' | 'medium' | 'hard'
    // Category filter — STRICT: never serve a question outside the picked
    // categories. Earlier the local pool fell back to TRIVIA_POOL (all
    // categories) when the cat×difficulty intersection was small, which
    // made vs-AI and free play violate the user's category choice.
    const catPool = savedCats.length > 0
      ? TRIVIA_POOL.filter(q => savedCats.includes(q.category))
      : [...TRIVIA_POOL]
    // Difficulty filter: easy=easy only, medium=easy+medium, hard=all
    const diffPool = savedDiff === 'easy'
      ? catPool.filter(q => q.difficulty === 'easy')
      : savedDiff === 'medium'
        ? catPool.filter(q => q.difficulty === 'easy' || q.difficulty === 'medium')
        : catPool
    // If the difficulty trim leaves too few, drop difficulty but KEEP categories.
    // Only fall back to the full bank if the user picked NO categories at all.
    const finalPool = diffPool.length >= 5
      ? diffPool
      : (catPool.length > 0 ? catPool : TRIVIA_POOL)
    activePoolRef.current = shuffle([...finalPool])

    const t = setTimeout(() => {
      setIsLoading(false)
      const modeLabel = MODE_META[mode]?.label ?? mode
      toast(vsAI ? `You play as X — AI plays as O [${modeLabel}]` : `Match found — you play as ${mark} [${modeLabel}]`, 'info')
    }, 900)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep publicKeyRef current so the WS closure always sees the latest wallet.
  useEffect(() => { publicKeyRef.current = publicKey }, [publicKey])

  // WS for PvP. Connect immediately (don't wait for the loading screen to
  // finish) so we never miss a `board_updated` broadcast from the opponent
  // while we're still rendering the spinner. Otherwise: P1 plays + broadcasts
  // before P2's WS opens, P2 misses the turn-flip, and BE's `state` reply
  // (which always reads the initial 'X' from DB since turns aren't persisted
  // mid-match) leaves P2 stuck on "opponent's turn".
  useEffect(() => {
    const isPvP = !params.matchId.startsWith('vs-ai-')
    if (!isPvP) return

    // Track whether we've received any live event yet — once we have, the
    // server's stale DB-derived `state` message must NOT clobber our
    // currentPlayer (DB never updates per-turn). Spans reconnects so a
    // dropped/restored socket doesn't undo turn state.
    let receivedLiveEvent = false
    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    function connect() {
      if (cancelled) return
      const ws = new WebSocket(`${WS_URL}/ws/${params.matchId}`)
      wsRef.current = ws

      ws.onopen = () => {
        attempt = 0  // reset backoff on successful connect
        const q = wsQueueRef.current
        wsQueueRef.current = []
        for (const m of q) {
          if (ws.readyState === WebSocket.OPEN) ws.send(m)
        }
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'ping') {
            // Heartbeat reply — keeps server-side last-seen fresh.
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'pong', t: Date.now() }))
            return
          }
          if (msg.type === 'board_updated') {
            receivedLiveEvent = true
            if (msg.board) { setBoard(msg.board); boardRef.current = msg.board }
            if (msg.boardSize) { setBoardSize(msg.boardSize); boardSizeRef.current = msg.boardSize }
            if (msg.nextPlayer) { setCurrentPlayer(msg.nextPlayer); currentPlayerRef.current = msg.nextPlayer }
            if (msg.winLine) setWinLine(msg.winLine)
            if (msg.winner) setWinner(msg.winner)
            setTriviaSelectedIdx(null); setTriviaCorrectIdx(null)
            setApiQuestion(null); setApiSessionId(null)
            setEliminated([]); setPendingCell(null)
            setQuestionIndex(i => i + 1); setTimeKey(k => k + 1)
          } else if (msg.type === 'state' && msg.match) {
            if (!receivedLiveEvent) {
              setBoard(msg.match.board); setCurrentPlayer(msg.match.currentPlayer)
            }
            try {
              if (msg.match.playerOne) playerOnePubkeyRef.current = new PublicKey(msg.match.playerOne)
              if (msg.match.playerTwo) playerTwoPubkeyRef.current = new PublicKey(msg.match.playerTwo)
              // Authoritatively derive myMark from the server's player list so a
              // stale sessionStorage value (e.g. from a race-condition in the lobby
              // polling path) can never put both players on the same side.
              const myAddr = publicKeyRef.current?.toBase58()
              if (myAddr && msg.match.playerOne && msg.match.playerTwo) {
                const correctMark: 'X' | 'O' = myAddr === msg.match.playerOne ? 'X' : 'O'
                setMyMark(correctMark)
                sessionStorage.setItem('mddMyMark', correctMark)
              }
              // If the player arrived via a direct URL (no lobby flow), mddCategories
              // may be missing or empty. Populate from the authoritative server state
              // so they use the correct question pool — without this, any player who
              // opens /game/<matchId> directly (e.g. from a shared link) would receive
              // questions from all categories regardless of what the creator chose.
              if (Array.isArray(msg.match.categories) && msg.match.categories.length > 0) {
                const existing = sessionStorage.getItem('mddCategories')
                const existingCats = JSON.parse(existing ?? '[]') as string[]
                if (existingCats.length === 0) {
                  sessionStorage.setItem('mddCategories', JSON.stringify(msg.match.categories))
                }
              }
            } catch {}
          } else if (msg.type === 'viewer_count') {
            setViewerCount(typeof msg.count === 'number' ? msg.count : 0)
          }
        } catch {}
      }

      ws.onclose = () => {
        if (cancelled || winnerRef.current !== null) return  // game over → stop reconnecting
        // Exponential backoff: 1s, 2s, 4s, 8s, max 16s.
        const delay = Math.min(1000 * Math.pow(2, attempt), 16_000)
        attempt += 1
        reconnectTimer = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        // Let onclose drive the reconnect — error events fire too.
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
      wsRef.current = null
    }
  // Socket lifecycle is tied to the match only. `winner` is intentionally NOT a
  // dependency — it's read via winnerRef inside onclose, so a win no longer tears
  // down and rebuilds the socket (which used to reset receivedLiveEvent and let a
  // stale DB-derived `state` message clobber the board).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.matchId])

  useEffect(() => { questionStartRef.current = Date.now() }, [timeKey])

  // Re-shuffle the vs-AI question pool each time it cycles through completely
  // so the second (and subsequent) lap presents questions in a different order.
  // Without this, the pool repeats in the exact same shuffled sequence which
  // becomes predictable in long matches or when the category pool is small.
  useEffect(() => {
    if (!isVsAI) return
    const len = activePoolRef.current.length
    if (len > 0 && questionIndex > 0 && questionIndex % len === 0) {
      activePoolRef.current = shuffle([...activePoolRef.current])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex])

  // Guard: ensures the game-over side-effects (DB report, on-chain settle,
  // wallet popup, history write) fire exactly once per match — even under
  // React StrictMode double-invoke in dev.
  const finishedOnceRef = useRef(false)

  // Sound + save on game over
  useEffect(() => {
    if (!winner) return
    if (finishedOnceRef.current) return
    finishedOnceRef.current = true
    if (winner === myMark) sounds.win()
    else if (winner === 'draw') sounds.draw()
    else sounds.lose()

    const modeId  = sessionStorage.getItem('mddMode') ?? 'classic'
    const modeMap: Record<string, string> = { classic: 'Classic Duel', shifting: 'Shifting Board', scaleup: 'Scale Up', blitz: 'Blitz', 'vs-ai': 'vs AI' }
    const stakeNow = parseFloat(sessionStorage.getItem('mddStake') ?? '0.05')
    const currencyNow = (sessionStorage.getItem('mddCurrency') === 'usdc' ? 'usdc' : 'sol') as 'sol' | 'usdc'
    const opponentAddr = myMark === 'X'
      ? playerTwoPubkeyRef.current?.toBase58()
      : playerOnePubkeyRef.current?.toBase58()
    const opponentDisplay = isVsAI
      ? 'MindDuel AI'
      : opponentAddr ? `${opponentAddr.slice(0, 4)}…${opponentAddr.slice(-4)}` : '???'
    const matchResult = { result: winner === myMark ? 'win' : winner === 'draw' ? 'draw' : 'lose', opponent: opponentDisplay, mode: modeMap[modeId] ?? modeId, isVsAI, stake: stakeNow, currency: currencyNow, log: matchLogRef.current }
    sessionStorage.setItem('mddLastMatch', JSON.stringify(matchResult))

    const stored = JSON.parse(localStorage.getItem('mddHistory') ?? '[]')
    const entry = { id: Date.now().toString(), timestamp: Date.now(), result: matchResult.result, opponent: matchResult.opponent, mode: matchResult.mode, isVsAI, stake: stakeNow, currency: currencyNow, questions: matchLogRef.current.length, correct: matchLogRef.current.filter(l => l.correct).length }
    localStorage.setItem('mddHistory', JSON.stringify([entry, ...stored].slice(0, 50)))

    // Mirror vs-AI matches to backend so they appear in /history alongside PvP.
    if (isVsAI && publicKey) {
      const result: 'win' | 'loss' | 'draw' =
        matchResult.result === 'win'  ? 'win'  :
        matchResult.result === 'draw' ? 'draw' : 'loss'
      void reportVsAiResult({ player: publicKey.toBase58(), mode: modeId, result })
    }

    // Record the result in DB immediately, regardless of on-chain settle.
    // To avoid needing both players' addresses (which the joiner has but
    // the creator may not), we use a simple convention: only the winner
    // reports. For draws, either side reports null. Losers stay silent —
    // the winner's call is the source of truth. finishMatch on the BE is
    // idempotent so the later settle-success retry can patch the txSig.
    if (!isVsAI && publicKey) {
      const iWon  = winner === myMark
      const isDraw = winner === 'draw'
      const shouldReport = iWon || isDraw
      if (shouldReport) {
        const stakeAmt = parseFloat(sessionStorage.getItem('mddStake') ?? '0')
        const pot = stakeAmt * 2
        const fee = pot * 0.025
        void reportMatchFinish({
          matchId:    params.matchId,
          winner:     isDraw ? null : publicKey.toBase58(),
          pot,
          fee,
          onChainSig: null,
        })
      }
    }

    const stakeForSettle = parseFloat(sessionStorage.getItem('mddStake') ?? '0')
    // ── Off-chain gameplay settlement ────────────────────────────────────
    // Moves are no longer broadcast on-chain (no commit/reveal popups during
    // play), so the GameAccount's board stays empty — settle_game would
    // refuse to pay out because it can't detect a winner from chain state.
    //
    // We use `resign_game` instead: the LOSER's client signs ONE tx at
    // game-over, which transfers the prize to the opponent and closes the
    // GameAccount. Winner receives funds with zero popups.
    //
    // Edge cases:
    //   • Draws — neither side resigns. Funds settle 50/50 via the 24h
    //     timeout branch in settle_game (any side can call after timeout).
    //   • Loser closes tab before signing — same fallback (winner waits 24h).
    const iLostPvP = !isVsAI && winner !== 'draw' && winner !== myMark
    if (iLostPvP && anchorClient && publicKey && playerOnePubkeyRef.current && playerTwoPubkeyRef.current && stakeForSettle > 0) {
      const matchCurrency = sessionStorage.getItem('mddCurrency') ?? 'sol'
      const resignPromise = matchCurrency === 'usdc'
        ? resignGameUsdc(anchorClient, publicKey, playerOnePubkeyRef.current, playerTwoPubkeyRef.current, params.matchId)
        : resignGame(anchorClient, publicKey, playerOnePubkeyRef.current, playerTwoPubkeyRef.current, params.matchId)
      resignPromise
        .then(sig => {
          toast('Prize sent to opponent on-chain ✓', 'success')
          const winnerAddr = winner === 'X'
            ? playerOnePubkeyRef.current?.toBase58() ?? null
            : playerTwoPubkeyRef.current?.toBase58() ?? null
          const stakeAmt = parseFloat(sessionStorage.getItem('mddStake') ?? '0')
          const pot = stakeAmt * 2
          const fee = pot * 0.025
          void reportMatchFinish({
            matchId:    params.matchId,
            winner:     winnerAddr,
            pot,
            fee,
            onChainSig: typeof sig === 'string' ? sig : null,
          })
        })
        .catch(e => {
          const msg = e instanceof Error ? e.message : String(e)
          console.error('resignGame failed:', e)
          if (/User rejected|rejected by user/i.test(msg)) {
            toast('Settle skipped — opponent can claim via 24h timeout.', 'warning')
          } else if (/offline|network|fetch|timed?\s?out/i.test(msg)) {
            toast('Network issue settling on-chain. Funds remain in escrow.', 'error')
          } else if (/InvalidGameState|GameStillActive|AccountNotInitialized|0xbc4|3012|already.+(settled|finished|closed)|account.+(does\s?not\s?exist|not.*initialized)/i.test(msg)) {
            // Race: opponent (winner) already settled and CLOSED the game
            // account first — Anchor then reports it as AccountNotInitialized
            // (0xbc4 / 3012). The opponent already has the prize, so this is a
            // success from our side. Silent.
          } else {
            toast('On-chain settle failed: ' + msg.slice(0, 100), 'error')
          }
        })
    }

    // Winner path (SOL): oracle-signed settle as a FALLBACK only. The loser's
    // resign (above) is the primary settlement — the loser is right here
    // conceding, so it almost always lands. Both resign and settle_with_proof
    // pay the winner and CLOSE the same game account, so if the winner also
    // raced a settle they'd collide on the closed account (AccountNotInitialized
    // / 0xbc4). To avoid that we wait a grace period, then check whether the
    // game is still open; only if the loser HASN'T settled do we claim. This
    // covers the real gap (loser closed their tab) without the double-settle.
    const iWonPvP = !isVsAI && winner !== 'draw' && winner === myMark
    const settleCurrency = sessionStorage.getItem('mddCurrency') ?? 'sol'
    if (iWonPvP && settleCurrency === 'sol' && anchorClient && publicKey
        && playerOnePubkeyRef.current && playerTwoPubkeyRef.current && stakeForSettle > 0) {
      const winnerPk = winner === 'X' ? playerOnePubkeyRef.current : playerTwoPubkeyRef.current
      const p1 = playerOnePubkeyRef.current
      void (async () => {
        try {
          // Give the loser's resign time to land (sign + confirm).
          await new Promise(r => setTimeout(r, 6000))
          // Still open? If the loser already settled, the account is closed and
          // fetchOpenGame returns null → nothing to do.
          const open = await fetchOpenGame(anchorClient, p1, params.matchId).catch(() => null)
          if (!open || open.status === 'finished') return
          const sig = await settleWithProof(
            anchorClient,
            publicKey,
            p1,
            playerTwoPubkeyRef.current!,
            winnerPk,
            params.matchId,
          )
          toast('Pot claimed on-chain ✓', 'success')
          void reportMatchFinish({
            matchId:    params.matchId,
            winner:     winnerPk.toBase58(),
            pot:        stakeForSettle * 2,
            fee:        stakeForSettle * 2 * 0.025,
            onChainSig: sig,
          })
        } catch (e) {
          // Non-fatal: the loser's resign or the 24h timeout still settles. A
          // closed-account race here is expected and harmless.
          const msg = e instanceof Error ? e.message : String(e)
          if (!/AccountNotInitialized|0xbc4|InvalidGameState|already.+(settled|finished|closed)|does\s?not\s?exist/i.test(msg)) {
            console.error('oracle settle fallback failed:', e)
          }
        }
      })()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner])

  // AI move
  useEffect(() => {
    if (!isVsAI || currentPlayer !== 'O' || gameOver || isLoading) return
    if (boardRef.current.every(c => c !== null)) return
    const id = setTimeout(() => {
      const move = getAIMove(boardRef.current, 'O', difficulty, boardSizeRef.current)
      if (move === -1) return
      const next = [...boardRef.current] as CellValue[]
      next[move] = 'O'
      const win = checkWinner(next, boardSizeRef.current)
      sounds.place()
      setBoard(next)
      boardRef.current = next
      if (win) { setWinLine(win); setWinner('O') }
      else if (next.every(c => c !== null)) {
        if (gameModeRef.current === 'scaleup' && boardSizeRef.current < 5) {
          triggerExpand(next)
        } else {
          setWinner('draw')
        }
      } else {
        setCurrentPlayer('X'); setQuestionIndex(i => i + 1); setEliminated([]); setTimeKey(k => k + 1)
        roundCountRef.current += 1
        checkShift()
      }
    }, 1200 + Math.random() * 800)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVsAI, currentPlayer, gameOver, isLoading, difficulty])

  function sendWsEvent(event: unknown) {
    const payload = JSON.stringify(event)
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(payload)
    } else {
      // WS not open yet (CONNECTING) or just torn down by StrictMode
      // remount. Queue the payload so it fires the moment the next ws opens.
      wsQueueRef.current.push(payload)
    }
  }

  function triggerExpand(currentBoard: CellValue[]) {
    const oldSize = boardSizeRef.current
    const newSize = oldSize + 1
    const expanded = expandBoard(currentBoard, oldSize)
    boardSizeRef.current = newSize
    setBoardSize(newSize)
    setBoard(expanded)
    boardRef.current = expanded
    setModeMsg(`⬆ Board expanded to ${newSize}×${newSize}!`)
    setTimeout(() => setModeMsg(''), 2200)
    // continue game
    setCurrentPlayer(p => p === 'X' ? 'O' : 'X')
    setQuestionIndex(i => i + 1)
    setEliminated([])
    setTimeKey(k => k + 1)
    setPendingCell(null)
  }

  // Local-only shift used by the vs-AI path (no WebSocket). Triggered from the
  // placed-piece count so it stays deterministic. PvP shifting is handled inline
  // in advanceTurn so the shifted board can be broadcast to the opponent.
  function checkShift() {
    if (gameModeRef.current !== 'shifting') return
    const placed = boardRef.current.filter(c => c !== null).length
    if (placed === 0 || placed % 3 !== 0) return
    shiftCountRef.current += 1
    const shifted = shiftBoardCells([...boardRef.current], shiftCountRef.current, boardSizeRef.current)
    boardRef.current = shifted
    setIsShifting(true)
    setTimeout(() => {
      setBoard(shifted)
      setIsShifting(false)
      setModeMsg('↔ Board shifted!')
      setTimeout(() => setModeMsg(''), 1800)
    }, 350)
  }

  function advanceTurn(place: boolean, cell: number) {
    const currentSize = boardSizeRef.current
    const mode = gameModeRef.current
    // Read the mark from the ref, not the closed-over `currentPlayer` state —
    // advanceTurn is reached through the memoized handlePickAnswer, whose
    // closure can hold a stale currentPlayer.
    const mark = currentPlayerRef.current

    if (place) {
      sounds.place()
      const nextBoard = [...boardRef.current] as CellValue[]
      nextBoard[cell] = mark
      const win = checkWinner(nextBoard, currentSize)
      setBoard(nextBoard)
      boardRef.current = nextBoard
      setPendingCell(null)

      if (win) {
        setWinLine(win)
        setWinner(mark)
        if (!isVsAI) sendWsEvent({ type: 'board_updated', board: nextBoard, boardSize: currentSize, nextPlayer: null, winner: mark, winLine: win })
        return
      }

      if (nextBoard.every(c => c !== null)) {
        if (mode === 'scaleup' && currentSize < 5) {
          triggerExpand(nextBoard)
          if (!isVsAI) sendWsEvent({ type: 'board_updated', board: expandBoard(nextBoard, currentSize), boardSize: currentSize + 1, nextPlayer: mark === 'X' ? 'O' : 'X', winner: null, winLine: null })
          return
        }
        setWinner('draw')
        if (!isVsAI) sendWsEvent({ type: 'board_updated', board: nextBoard, boardSize: currentSize, nextPlayer: null, winner: 'draw', winLine: null })
        return
      }

      // Scale Up: expand when enough pieces placed
      if (mode === 'scaleup') {
        const placed = nextBoard.filter(c => c !== null).length
        const shouldExpand = (currentSize === 3 && placed >= 4) || (currentSize === 4 && placed >= 10)
        if (shouldExpand && currentSize < 5) {
          const expanded = expandBoard(nextBoard, currentSize)
          const newSize = currentSize + 1
          boardSizeRef.current = newSize
          setBoardSize(newSize)
          setBoard(expanded)
          boardRef.current = expanded
          setModeMsg(`⬆ Board expanded to ${newSize}×${newSize}!`)
          setTimeout(() => setModeMsg(''), 2200)
          const nextPlayer: 'X' | 'O' = mark === 'X' ? 'O' : 'X'
          setCurrentPlayer(nextPlayer)
          currentPlayerRef.current = nextPlayer
          setQuestionIndex(i => i + 1); setEliminated([]); setTimeKey(k => k + 1)
          roundCountRef.current += 1
          if (!isVsAI) sendWsEvent({ type: 'board_updated', board: expanded, boardSize: newSize, nextPlayer, winner: null, winLine: null })
          return
        }
      }
    } else {
      setPendingCell(null)
    }

    const nextPlayer: 'X' | 'O' = mark === 'X' ? 'O' : 'X'
    setCurrentPlayer(nextPlayer)
    currentPlayerRef.current = nextPlayer
    setQuestionIndex(i => i + 1)
    setEliminated([])
    setTimeKey(k => k + 1)
    roundCountRef.current += 1

    // Shifting Board: a shift happens only right after a piece is placed, every
    // 3rd placed piece. The trigger is derived from the placed-count (identical
    // on both clients since they share the board), and the MOVER applies the
    // shift then broadcasts the already-shifted board — so the opponent renders
    // the same board instead of computing its own (which desynced the two
    // boards in PvP). Forfeits place nothing → no shift.
    let outBoard = boardRef.current
    if (place && mode === 'shifting') {
      const placed = boardRef.current.filter(c => c !== null).length
      if (placed > 0 && placed % 3 === 0) {
        shiftCountRef.current += 1
        outBoard = shiftBoardCells([...boardRef.current], shiftCountRef.current, boardSizeRef.current)
        boardRef.current = outBoard
        setIsShifting(true)
        setTimeout(() => {
          setBoard(outBoard)
          setIsShifting(false)
          setModeMsg('↔ Board shifted!')
          setTimeout(() => setModeMsg(''), 1800)
        }, 350)
      }
    }

    if (!isVsAI) {
      sendWsEvent({ type: 'board_updated', board: outBoard, boardSize: boardSizeRef.current, nextPlayer, winner: null, winLine: null })
    }
  }

  async function handleCellClick(i: number) {
    if (gameOver || board[i] || pendingCell !== null || currentPlayer !== myMark) return
    setPendingCell(i)

    if (!isVsAI) {
      setTriviaFetching(true)
      try {
        const savedCats = JSON.parse(sessionStorage.getItem('mddCategories') ?? '[]') as string[]
        const playerId  = publicKey?.toBase58() ?? params.matchId
        // Pass matchId so the backend can deduplicate across both players:
        // neither player will receive a question the other already answered
        // in this match, regardless of their individual ring buffers.
        const trivia = await fetchTrivia(savedCats, difficulty, playerId, params.matchId)
        setApiQuestion(trivia.question)
        setApiSessionId(trivia.sessionId)
      } catch {
        toast('Failed to load question', 'error')
        setPendingCell(null)
      }
      setTriviaFetching(false)
    }
  }

  const handlePickAnswer = useCallback(async (idx: number) => {
    if (pendingCell === null) return
    const elapsed = parseFloat(((Date.now() - questionStartRef.current) / 1000).toFixed(1))
    setTriviaSelectedIdx(idx) // idx is display space

    // Convert display index to original index before comparing / sending to backend
    const originalIdx = optPerm[idx] ?? idx

    let correct: boolean
    let correctIndex: number // always in original space

    if (isVsAI || !apiSessionId) {
      correct = originalIdx === localQ.correctIndex
      correctIndex = localQ.correctIndex
    } else {
      try {
        const result = await revealTrivia(apiSessionId, originalIdx)
        correct = result.correct
        correctIndex = result.correctIndex // original index from backend
      } catch (e) {
        setTriviaSelectedIdx(null)
        if (e instanceof TriviaSessionExpiredError) {
          toast('Question expired — fetching a new one', 'warning')
          // Drop the dead session and force a fresh trivia fetch on next tick.
          setApiSessionId(null)
          setApiQuestion(null)
          setTimeKey(k => k + 1)
        } else {
          toast('Error checking answer — try again', 'error')
        }
        return
      }
    }

    // Convert correct original index to display space for TriviaCard highlight
    setTriviaCorrectIdx(optPerm.indexOf(correctIndex))
    matchLogRef.current = [...matchLogRef.current, { q: displayQ.question.slice(0, 45), correct, time: elapsed }]
    if (correct) sounds.correct()
    else sounds.wrong()

    // Off-chain gameplay: no on-chain commit/reveal per move = zero wallet
    // popups during play. Stake is locked at game start (initialize_game) and
    // released at game end (resign_game from loser → pays winner). The chain
    // is the escrow + settlement layer; the BE WS is the move authority.

    setTimeout(() => {
      toast(correct ? 'Correct! Move placed.' : 'Wrong answer — turn lost.', correct ? 'success' : 'error')
      setTriviaSelectedIdx(null); setTriviaCorrectIdx(null)
      setApiQuestion(null); setApiSessionId(null)
      advanceTurn(correct, pendingCell)
    }, 900)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCell, localQ, apiSessionId, isVsAI, displayQ, anchorClient, publicKey, optPerm])

  /**
   * Forfeit current turn without placing a piece. Centralised so every
   * forfeit path (trivia timeout, Blitz pick-cell timeout, Skip hint with
   * no cell selected) updates state AND broadcasts the turn-flip to the
   * opponent over WebSocket. The earlier bug was that the fallback path
   * mutated `currentPlayer` locally but never called `sendWsEvent`, so the
   * opponent's client thought it was still the original player's turn.
   */
  function forfeitTurnWithoutPlacement() {
    const next: 'X' | 'O' = currentPlayer === 'X' ? 'O' : 'X'
    setCurrentPlayer(next)
    setQuestionIndex(i => i + 1)
    setEliminated([])
    setTimeKey(k => k + 1)
    setPendingCell(null)
    setApiQuestion(null); setApiSessionId(null)
    setTriviaSelectedIdx(null); setTriviaCorrectIdx(null)
    roundCountRef.current += 1
    if (!isVsAI) {
      sendWsEvent({ type: 'board_updated', board: boardRef.current, boardSize: boardSizeRef.current, nextPlayer: next, winner: null, winLine: null })
    }
    // No shift on a forfeit: a shift only follows an actual placement. Calling
    // it here would broadcast the pre-shift board then mutate locally → desync.
  }

  /**
   * Resign the match. The on-chain `resign_game` instruction settles
   * immediately: opponent gets the prize (pot − 2.5% fee), platform fee
   * goes to treasury, and the GameAccount PDA is closed so the wallet
   * is free for a new match. Local state + WS broadcast follows so the
   * opponent sees "You Won" without waiting.
   */
  async function performResign() {
    setConfirmResign(false)
    const oppMark: 'X' | 'O' = myMark === 'X' ? 'O' : 'X'

    // For staked PvP: fire on-chain resign (releases escrow to opponent + closes PDA).
    const stakeNow = parseFloat(sessionStorage.getItem('mddStake') ?? '0')
    if (!isVsAI && stakeNow > 0 && anchorClient && publicKey
        && playerOnePubkeyRef.current && playerTwoPubkeyRef.current) {
      const matchCurrency = sessionStorage.getItem('mddCurrency') ?? 'sol'
      try {
        if (matchCurrency === 'usdc') {
          await resignGameUsdc(anchorClient, publicKey, playerOnePubkeyRef.current, playerTwoPubkeyRef.current, params.matchId)
        } else {
          await resignGame(anchorClient, publicKey, playerOnePubkeyRef.current, playerTwoPubkeyRef.current, params.matchId)
        }
        toast('Resigned. Prize sent to opponent on-chain.', 'warning')
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (/User rejected|rejected by user/i.test(msg)) {
          toast('Resign cancelled — no on-chain action.', 'info')
          return
        }
        // Common race: opponent already settled (e.g. won-on-board) before we
        // could resign. The PDA is closed → tx fails. Treat as already-resolved
        // success since we're conceding anyway.
        if (/InvalidGameState|GameStillActive|AccountNotInitialized|AccountNotFound|0xbc4|3012|already.+(settled|finished|closed)|account.+(does\s?not\s?exist|not.*initialized)/i.test(msg)) {
          toast('Match already settled — opponent claimed the prize.', 'info')
        } else {
          console.error('resignGame failed:', e)
          toast('On-chain resign failed: ' + msg.slice(0, 80), 'error')
        }
      }
    } else {
      toast('You resigned. Opponent wins.', 'warning')
    }

    sounds.lose()
    if (!isVsAI) {
      sendWsEvent({ type: 'board_updated', board: boardRef.current, boardSize: boardSizeRef.current, nextPlayer: null, winner: oppMark, winLine: null })
    }
    setWinner(oppMark)
  }

  const handleTimeout = useCallback(() => {
    const elapsed = parseFloat(((Date.now() - questionStartRef.current) / 1000).toFixed(1))
    matchLogRef.current = [...matchLogRef.current, { q: displayQ.question.slice(0, 45), correct: false, time: elapsed }]
    sounds.timeout()
    toast("Time's up! Turn forfeited.", 'warning')
    if (pendingCell !== null) advanceTurn(false, pendingCell)
    else forfeitTurnWithoutPlacement()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCell, displayQ, currentPlayer])

  /**
   * Apply a hint's local visual effect. Caller is responsible for ensuring
   * any on-chain payment already settled. Returns true if the effect
   * actually applied (false = nothing to do, e.g. eliminate when there's
   * nothing left to eliminate).
   */
  async function applyHintLocal(id: HintId): Promise<boolean> {
    if (id === 'eliminate2') {
      if (isVsAI) {
        // Generate wrong options in display space using the current optPerm
        const wrongDisplay = optPerm
          .map((origIdx, dispIdx) => ({ origIdx, dispIdx }))
          .filter(({ origIdx, dispIdx }) => origIdx !== localQ.correctIndex && !eliminated.includes(dispIdx))
          .map(({ dispIdx }) => dispIdx)
        if (wrongDisplay.length < 2) return false
        const picks = wrongDisplay.sort(() => Math.random() - 0.5).slice(0, 2)
        setEliminated(prev => [...prev, ...picks])
      } else {
        if (!apiSessionId) { toast('No active question session', 'error'); return false }
        try {
          const res = await peekTrivia(apiSessionId, 'eliminate2')
          if (res.type !== 'eliminate2') return false
          // Backend returns original indices — convert to display space via optPerm
          const displayWrong = res.wrongIndices
            .map(origIdx => optPerm.indexOf(origIdx))
            .filter(d => d >= 0 && !eliminated.includes(d))
          setEliminated(prev => [...prev, ...displayWrong])
        } catch (e) {
          toast(e instanceof Error ? e.message : 'Hint reveal failed', 'error')
          return false
        }
      }
      toast('2 wrong answers removed', 'info')
      return true
    }
    if (id === 'category') {
      const cat = (isVsAI || !apiQuestion) ? localQ.category : apiQuestion.category
      setCategoryHint(cat)
      toast(`Category: ${cat}`, 'info')
      return true
    }
    if (id === 'extra-time') {
      setExtraTimeBumps(b => b + 1)
      toast('+8 seconds added', 'info')
      return true
    }
    if (id === 'first-letter') {
      if (isVsAI) {
        const correct = localQ.options[localQ.correctIndex] ?? ''
        const ch = correct.trim().charAt(0).toUpperCase()
        setFirstLetterHint(ch)
      } else {
        if (!apiSessionId) { toast('No active question session', 'error'); return false }
        try {
          const res = await peekTrivia(apiSessionId, 'first-letter')
          if (res.type !== 'first-letter') return false
          setFirstLetterHint(res.firstLetter)
        } catch (e) {
          toast(e instanceof Error ? e.message : 'Hint reveal failed', 'error')
          return false
        }
      }
      toast('First letter revealed', 'info')
      return true
    }
    if (id === 'skip') {
      toast('Question skipped', 'info')
      if (pendingCell !== null) advanceTurn(false, pendingCell)
      else forfeitTurnWithoutPlacement()
      return true
    }
    return false
  }

  /**
   * Entry point for the hint pills. In vs-AI (free practice) we run the
   * effect immediately; in staked PvP we open a confirm dialog so the user
   * sees the cost before signing the on-chain `claim_hint` tx.
   */
  async function requestPurchaseHint(id: HintId) {
    if (purchasingHint) return
    if (usedHints.has(id)) { toast('Hint already used', 'info'); return }
    if (pendingCell === null && id !== 'extra-time') {
      toast('Select a cell first', 'info')
      return
    }
    const stakedPvP = !isVsAI && stake > 0
    if (stakedPvP) {
      // Pre-check balance so we fail fast with a clear message instead of
      // letting the user click through the dialog and have the wallet reject.
      const ok = await hasBalanceForHint(id)
      if (!ok) return
      setHintToConfirm(id)
    } else {
      void executePurchaseHint(id)
    }
  }

  /** Returns true if the user has enough balance to cover the hint price. */
  async function hasBalanceForHint(id: HintId): Promise<boolean> {
    if (!anchorClient || !publicKey) return true
    try {
      if (currency === 'usdc') {
        const bal = await getUsdcBalance(anchorClient.provider.connection, publicKey)
        const need = parseFloat(HINT_PRICE_USDC[id])
        if (bal < need) {
          toast(`Need ${need} USDC for this hint — your balance is ${bal.toFixed(2)} USDC`, 'error')
          return false
        }
      } else {
        const lamports = await anchorClient.provider.connection.getBalance(publicKey)
        const sol = lamports / 1_000_000_000
        const need = parseFloat(HINT_PRICE[id])
        if (sol < need) {
          toast(`Need ${need} SOL for this hint — your balance is ${sol.toFixed(4)} SOL`, 'error')
          return false
        }
      }
      return true
    } catch {
      return true  // RPC blip — let the tx attempt and surface the real error
    }
  }

  /**
   * Run the actual purchase. In staked PvP we fire on-chain `claim_hint`
   * first, only apply effect on confirmation. Each hint is one-shot per
   * match: the on-chain ledger blocks repeats.
   */
  async function executePurchaseHint(id: HintId) {
    setHintToConfirm(null)
    setPurchasingHint(id)
    try {
      const stakedPvP = !isVsAI && stake > 0 && anchorClient && publicKey && playerOnePubkeyRef.current
      let txSig: string | null = null
      if (stakedPvP) {
        try {
          // Off-chain hint payment: split 80/20 to treasury + escrow via direct
          // transfers (bypasses claim_hint program's NotYourTurn guard so both
          // players can buy hints regardless of whose on-chain turn it is).
          txSig = await payHintOffchain(anchorClient!, publicKey!, playerOnePubkeyRef.current!, id, currency)
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Transaction failed'
          if (msg.includes('User rejected')) {
            toast('Hint purchase cancelled', 'info')
          } else if (msg.toLowerCase().includes('insufficient')) {
            toast(`Insufficient ${currency.toUpperCase()} balance for this hint`, 'error')
          } else {
            toast(msg, 'error')
          }
          return
        }
      }
      // Mark used FIRST so a failed-apply doesn't let the user re-buy and
      // double-charge themselves. The on-chain ledger already prevents
      // re-buy server-side; this keeps the UI honest.
      if (stakedPvP) setUsedHints(prev => new Set(prev).add(id))

      const applied = await applyHintLocal(id)
      if (applied) {
        if (!stakedPvP) setUsedHints(prev => new Set(prev).add(id))
        sounds.hint()
      } else if (stakedPvP) {
        // On-chain payment confirmed but local effect couldn't apply (e.g.
        // peek API down, session expired). User is owed the effect — surface
        // it clearly with the tx so they can verify the charge.
        toast(
          txSig
            ? `Hint paid on-chain but couldn't apply locally. Tx: ${txSig.slice(0, 8)}…`
            : 'Hint paid on-chain but couldn\'t apply locally',
          'warning',
        )
      }
    } finally {
      setPurchasingHint(null)
    }
  }

  const isMyTurn   = currentPlayer === myMark && !gameOver
  const isAITurn   = isVsAI && currentPlayer === 'O' && !gameOver
  const isOppTurn  = !isVsAI && currentPlayer !== myMark && !gameOver
  const boardDisabled = gameOver || pendingCell !== null || isAITurn || isOppTurn || isShifting

  const turnText = isShifting ? 'Board is shifting…'
    : isMyTurn ? (pendingCell !== null ? 'Answer to claim cell' : 'Your turn — select a cell')
    : isAITurn ? 'AI is thinking…'
    : 'Opponent\'s turn'

  const modeMeta = MODE_META[gameModeStr] ?? MODE_META.classic
  const placedCount = board.filter(c => c !== null).length

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif", color: INK, display: 'flex', flexDirection: 'column' }}>

      <AnimatePresence>
        {gameOver && winner && <GameOverModal winner={winner} isVsAI={isVsAI} myMark={myMark} stake={stake} currency={currency} />}
      </AnimatePresence>

      <AnimatePresence>
        {modeMsg && <ModeBanner msg={modeMsg} />}
      </AnimatePresence>

      <AnimatePresence>
        {isLoading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG, gap: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${BLUE}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 15, fontWeight: 500, color: MUTED }}>Connecting to match…</p>
            <p style={{ fontSize: 12, color: FAINT, fontFamily: 'ui-monospace, monospace' }}>{params.matchId}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="glass-nav" style={{ height: 64, flexShrink: 0 }}>
        <div className="game-nav-inner" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Image src="/icon-192.png" alt="MindDuel" width={28} height={28} style={{ borderRadius: 8, flexShrink: 0 }} />
            <span className="game-nav-brand" style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.4 }}>MindDuel</span>
            <span className="game-nav-mode" style={{ padding: '3px 9px', borderRadius: 999, background: modeMeta.bg, color: modeMeta.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{modeMeta.label}</span>
            {boardSize > 3 && (
              <span style={{ padding: '3px 9px', borderRadius: 999, background: '#FDECEB', color: '#A81C13', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, flexShrink: 0 }}>{boardSize}×{boardSize}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <SoundToggle />
            {!isVsAI && viewerCount > 0 && (
              <span title={`${viewerCount} watching live`} className="game-nav-viewers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--mdd-bg-soft)', borderRadius: 999, fontSize: 12, fontWeight: 600, color: MUTED }}>
                👁 {viewerCount}
              </span>
            )}
            {!isVsAI && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/spectate/${params.matchId}`
                  navigator.clipboard.writeText(url).then(() => toast('Watch link copied — share it!', 'success')).catch(() => toast('Could not copy link', 'error'))
                }}
                title="Copy spectator link"
                className="game-nav-share"
                style={{ appearance: 'none', border: '1.5px solid var(--mdd-border-strong)', background: 'var(--mdd-card)', color: INK, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                🔗 Share
              </button>
            )}
            {!gameOver && (
              <button
                onClick={() => setConfirmResign(true)}
                title="Resign this match"
                style={{ appearance: 'none', border: '1.5px solid #FCC9C5', background: 'var(--mdd-card)', color: '#A81C13', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="4" y1="22" x2="4" y2="15"/>
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                </svg>
                <span className="game-resign-label">Resign</span>
              </button>
            )}
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </nav>

      <div className="game-layout" style={{ flex: 1, display: 'flex', overflow: 'hidden', maxWidth: 1280, margin: '0 auto', width: '100%' }}>

        {/* ── Board panel ───────────────────────────────────────────── */}
        <div className="game-board-panel" style={{ flex: '0 0 60%', padding: '28px 40px', display: 'flex', flexDirection: 'column', borderRight: '0.5px solid rgba(0,0,0,0.06)' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0, flex: '1 1 auto' }}>
              <PlayerChip
                color={BLUE}
                label="YOU"
                addr={publicKey ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}` : '—'}
                mark={myMark}
                active={currentPlayer === myMark}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: FAINT, letterSpacing: 1 }}>VS</span>
              <PlayerChip
                color={RED}
                label={isVsAI ? 'AI' : 'OPPONENT'}
                addr={(() => {
                  if (isVsAI) return 'MindDuel AI'
                  const opp = myMark === 'X'
                    ? playerTwoPubkeyRef.current?.toBase58()
                    : playerOnePubkeyRef.current?.toBase58()
                  return opp ? `${opp.slice(0, 4)}…${opp.slice(-4)}` : 'waiting…'
                })()}
                mark={myMark === 'X' ? 'O' : 'X'}
                active={currentPlayer !== myMark}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: isVsAI ? 'var(--mdd-bg-soft)' : '#E8F7EE', borderRadius: 999, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 11, color: isVsAI ? MUTED : GREEN_DARK, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>{isVsAI ? 'Mode' : 'Pot'}</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isVsAI ? MUTED : GREEN_DARK, letterSpacing: -0.3 }}>{isVsAI ? 'Free' : `${(stake * 2).toFixed(2)} ${currencyLabel}`}</span>
              </div>
            </div>
          </div>

          {/* Shifting Board: progress until the next shift. The board shifts
              after every 3rd PLACED piece (deterministic on both clients), so
              the indicator counts placed pieces, matching the real trigger. */}
          {gameModeStr === 'shifting' && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7C3AED', letterSpacing: 0.3 }}>SHIFT IN</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED' }}>{3 - (placedCount % 3)} moves</span>
              </div>
              <div style={{ height: 3, background: '#EDE9FE', borderRadius: 999, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${((placedCount % 3) / 3) * 100}%` }}
                  transition={{ duration: 0.3 }}
                  style={{ height: '100%', background: '#7C3AED', borderRadius: 999 }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: isShifting ? ORANGE : isMyTurn ? BLUE : isAITurn ? MUTED : '#E5E5EA', color: (isMyTurn || isAITurn || isShifting) ? '#fff' : INK, padding: '10px 18px', borderRadius: 999, boxShadow: isMyTurn ? `0 6px 20px ${BLUE}40` : isShifting ? `0 6px 20px ${ORANGE}40` : 'none', fontSize: 14, fontWeight: 600, letterSpacing: -0.2, transition: 'background 300ms ease' }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--mdd-card)', opacity: isMyTurn || isAITurn || isShifting ? 1 : 0.4, boxShadow: isMyTurn ? '0 0 0 4px rgba(255,255,255,0.28)' : 'none' }} />
              {turnText}
            </motion.div>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 'min(460px, 100%)', aspectRatio: '1 / 1' }}>
              <motion.div
                animate={isShifting ? { scale: 0.97, opacity: 0.75 } : { scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{ position: 'absolute', inset: 0, background: 'var(--mdd-card)', borderRadius: 24, boxShadow: `0 2px 8px rgba(0,0,0,0.06), 0 0 0 0.5px ${isShifting ? ORANGE : 'rgba(0,0,0,0.05)'}`, padding: 14, overflow: 'hidden', display: 'grid', gridTemplateColumns: `repeat(${boardSize}, 1fr)`, gridTemplateRows: `repeat(${boardSize}, 1fr)`, gap: boardSize === 3 ? 10 : boardSize === 4 ? 8 : 6, transition: 'box-shadow 300ms ease' }}
              >
                {board.map((cell, i) => (
                  <BoardCell key={i} value={cell} isPending={i === pendingCell && !cell} isEmpty={!cell} isWin={winLine?.includes(i) ?? false} isShifting={isShifting} onClick={() => !boardDisabled && handleCellClick(i)} />
                ))}
              </motion.div>
              <AnimatePresence>
                {winLine && winner && winner !== 'draw' && <WinLineOverlay winLine={winLine} winner={winner} boardSize={boardSize} />}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {pendingCell !== null && !gameOver && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} style={{ textAlign: 'center', fontSize: 13, color: BLUE, fontWeight: 600, marginTop: 14 }}>
                Cell {pendingCell + 1} selected — answer to claim
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right: Trivia + Power-ups + Leaderboard ───────────────── */}
        <div className="game-right-panel" style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>

          <AnimatePresence mode="wait">
            {isAITurn ? (
              <motion.div key="ai" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <IconRobot size={28} color="#0071E3" bg="#E5F0FD" />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: INK, marginBottom: 10 }}>AI is thinking…</p>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {[0, 1, 2].map(i => (<motion.span key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.22 }} style={{ width: 8, height: 8, borderRadius: 4, background: BLUE, display: 'inline-block' }} />))}
                  </div>
                </div>
                <p style={{ fontSize: 12, color: MUTED }}>Calculating optimal move…</p>
              </motion.div>

            ) : isOppTurn ? (
              <motion.div key="opp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '32px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[0, 1, 2].map(i => (<motion.span key={i} animate={{ opacity: [0.2, 0.9, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.28 }} style={{ width: 10, height: 10, borderRadius: 5, background: FAINT, display: 'inline-block' }} />))}
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: MUTED }}>Opponent&apos;s turn</p>
                <p style={{ fontSize: 12, color: FAINT, fontFamily: 'ui-monospace, monospace' }}>Waiting for their answer…</p>
              </motion.div>

            ) : !gameOver && pendingCell === null ? (
              <motion.div key="pick-cell" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '40px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
                <IconCrosshair size={28} color="#0071E3" bg="#E5F0FD" />
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: INK, margin: '0 0 4px' }}>Pick a cell</p>
                  <p style={{ fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.5 }}>Click an empty square on the board to claim it.<br />A trivia question will appear — answer correctly to place your piece.</p>
                </div>
                {blitzPickLeft !== null && (
                  <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: blitzPickLeft <= 3 ? '#A81C13' : '#8A5A00', background: blitzPickLeft <= 3 ? '#FDECEB' : '#FFF4E0', padding: '6px 12px', borderRadius: 999, letterSpacing: 0.4 }}>
                    BLITZ · {blitzPickLeft}s LEFT TO PICK
                  </div>
                )}
              </motion.div>

            ) : !gameOver ? (
              <motion.div key={`trivia-${questionIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.05 }}>
                {triviaFetching ? (
                  <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '40px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: `3px solid ${BLUE}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ fontSize: 13, color: MUTED }}>Loading question…</p>
                  </div>
                ) : (
                  <TriviaCard
                    question={effectiveQ}
                    selectedIdx={triviaSelectedIdx}
                    correctIdx={triviaCorrectIdx}
                    onPickAnswer={handlePickAnswer}
                    onTimeout={handleTimeout}
                    disabled={pendingCell === null}
                    eliminated={eliminated}
                    timeKey={timeKey}
                    extraTimeBumps={extraTimeBumps}
                    firstLetterHint={firstLetterHint}
                    categoryHint={categoryHint}
                  />
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Power-ups */}
          {!gameOver && (
            <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.5 }}>POWER-UPS</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: MUTED }}>
                  {isVsAI || stake === 0 ? 'free in practice' : 'paid on-chain to treasury'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['eliminate2', 'category', 'first-letter', 'extra-time', 'skip'] as HintId[]).map(id => {
                  const cost = currency === 'usdc' ? HINT_PRICE_USDC[id] : HINT_PRICE[id]
                  return (
                    <HintPill
                      key={id}
                      id={id}
                      label={HINT_LABEL[id]}
                      cost={cost}
                      currency={currency === 'usdc' ? 'USDC' : 'SOL'}
                      onClick={() => requestPurchaseHint(id)}
                      disabled={usedHints.has(id) || purchasingHint !== null || (pendingCell === null && id !== 'extra-time')}
                      loading={purchasingHint === id}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Live Leaderboard */}
          <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Live Leaderboard</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: GREEN, background: '#E8F7EE', padding: '2px 6px', borderRadius: 6, letterSpacing: 0.3 }}>LIVE</span>
              </div>
              <a href="/leaderboard" style={{ fontSize: 12, color: MUTED, cursor: 'pointer', textDecoration: 'none' }}>View all →</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {LEADERBOARD.map(staticP => {
                // Replace placeholder addrs with the live wallet addresses for
                // this match so the recording shows real on-chain identities.
                const meAddr = publicKey?.toBase58()
                const oppPk = myMark === 'X' ? playerTwoPubkeyRef.current : playerOnePubkeyRef.current
                const oppAddr = isVsAI ? null : oppPk?.toBase58() ?? null
                const fmt = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`
                const p = (staticP as { you?: boolean }).you && meAddr
                  ? { ...staticP, addr: fmt(meAddr) }
                  : (staticP as { opponent?: boolean }).opponent && oppAddr
                  ? { ...staticP, addr: fmt(oppAddr) }
                  : staticP
                return (
                <div key={p.rank} style={{ display: 'flex', alignItems: 'center', padding: (p as { you?: boolean }).you ? '9px 8px' : '9px 4px', borderTop: p.rank !== 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', background: (p as { you?: boolean }).you ? '#F5F9FF' : 'transparent', borderRadius: (p as { you?: boolean }).you ? 10 : 0 }}>
                  <span style={{ width: 22, fontSize: 12, fontWeight: 700, color: p.rank <= 3 ? INK : FAINT, fontVariantNumeric: 'tabular-nums' }}>{p.rank}</span>
                  <div style={{ width: 24, height: 24, borderRadius: 12, marginRight: 10, background: (p as { opponent?: boolean }).opponent ? '#FFE5E2' : (p as { you?: boolean }).you ? '#E5F0FD' : 'var(--mdd-bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: (p as { opponent?: boolean }).opponent ? RED : (p as { you?: boolean }).you ? BLUE : MUTED }}>
                    {(p as { opponent?: boolean }).opponent ? 'O' : (p as { you?: boolean }).you ? 'X' : ''}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: (p as { you?: boolean }).you ? BLUE : INK }}>
                    {p.addr}{(p as { you?: boolean }).you && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: BLUE, background: '#E5F0FD', padding: '1px 5px', borderRadius: 4, letterSpacing: 0.3 }}>YOU</span>}
                  </span>
                  <span style={{ fontSize: 12, color: MUTED, marginRight: 14, fontVariantNumeric: 'tabular-nums' }}>{p.wins}W</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: GREEN_DARK, fontVariantNumeric: 'tabular-nums' }}>{p.sol}</span>
                </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={hintToConfirm !== null}
        title={hintToConfirm ? `Buy ${HINT_LABEL[hintToConfirm]}?` : ''}
        message={
          hintToConfirm ? (
            <>
              <strong>{HINT_LABEL[hintToConfirm]}</strong> — {HINT_DESCRIPTION[hintToConfirm]}
              <br /><br />
              Cost: <strong>{currency === 'usdc' ? HINT_PRICE_USDC[hintToConfirm] : HINT_PRICE[hintToConfirm]} {currency.toUpperCase()}</strong>. Paid directly to the platform treasury on-chain.
              <br /><br />
              <span style={{ fontSize: 12, color: 'var(--mdd-muted)' }}>
                One-shot per match — your wallet will prompt to sign.
              </span>
            </>
          ) : ''
        }
        confirmLabel="Buy & sign"
        cancelLabel="Cancel"
        tone="default"
        onConfirm={() => hintToConfirm && void executePurchaseHint(hintToConfirm)}
        onCancel={() => setHintToConfirm(null)}
      />

      <ConfirmDialog
        open={confirmResign}
        title="Resign this match?"
        message={
          <>
            Your opponent will be declared the winner and you&apos;ll be returned to the lobby.
            {!isVsAI && stake > 0 && (
              <>
                <br /><br />
                <strong>Stake match ({(stake * 2).toFixed(2)} {currency.toUpperCase()} pot):</strong> resigning sends the pot
                {' '}({(stake * 2 * 0.975).toFixed(3)} {currency.toUpperCase()} after 2.5% fee) to your opponent on-chain. You forfeit your full stake of {stake} {currency.toUpperCase()}.
              </>
            )}
          </>
        }
        confirmLabel="Yes, resign"
        cancelLabel="Keep playing"
        tone="danger"
        onConfirm={performResign}
        onCancel={() => setConfirmResign(false)}
      />
    </div>
  )
}
