'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signingSignal } from '@/lib/signing-signal'

/**
 * Top-of-screen banner shown while a wallet signing prompt is open. Solves
 * the "is the app stuck or just waiting on Phantom?" confusion: after ~1s
 * with no popup visible the user assumes a hang and clicks again. The
 * banner makes the wait state explicit.
 */
export function SigningBanner() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(signingSignal.isActive())
    return signingSignal.subscribe(setActive)
  }, [])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
            zIndex: 999, pointerEvents: 'none',
            background: 'var(--mdd-card)',
            border: '1.5px solid #0071E3',
            borderRadius: 999,
            padding: '8px 16px 8px 12px',
            boxShadow: '0 8px 32px rgba(0,113,227,0.18), 0 0 0 0.5px rgba(0,0,0,0.06)',
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontSize: 13, fontWeight: 600, color: '#0071E3',
            fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif",
          }}
        >
          <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #0071E3', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
          Confirm in your wallet…
        </motion.div>
      )}
    </AnimatePresence>
  )
}
