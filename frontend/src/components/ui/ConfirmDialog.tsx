'use client'

import { useEffect, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const BLUE    = '#0071E3'
const RED     = '#FF3B30'
const GREEN   = '#34C759'
const WARN    = '#F59E0B'

export type ConfirmTone = 'default' | 'danger' | 'warning' | 'success'

interface ConfirmDialogProps {
  open:        boolean
  title:       string
  message:     string | ReactNode
  confirmLabel?:string
  cancelLabel?: string
  tone?:       ConfirmTone
  /** When true, hide the cancel button entirely (used for one-button info dialogs). */
  hideCancel?: boolean
  onConfirm:   () => void
  onCancel:    () => void
}

const TONES: Record<ConfirmTone, { bg: string; icon: string; iconBg: string; cta: string; ctaShadow: string }> = {
  default: { bg: '#E5F0FD', icon: '?',  iconBg: BLUE,  cta: BLUE,  ctaShadow: 'rgba(0,113,227,0.25)' },
  danger:  { bg: '#FDECEB', icon: '⚠',  iconBg: RED,   cta: RED,   ctaShadow: 'rgba(255,59,48,0.25)' },
  warning: { bg: '#FFF4E0', icon: '!',  iconBg: WARN,  cta: WARN,  ctaShadow: 'rgba(245,158,11,0.30)' },
  success: { bg: '#E8F7EE', icon: '✓',  iconBg: GREEN, cta: GREEN, ctaShadow: 'rgba(52,199,89,0.30)' },
}

/**
 * Reusable confirmation / info dialog. Themed to match the rest of the app
 * (Apple-flat, BLUE primary, white card with subtle shadow, rounded 22px).
 *
 * Renders via React Portal so ancestor `transform` (Framer Motion) does not
 * re-anchor the fixed-position backdrop.
 */
export function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  tone = 'default',
  hideCancel = false,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Lock body scroll while open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // ESC to cancel, Enter to confirm
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      else if (e.key === 'Enter') { e.preventDefault(); onConfirm() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel, onConfirm])

  const t = TONES[tone]

  const ui = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onCancel}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            boxSizing: 'border-box',
            fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={e => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            style={{
              position: 'relative',
              width: '100%', maxWidth: 380,
              background: 'var(--mdd-card)', borderRadius: 22,
              padding: '28px 24px 22px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.22), 0 0 0 0.5px rgba(0,0,0,0.06)',
              boxSizing: 'border-box',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: t.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 16,
                background: t.iconBg, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, fontWeight: 700,
              }}>{t.icon}</div>
            </div>

            <h2 id="confirm-title" style={{
              margin: 0, fontSize: 18, fontWeight: 700,
              letterSpacing: -0.4, color: INK, textAlign: 'center',
            }}>{title}</h2>

            <div id="confirm-message" style={{
              margin: '8px 0 22px', fontSize: 13.5, color: MUTED,
              textAlign: 'center', lineHeight: 1.5,
            }}>{message}</div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {!hideCancel && (
                <button
                  onClick={onCancel}
                  style={{
                    appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)',
                    background: 'var(--mdd-card)', color: INK,
                    padding: '11px 16px', borderRadius: 12,
                    fontSize: 13.5, fontWeight: 600,
                    fontFamily: 'inherit', cursor: 'pointer',
                    flex: '1 1 0', minWidth: 0,
                  }}
                >
                  {cancelLabel}
                </button>
              )}
              <button
                onClick={onConfirm}
                autoFocus
                style={{
                  appearance: 'none', border: 'none',
                  background: t.cta, color: '#fff',
                  padding: '11px 18px', borderRadius: 12,
                  fontSize: 13.5, fontWeight: 600,
                  fontFamily: 'inherit', cursor: 'pointer',
                  flex: hideCancel ? '1 1 100%' : '1 1 0', minWidth: 0,
                  boxShadow: `0 2px 10px ${t.ctaShadow}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (!mounted) return null
  return createPortal(ui, document.body)
}
