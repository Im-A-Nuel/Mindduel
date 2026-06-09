'use client'

import Link from 'next/link'
import Image from 'next/image'
import { WalletButton } from '@/components/wallet/WalletButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BottomTabBar } from './BottomTabBar'

const BLUE  = '#0071E3'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const GREEN = '#34C759'

export type NavActive = 'play' | 'leaderboard' | 'history' | 'profile'

const NAV_ITEMS: { label: string; id: NavActive; href: string }[] = [
  { label: 'Play',        id: 'play',        href: '/lobby'        },
  { label: 'Leaderboard', id: 'leaderboard', href: '/leaderboard'  },
  { label: 'History',     id: 'history',     href: '/history'      },
  { label: 'Profile',     id: 'profile',     href: '/profile'      },
]

export function NavBar({ active }: { active: NavActive }) {
  return (
    <>
      <nav className="glass-nav" style={{ height: 64, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left: logo + links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexShrink: 1 }}>
              <Image src="/icon-192.png" alt="MindDuel" width={28} height={28} style={{ borderRadius: 8, flexShrink: 0 }} />
              <span className="nav-logo-text" style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.4, color: INK, whiteSpace: 'nowrap' }}>MindDuel</span>
            </Link>

            {/* Nav links — hidden on mobile */}
            <div className="nav-links" style={{ display: 'flex', gap: 24 }}>
              {NAV_ITEMS.map(({ label, id, href }) => {
                const isActive = active === id
                return (
                  <Link
                    key={id}
                    href={href}
                    style={{ textDecoration: 'none', position: 'relative', fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? INK : MUTED }}
                  >
                    {label}
                    {isActive && (
                      <div style={{ position: 'absolute', bottom: -22, left: 0, right: 0, height: 2, background: BLUE, borderRadius: 1 }} />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right: network badge (desktop only) + wallet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div className="nav-devnet" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px', background: 'var(--mdd-card)', borderRadius: 999, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.08)' }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: GREEN }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: MUTED }}>Solana Devnet</span>
            </div>
            <ThemeToggle />
            <WalletButton />
          </div>

        </div>
      </nav>

      {/* Bottom tab bar — mobile only */}
      <BottomTabBar active={active} />
    </>
  )
}
