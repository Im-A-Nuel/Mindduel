'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import type { AIDifficulty } from '@/lib/ai'
import { cn } from '@/lib/utils'
import { NavBar } from '@/components/layout/NavBar'
import { createMatch, joinMatch, queueMatch, getMatchForPlayer, getGuestId, fetchLiveStats, leaveQueue, type LiveStats } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { useIsOnline } from '@/components/NetworkStatus'
import { useNetworkCheck } from '@/hooks/useNetworkCheck'
import { CheckInButton } from '@/components/CheckInButton'
import { ShareButton } from '@/components/ShareButton'
import { useSwitchChain } from 'wagmi'
import { CELO_CHAIN_ID } from '@/lib/constants'

// ── Design tokens ────────────────────────────────────────────────────
const BLUE   = '#0071E3'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const GREEN  = '#34C759'
const GREEN_DARK = '#0A7A2D'

// ── Data ─────────────────────────────────────────────────────────────
const MODES = [
  { id: 'classic',  name: 'Classic Duel',    desc: 'Standard 3×3, first to align 3.', tag: 'STANDARD',  tagBg: '#E8F7EE', tagColor: GREEN_DARK,  available: true },
  { id: 'shifting', name: 'Shifting Board',  desc: 'Rows & columns shift every 3 turns.', tag: 'DYNAMIC',   tagBg: '#FFF4E0', tagColor: '#8A5A00', available: true },
  { id: 'scaleup',  name: 'Scale Up',        desc: 'Board grows from 3×3 → 5×5.',      tag: 'EXPANDING', tagBg: '#FDECEB', tagColor: '#A81C13',   available: true },
  { id: 'blitz',    name: 'Blitz',           desc: '5-second answers. No mercy.',       tag: 'INTENSE',   tagBg: '#FDECEB', tagColor: '#A81C13',   available: true },
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
        width: '100%', padding: '16px 14px',
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

// ── Casual / Ranked toggle ────────────────────────────────────────────
// Ranked records the result on-chain (win = +points, loss = −points) for the
// connected Celo address. Casual matches are played for fun and not recorded.
function MatchTypeToggle({ value, onChange, rankedDisabled }: { value: 'casual' | 'ranked' | 'ai'; onChange: (v: 'casual' | 'ranked' | 'ai') => void; rankedDisabled?: boolean }) {
  const OPTIONS: { id: 'casual' | 'ranked' | 'ai'; title: string; sub: string }[] = [
    { id: 'casual', title: 'Casual',  sub: 'For fun · not recorded' },
    { id: 'ranked', title: 'Ranked',  sub: 'On-chain · +/− points' },
    { id: 'ai',     title: 'vs AI',   sub: 'Practice vs MindDuel AI' },
  ]
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {OPTIONS.map(opt => {
        const active = value === opt.id
        const disabled = opt.id === 'ranked' && rankedDisabled
        return (
          <motion.button
            key={opt.id}
            onClick={() => !disabled && onChange(opt.id)}
            disabled={disabled}
            whileTap={disabled ? {} : { scale: 0.98 }}
            style={{
              appearance: 'none', fontFamily: 'inherit', flex: 1, padding: '12px', borderRadius: 14,
              background: active ? BLUE : 'var(--mdd-card)',
              color: active ? '#fff' : INK,
              border: active ? `2px solid ${BLUE}` : '2px solid transparent',
              boxShadow: active ? '0 4px 12px rgba(0,113,227,0.22)' : '0 0 0 0.5px rgba(0,0,0,0.10)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 160ms ease',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>{opt.title}</span>
            <span style={{ fontSize: 11, opacity: active ? 0.85 : 0.6 }}>{opt.sub}</span>
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

// ── Page ─────────────────────────────────────────────────────────────
export default function LobbyPage() {
  const router = useRouter()
  const { address, isConnected, connect } = useWallet()
  const toast = useToast()
  const isOnline = useIsOnline()
  const networkCheck = useNetworkCheck()
  const { switchChain, isPending: switching } = useSwitchChain()
  const [liveStats, setLiveStats]   = useState<LiveStats | null>(null)
  const [statsError, setStatsError] = useState(false)

  const [selectedMode, setSelectedMode] = useState<ModeId>('classic')
  const [matchType, setMatchType]       = useState<'casual' | 'ranked' | 'ai'>('ranked')
  const [cats, setCats]                 = useState<string[]>(['General Knowledge', 'Crypto & Web3'])
  const [difficulty, setDifficulty]     = useState<AIDifficulty>('hard')
  const [matchmaking, setMatchmaking]   = useState(false)
  const [matchmakingPhase, setMatchmakingPhase] = useState<'idle' | 'creating' | 'waiting'>('idle')

  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false)
  const [generatedJoinCode, setGeneratedJoinCode] = useState('')
  const [generatedMatchId, setGeneratedMatchId]   = useState('')

  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joinError, setJoinError]         = useState('')
  const [joining, setJoining]             = useState(false)
  const [showLivePopup, setShowLivePopup] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isVsAI = matchType === 'ai'
  // vs-AI is always casual practice; ranked also requires a connected wallet
  // since results are recorded on-chain for the player's address.
  const ranked = matchType === 'ranked'

  function toggleCat(c: string) {
    setCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

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

  // Warn user if they try to leave page during in-flight matchmaking
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
    // cats.length === 0 means "Random" (server picks from all categories) — allowed.
    if (isVsAI) return null
    // Ranked records results for the connected address - require a wallet.
    if (ranked && !isConnected) return 'Connect your wallet to play Ranked.'
    return null
  }

  // Reactive validation state for disabling button + showing inline hint
  const validationError = (() => {
    if (ranked && !isConnected) return 'Connect your wallet to play Ranked, or switch to Casual.'
    return null
  })()

  function saveCommonSession() {
    sessionStorage.setItem('mddVsAI', isVsAI ? '1' : '0')
    sessionStorage.setItem('mddMode', selectedMode)
    sessionStorage.setItem('mddDifficulty', difficulty)
    sessionStorage.setItem('mddRanked', ranked ? '1' : '0')
    sessionStorage.setItem('mddCategories', JSON.stringify(cats))
  }

  // Player id used for backend calls. Ranked must use the wallet address;
  // casual falls back to a stable guest id when no wallet is connected.
  function resolvePlayerId(): string {
    return ranked ? (address as string) : (address ?? getGuestId())
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
      const playerId = resolvePlayerId()
      const match = await createMatch(playerId, selectedMode, ranked, cats, difficulty)
      matchCreated = true

      sessionStorage.setItem('mddMyMark', 'X')
      setGeneratedJoinCode(match.joinCode)
      setGeneratedMatchId(match.matchId)
      setShowJoinCodeModal(true)
      setMatchmaking(false)
      setMatchmakingPhase('idle')
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
      // We don't yet know if the target match is ranked; use the wallet address
      // when connected (works for both), else a guest id (casual only).
      const playerId = address ?? getGuestId()
      const result = await joinMatch(code, playerId)
      if (!result) {
        setJoinError('Code not found or match already started.')
        setJoining(false)
        return
      }
      // Ranked matches require a connected wallet to record the joiner's result.
      if (result.ranked && !isConnected) {
        setJoinError('This is a Ranked match - connect your wallet to join.')
        toast('Connect your wallet to join a Ranked match.', 'warning')
        setJoining(false)
        return
      }
      // Self-join check
      if (result.playerOne && address && result.playerOne === address) {
        setJoinError('You created this match - share the code instead.')
        setJoining(false)
        return
      }

      sessionStorage.setItem('mddMyMark', 'O')
      sessionStorage.setItem('mddVsAI', '0')
      sessionStorage.setItem('mddMode', result.mode)
      sessionStorage.setItem('mddRanked', result.ranked ? '1' : '0')
      // Use the creator's difficulty if the backend returned it; otherwise
      // fall back to the joiner's own current UI selection. This ensures
      // both players draw from the same difficulty tier within their shared
      // category pool, rather than each using their own stale sessionStorage value.
      sessionStorage.setItem('mddDifficulty', result.difficulty ?? difficulty)
      // Inherit creator's categories (BE returns them in joinByCode response).
      // The joiner's own picks are ignored here - both players must use the
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

    const playerId = resolvePlayerId()
    let first: Awaited<ReturnType<typeof queueMatch>> | null = null
    try {
      first = await queueMatch(playerId, selectedMode, ranked, cats)

      if (first.status === 'matched' && first.matchId) {
        // Player 2 path: opponent was already waiting in queue.
        sessionStorage.setItem('mddMyMark', 'O')
        sessionStorage.setItem('mddVsAI', '0')
        sessionStorage.setItem('mddMode', first.mode ?? selectedMode)
        sessionStorage.setItem('mddRanked', (first.ranked ?? ranked) ? '1' : '0')
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

    // Player 1 path: waiting in queue - poll until an opponent claims us.
    pollRef.current = setInterval(async () => {
      try {
        const found = await getMatchForPlayer(playerId)
        if (found) {
          clearInterval(pollRef.current!)
          sessionStorage.setItem('mddMyMark', 'X')
          // Overwrite with the merged categories the backend resolved when
          // matching the two players. Without this, P1 only ever uses their
          // own unmerged category list and may receive a different question
          // pool than P2 - causing both players to see questions from
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
    // a real player could have. Failure is non-fatal - BE GC eventually evicts.
    void leaveQueue(resolvePlayerId())
  }

  // Auto-cleanup queue entry on unmount (page navigate, tab close, refresh).
  // Without this, players who navigate away while queued sit in the BE queue
  // for up to 60s and can match-then-ghost the next person.
  useEffect(() => {
    return () => {
      if (matchmakingPhase === 'waiting') {
        void leaveQueue(address ?? getGuestId())
      }
    }
  }, [matchmakingPhase, address])

  // Tab close / refresh: fire a sync beacon so the BE can drop us before
  // the page unloads. Regular fetch wouldn't make it out in time.
  useEffect(() => {
    if (matchmakingPhase !== 'waiting') return
    const handler = () => {
      const playerId = address ?? getGuestId()
      try {
        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'}/api/match/queue`
        const blob = new Blob([JSON.stringify({ playerId })], { type: 'application/json' })
        void fetch(url, { method: 'DELETE', body: blob, headers: { 'Content-Type': 'application/json' }, keepalive: true })
      } catch {}
    }
    window.addEventListener('beforeunload', handler)
    window.addEventListener('pagehide', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
      window.removeEventListener('pagehide', handler)
    }
  }, [matchmakingPhase, address])

  const modeLabel = selectedMode === 'classic' ? 'Classic'
    : selectedMode === 'shifting' ? 'Shifting Board'
    : selectedMode === 'scaleup' ? 'Scale Up'
    : selectedMode === 'blitz' ? 'Blitz'
    : selectedMode

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
                  {liveStats === null ? '-' : liveStats.activeMatches + liveStats.waitingMatches}
                </div>
                {liveStats !== null && liveStats.queueLength > 0 && (
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{liveStats.queueLength} in queue</div>
                )}
              </div>
              <div style={{ height: 14 }} />
              <div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: 500 }}>Ranked matches · last 24h</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1, color: BLUE }}>
                    {liveStats === null ? '-' : liveStats.rankedLast24h}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: BLUE, letterSpacing: 0.3 }}>RANKED</span>
                </div>
              </div>
              <div style={{ height: 12 }} />
              <div style={{ paddingTop: 12, borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: 500 }}>Ranked players on the ladder</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>
                    {liveStats === null ? '-' : liveStats.playersRanked}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, letterSpacing: 0.3 }}>PLAYERS</span>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 10.5, color: MUTED, lineHeight: 1.4 }}>
                Celo · {liveStats ? `${liveStats.matchesPlayed} matches played` : 'loading…'}
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
        <div style={{ background: '#FDECEB', borderBottom: '1px solid #F5C2C0', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#A81C13' }}>
            ⚠ Your wallet is on the wrong network - ranked results are recorded on <strong>Celo</strong>.
          </span>
          <button
            onClick={() => switchChain({ chainId: CELO_CHAIN_ID })}
            disabled={switching}
            style={{ appearance: 'none', border: 'none', background: '#A81C13', color: '#fff', padding: '6px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: switching ? 'wait' : 'pointer', fontFamily: 'inherit' }}
          >
            {switching ? 'Switching…' : 'Switch to Celo'}
          </button>
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
            <CheckInButton />
            <ShareButton variant="ghost" text="Play MindDuel — trivia-gated PvP, climb the on-chain ranks on Celo. No staking, pure skill." />
          </div>
          <p style={{ fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.4 }}>
            Configure your duel - pick a mode, go Casual or climb the Ranked ladder, choose what you know.
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
                <div key={m.id} style={{ scrollSnapAlign: 'start', flex: '1 1 150px', minWidth: 150, display: 'flex' }}>
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
                          {/* Tag pill on top - own row, no overlap with title */}
                          <span style={{
                            alignSelf: 'flex-start',
                            padding: '3px 8px', borderRadius: 999,
                            fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4,
                            background: d.tagBg, color: d.tagColor,
                          }}>{d.tag}</span>

                          {/* Title - own row */}
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

          {/* Match Type - Casual / Ranked / vs AI */}
          <Card>
            <SectionTitle hint="No staking">Match Type</SectionTitle>
            <MatchTypeToggle value={matchType} onChange={setMatchType} rankedDisabled={!isConnected} />
            <p style={{ margin: '12px 2px 0', fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
              {matchType === 'ranked'
                ? 'Ranked results are recorded on-chain - winning adds points, losing subtracts them. No tokens are staked.'
                : matchType === 'ai'
                ? 'Practice against MindDuel AI in your chosen mode. Casual - never affects your on-chain ranking.'
                : 'Casual matches are just for fun and never affect your on-chain ranking.'}
              {matchType === 'ranked' && !isConnected && (
                <span style={{ display: 'block', marginTop: 4, color: '#8A5A00', fontWeight: 500 }}>
                  Connect a wallet to play Ranked.
                </span>
              )}
            </p>
          </Card>

          {/* Trivia Category */}
          <Card>
            <SectionTitle hint={cats.length === 0 ? 'Random' : `${cats.length} selected`}>Trivia Category</SectionTitle>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <CategoryChip label="Random" selected={cats.length === 0} onClick={() => setCats([])} />
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
                  <strong style={{ color: INK }}>{modeLabel}</strong>{' · '}
                  <strong style={{ color: INK }}>{ranked ? 'Ranked' : 'Casual'}</strong>
                  . Trivia categories merge with your opponent&apos;s.
                </div>
              </div>
            ) : (
              <>
                {ranked && !isConnected ? (
                  <motion.button
                    onClick={() => connect()}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    style={{ appearance: 'none', border: 'none', flex: 1, padding: '15px', background: 'var(--mdd-dark-surface)', color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 160ms ease' }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: 9, background: '#FCFF52' }} />
                    Connect Wallet to Play Ranked
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
              Practice mode - casual, never ranked. No wallet required.
            </p>
          )}

          {/* Mobile-only: Join with Code - below action buttons */}
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
                {liveStats === null ? '-' : liveStats.activeMatches + liveStats.waitingMatches}
              </div>
              {liveStats !== null && liveStats.queueLength > 0 && (
                <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{liveStats.queueLength} in queue</div>
              )}
            </div>
            <div style={{ height: 14 }} />
            <div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: 500 }}>Ranked matches · last 24h</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1, color: BLUE }}>
                  {liveStats === null ? '-' : liveStats.rankedLast24h}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: BLUE, letterSpacing: 0.3 }}>RANKED</span>
              </div>
            </div>
            <div style={{ height: 12 }} />
            <div style={{ paddingTop: 12, borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: 500 }}>Ranked players on the ladder</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>
                  {liveStats === null ? '-' : liveStats.playersRanked}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, letterSpacing: 0.3 }}>PLAYERS</span>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 10.5, color: MUTED, lineHeight: 1.4 }}>
              Celo · {liveStats ? `${liveStats.matchesPlayed} matches played` : 'loading…'}
            </div>
          </Card>

        </motion.div>
        </div>

      </div>
    </div>
  )
}
