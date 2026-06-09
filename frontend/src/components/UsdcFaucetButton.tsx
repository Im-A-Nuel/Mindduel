'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { motion, AnimatePresence } from 'framer-motion'
import { requestUsdcFaucet, FaucetRateLimitError } from '@/lib/anchor-client'
import { FAUCET_AMOUNT_USDC, MOCK_USDC_MINT } from '@/lib/constants'
import { IconCoin } from '@/components/ui/StateIcons'

type Variant = 'pill' | 'block'

const GREEN_DARK = '#0A7A2D'
const RED_DARK = '#A81C13'

const COOLDOWN_MS = 24 * 60 * 60 * 1000
const STORAGE_PREFIX = 'mddFaucetClaim:'

function readLastClaim(addr: string): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + addr)
    const n = raw ? parseInt(raw, 10) : 0
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function writeLastClaim(addr: string, ts: number) {
  try { localStorage.setItem(STORAGE_PREFIX + addr, String(ts)) } catch {}
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

export function UsdcFaucetButton({
  variant = 'block',
  onSuccess,
}: {
  variant?: Variant
  onSuccess?: () => void
}) {
  const { publicKey } = useWallet()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string>('')
  const [lastClaim, setLastClaim] = useState<number>(0)
  const [now, setNow] = useState<number>(() => Date.now())

  // Load persisted claim timestamp when wallet changes
  useEffect(() => {
    if (!publicKey) { setLastClaim(0); return }
    setLastClaim(readLastClaim(publicKey.toBase58()))
  }, [publicKey])

  // Tick clock while in cooldown so the countdown updates
  const remaining = lastClaim > 0 ? Math.max(0, lastClaim + COOLDOWN_MS - now) : 0
  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [remaining])

  const inCooldown = remaining > 0
  const disabled = loading || !publicKey || inCooldown

  async function handleClaim() {
    if (!publicKey) {
      setMsg('Connect wallet first')
      return
    }
    if (inCooldown) return
    setMsg('')
    setLoading(true)
    try {
      await requestUsdcFaucet(publicKey)
      const ts = Date.now()
      writeLastClaim(publicKey.toBase58(), ts)
      setLastClaim(ts)
      setNow(ts)
      setMsg(`+${FAUCET_AMOUNT_USDC} USDC claimed`)
      onSuccess?.()
      setTimeout(() => setMsg(''), 4000)
    } catch (e) {
      // Rate-limit: silently lock the button — the cooldown UI is the message.
      if (e instanceof FaucetRateLimitError) {
        const ts = Date.now()
        writeLastClaim(publicKey.toBase58(), ts)
        setLastClaim(ts)
        setNow(ts)
      } else {
        setMsg(e instanceof Error ? e.message : 'Faucet failed')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!MOCK_USDC_MINT) return null

  const labelClaim = `Claim ${FAUCET_AMOUNT_USDC} Free Mock USDC`
  const labelClaimed = `Claimed · next in ${formatRemaining(remaining)}`

  if (variant === 'pill') {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
        <motion.button
          whileHover={{ scale: !disabled ? 1.02 : 1 }}
          whileTap={{ scale: !disabled ? 0.97 : 1 }}
          onClick={handleClaim}
          disabled={disabled}
          style={{
            appearance: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 18px',
            background: loading
              ? '#AEAEB2'
              : inCooldown
                ? '#E5E5EA'
                : 'linear-gradient(135deg, #34C759 0%, #0A7A2D 100%)',
            color: inCooldown ? '#6E6E73' : '#fff',
            borderRadius: 999, fontSize: 13.5, fontWeight: 600,
            fontFamily: 'inherit',
            boxShadow: loading || inCooldown ? 'none' : '0 4px 14px rgba(52,199,89,0.35)',
            opacity: !publicKey ? 0.55 : 1,
            transition: 'background 180ms ease, color 180ms ease',
          }}
        >
          {inCooldown ? <span style={{ fontSize: 15 }}>✓</span> : <IconCoin size={15} color="#8A5A00" />}
          {loading
            ? 'Claiming…'
            : !publicKey
              ? `Connect wallet to claim ${FAUCET_AMOUNT_USDC} Mock USDC`
              : inCooldown
                ? labelClaimed
                : labelClaim}
        </motion.button>
        <AnimatePresence>
          {msg && (
            <motion.span
              key={msg}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: 12, fontWeight: 500, color: msg.startsWith('+') ? GREEN_DARK : RED_DARK }}
            >
              {msg}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        onClick={handleClaim}
        disabled={disabled}
        style={{
          appearance: 'none', border: 'none', padding: '10px 14px',
          background: loading
            ? '#AEAEB2'
            : inCooldown
              ? '#E5E5EA'
              : 'linear-gradient(135deg, #34C759 0%, #0A7A2D 100%)',
          color: inCooldown ? '#6E6E73' : '#fff',
          borderRadius: 10, fontSize: 12.5, fontWeight: 600,
          fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          boxShadow: loading || inCooldown ? 'none' : '0 2px 8px rgba(52,199,89,0.30)',
          transition: 'background 180ms ease, color 180ms ease',
        }}
      >
        {inCooldown ? <span>✓</span> : <IconCoin size={14} color="#8A5A00" />}
        {loading
          ? 'Claiming…'
          : inCooldown
            ? `Next in ${formatRemaining(remaining)}`
            : `Claim ${FAUCET_AMOUNT_USDC} Mock USDC`}
      </button>
      <AnimatePresence>
        {msg && (
          <motion.span
            key={msg}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: 11.5, color: msg.startsWith('+') ? GREEN_DARK : RED_DARK }}
          >
            {msg}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
