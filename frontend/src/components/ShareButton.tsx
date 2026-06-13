'use client'

import { motion } from 'framer-motion'
import { useToast } from '@/components/ui/Toast'

const INK = 'var(--mdd-ink)'

/**
 * Share button — native Web Share where available (mobile / MiniPay), else
 * copy-to-clipboard with an X (Twitter) intent fallback. Used to spread the
 * app + match results, driving new players.
 */
export function ShareButton({
  text,
  url,
  label = 'Share',
  variant = 'solid',
}: {
  text?: string
  url?: string
  label?: string
  variant?: 'solid' | 'ghost'
}) {
  const toast = useToast()

  async function onShare() {
    const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.origin : 'https://mindduel-celo.vercel.app')
    const shareText = text ?? 'Play MindDuel — trivia-gated PvP with on-chain ranking on Celo.'

    const nav = typeof navigator !== 'undefined' ? navigator : undefined
    if (nav?.share) {
      try {
        await nav.share({ title: 'MindDuel', text: shareText, url: shareUrl })
        return
      } catch {
        return // user dismissed the native sheet
      }
    }
    try {
      await nav?.clipboard?.writeText(`${shareText} ${shareUrl}`)
      toast('Link copied — share it!', 'success')
    } catch {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
        '_blank',
      )
    }
  }

  const solid = variant === 'solid'
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onShare}
      style={{
        appearance: 'none', fontFamily: 'inherit', cursor: 'pointer',
        padding: '9px 16px', borderRadius: 999, flexShrink: 0,
        border: solid ? 'none' : '1.5px solid rgba(0,0,0,0.12)',
        background: solid ? '#1D1D1F' : 'var(--mdd-card)',
        color: solid ? '#fff' : INK,
        fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', gap: 7,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
      </svg>
      {label}
    </motion.button>
  )
}
