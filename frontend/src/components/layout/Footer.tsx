'use client'

import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { PROGRAM_ID } from '@/lib/constants'

/**
 * Routes where the footer is hidden — full-screen / immersive surfaces
 * (live match, spectator view, result splash) shouldn't have a footer
 * pushing content up. Match by prefix so dynamic segments are covered.
 */
const HIDDEN_PREFIXES = ['/game/', '/spectate/', '/result']

const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const FAINT      = 'var(--mdd-faint)'
const GREEN  = '#34C759'
const BLUE   = '#0071E3'

const REPO_URL = 'https://github.com/im-f-nuel/MinDDuel'
const DOCS_URL = 'https://mindduel.gitbook.io/mindduel-docs'

function shortPk(pk: string): string {
  return pk.slice(0, 4) + '…' + pk.slice(-4)
}

export function Footer() {
  const pathname = usePathname() ?? ''
  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null

  // Footer is content-heavy and competes with the bottom tab bar on phones.
  // Show it on the landing page only at mobile widths; hide everywhere else.
  // Desktop (>=768px) always shows it (except on the immersive routes above).
  const isLanding = pathname === '/'

  return (
    <footer
      className={isLanding ? '' : 'footer-hide-mobile'}
      style={{
        borderTop: '0.5px solid rgba(0,0,0,0.06)',
        background: 'var(--mdd-card)',
        marginTop: 32,
      }}
    >
      <div
        className="footer-inner"
        style={{
          maxWidth: 1280, margin: '0 auto',
          padding: '24px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
          fontSize: 12, color: MUTED,
        }}
      >
        {/* Left: brand + tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/icon-192.png" alt="MindDuel" width={22} height={22} style={{ borderRadius: 6 }} />
          <span style={{ fontWeight: 600, color: INK, fontSize: 13 }}>MindDuel</span>
          <span style={{ color: FAINT }}>·</span>
          <span>Trivia-gated PvP TTT on Solana</span>
        </div>

        {/* Middle: deployment info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: '#E8F7EE', color: '#0A7A2D', fontSize: 11, fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: GREEN, animation: 'liveDotPulse 1.6s ease-in-out infinite' }} />
            Solana Devnet
          </span>
          <a
            href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`}
            target="_blank" rel="noopener noreferrer"
            title="View program on Solana Explorer"
            style={{ color: MUTED, textDecoration: 'none', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11.5 }}
          >
            Program {shortPk(PROGRAM_ID)} ↗
          </a>
        </div>

        {/* Right: links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a
            href={DOCS_URL}
            target="_blank" rel="noopener noreferrer"
            style={{ color: MUTED, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            title="MindDuel Documentation"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Docs
          </a>
          <a
            href={REPO_URL}
            target="_blank" rel="noopener noreferrer"
            style={{ color: MUTED, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            title="GitHub repository"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            GitHub
          </a>
          <span style={{ color: FAINT, fontSize: 11.5 }}>v0.1 · Hackathon build</span>
        </div>
      </div>
    </footer>
  )
}
