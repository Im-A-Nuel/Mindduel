'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { NavBar } from '@/components/layout/NavBar'
import { useToast } from '@/components/ui/Toast'
import { sounds } from '@/lib/sounds'
import {
  SUPPORT_EMAIL,
  SUPPORT_TELEGRAM,
  SUPPORT_TELEGRAM_URL,
  GITHUB_REPO_URL,
} from '@/lib/constants'

const BLUE  = '#0071E3'
const INK   = 'var(--mdd-ink)'
const MUTED = 'var(--mdd-muted)'
const FAINT = 'var(--mdd-faint)'
const CARD  = 'var(--mdd-card)'

function ContactCard({
  icon, title, value, href, onCopy,
}: {
  icon: React.ReactNode
  title: string
  value: string
  href: string
  onCopy?: () => void
}) {
  return (
    <div style={{
      background: CARD, borderRadius: 18, padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 13, background: '#E5F0FD',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: BLUE,
      }}>{icon}</div>

      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: FAINT, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: INK, overflowWrap: 'anywhere' }}>{value}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {onCopy && (
          <button
            onClick={onCopy}
            style={{
              appearance: 'none', border: '1.5px solid var(--mdd-border-strong)', background: CARD, color: INK,
              padding: '9px 14px', borderRadius: 11, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            Copy
          </button>
        )}
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => sounds.tap()} style={{ textDecoration: 'none' }}>
          <button style={{
            appearance: 'none', border: 'none', background: BLUE, color: '#fff',
            padding: '9px 16px', borderRadius: 11, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            Open
          </button>
        </a>
      </div>
    </div>
  )
}

/**
 * Support / contact.
 *
 * Added on Celo Foundation feedback: the app had no way to reach a human.
 * Channels come from constants so this page, the terms page and the footer
 * can never disagree about how to get in touch.
 */
export default function SupportPage() {
  const toast = useToast()

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
      .then(() => { sounds.copy(); toast(`${label} copied`, 'success') })
      .catch(() => toast('Could not copy', 'error'))
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mdd-bg)', color: INK, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif" }}>
      <NavBar active="play" showBottomTab={false} />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 30 }}
        >
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1.2, margin: '0 0 10px' }}>Get help</h1>
          <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.6, margin: 0 }}>
            Something broken, a question stuck in your head, or an idea you want built? Message us and we will get back to you.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 34 }}
        >
          <ContactCard
            title="Telegram"
            value={`@${SUPPORT_TELEGRAM}`}
            href={SUPPORT_TELEGRAM_URL}
            onCopy={() => copy(`@${SUPPORT_TELEGRAM}`, 'Telegram handle')}
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 4.5 2.5 11.5l6 2 2 6.5 3.5-4.5 5 3.5z" />
                <path d="M8.5 13.5 21.5 4.5" />
              </svg>
            }
          />
          <ContactCard
            title="Email"
            value={SUPPORT_EMAIL}
            href={`mailto:${SUPPORT_EMAIL}?subject=MindDuel%20support`}
            onCopy={() => copy(SUPPORT_EMAIL, 'Email address')}
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
                <path d="m3 6 9 6 9-6" />
              </svg>
            }
          />
          <ContactCard
            title="Report a bug"
            value="GitHub issues"
            href={`${GITHUB_REPO_URL}/issues`}
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5" />
                <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
              </svg>
            }
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45 }}
        >
          <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4, margin: '0 0 12px' }}>Before you write</h2>
          <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.65, margin: '0 0 14px' }}>
            Most questions are answered on the{' '}
            <Link href="/how-it-works" onClick={() => sounds.tap()} style={{ color: BLUE, textDecoration: 'none', fontWeight: 600 }}>how it works</Link>{' '}
            page: how a turn works, what ranked means, and why the game is free.
          </p>
          <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.65, margin: 0 }}>
            If you are reporting a problem with a match, sending us the match ID from the top of the game screen
            makes it much faster to find.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ marginTop: 34, display: 'flex', gap: 12, flexWrap: 'wrap' }}
        >
          <Link href="/lobby" onClick={() => sounds.click()} style={{ textDecoration: 'none', flex: '1 1 180px' }}>
            <button style={{ appearance: 'none', border: 'none', width: '100%', padding: '14px', background: BLUE, color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,113,227,0.25)' }}>
              Back to playing
            </button>
          </Link>
        </motion.div>
      </main>
    </div>
  )
}
