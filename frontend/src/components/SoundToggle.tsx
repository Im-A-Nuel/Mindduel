'use client'

import { useEffect, useState } from 'react'
import { sounds } from '@/lib/sounds'

const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'

/**
 * Compact circular button to toggle sound on/off. Reflects the engine's
 * mute state and persists across reloads via localStorage (handled in
 * sounds.ts).
 */
export function SoundToggle({ className }: { className?: string }) {
  const [muted, setMuted] = useState(false)

  // Initial value + subscribe to engine changes (so multiple toggles
  // mounted simultaneously stay in sync).
  useEffect(() => {
    setMuted(sounds.isMuted())
    return sounds.subscribe(setMuted)
  }, [])

  return (
    <button
      type="button"
      onClick={() => sounds.toggle()}
      aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
      title={muted ? 'Unmute sound effects' : 'Mute sound effects'}
      className={className}
      style={{
        appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)',
        background: 'var(--mdd-card)', color: muted ? MUTED : INK,
        width: 36, height: 36, borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
        transition: 'background 140ms ease, color 140ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--mdd-bg-soft)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--mdd-card)')}
    >
      {muted ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1="23" y1="9" x2="17" y2="15"/>
          <line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      )}
    </button>
  )
}
