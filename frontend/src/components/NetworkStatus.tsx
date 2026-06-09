'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Global network status banner.
 *
 * Listens to browser online/offline events. When offline, shows a sticky
 * banner at the top of the viewport so the user knows actions will fail.
 * Returns to a transient "Back online" toast when connection restores.
 *
 * Mounted once globally via ClientProviders.
 */
export function NetworkStatusBanner() {
  const [online, setOnline]   = useState(true)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    // Initialize from current state (SSR-safe)
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)

    function handleOnline() {
      setOnline(true)
      setShowBack(true)
      setTimeout(() => setShowBack(false), 3000)
    }
    function handleOffline() {
      setOnline(false)
      setShowBack(false)
    }
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          key="offline"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          role="alert"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
            background: '#A81C13', color: '#fff',
            padding: '10px 16px',
            fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 2px 12px rgba(168,28,19,0.3)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 10, background: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
            ⚠
          </span>
          You&apos;re offline. Actions involving the network will fail until your connection is restored.
        </motion.div>
      )}
      {showBack && (
        <motion.div
          key="back"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
            background: '#0A7A2D', color: '#fff',
            padding: '10px 16px',
            fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 2px 12px rgba(10,122,45,0.3)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 10, background: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
            ✓
          </span>
          Back online.
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Hook variant for components that need to gate actions on network state.
 *
 * Usage:
 *   const isOnline = useIsOnline()
 *   if (!isOnline) { toast('No internet'); return }
 */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
