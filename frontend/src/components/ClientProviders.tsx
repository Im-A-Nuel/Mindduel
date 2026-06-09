'use client'

import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { ToastProvider } from '@/components/ui/Toast'
import { NetworkStatusBanner } from '@/components/NetworkStatus'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'
import { ThemeProvider } from '@/components/ThemeProvider'
import { useEffect } from 'react'
import { sounds } from '@/lib/sounds'

import '@solana/wallet-adapter-react-ui/styles.css'

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com'

/**
 * Custom fetch for the Solana Connection with exponential backoff on 429.
 *
 * The public `api.devnet.solana.com` endpoint rate-limits aggressively, and
 * during a stake match the wallet adapter, anchor client, and balance reads
 * all hit it concurrently. Without retry we crash the page on 429. With
 * jittered backoff (capped) the storm shapes itself naturally.
 *
 * We retry up to 5 times on 429 / 503 / network errors. After that we let
 * the error propagate so the calling code can surface a useful toast.
 */
async function rpcFetchWithBackoff(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const maxAttempts = 5
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(input, init)
      if (res.status !== 429 && res.status !== 503) return res
      // Honor Retry-After if the RPC sends one.
      const ra = res.headers.get('retry-after')
      const headerDelay = ra ? Math.min(8_000, parseInt(ra, 10) * 1000 || 0) : 0
      const backoff = Math.min(8_000, 250 * 2 ** attempt) + Math.random() * 200
      await new Promise(r => setTimeout(r, headerDelay || backoff))
      if (attempt === maxAttempts - 1) return res
    } catch (e) {
      if (attempt === maxAttempts - 1) throw e
      const backoff = Math.min(8_000, 250 * 2 ** attempt) + Math.random() * 200
      await new Promise(r => setTimeout(r, backoff))
    }
  }
  return fetch(input, init)
}

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

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  const connectionConfig = useMemo(() => ({
    commitment: 'confirmed' as const,
    fetch: rpcFetchWithBackoff,
    confirmTransactionInitialTimeout: 60_000,
  }), [])

  return (
    <ThemeProvider>
      <ConnectionProvider endpoint={RPC_ENDPOINT} config={connectionConfig}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <ToastProvider>
              <NetworkStatusBanner />
              <GlobalShortcuts />
              <KeyboardShortcuts />
              {children}
            </ToastProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  )
}
