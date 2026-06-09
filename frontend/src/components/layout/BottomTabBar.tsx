'use client'

import Link from 'next/link'
import type { NavActive } from './NavBar'

const BLUE = '#0071E3'
const MUTED = '#8E8E93'

const TABS: { id: NavActive; label: string; href: string; icon: React.ReactNode }[] = [
  {
    id: 'play', label: 'Play', href: '/lobby',
    icon: <><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M9 8L14 11L9 14V8Z" fill="currentColor"/></>,
  },
  {
    id: 'leaderboard', label: 'Ranks', href: '/leaderboard',
    icon: <><rect x="3" y="9" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="9" y="5" width="4" height="13" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="15" y="12" width="4" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
  },
  {
    id: 'history', label: 'History', href: '/history',
    icon: <><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M11 7V11L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
  },
  {
    id: 'profile', label: 'Profile', href: '/profile',
    icon: <><circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M4 19C4 15.69 7.13 13 11 13C14.87 13 18 15.69 18 19" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></>,
  },
]

export function BottomTabBar({ active }: { active: NavActive }) {
  return (
    <div className="bottom-tab-bar">
      {TABS.map(tab => {
        const isActive = tab.id === active
        return (
          <Link
            key={tab.id}
            href={tab.href}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', color: isActive ? BLUE : MUTED }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">{tab.icon}</svg>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500 }}>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
