'use client'

import { useTheme } from '@/components/ThemeProvider'

const INK        = 'var(--mdd-ink)'

/**
 * Sun/moon toggle button. Sized to match the SoundToggle (36×36 round)
 * and uses the same neutral border style for visual harmony with the
 * other navbar pills.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={className}
      style={{
        appearance: 'none',
        border: '1.5px solid var(--mdd-border-strong, rgba(0,0,0,0.10))',
        background: 'var(--mdd-card, #fff)',
        color: 'var(--mdd-ink, ' + INK + ')',
        width: 36, height: 36, borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
        fontFamily: 'inherit',
        transition: 'background 140ms ease, color 140ms ease, border-color 140ms ease',
      }}
    >
      {isDark ? (
        // Sun (click to go light)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      ) : (
        // Moon (click to go dark)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}
