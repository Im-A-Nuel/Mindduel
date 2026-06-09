'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { IconCheck, IconX, IconClock, IconZap } from '@/components/ui/Icons'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANTS = {
  success: {
    icon: IconCheck,
    accent: 'bg-success',
    ring: 'border-success/30',
    iconBg: 'bg-success/12 text-success',
  },
  error: {
    icon: IconX,
    accent: 'bg-danger',
    ring: 'border-danger/30',
    iconBg: 'bg-danger/12 text-danger',
  },
  warning: {
    icon: IconClock,
    accent: 'bg-warning',
    ring: 'border-warning/30',
    iconBg: 'bg-warning/12 text-warning',
  },
  info: {
    icon: IconZap,
    accent: 'bg-primary-hover',
    ring: 'border-primary/30',
    iconBg: 'bg-primary/12 text-primary-hover',
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts(prev => [...prev.slice(-3), { id, message, variant }])
    setTimeout(() => dismiss(id), 3400)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map(t => {
            const v = VARIANTS[t.variant]
            const IconComp = v.icon
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 48, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className={cn(
                  'pointer-events-auto relative overflow-hidden',
                  'flex items-center gap-3 pr-4 pl-3 py-3 rounded-2xl border',
                  'bg-bg-elevated/95 backdrop-blur-xl shadow-elevated',
                  'min-w-[260px] max-w-xs',
                  v.ring,
                )}
              >
                {/* Left accent bar */}
                <div className={cn('absolute left-0 top-3 bottom-3 w-[3px] rounded-full', v.accent)} />

                {/* Icon */}
                <div className={cn(
                  'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ml-2',
                  v.iconBg,
                )}>
                  <IconComp className="w-3.5 h-3.5" />
                </div>

                {/* Message */}
                <span className="text-sm font-body text-text-primary flex-1 leading-snug">
                  {t.message}
                </span>

                {/* Dismiss */}
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.07] transition-colors"
                  aria-label="Dismiss"
                >
                  <IconX className="w-3 h-3" />
                </button>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.05]">
                  <div className={cn('h-full rounded-full animate-toast-progress', v.accent, 'opacity-60')} />
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx.toast
}
