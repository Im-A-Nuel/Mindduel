'use client'

/**
 * Reusable colored-circle icons used in empty/error/info states across pages.
 * Replaces inline emojis (⚠️, 🔌, 🎮, 🏆, 🏅) for consistent visual language.
 */

interface IconProps {
  size?:    number
  bgSize?:  number
  bg?:      string
  fg?:      string
}

function IconBubble({ size = 56, bg, children }: { size?: number; bg: string; children: React.ReactNode }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.3),
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 14px',
    }}>{children}</div>
  )
}

export function StateIconAlert({ size = 56, bg = '#FDECEB', fg = '#A81C13' }: IconProps & { fg?: string }) {
  return (
    <IconBubble size={size} bg={bg}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </IconBubble>
  )
}

export function StateIconWallet({ size = 56, bg = '#E5F0FD' }: IconProps) {
  return (
    <IconBubble size={size} bg={bg}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0071E3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
      </svg>
    </IconBubble>
  )
}

export function StateIconTrophy({ size = 56, bg = '#FFF4E0' }: IconProps) {
  return (
    <IconBubble size={size} bg={bg}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8A5A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
      </svg>
    </IconBubble>
  )
}

export function IconEject({ size = 14, color = '#FF3B30' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
      <path d="M5 9l7-7 7 7"/>
      <line x1="5" y1="15" x2="19" y2="15"/>
      <line x1="5" y1="19" x2="19" y2="19"/>
    </svg>
  )
}

export function IconViewers({ size = 12, color = '#6E6E73' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-1px' }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

/** Robot / AI head — replaces 🤖 */
export function IconRobot({ size = 24, color = '#0071E3', bg }: { size?: number; color?: string; bg?: string }) {
  const inner = (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="3"/>
      <circle cx="9" cy="13" r="1.5" fill={color} stroke="none"/>
      <circle cx="15" cy="13" r="1.5" fill={color} stroke="none"/>
      <path d="M9.5 16.5h5"/>
      <path d="M12 7V4"/>
      <circle cx="12" cy="3" r="1" fill={color} stroke="none"/>
      <path d="M3 11H1M23 11h-2"/>
    </svg>
  )
  if (!bg) return inner
  return (
    <div style={{ width: size + 16, height: size + 16, borderRadius: Math.round((size + 16) * 0.3), background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {inner}
    </div>
  )
}

/** Crosshair / target — replaces 🎯 */
export function IconCrosshair({ size = 24, color = '#0071E3', bg }: { size?: number; color?: string; bg?: string }) {
  const inner = (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="3" x2="12" y2="7"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
      <line x1="3" y1="12" x2="7" y2="12"/>
      <line x1="17" y1="12" x2="21" y2="12"/>
    </svg>
  )
  if (!bg) return inner
  return (
    <div style={{ width: size + 16, height: size + 16, borderRadius: Math.round((size + 16) * 0.3), background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {inner}
    </div>
  )
}

/** Lightning bolt — replaces ⚡ */
export function IconBolt({ size = 24, color = '#8A5A00', bg }: { size?: number; color?: string; bg?: string }) {
  const inner = (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={color} stroke="none" opacity="0.85"/>
    </svg>
  )
  if (!bg) return inner
  return (
    <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {inner}
    </div>
  )
}

/** Flame — replaces 🔥 */
export function IconFlame({ size = 16, color = '#FF6A00' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-2px' }}>
      <path d="M12 23c-4.97 0-9-3.36-9-8 0-4 3-6.5 5-8 0 2.5 1.5 3.5 1.5 3.5C10 8 11 5 11 2c3 2 7 5.5 7 9.5 0 1.2-.3 2.3-.8 3.2.8-1 1.3-2.3 1.3-3.7 0 0 1.5 1.5 1.5 4.5 0 3.9-3.58 7.5-8 7.5z"/>
    </svg>
  )
}

/** Coin / token — replaces 🪙 */
export function IconCoin({ size = 16, color = '#8A5A00' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-2px' }}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v10M9.5 9.5C9.5 8.1 10.6 7 12 7s2.5 1.1 2.5 2.5c0 1.4-1.1 2.5-2.5 2.5s-2.5 1.1-2.5 2.5S10.6 17 12 17s2.5-1.1 2.5-2.5"/>
    </svg>
  )
}

/** Medal — replaces 🏅 */
export function IconMedal({ size = 28, color = '#8A5A00', bg = '#FFF4E0' }: { size?: number; color?: string; bg?: string }) {
  return (
    <div style={{ width: size + 20, height: size + 20, borderRadius: Math.round((size + 20) * 0.3), background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="14" r="7"/>
        <path d="M8.21 3.06 7 6l5 2 5-2-1.21-2.94A2 2 0 0 0 13.93 2h-3.86a2 2 0 0 0-1.86 1.06z"/>
        <path d="M12 11v6"/>
        <path d="M9.5 13.5l2.5 1 2.5-1"/>
      </svg>
    </div>
  )
}

/** Trophy inline (small) — replaces 🏆 in text contexts */
export function IconTrophySm({ size = 20, color = '#8A5A00' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-4px', marginRight: 4 }}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  )
}

/** Dice — replaces 🎲 */
export function IconDice({ size = 14, color = '#6E6E73' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }}>
      <rect x="2" y="2" width="20" height="20" rx="4"/>
      <circle cx="8" cy="8" r="1.2" fill={color} stroke="none"/>
      <circle cx="16" cy="8" r="1.2" fill={color} stroke="none"/>
      <circle cx="12" cy="12" r="1.2" fill={color} stroke="none"/>
      <circle cx="8" cy="16" r="1.2" fill={color} stroke="none"/>
      <circle cx="16" cy="16" r="1.2" fill={color} stroke="none"/>
    </svg>
  )
}

/** Handshake / draw — replaces 🤝 */
export function IconHandshake({ size = 20, color = '#0071E3', bg = 'var(--mdd-card)' }: { size?: number; color?: string; bg?: string }) {
  return (
    <div style={{ width: 40, height: 40, borderRadius: 20, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/>
      </svg>
    </div>
  )
}
