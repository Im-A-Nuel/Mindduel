'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { PublicKey } from '@solana/web3.js'
import type { AIDifficulty } from '@/lib/ai'
import { cn } from '@/lib/utils'
import { NavBar } from '@/components/layout/NavBar'
import { createMatch, joinMatch, queueMatch, getMatchForPlayer, getGuestId, fetchLiveStats, leaveQueue, type LiveStats } from '@/lib/api'
import { useAnchorClient } from '@/hooks/useAnchorClient'
import {
  initializeGame,
  joinGame,
  initializeGameUsdc,
  joinGameUsdc,
  getUsdcBalance,
  hasOpenGame,
  fetchOpenGame,
  settleGame,
  settleGameUsdc,
  cancelMatch,
  cancelMatchUsdc,
  resignGame,
  resignGameUsdc,
  type OpenGameInfo,
} from '@/lib/anchor-client'
import { MOCK_USDC_MINT, USDC_DECIMALS } from '@/lib/constants'
import { UsdcFaucetButton } from '@/components/UsdcFaucetButton'
import { useToast } from '@/components/ui/Toast'
import { useIsOnline } from '@/components/NetworkStatus'
import { useNetworkCheck } from '@/hooks/useNetworkCheck'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

type Currency = 'sol' | 'usdc'

const STAKE_STEPS: Record<Currency, { step: number; min: number; default: number; suffix: string; format: (v: number) => string }> = {
  sol:  { step: 0.01, min: 0.01, default: 0.05, suffix: 'SOL',  format: v => v.toFixed(2) },
  usdc: { step: 1,    min: 1,    default: 5,    suffix: 'USDC', format: v => v.toFixed(0) },
}

// Reserve a small SOL amount for tx fees + escrow ATA rent so user
// doesn't accidentally lock their entire balance and get insufficient-funds.
const SOL_FEE_BUFFER = 0.005

// ── Design tokens ────────────────────────────────────────────────────
const BLUE   = '#0071E3'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const GREEN  = '#34C759'
const GREEN_DARK = '#0A7A2D'

// ── Data ─────────────────────────────────────────────────────────────
const MODES = [
  { id: 'classic',  name: 'Classic Duel',    desc: 'Standard 3×3, first to align 3.', tag: 'EASY',    tagBg: '#E8F7EE', tagColor: GREEN_DARK,  available: true },
  { id: 'shifting', name: 'Shifting Board',  desc: 'Rows & columns shift every 3 turns.', tag: 'MEDIUM', tagBg: '#FFF4E0', tagColor: '#8A5A00', available: true },
  { id: 'scaleup',  name: 'Scale Up',        desc: 'Board grows from 3×3 → 5×5.',      tag: 'HARD',    tagBg: '#FDECEB', tagColor: '#A81C13',   available: true },
  { id: 'blitz',    name: 'Blitz',           desc: '5-second answers. No mercy.',       tag: 'INTENSE', tagBg: '#FDECEB', tagColor: '#A81C13',   available: true },
  { id: 'vs-ai',   name: 'vs AI',           desc: 'Practice vs MindDuel AI. Free.',    tag: 'FREE',    tagBg: '#E5F0FD', tagColor: BLUE,        available: true },
] as const

type ModeId = typeof MODES[number]['id']

function IconClassicDuel() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <line x1="8" y1="1.5" x2="8" y2="22.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <line x1="16" y1="1.5" x2="16" y2="22.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <line x1="1.5" y1="8" x2="22.5" y2="8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <line x1="1.5" y1="16" x2="22.5" y2="16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <line x1="2.5" y1="2.5" x2="6.5" y2="6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <line x1="6.5" y1="2.5" x2="2.5" y2="6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7"/>
      <line x1="17.5" y1="17.5" x2="21.5" y2="21.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <line x1="21.5" y1="17.5" x2="17.5" y2="21.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  )
}

function IconShiftingBoard() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <line x1="8" y1="1.5" x2="8" y2="22.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.25"/>
      <line x1="16" y1="1.5" x2="16" y2="22.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.25"/>
      <line x1="1.5" y1="8" x2="22.5" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.25"/>
      <line x1="1.5" y1="16" x2="22.5" y2="16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.25"/>
      <path d="M12 4.5 A7.5 7.5 0 1 1 4.5 12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" fill="none"/>
      <path d="M9.2 1.8 L12.2 5 L15.2 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconScaleUp() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="1.5" y="1.5" width="9.5" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
      <line x1="6.25" y1="1.5" x2="6.25" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="1.5" y1="6.25" x2="11" y2="6.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M22.5 1.5 L17.5 1.5 M22.5 1.5 L22.5 6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
      <path d="M13 22.5 L22.5 22.5 L22.5 13" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="13" y1="17.5" x2="22.5" y2="17.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.4"/>
      <line x1="17.5" y1="13" x2="17.5" y2="22.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.4"/>
    </svg>
  )
}

function IconBlitz() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2 L5 13.5 L11.2 13.5 L10 22 L19 10.5 L12.8 10.5 Z"/>
    </svg>
  )
}

function IconVsAI() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.7"/>
      <line x1="9.5" y1="6.5" x2="9.5" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="14.5" y1="6.5" x2="14.5" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="9.5" y1="17.5" x2="9.5" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="14.5" y1="17.5" x2="14.5" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="6.5" y1="9.5" x2="3" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="6.5" y1="14.5" x2="3" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="17.5" y1="9.5" x2="21" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="17.5" y1="14.5" x2="21" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
    </svg>
  )
}

const MODE_ICONS: Record<ModeId, React.ReactElement> = {
  'classic':  <IconClassicDuel />,
  'shifting': <IconShiftingBoard />,
  'scaleup':  <IconScaleUp />,
  'blitz':    <IconBlitz />,
  'vs-ai':    <IconVsAI />,
}

const CATEGORIES = ['General Knowledge', 'Crypto & Web3', 'Science', 'History', 'Math', 'Pop Culture']

const DIFFICULTIES: { id: AIDifficulty; label: string; desc: string; tag: string; tagBg: string; tagColor: string }[] = [
  { id: 'easy',   label: 'Easy',   desc: 'AI plays randomly most of the time.',    tag: 'EASY',   tagBg: '#E8F7EE', tagColor: GREEN_DARK },
  { id: 'medium', label: 'Medium', desc: 'Balanced. AI mixes smart and random.',    tag: 'MEDIUM', tagBg: '#FFF4E0', tagColor: '#8A5A00' },
  { id: 'hard',   label: 'Hard',   desc: 'Perfect minimax. Every move is optimal.', tag: 'HARD',   tagBg: '#FDECEB', tagColor: '#A81C13' },
]

function ModeCard({ mode, selected, onClick }: { mode: typeof MODES[number]; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={() => mode.available && onClick()}
      disabled={!mode.available}
      whileHover={mode.available ? { scale: 1.02 } : {}}
      whileTap={mode.available ? { scale: 0.98 } : {}}
      className="glass-panel"
      style={{
        appearance: 'none', textAlign: 'left', fontFamily: 'inherit',
        flex: '0 0 auto', width: 158, padding: '16px 14px',
        borderRadius: 18,
        border: selected
          ? `2px solid ${BLUE}`
          : '2px solid transparent',
        boxShadow: selected
          ? '0 6px 20px rgba(0,113,227,0.22), inset 0 1px 0 rgba(255,255,255,0.10)'
          : undefined,
        cursor: mode.available ? 'pointer' : 'not-allowed',
        opacity: mode.available ? 1 : 0.42,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 14, background: selected ? '#E5F0FD' : 'var(--mdd-bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selected ? BLUE : INK }}>
        {MODE_ICONS[mode.id]}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: INK, letterSpacing: -0.3, lineHeight: 1.2 }}>{mode.name}</div>
      <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.4, flex: 1 }}>{mode.desc}</div>
      <div style={{ alignSelf: 'flex-start', padding: '4px 9px', borderRadius: 999, background: mode.tagBg, color: mode.tagColor, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3 }}>
        {mode.tag}
      </div>
    </motion.button>
  )
}

function CategoryChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.96 }} style={{ appearance: 'none', fontFamily: 'inherit', flexShrink: 0, padding: '7px 14px', borderRadius: 999, background: selected ? BLUE : 'var(--mdd-card)', color: selected ? '#fff' : INK, border: 'none', boxShadow: selected ? '0 2px 8px rgba(0,113,227,0.25)' : '0 0 0 0.5px rgba(0,0,0,0.10)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 140ms ease' }}>
      {selected && <span style={{ fontSize: 10 }}>✓</span>}
      {label}
    </motion.button>
  )
}

// Currency-specific theming so SOL and USDC are visually distinct.
const CURRENCY_THEME: Record<Currency, { primary: string; soft: string; gradient: string; symbol: string }> = {
  sol:  { primary: '#9945FF', soft: '#F1EBFE', gradient: 'linear-gradient(135deg, #9945FF, #14F195)', symbol: '◎' },
  usdc: { primary: '#2775CA', soft: '#E5F0FD', gradient: 'linear-gradient(135deg, #2775CA, #1B5DA5)', symbol: '$' },
}

function CurrencyIcon({ currency, size = 28 }: { currency: Currency; size?: number }) {
  const t = CURRENCY_THEME[currency]
  return (
    <div
      aria-label={currency.toUpperCase()}
      style={{
        width: size, height: size, borderRadius: size / 2,
        background: t.gradient, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.5, fontWeight: 700,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',
        flexShrink: 0,
      }}
    >
      {t.symbol}
    </div>
  )
}

function StakeInput({
  value,
  currency,
  balance,
  onChange,
  onStep,
}: {
  value: number
  currency: Currency
  /** User's wallet balance in this currency. null = unknown / not connected. */
  balance: number | null
  onChange: (v: number) => void
  onStep: (d: number) => void
}) {
  const cfg = STAKE_STEPS[currency]
  const theme = CURRENCY_THEME[currency]
  // Effective max derives from wallet balance. SOL keeps a small buffer for fees.
  const balanceMax = balance === null
    ? null
    : currency === 'sol'
      ? Math.max(0, balance - SOL_FEE_BUFFER)
      : balance
  // If we don't know the balance yet, allow up to a sane upper bound so the
  // UI is still functional. Real check happens in validateBeforeCreate().
  const effectiveMax = balanceMax ?? (currency === 'sol' ? 100 : 10_000)
  const [draft, setDraft] = useState<string>(cfg.format(value))

  // Sync draft when external value changes (e.g., currency toggle, +/- buttons)
  useEffect(() => {
    setDraft(cfg.format(value))
  }, [value, currency])  // eslint-disable-line react-hooks/exhaustive-deps

  function commitDraft() {
    const parsed = parseFloat(draft)
    if (Number.isFinite(parsed) && parsed >= cfg.min) {
      const clamped = Math.min(parsed, effectiveMax)
      const final = Math.max(cfg.min, clamped)
      const rounded = currency === 'usdc' ? Math.round(final) : parseFloat(final.toFixed(2))
      onChange(rounded)
      setDraft(cfg.format(rounded))
    } else {
      setDraft(cfg.format(value))
    }
  }

  const exceedsBalance = balanceMax !== null && value > balanceMax
  const noBalance      = balanceMax !== null && balanceMax < cfg.min

  const BtnStyle: React.CSSProperties = {
    appearance: 'none', border: 'none', fontFamily: 'inherit',
    width: 40, height: 40, borderRadius: 14,
    background: 'var(--mdd-bg)', color: INK, fontSize: 22, fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }

  function setMax() {
    if (balanceMax === null || balanceMax < cfg.min) return
    const rounded = currency === 'usdc' ? Math.floor(balanceMax) : parseFloat(balanceMax.toFixed(2))
    onChange(rounded)
    setDraft(cfg.format(rounded))
  }

  const borderColor = exceedsBalance ? '#FF3B30' : `${theme.primary}25`

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        background: 'var(--mdd-card)', borderRadius: 14,
        padding: '12px 12px 10px',
        boxShadow: `0 0 0 1px ${borderColor}`,
        gap: 8,
        transition: 'box-shadow 180ms ease',
      }}
    >
      {/* Top row: − / amount cluster / + */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={BtnStyle} onClick={() => onStep(-cfg.step)} aria-label="Decrease stake">−</button>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <CurrencyIcon currency={currency} size={24} />
          <input
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={e => {
              const cleaned = e.target.value.replace(/[^0-9.]/g, '')
              const dotCount = (cleaned.match(/\./g) ?? []).length
              const safe = dotCount > 1 ? cleaned.replace(/\.+$/, '') : cleaned
              setDraft(safe.slice(0, 10))
            }}
            onBlur={commitDraft}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            aria-label="Stake amount"
            maxLength={10}
            style={{
              appearance: 'none', border: 'none', outline: 'none',
              fontFamily: 'inherit',
              fontSize: 22, fontWeight: 700, color: theme.primary,
              fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4,
              textAlign: 'right',
              background: 'transparent', padding: 0,
              minWidth: 36, width: `${Math.max(3, Math.min(8, draft.length || 1))}ch`,
              maxWidth: '8ch',
            }}
          />
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: theme.primary,
            background: theme.soft, padding: '3px 9px', borderRadius: 999,
            letterSpacing: 0.5, flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            {cfg.suffix}
          </span>
        </div>

        <button style={BtnStyle} onClick={() => onStep(cfg.step)} aria-label="Increase stake">+</button>
      </div>

      {/* Bottom row: balance + max button */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 4px 0', borderTop: '0.5px solid rgba(0,0,0,0.05)',
        gap: 8, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
          <span style={{ fontSize: 10.5, color: MUTED, fontWeight: 500 }}>
            Balance · Pot
          </span>
          <span style={{ fontSize: 12, color: exceedsBalance ? '#A81C13' : INK, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {balance === null
              ? <span style={{ color: MUTED, fontWeight: 500 }}>Connect wallet</span>
              : <>{cfg.format(balance)}</>}
            <span style={{ color: MUTED, fontWeight: 500, margin: '0 6px' }}>·</span>
            <span style={{ color: theme.primary }}>{cfg.format(value * 2)}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={setMax}
          disabled={balanceMax === null || balanceMax < cfg.min}
          style={{
            appearance: 'none', border: 'none',
            background: theme.soft, color: theme.primary,
            padding: '5px 10px', borderRadius: 8,
            fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4,
            fontFamily: 'inherit',
            cursor: balanceMax === null || balanceMax < cfg.min ? 'not-allowed' : 'pointer',
            opacity: balanceMax === null || balanceMax < cfg.min ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          MAX
        </button>
      </div>

      {noBalance && (
        <span style={{ fontSize: 10.5, color: '#A81C13', fontWeight: 500, padding: '0 4px' }}>
          Not enough {cfg.suffix} to stake. Minimum is {cfg.format(cfg.min)}.
        </span>
      )}
    </div>
  )
}

function CurrencyToggle({ value, onChange, disabled }: { value: Currency; onChange: (v: Currency) => void; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--mdd-bg)', borderRadius: 12 }}>
      {(['sol', 'usdc'] as const).map(c => {
        const active = value === c
        return (
          <button
            key={c}
            onClick={() => !disabled && onChange(c)}
            disabled={disabled}
            style={{
              appearance: 'none', border: 'none', flex: 1, padding: '8px 12px',
              background: active ? 'var(--mdd-card)' : 'transparent',
              color: active ? INK : MUTED,
              borderRadius: 9, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
              cursor: disabled ? 'not-allowed' : 'pointer',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
              transition: 'all 140ms ease',
            }}
          >
            {c === 'sol' ? 'SOL' : 'Mock USDC'}
          </button>
        )
      })}
    </div>
  )
}

function PlayTypeToggle({ value, onChange }: { value: 'free' | 'stake'; onChange: (v: 'free' | 'stake') => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {(['free', 'stake'] as const).map(id => {
        const active = value === id
        return (
          <motion.button key={id} onClick={() => onChange(id)} whileTap={{ scale: 0.98 }} style={{ appearance: 'none', fontFamily: 'inherit', flex: 1, padding: '12px', borderRadius: 14, background: active ? BLUE : 'var(--mdd-card)', color: active ? '#fff' : INK, border: active ? `2px solid ${BLUE}` : '2px solid transparent', boxShadow: active ? '0 4px 12px rgba(0,113,227,0.22)' : '0 0 0 0.5px rgba(0,0,0,0.10)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 160ms ease' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{id === 'free' ? 'Free Play' : 'Stake Mode'}</span>
            <span style={{ fontSize: 11, opacity: active ? 0.85 : 0.6 }}>{id === 'free' ? 'Just for fun' : 'Real SOL'}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-[20px] p-[22px]', className)} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}>
      {children}
    </div>
  )
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: INK, letterSpacing: -0.2 }}>{children}</span>
      {hint && <span style={{ fontSize: 11, color: MUTED }}>{hint}</span>}
    </div>
  )
}

// ── Join Code Modal ────────────────────────────────────────────────────
function JoinCodeModal({ code, matchId, onStart }: { code: string; matchId: string; onStart: () => void }) {
  const [copied, setCopied] = useState(false)
  function copyCode() {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)' }}>
      <motion.div initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 20 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }} style={{ width: '100%', maxWidth: 380, background: 'var(--mdd-card)', borderRadius: 24, padding: '32px 28px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ width: 72, height: 72, borderRadius: 36, background: '#E8F7EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 16.5L13.5 22L24 11" stroke="#34C759" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, margin: '0 0 6px', color: INK }}>Match Created!</h2>
        <p style={{ fontSize: 14, color: MUTED, margin: '0 0 22px', lineHeight: 1.4 }}>Share this code with your opponent</p>

        <div style={{ background: 'var(--mdd-bg)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 26, fontWeight: 700, letterSpacing: 4, color: INK }}>{code}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Match ID: {matchId.slice(0, 8)}…</div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <button onClick={copyCode} style={{ flex: 1, appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)', background: 'var(--mdd-card)', color: INK, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
            {copied ? '✓ Copied!' : 'Copy Code'}
          </button>
          <button onClick={onStart} style={{ flex: 1, appearance: 'none', border: 'none', background: BLUE, color: '#fff', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,113,227,0.25)' }}>
            Start Game →
          </button>
        </div>
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Opponent can join anytime using this code</p>
      </motion.div>
    </motion.div>
  )
}

// ── Stuck Match Recovery Modal ────────────────────────────────────────
function StuckMatchModal({
  info, matchId, busy, onResume, onSettle, onCancel, onResign, onClose,
}: {
  info: OpenGameInfo
  matchId: string | null
  busy: boolean
  onResume: () => void
  onSettle: () => void
  onCancel: () => void
  onResign: () => void
  onClose: () => void
}) {
  const stake = info.currency === 'sol'
    ? (info.stakePerPlayer.toNumber() / LAMPORTS_PER_SOL).toFixed(3) + ' SOL'
    : (info.stakePerPlayer.toNumber() / 10 ** USDC_DECIMALS).toFixed(2) + ' USDC'
  const hours = Math.floor(info.secsUntilTimeout / 3600)
  const mins  = Math.floor((info.secsUntilTimeout % 3600) / 60)

  const isWaiting  = info.status === 'waitingForPlayer'
  const isActive   = info.status === 'active'
  const isFinished = info.status === 'finished' || info.status === 'cancelled'

  const headline = isWaiting  ? 'Open match — no opponent yet'
                 : isActive   ? 'Active match in progress'
                 : 'Old match needs cleanup'

  const blurb = isWaiting  ? `You created a match for ${stake} but no one joined. Resume to wait for a player, or wait for the 24h timeout to refund.`
              : isActive   ? `You have a match running with ${stake} on the line. Continue playing.`
              : 'A previous match is still on-chain. Try Settle to release escrow and clear it.'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)' }}>
      <motion.div initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 20 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }} style={{ width: '100%', maxWidth: 420, background: 'var(--mdd-card)', borderRadius: 24, padding: '28px 26px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: '#FFF4E0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>⏸</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, margin: '0 0 6px', color: INK, textAlign: 'center' }}>{headline}</h2>
        <p style={{ fontSize: 13, color: MUTED, margin: '0 0 18px', lineHeight: 1.5, textAlign: 'center' }}>{blurb}</p>

        <div style={{ background: 'var(--mdd-bg)', borderRadius: 12, padding: '12px 14px', marginBottom: 18, fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
          <div><strong style={{ color: INK }}>Stake:</strong> {stake}</div>
          <div><strong style={{ color: INK }}>Status:</strong> {info.status}</div>
          {info.playerTwo && (<div><strong style={{ color: INK }}>Opponent:</strong> {info.playerTwo.toBase58().slice(0, 6)}…{info.playerTwo.toBase58().slice(-4)}</div>)}
          <div><strong style={{ color: INK }}>Timeout in:</strong> {info.secsUntilTimeout > 0 ? `${hours}h ${mins}m` : 'eligible now'}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(isWaiting || isActive) && matchId && (
            <button onClick={onResume} disabled={busy} style={{ appearance: 'none', border: 'none', width: '100%', padding: '13px', background: BLUE, color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: busy ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(0,113,227,0.25)' }}>
              Resume match
            </button>
          )}
          {isWaiting && (
            <button onClick={onCancel} disabled={busy} style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)', width: '100%', padding: '13px', background: 'var(--mdd-card)', color: INK, borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Cancelling…' : 'Cancel match (refund stake)'}
            </button>
          )}
          {isActive && (
            <button onClick={onResign} disabled={busy} style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)', width: '100%', padding: '13px', background: 'var(--mdd-card)', color: INK, borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Resigning…' : 'Resign (forfeit stake → opponent wins)'}
            </button>
          )}
          {(isActive || isFinished) && (
            <button onClick={onSettle} disabled={busy} style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)', width: '100%', padding: '13px', background: 'var(--mdd-card)', color: INK, borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Settling…' : info.secsUntilTimeout > 0 ? `Force settle (avail in ${hours}h ${mins}m)` : 'Force settle (release escrow)'}
            </button>
          )}
          <button onClick={onClose} style={{ appearance: 'none', border: 'none', width: '100%', padding: '12px', background: 'transparent', color: MUTED, borderRadius: 12, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
            Use another wallet instead
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────
export default function LobbyPage() {
  const router = useRouter()
  const { publicKey } = useWallet()
  const { setVisible: setWalletModalVisible } = useWalletModal()
  const { connection } = useConnection()
  const anchorClient = useAnchorClient()
  const toast = useToast()
  const isOnline = useIsOnline()
  const networkCheck = useNetworkCheck()
  const [solBalance, setSolBalance] = useState<number | null>(null)
  const [liveStats, setLiveStats]   = useState<LiveStats | null>(null)
  const [statsError, setStatsError] = useState(false)

  const [selectedMode, setSelectedMode] = useState<ModeId>('classic')
  const [playType, setPlayType]         = useState<'free' | 'stake'>('stake')
  const [currency, setCurrency]         = useState<Currency>('sol')
  const [stake, setStake]               = useState(STAKE_STEPS.sol.default)
  const [usdcBalance, setUsdcBalance]   = useState<number | null>(null)
  const [cats, setCats]                 = useState<string[]>(['General Knowledge', 'Crypto & Web3'])
  const [difficulty, setDifficulty]     = useState<AIDifficulty>('hard')
  const [matchmaking, setMatchmaking]   = useState(false)
  const [matchmakingPhase, setMatchmakingPhase] = useState<'idle' | 'creating' | 'waiting'>('idle')

  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false)
  const [generatedJoinCode, setGeneratedJoinCode] = useState('')
  const [stuckGame, setStuckGame] = useState<{ info: OpenGameInfo; matchId: string | null } | null>(null)
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [generatedMatchId, setGeneratedMatchId]   = useState('')

  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joinError, setJoinError]         = useState('')
  const [joining, setJoining]             = useState(false)
  const [showLivePopup, setShowLivePopup] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isVsAI = selectedMode === 'vs-ai'

  function toggleCat(c: string) {
    setCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  function stepStake(d: number) {
    const cfg = STAKE_STEPS[currency]
    const balance = currency === 'sol' ? solBalance : usdcBalance
    const max = balance === null ? Number.POSITIVE_INFINITY
      : currency === 'sol' ? Math.max(0, balance - SOL_FEE_BUFFER)
      : balance
    setStake(s => {
      const next = s + d
      const rounded = currency === 'usdc' ? Math.round(next) : parseFloat(next.toFixed(2))
      return Math.max(cfg.min, Math.min(max, rounded))
    })
  }
  function changeCurrency(next: Currency) {
    setCurrency(next)
    setStake(STAKE_STEPS[next].default)
  }

  async function refreshUsdcBalance() {
    if (!publicKey || !MOCK_USDC_MINT) {
      setUsdcBalance(null)
      return
    }
    try {
      const bal = await getUsdcBalance(connection, publicKey)
      setUsdcBalance(bal)
    } catch {
      setUsdcBalance(0)
    }
  }

  useEffect(() => {
    if (currency === 'usdc') refreshUsdcBalance()
  }, [currency, publicKey])  // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh SOL balance when wallet connects/changes
  useEffect(() => {
    if (!publicKey) { setSolBalance(null); return }
    connection.getBalance(publicKey)
      .then(lamports => setSolBalance(lamports / LAMPORTS_PER_SOL))
      .catch(() => setSolBalance(null))
  }, [publicKey, connection])

  // Poll live stats from backend every 10s while lobby is mounted
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const s = await fetchLiveStats()
        if (!cancelled) { setLiveStats(s); setStatsError(false) }
      } catch {
        if (!cancelled) setStatsError(true)
      }
    }
    load()
    const id = setInterval(load, 10_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // Warn user if they try to leave page during in-flight transaction
  useEffect(() => {
    if (!matchmaking) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [matchmaking])

  /**
   * Run all pre-create checks. Returns null when OK, else a message to show.
   */
  function validateBeforeCreate(): string | null {
    if (!isOnline) return 'You’re offline. Reconnect to continue.'
    if (!publicKey) return 'Connect your wallet to create a match.'
    if (cats.length === 0) return 'Pick at least one trivia category to start.'
    if (isVsAI) return null
    if (playType === 'free') return null

    // Stake mode-specific validations
    const cfg = STAKE_STEPS[currency]
    if (!Number.isFinite(stake) || stake <= 0) return 'Stake must be greater than zero.'
    if (stake < cfg.min) return `Minimum stake is ${cfg.format(cfg.min)} ${cfg.suffix}.`

    if (currency === 'usdc') {
      if (!MOCK_USDC_MINT) return 'Mock USDC is not configured on this build.'
      if (usdcBalance === null) return 'Checking USDC balance — try again in a moment.'
      if (usdcBalance < stake) return `Need ${stake} USDC but you have ${usdcBalance.toFixed(2)}. Claim from the faucet.`
    } else {
      // SOL stake: gas + rent are sponsored by the backend, user only needs
      // the stake itself in their wallet.
      if (solBalance !== null && solBalance < stake) {
        return `Need ${stake.toFixed(3)} SOL but you have ${solBalance.toFixed(3)}.`
      }
    }
    return null
  }

  // Reactive validation state for disabling button + showing inline hint
  const validationError = (() => {
    if (!publicKey) return 'Connect your wallet to play.'
    if (cats.length === 0) return 'Pick at least one trivia category.'
    if (!isVsAI && playType === 'stake') {
      const cfg = STAKE_STEPS[currency]
      if (!Number.isFinite(stake) || stake < cfg.min) return `Min stake is ${cfg.format(cfg.min)} ${cfg.suffix}.`
    }
    return null
  })()

  function saveCommonSession() {
    sessionStorage.setItem('mddVsAI', isVsAI ? '1' : '0')
    sessionStorage.setItem('mddMode', selectedMode)
    sessionStorage.setItem('mddDifficulty', difficulty)
    sessionStorage.setItem('mddStake', isVsAI ? '0' : String(playType === 'free' ? 0 : stake))
    sessionStorage.setItem('mddCategories', JSON.stringify(cats))
    sessionStorage.setItem('mddCurrency', isVsAI || playType === 'free' ? 'sol' : currency)
  }

  async function handleCreate() {
    const err = validateBeforeCreate()
    if (err) {
      toast(err, 'warning')
      return
    }

    setMatchmaking(true)
    setMatchmakingPhase('creating')
    saveCommonSession()

    if (isVsAI) {
      sessionStorage.setItem('mddMyMark', 'X')
      await new Promise(r => setTimeout(r, 600))
      router.push('/game/vs-ai-' + Date.now())
      return
    }

    let matchCreated = false
    try {
      const playerId = publicKey?.toBase58() ?? getGuestId()
      const stakeVal = playType === 'free' ? 0 : stake
      const matchCurrency = playType === 'free' ? 'sol' : currency
      const match = await createMatch(playerId, selectedMode, stakeVal, matchCurrency, cats, difficulty)
      matchCreated = true

      if (anchorClient && publicKey && stakeVal > 0) {
        // Pre-flight: detect a stuck open match for this wallet BEFORE asking
        // Phantom to sign — otherwise the user sees the scary "transaction
        // reverted during simulation" prompt with no way to act on it.
        try {
          // Each match now lives at its own PDA (seeds include a per-match
          // nonce), so a prior match no longer blocks creating a new one. We
          // still OFFER recovery if the player has an earlier match whose
          // on-chain game is unfinished — derive that game from the OLD match's
          // id, not the one we just created.
          const beMatch = await getMatchForPlayer(publicKey.toBase58()).catch(() => null)
          if (beMatch?.matchId && beMatch.matchId !== match.matchId) {
            const info = await fetchOpenGame(anchorClient, publicKey, beMatch.matchId).catch(() => null)
            if (info && (info.status === 'waitingForPlayer' || info.status === 'active')) {
              setStuckGame({ info, matchId: beMatch.matchId })
              setMatchmaking(false)
              setMatchmakingPhase('idle')
              return
            }
          }
        } catch {
          // RPC failure during pre-flight — fall through and let the actual
          // tx attempt surface the real error.
        }
        try {
          if (currency === 'usdc') {
            await initializeGameUsdc(anchorClient, publicKey, stakeVal, selectedMode, match.matchId)
          } else {
            await initializeGame(anchorClient, publicKey, stakeVal, selectedMode, match.matchId)
          }
          sessionStorage.setItem('mddPlayerOnePubkey', publicKey.toBase58())
          sessionStorage.setItem('mddPlayerTwoPubkey', '')
        } catch (e) {
          // On-chain init failed — can't proceed since stake wasn't escrowed
          const msg = e instanceof Error ? e.message : String(e)
          if (/User rejected|user rejected|rejected by user/i.test(msg)) {
            toast('Transaction rejected in wallet.', 'warning')
          } else if (/insufficient/i.test(msg)) {
            toast('Insufficient balance to cover stake + fees.', 'error')
          } else if (/already.+exists|account.+already/i.test(msg)) {
            toast('You already have an open match. Settle or cancel it first.', 'error')
          } else if (/blockhash|timed?\s?out/i.test(msg)) {
            toast('Network timeout. Try again.', 'error')
          } else {
            toast('Failed to lock stake on-chain. ' + msg.slice(0, 100), 'error')
          }
          console.error('On-chain initializeGame failed:', e)
          setMatchmaking(false)
          setMatchmakingPhase('idle')
          return
        }
      }

      sessionStorage.setItem('mddMyMark', 'X')
      setGeneratedJoinCode(match.joinCode)
      setGeneratedMatchId(match.matchId)
      setShowJoinCodeModal(true)
      setMatchmaking(false)
      setMatchmakingPhase('idle')
      // Refresh balance after stake locked
      if (publicKey) {
        connection.getBalance(publicKey).then(l => setSolBalance(l / LAMPORTS_PER_SOL)).catch(() => {})
        if (currency === 'usdc') refreshUsdcBalance()
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('createMatch failed:', e)
      if (!matchCreated) {
        toast(/network|fetch|failed.+fetch/i.test(msg)
          ? 'Cannot reach matchmaking server. Check connection.'
          : 'Failed to create match. Try again.', 'error')
      }
      setMatchmaking(false)
      setMatchmakingPhase('idle')
    }
  }

  async function handleJoinWithCode() {
    if (!isOnline) {
      toast('You’re offline. Reconnect to continue.', 'warning')
      return
    }
    if (!publicKey) {
      setJoinError('Connect wallet to join.')
      toast('Connect your wallet to join a match.', 'warning')
      return
    }
    const code = joinCodeInput.trim().toUpperCase()
    if (!code) {
      setJoinError('Enter a join code.')
      return
    }
    if (code.length < 6) {
      setJoinError('Code looks too short.')
      return
    }
    setJoinError('')
    setJoining(true)
    try {
      const playerId = publicKey.toBase58()
      const result = await joinMatch(code, playerId)
      if (!result) {
        setJoinError('Code not found or match already started.')
        setJoining(false)
        return
      }
      // Self-join check
      if (result.playerOne && publicKey && result.playerOne === publicKey.toBase58()) {
        setJoinError('You created this match — share the code instead.')
        setJoining(false)
        return
      }
      // Pre-check balance so we fail fast in lobby instead of routing the
      // user into the game page and bouncing them back after wallet reject.
      if (anchorClient && publicKey && result.stake > 0) {
        try {
          if (result.currency === 'usdc') {
            const usdc = await getUsdcBalance(connection, publicKey)
            if (usdc < result.stake) {
              setJoinError(`Need ${result.stake} USDC to match the stake — you have ${usdc.toFixed(2)} USDC. Top up via the faucet.`)
              setJoining(false)
              return
            }
          } else {
            const lamports = await connection.getBalance(publicKey)
            const sol = lamports / LAMPORTS_PER_SOL
            // Add a small buffer for tx fees (sponsor pays, but fall-back path needs it).
            if (sol < result.stake + 0.001) {
              setJoinError(`Need ${result.stake} SOL to match the stake — you have ${sol.toFixed(4)} SOL.`)
              setJoining(false)
              return
            }
          }
        } catch {
          // RPC blip — let the tx attempt and surface the real error from chain.
        }
      }
      if (anchorClient && publicKey && result.stake > 0 && result.playerOne) {
        try {
          const playerOnePubkey = new PublicKey(result.playerOne)
          if (result.currency === 'usdc') {
            await joinGameUsdc(anchorClient, publicKey, playerOnePubkey, result.matchId)
          } else {
            await joinGame(anchorClient, publicKey, playerOnePubkey, result.matchId)
          }
          sessionStorage.setItem('mddPlayerOnePubkey', result.playerOne)
          sessionStorage.setItem('mddPlayerTwoPubkey', publicKey.toBase58())
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          console.error('On-chain joinGame failed:', e)
          if (/User rejected|rejected by user/i.test(msg)) {
            toast('Transaction rejected in wallet.', 'warning')
          } else if (/insufficient/i.test(msg)) {
            toast('Insufficient balance to match the stake.', 'error')
          } else if (/GameAlreadyFull|already.+full/i.test(msg)) {
            toast('Match is already full.', 'error')
          } else if (/Unauthorized/i.test(msg)) {
            toast('Cannot join your own match.', 'error')
          } else {
            toast('On-chain join failed. ' + msg.slice(0, 100), 'error')
          }
          setJoining(false)
          return
        }
      }

      sessionStorage.setItem('mddMyMark', 'O')
      sessionStorage.setItem('mddVsAI', '0')
      sessionStorage.setItem('mddMode', result.mode)
      sessionStorage.setItem('mddStake', String(result.stake))
      sessionStorage.setItem('mddCurrency', result.currency)
      // Use the creator's difficulty if the backend returned it; otherwise
      // fall back to the joiner's own current UI selection. This ensures
      // both players draw from the same difficulty tier within their shared
      // category pool, rather than each using their own stale sessionStorage value.
      sessionStorage.setItem('mddDifficulty', result.difficulty ?? difficulty)
      // Inherit creator's categories (BE returns them in joinByCode response).
      // The joiner's own picks are ignored here — both players must use the
      // same trivia pool, otherwise each side fetches different categories.
      const inheritedCats = result.categories?.length ? result.categories : cats
      sessionStorage.setItem('mddCategories', JSON.stringify(inheritedCats))
      router.push(`/game/${result.matchId}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('joinMatch failed:', e)
      setJoinError(/network|fetch/i.test(msg) ? 'Network error. Try again.' : 'Failed to join. Try again.')
      setJoining(false)
    }
  }

  async function startMatchmaking() {
    const err = validateBeforeCreate()
    if (err) {
      toast(err, 'warning')
      return
    }

    setMatchmaking(true)
    setMatchmakingPhase('waiting')
    saveCommonSession()

    const stakeVal = playType === 'free' ? 0 : stake
    const matchCurrency = playType === 'free' ? 'sol' : currency
    const playerId = publicKey?.toBase58() ?? getGuestId()
    let first: Awaited<ReturnType<typeof queueMatch>> | null = null
    try {
      first = await queueMatch(playerId, selectedMode, stakeVal, matchCurrency, cats)

      if (first.status === 'matched' && first.matchId) {
        // Player 2 path: opponent was already waiting in queue — join their on-chain game.
        if (anchorClient && publicKey && (first.stake ?? 0) > 0 && first.playerOne) {
          try {
            const playerOnePubkey = new PublicKey(first.playerOne)
            if ((first.currency ?? matchCurrency) === 'usdc') {
              await joinGameUsdc(anchorClient, publicKey, playerOnePubkey, first.matchId)
            } else {
              await joinGame(anchorClient, publicKey, playerOnePubkey, first.matchId)
            }
            sessionStorage.setItem('mddPlayerOnePubkey', first.playerOne)
            sessionStorage.setItem('mddPlayerTwoPubkey', publicKey.toBase58())
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            if (/User rejected|rejected by user/i.test(msg)) {
              toast('Transaction rejected in wallet.', 'warning')
            } else if (/insufficient/i.test(msg)) {
              toast('Insufficient balance to match the stake.', 'error')
            } else {
              toast('On-chain join failed. ' + msg.slice(0, 100), 'error')
            }
            setMatchmaking(false)
            setMatchmakingPhase('idle')
            return
          }
        }
        sessionStorage.setItem('mddMyMark', 'O')
        sessionStorage.setItem('mddVsAI', '0')
        sessionStorage.setItem('mddMode', first.mode ?? selectedMode)
        sessionStorage.setItem('mddStake', String(first.stake ?? stakeVal))
        sessionStorage.setItem('mddCurrency', first.currency ?? matchCurrency)
        if (first.sharedCategories?.length) {
          sessionStorage.setItem('mddCategories', JSON.stringify(first.sharedCategories))
        }
        router.push(`/game/${first.matchId}`)
        return
      }
    } catch (e) {
      console.error('queueMatch failed:', e)
      toast('Cannot reach matchmaking server. Try again.', 'error')
      setMatchmaking(false)
      setMatchmakingPhase('idle')
      return
    }

    // Player 1 path: waiting in queue — create on-chain game now so player 2 can
    // join. The backend pre-created this player's match at enqueue, so we have a
    // matchId to seed the PDA nonce with (shared with whoever claims us).
    const waitingMatchId = first?.matchId
    if (anchorClient && publicKey && stakeVal > 0 && waitingMatchId) {
      try {
        const alreadyOpen = await hasOpenGame(connection, publicKey, waitingMatchId).catch(() => false)
        if (!alreadyOpen) {
          if (matchCurrency === 'usdc') {
            await initializeGameUsdc(anchorClient, publicKey, stakeVal, selectedMode, waitingMatchId)
          } else {
            await initializeGame(anchorClient, publicKey, stakeVal, selectedMode, waitingMatchId)
          }
        }
        sessionStorage.setItem('mddPlayerOnePubkey', publicKey.toBase58())
        sessionStorage.setItem('mddPlayerTwoPubkey', '')
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (/User rejected|rejected by user/i.test(msg)) {
          toast('Transaction rejected — leaving queue.', 'warning')
        } else {
          toast('On-chain init failed: ' + msg.slice(0, 80), 'error')
        }
        setMatchmaking(false)
        setMatchmakingPhase('idle')
        return
      }
    }

    pollRef.current = setInterval(async () => {
      try {
        const found = await getMatchForPlayer(playerId)
        if (found) {
          clearInterval(pollRef.current!)
          sessionStorage.setItem('mddMyMark', 'X')
          // Overwrite with the merged categories the backend resolved when
          // matching the two players. Without this, P1 only ever uses their
          // own unmerged category list and may receive a different question
          // pool than P2 — causing both players to see questions from
          // different (and unexpected) categories.
          if (found.categories && found.categories.length > 0) {
            sessionStorage.setItem('mddCategories', JSON.stringify(found.categories))
          }
          if (found.difficulty) {
            sessionStorage.setItem('mddDifficulty', found.difficulty)
          }
          router.push(`/game/${found.matchId}`)
        }
      } catch {}
    }, 2000)

    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
        setMatchmaking(false)
        setMatchmakingPhase('idle')
        toast('No opponent found in 60s. Try Create Game and share a code.', 'info')
      }
    }, 60000)
  }

  function cancelMatchmaking() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
    setMatchmaking(false)
    setMatchmakingPhase('idle')
    // Best-effort: tell BE to drop us from the queue so we don't take a slot
    // a real player could have. Failure is non-fatal — BE GC eventually evicts.
    const playerId = publicKey?.toBase58() ?? getGuestId()
    void leaveQueue(playerId)
  }

  // Auto-cleanup queue entry on unmount (page navigate, tab close, refresh).
  // Without this, players who navigate away while queued sit in the BE queue
  // for up to 60s and can match-then-ghost the next person.
  useEffect(() => {
    return () => {
      if (matchmakingPhase === 'waiting') {
        const playerId = publicKey?.toBase58() ?? getGuestId()
        void leaveQueue(playerId)
      }
    }
  }, [matchmakingPhase, publicKey])

  // Tab close / refresh: fire a sync beacon so the BE can drop us before
  // the page unloads. Regular fetch wouldn't make it out in time.
  useEffect(() => {
    if (matchmakingPhase !== 'waiting') return
    const handler = () => {
      const playerId = publicKey?.toBase58() ?? getGuestId()
      try {
        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'}/api/match/queue`
        const blob = new Blob([JSON.stringify({ playerId })], { type: 'application/json' })
        // sendBeacon doesn't support DELETE — POST a dequeue body to a side route would be cleaner,
        // but for now we fall back to a fire-and-forget fetch with keepalive.
        void fetch(url, { method: 'DELETE', body: blob, headers: { 'Content-Type': 'application/json' }, keepalive: true })
      } catch {}
    }
    window.addEventListener('beforeunload', handler)
    window.addEventListener('pagehide', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
      window.removeEventListener('pagehide', handler)
    }
  }, [matchmakingPhase, publicKey])

  // ── Stuck-match recovery handlers ─────────────────────────────────────
  function handleStuckResume() {
    if (!stuckGame) return
    const matchId = stuckGame.matchId
    if (!matchId) {
      toast('Match record missing in our database — we cannot route you to it. Try a new wallet.', 'warning')
      return
    }
    // Restore session keys so the game page knows who's who and what currency.
    if (publicKey) sessionStorage.setItem('mddPlayerOnePubkey', publicKey.toBase58())
    if (stuckGame.info.playerTwo) {
      sessionStorage.setItem('mddPlayerTwoPubkey', stuckGame.info.playerTwo.toBase58())
    } else {
      sessionStorage.setItem('mddPlayerTwoPubkey', '')
    }
    sessionStorage.setItem('mddCurrency', stuckGame.info.currency)
    sessionStorage.setItem('mddStake', String(stuckGame.info.stakePerPlayer.toNumber() / (stuckGame.info.currency === 'sol' ? LAMPORTS_PER_SOL : 10 ** USDC_DECIMALS)))
    sessionStorage.setItem('mddMyMark', 'X')
    sessionStorage.setItem('mddVsAI', '0')
    setStuckGame(null)
    router.push(`/game/${matchId}`)
  }

  async function handleStuckCancel() {
    if (!stuckGame || !anchorClient || !publicKey) return
    const { info, matchId } = stuckGame
    if (!matchId) {
      toast('Match record missing — cannot locate its on-chain game to cancel.', 'warning')
      return
    }
    setRecoveryBusy(true)
    try {
      if (info.currency === 'usdc') {
        await cancelMatchUsdc(anchorClient, publicKey, matchId)
      } else {
        await cancelMatch(anchorClient, publicKey, matchId)
      }
      toast('Match cancelled. Stake refunded, wallet is free.', 'success')
      setStuckGame(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/User rejected|rejected by user/i.test(msg)) {
        toast('Cancel rejected in wallet.', 'warning')
      } else if (/0x1770|InvalidGameState/i.test(msg)) {
        toast('Match already started or wrong currency. Refresh and try again.', 'error')
      } else if (/0x177D|Unauthorized/i.test(msg)) {
        toast('Only the match creator can cancel.', 'error')
      } else {
        toast('Cancel failed: ' + msg.slice(0, 100), 'error')
      }
    } finally {
      setRecoveryBusy(false)
    }
  }

  async function handleStuckResign() {
    if (!stuckGame || !anchorClient || !publicKey) return
    const { info, matchId } = stuckGame
    if (!info.playerTwo) {
      toast('No opponent to resign to. Use Cancel instead.', 'warning')
      return
    }
    if (!matchId) {
      toast('Match record missing — cannot locate its on-chain game to resign.', 'warning')
      return
    }
    setRecoveryBusy(true)
    try {
      if (info.currency === 'usdc') {
        await resignGameUsdc(anchorClient, publicKey, info.playerOne, info.playerTwo, matchId)
      } else {
        await resignGame(anchorClient, publicKey, info.playerOne, info.playerTwo, matchId)
      }
      toast('Resigned. Stake sent to opponent. Wallet is free.', 'success')
      setStuckGame(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/User rejected|rejected by user/i.test(msg)) {
        toast('Resign rejected in wallet.', 'warning')
      } else if (/InvalidGameState|already.+(settled|finished|closed)/i.test(msg)) {
        toast('Match already ended on-chain.', 'info')
        setStuckGame(null)
      } else {
        toast('Resign failed: ' + msg.slice(0, 100), 'error')
      }
    } finally {
      setRecoveryBusy(false)
    }
  }

  async function handleStuckForceSettle() {
    if (!stuckGame || !anchorClient || !publicKey) return
    const { info, matchId } = stuckGame
    if (!info.playerTwo) {
      toast('No opponent ever joined this match. Force-settle requires both players to be set on-chain.', 'warning')
      return
    }
    if (!matchId) {
      toast('Match record missing — cannot locate its on-chain game to settle.', 'warning')
      return
    }
    setRecoveryBusy(true)
    try {
      if (info.currency === 'usdc') {
        await settleGameUsdc(anchorClient, publicKey, info.playerOne, info.playerTwo, matchId)
      } else {
        await settleGame(anchorClient, info.playerOne, info.playerTwo, matchId)
      }
      toast('Old match settled. Funds released, you can create a new match now.', 'success')
      setStuckGame(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/InvalidGameState|GameStillActive|already.+(settled|finished)/i.test(msg)) {
        toast(`Settle not eligible yet. Wait ~${Math.ceil(info.secsUntilTimeout / 3600)}h for timeout, or finish the match.`, 'warning')
      } else if (/User rejected|rejected by user/i.test(msg)) {
        toast('Settle rejected in wallet.', 'warning')
      } else {
        toast('Settle failed: ' + msg.slice(0, 100), 'error')
      }
    } finally {
      setRecoveryBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mdd-bg)', fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif", color: INK }}>

      <AnimatePresence>
        {showJoinCodeModal && (
          <JoinCodeModal
            code={generatedJoinCode}
            matchId={generatedMatchId}
            onStart={() => router.push(`/game/${generatedMatchId}`)}
          />
        )}
        {stuckGame && (
          <StuckMatchModal
            info={stuckGame.info}
            matchId={stuckGame.matchId}
            busy={recoveryBusy}
            onResume={handleStuckResume}
            onSettle={handleStuckForceSettle}
            onCancel={handleStuckCancel}
            onResign={handleStuckResign}
            onClose={() => setStuckGame(null)}
          />
        )}
        {showLivePopup && (
          <motion.div
            key="live-popup-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLivePopup(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              key="live-popup-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                borderRadius: '20px 20px 0 0',
                background: 'var(--mdd-card)',
                padding: 24,
                boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: statsError ? '#A81C13' : GREEN, letterSpacing: 0.5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 4, background: statsError ? '#A81C13' : GREEN, animation: statsError ? 'none' : 'liveDotPulse 1.6s ease-in-out infinite' }} />
                  {statsError ? 'STATS OFFLINE' : 'LIVE'}
                </div>
                <button
                  onClick={() => setShowLivePopup(false)}
                  style={{ appearance: 'none', border: 'none', background: 'var(--mdd-bg)', color: MUTED, borderRadius: 999, width: 32, height: 32, fontSize: 18, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 4, fontWeight: 500 }}>Active matches right now</div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, lineHeight: 1, color: INK, fontVariantNumeric: 'tabular-nums' }}>
                  {liveStats === null ? '—' : liveStats.activeMatches + liveStats.waitingMatches}
                </div>
                {liveStats !== null && liveStats.queueLength > 0 && (
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{liveStats.queueLength} in queue</div>
                )}
              </div>
              <div style={{ height: 14 }} />
              <div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: 500 }}>Wagered last 24h</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1, color: '#9945FF' }}>
                    {liveStats === null ? '—' : liveStats.wageredLast24hSol.toFixed(3)}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9945FF', letterSpacing: 0.3 }}>SOL</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.1, color: '#2775CA' }}>
                    {liveStats === null ? '—' : liveStats.wageredLast24hUsdc.toFixed(2)}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2775CA', letterSpacing: 0.3 }}>USDC</span>
                </div>
              </div>
              <div style={{ height: 12 }} />
              <div style={{ paddingTop: 12, borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: 500 }}>Currently in escrow</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontVariantNumeric: 'tabular-nums' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#9945FF' }}>
                      {liveStats === null ? '—' : `${liveStats.totalLockedSol.toFixed(3)}`}
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9945FF', letterSpacing: 0.3 }}>SOL</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#2775CA' }}>
                      {liveStats === null ? '—' : `${liveStats.totalLockedUsdc.toFixed(2)}`}
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#2775CA', letterSpacing: 0.3 }}>USDC</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 10.5, color: MUTED, lineHeight: 1.4 }}>
                Devnet · {liveStats ? `${liveStats.finishedTotal} matches settled` : 'loading…'}
              </div>
              <button
                onClick={() => setShowLivePopup(false)}
                style={{ appearance: 'none', border: 'none', width: '100%', marginTop: 20, padding: '13px', background: 'var(--mdd-bg)', color: INK, borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar active="play" />

      {networkCheck.status === 'wrong-network' && (
        <div style={{ background: '#FDECEB', borderBottom: '1px solid #F5C2C0', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#A81C13' }}>
            ⚠ RPC pointing at <strong>{networkCheck.cluster}</strong> instead of devnet — transactions will fail. Check NEXT_PUBLIC_RPC_URL.
          </span>
        </div>
      )}
      {networkCheck.status === 'rpc-error' && (
        <div style={{ background: '#FFF4E0', borderBottom: '1px solid #F5D69E', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#8A5A00' }}>
            RPC unreachable — playing offline-only. Some features may not work.
          </span>
        </div>
      )}

      <div className="page-content has-bottom-tab" style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 40px' }}>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1.2, margin: '0 0 6px', lineHeight: 1.1, flex: '1 1 auto' }}>New Match</h1>
            <button
              onClick={() => setShowLivePopup(true)}
              className="lg:hidden"
              style={{
                appearance: 'none', border: '1px solid rgba(52,199,89,0.3)',
                background: 'rgba(52,199,89,0.12)', color: GREEN,
                padding: '4px 10px', borderRadius: 999,
                fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                flexShrink: 0, marginBottom: 6,
              }}
              aria-label="View live stats"
            >
              <span style={{ width: 6, height: 6, borderRadius: 3, background: GREEN, animation: 'liveDotPulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
              LIVE
              {liveStats !== null && (
                <span style={{ opacity: 0.8 }}>· {liveStats.activeMatches + liveStats.waitingMatches}</span>
              )}
            </button>
          </div>
          <p style={{ fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.4 }}>
            Configure your duel — pick a mode, set the stakes, choose what you know.
          </p>
        </motion.div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ── Main column ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}
        >

          {/* Choose Mode */}
          <Card>
            <SectionTitle hint="Swipe →">Choose Mode</SectionTitle>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none' }} className="mode-scroll">
              {MODES.map(m => (
                <div key={m.id} style={{ scrollSnapAlign: 'start', flexShrink: 0 }}>
                  <ModeCard mode={m} selected={selectedMode === m.id} onClick={() => setSelectedMode(m.id)} />
                </div>
              ))}
            </div>
          </Card>

          {/* Difficulty (VS AI only) */}
          <AnimatePresence>
            {isVsAI && (
              <motion.div key="difficulty" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }} style={{ overflow: 'hidden' }}>
                <Card>
                  <SectionTitle>AI Difficulty</SectionTitle>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {DIFFICULTIES.map(d => {
                      const active = difficulty === d.id
                      return (
                        <motion.button
                          key={d.id}
                          onClick={() => setDifficulty(d.id)}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            appearance: 'none', textAlign: 'left', fontFamily: 'inherit',
                            flex: '1 1 0', minWidth: 0,
                            padding: 14, borderRadius: 16,
                            background: 'var(--mdd-card-alt)',
                            border: active ? `2px solid ${BLUE}` : '1.5px solid var(--mdd-border-strong)',
                            boxShadow: active
                              ? '0 4px 14px rgba(0,113,227,0.22), inset 0 1px 0 rgba(255,255,255,0.04)'
                              : '0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', gap: 8,
                            transition: 'all 140ms ease',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                          }}
                        >
                          {/* Tag pill on top — own row, no overlap with title */}
                          <span style={{
                            alignSelf: 'flex-start',
                            padding: '3px 8px', borderRadius: 999,
                            fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4,
                            background: d.tagBg, color: d.tagColor,
                          }}>{d.tag}</span>

                          {/* Title — own row */}
                          <span style={{
                            fontSize: 14, fontWeight: 700,
                            color: active ? BLUE : INK,
                            lineHeight: 1.2, letterSpacing: -0.2,
                          }}>
                            {d.label}
                          </span>

                          {/* Description */}
                          <span style={{
                            fontSize: 11.5, color: MUTED, lineHeight: 1.4,
                          }}>
                            {d.desc}
                          </span>
                        </motion.button>
                      )
                    })}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Play Type */}
          <AnimatePresence>
            {!isVsAI && (
              <motion.div key="playtype" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }} style={{ overflow: 'hidden' }}>
                <Card>
                  <SectionTitle>Play Type</SectionTitle>
                  <PlayTypeToggle value={playType} onChange={setPlayType} />
                  <AnimatePresence>
                    {playType === 'stake' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={{ marginTop: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <CurrencyToggle value={currency} onChange={changeCurrency} disabled={!MOCK_USDC_MINT && currency === 'sol'} />
                        <StakeInput value={stake} currency={currency} balance={currency === 'sol' ? solBalance : usdcBalance} onChange={setStake} onStep={stepStake} />
                        {currency === 'usdc' && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--mdd-bg)', borderRadius: 12, gap: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                              <span style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>Mock USDC balance</span>
                              <span style={{ fontSize: 15, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>
                                {usdcBalance === null ? (publicKey ? '…' : 'Connect wallet') : `${usdcBalance.toFixed(2)} USDC`}
                              </span>
                            </div>
                            <UsdcFaucetButton variant="block" onSuccess={() => setTimeout(refreshUsdcBalance, 2000)} />
                          </div>
                        )}
                        {currency === 'usdc' && !MOCK_USDC_MINT && (
                          <p style={{ margin: 0, fontSize: 11.5, color: '#A81C13' }}>
                            Mock USDC mint not configured. Set NEXT_PUBLIC_MOCK_USDC_MINT.
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trivia Category */}
          <Card>
            <SectionTitle hint={`${cats.length} selected`}>Trivia Category</SectionTitle>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <CategoryChip key={c} label={c} selected={cats.includes(c)} onClick={() => toggleCat(c)} />
              ))}
            </div>
          </Card>

          {/* CTA */}
          <div style={{ display: 'flex', gap: 12 }}>
            {!isVsAI && matchmakingPhase === 'waiting' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, padding: '15px', background: 'var(--mdd-bg)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${BLUE}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: MUTED }}>Looking for an opponent…</span>
                  </div>
                  <button onClick={cancelMatchmaking} style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)', padding: '15px 20px', background: 'var(--mdd-card)', color: INK, borderRadius: 14, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
                <div style={{ fontSize: 11, color: MUTED, padding: '0 4px', lineHeight: 1.5 }}>
                  Pairing on{' '}
                  <strong style={{ color: INK }}>
                    {selectedMode === 'classic' ? 'Classic' : selectedMode === 'shifting' ? 'Shifting Board' : selectedMode === 'scaleup' ? 'Scale Up' : selectedMode === 'blitz' ? 'Blitz' : selectedMode}
                  </strong>{' · '}
                  <strong style={{ color: INK }}>
                    {playType === 'free' ? 'Free play' : `${stake} ${currency.toUpperCase()}`}
                  </strong>
                  . Trivia categories merge with your opponent&apos;s.
                </div>
              </div>
            ) : (
              <>
                {!publicKey ? (
                  <motion.button
                    onClick={() => setWalletModalVisible(true)}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    style={{ appearance: 'none', border: 'none', flex: 1, padding: '15px', background: 'var(--mdd-dark-surface)', color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 160ms ease' }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: 9, background: 'linear-gradient(135deg, #9945FF, #14F195)' }} />
                    Connect Wallet to Play
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      onClick={handleCreate}
                      disabled={matchmaking}
                      whileHover={{ scale: matchmaking ? 1 : 1.015 }}
                      whileTap={{ scale: matchmaking ? 1 : 0.985 }}
                      style={{ appearance: 'none', border: 'none', flex: 1, padding: '15px', background: matchmaking ? '#AEAEB2' : BLUE, color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 600, fontFamily: 'inherit', cursor: matchmaking ? 'not-allowed' : 'pointer', boxShadow: matchmaking ? 'none' : '0 4px 14px rgba(0,113,227,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 160ms ease' }}
                    >
                      {matchmaking ? (
                        <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />{isVsAI ? 'Starting…' : 'Creating…'}</>
                      ) : (
                        isVsAI ? 'Play vs AI' : 'Create Game'
                      )}
                    </motion.button>
                    {!isVsAI && (
                      <button
                        onClick={startMatchmaking}
                        disabled={matchmaking}
                        style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)', padding: '15px 18px', background: 'var(--mdd-card)', color: INK, borderRadius: 14, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: matchmaking ? 'not-allowed' : 'pointer' }}
                      >
                        Quick Match
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          {validationError && !matchmaking && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FFF4E0', border: '1px solid #F5DCA0', color: '#8A5A00', borderRadius: 12, fontSize: 12.5, fontWeight: 500, marginTop: -4 }}
            >
              <span style={{ fontSize: 14 }}>⚠</span>
              <span>{validationError}</span>
            </motion.div>
          )}
          {isVsAI && (
            <p style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginTop: -8 }}>
              Practice mode — no SOL required
            </p>
          )}

          {/* Mobile-only: Join with Code — below action buttons */}
          <div className="lg:hidden" style={{ display: 'flex', flexDirection: 'column' }}>
            <Card>
              <SectionTitle>Join with Code</SectionTitle>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 10, lineHeight: 1.4 }}>
                Have a friend&apos;s code? Join their game directly.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={joinCodeInput}
                  onChange={e => { setJoinCodeInput(e.target.value.toUpperCase()); setJoinError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleJoinWithCode()}
                  placeholder="MNDL-XXXXXX"
                  maxLength={11}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: joinError ? '1.5px solid #FF3B30' : '1.5px solid rgba(0,0,0,0.10)', background: 'var(--mdd-bg)', fontSize: 13, fontWeight: 600, fontFamily: 'ui-monospace, monospace', color: INK, outline: 'none' }}
                />
                <button
                  onClick={handleJoinWithCode}
                  disabled={joining || !joinCodeInput.trim()}
                  style={{ appearance: 'none', border: 'none', padding: '9px 14px', background: joining ? '#AEAEB2' : '#1C1C1E', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: joining ? 'not-allowed' : 'pointer' }}
                >
                  {joining ? '…' : 'Join'}
                </button>
              </div>
              {joinError && <p style={{ fontSize: 12, color: '#FF3B30', marginTop: 6, margin: '6px 0 0' }}>{joinError}</p>}
            </Card>
          </div>
        </motion.div>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          style={{ width: 280, flexShrink: 0, flexDirection: 'column', gap: 16 }}
          className="hidden lg:flex"
        >
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: statsError ? '#A81C13' : GREEN, letterSpacing: 0.5, marginBottom: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: statsError ? '#A81C13' : GREEN, animation: statsError ? 'none' : 'liveDotPulse 1.6s ease-in-out infinite' }} />
              {statsError ? 'STATS OFFLINE' : 'LIVE'}
            </div>
            <div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 4, fontWeight: 500 }}>Active matches right now</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, lineHeight: 1, color: INK, fontVariantNumeric: 'tabular-nums' }}>
                {liveStats === null ? '—' : liveStats.activeMatches + liveStats.waitingMatches}
              </div>
              {liveStats !== null && liveStats.queueLength > 0 && (
                <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{liveStats.queueLength} in queue</div>
              )}
            </div>
            <div style={{ height: 14 }} />
            <div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: 500 }}>Wagered last 24h</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1, color: '#9945FF' }}>
                  {liveStats === null ? '—' : liveStats.wageredLast24hSol.toFixed(3)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9945FF', letterSpacing: 0.3 }}>SOL</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.1, color: '#2775CA' }}>
                  {liveStats === null ? '—' : liveStats.wageredLast24hUsdc.toFixed(2)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2775CA', letterSpacing: 0.3 }}>USDC</span>
              </div>
            </div>
            <div style={{ height: 12 }} />
            <div style={{ paddingTop: 12, borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: 500 }}>Currently in escrow</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontVariantNumeric: 'tabular-nums' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#9945FF' }}>
                    {liveStats === null ? '—' : `${liveStats.totalLockedSol.toFixed(3)}`}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9945FF', letterSpacing: 0.3 }}>SOL</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#2775CA' }}>
                    {liveStats === null ? '—' : `${liveStats.totalLockedUsdc.toFixed(2)}`}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#2775CA', letterSpacing: 0.3 }}>USDC</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 10.5, color: MUTED, lineHeight: 1.4 }}>
              Devnet · {liveStats ? `${liveStats.finishedTotal} matches settled` : 'loading…'}
            </div>
          </Card>

        </motion.div>
        </div>

      </div>
    </div>
  )
}
