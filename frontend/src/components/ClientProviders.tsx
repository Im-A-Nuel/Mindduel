'use client'

import { useEffect, useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi'
import { ToastProvider } from '@/components/ui/Toast'
import { NetworkStatusBanner } from '@/components/NetworkStatus'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'
import { ThemeProvider } from '@/components/ThemeProvider'
import { useMiniPay } from '@/hooks/useMiniPay'
import { sounds } from '@/lib/sounds'

/** Global keyboard handlers that don't need their own UI. */
function GlobalShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        sounds.toggle()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  return null
}

/** Runs the MiniPay auto-connect hook (Celo Proof of Ship integration). */
function MiniPayBootstrap() {
  useMiniPay()
  return null
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <ThemeProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <MiniPayBootstrap />
            <NetworkStatusBanner />
            <GlobalShortcuts />
            <KeyboardShortcuts />
            {children}
          </ToastProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}
