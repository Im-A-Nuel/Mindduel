'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const BG    = '#F5F5F7'

interface Shortcut { keys: string[]; label: string }

const SHORTCUTS: { section: string; items: Shortcut[] }[] = [
  {
    section: 'Game board',
    items: [
      { keys: ['1', '–', '9'],  label: 'Claim cell 1–9 during your turn' },
      { keys: ['A', '–', 'D'],  label: 'Pick trivia answer A–D' },
      { keys: ['Esc'],          label: 'Close any open dialog' },
      { keys: ['Enter'],        label: 'Confirm primary action in dialogs' },
    ],
  },
  {
    section: 'Global',
    items: [
      { keys: ['?'],     label: 'Open this shortcuts dialog' },
      { keys: ['M'],     label: 'Toggle sound effects' },
    ],
  },
]

/**
 * Floating "?" button bottom-right that opens a keyboard shortcut cheat sheet.
 * Listens globally for "?" (Shift+/) to open. Renders via portal so it works
 * over any page.
 */
export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when user is typing in an input/textarea
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setOpen(o => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const triggerBtn = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Show keyboard shortcuts (press ?)"
      title="Keyboard shortcuts (?)"
      className="kbd-fab hidden-on-mobile"
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 90,
        width: 36, height: 36, borderRadius: 18,
        background: 'var(--mdd-card)', border: '1.5px solid rgba(0,0,0,0.10)',
        color: INK, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
        fontSize: 14, fontWeight: 700,
      }}
    >
      ?
    </button>
  )

  const dialog = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="kbd"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 250,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, boxSizing: 'border-box',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-labelledby="kbd-title"
            style={{
              width: '100%', maxWidth: 460,
              maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
              background: 'var(--mdd-card)', borderRadius: 22,
              padding: 24, boxSizing: 'border-box',
              boxShadow: '0 24px 60px rgba(0,0,0,0.22), 0 0 0 0.5px rgba(0,0,0,0.06)',
              fontFamily: "'Inter', system-ui, sans-serif", color: INK,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 id="kbd-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.4 }}>
                Keyboard shortcuts
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ appearance: 'none', border: 'none', background: BG, width: 30, height: 30, borderRadius: 8, cursor: 'pointer', color: MUTED, fontSize: 15, fontFamily: 'inherit' }}
              >✕</button>
            </div>

            {SHORTCUTS.map(group => (
              <div key={group.section} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
                  {group.section}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontSize: 13, color: INK }}>{item.label}</span>
                      <span style={{ display: 'inline-flex', gap: 4, flexShrink: 0 }}>
                        {item.keys.map((k, i) => (
                          <kbd
                            key={i}
                            style={{
                              fontFamily: 'ui-monospace, Menlo, monospace',
                              fontSize: 11, fontWeight: 600,
                              padding: '3px 7px', minWidth: 18, textAlign: 'center',
                              background: BG, color: INK,
                              borderRadius: 6,
                              boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 1px 0 rgba(0,0,0,0.06)',
                            }}
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <p style={{ fontSize: 11.5, color: MUTED, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>
              Press <kbd style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, padding: '1px 5px', background: BG, borderRadius: 4 }}>?</kbd> any time to reopen this dialog.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (!mounted) return null
  return (
    <>
      {triggerBtn}
      {createPortal(dialog, document.body)}
    </>
  )
}
