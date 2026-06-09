import Link from 'next/link'
import Image from 'next/image'

const INK        = 'var(--mdd-ink)'
const BLUE  = '#0071E3'
const RED   = '#FF3B30'
const MUTED      = 'var(--mdd-muted)'

const BOARD_CELLS: Array<'X' | 'O' | null> = [null, 'X', null, 'O', null, null, null, null, 'X']

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--mdd-bg)',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
        <Image src="/icon-192.png" alt="MindDuel" width={28} height={28} style={{ borderRadius: 8 }} />
        <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.4, color: INK }}>MindDuel</span>
      </div>

      {/* Mini TTT board */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 62px)', gridTemplateRows: 'repeat(3, 62px)',
        gap: 6, padding: 10, background: 'var(--mdd-card)', borderRadius: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.05)',
        marginBottom: 32,
      }}>
        {BOARD_CELLS.map((cell, i) => (
          <div key={i} style={{
            borderRadius: 10, background: cell ? '#fff' : 'var(--mdd-card-alt)',
            border: '1.5px solid rgba(0,0,0,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700,
            color: cell === 'X' ? BLUE : RED,
            boxShadow: cell ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}>
            {cell}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -4, color: INK, lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: 14 }}>
        404
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: INK, margin: '0 0 8px', letterSpacing: -0.4 }}>
        Page not found
      </h1>
      <p style={{ fontSize: 15, color: MUTED, margin: '0 0 32px', lineHeight: 1.5, textAlign: 'center', maxWidth: 300 }}>
        This page doesn&apos;t exist. Maybe the match already ended?
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <Link
          href="/"
          style={{ display: 'inline-block', padding: '12px 24px', background: BLUE, color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(0,113,227,0.25)' }}
        >
          Back to Home
        </Link>
        <Link
          href="/lobby"
          style={{ display: 'inline-block', padding: '12px 24px', background: 'var(--mdd-card)', color: INK, borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: 'none', boxShadow: '0 0 0 1.5px rgba(0,0,0,0.10)' }}
        >
          Play a Game
        </Link>
      </div>
    </div>
  )
}
