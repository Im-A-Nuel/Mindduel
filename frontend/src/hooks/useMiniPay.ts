'use client'

import { useEffect, useState } from 'react'
import { useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

/**
 * MiniPay integration hook (the Celo "Proof of Ship" required hook).
 *
 * MiniPay is an in-app wallet that injects `window.ethereum` with an
 * `isMiniPay` flag. When the dapp is opened inside MiniPay there is no connect
 * button to press — we auto-connect the injected connector on mount so the
 * player is ready to be ranked immediately.
 *
 * Returns whether we're running inside MiniPay so the UI can hide the manual
 * "Connect Wallet" button in that environment.
 */
export function useMiniPay(): { isMiniPay: boolean } {
  const { connect } = useConnect()
  const [isMiniPay, setIsMiniPay] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const eth = (window as unknown as { ethereum?: { isMiniPay?: boolean } }).ethereum
    if (eth?.isMiniPay) {
      setIsMiniPay(true)
      // Auto-connect — MiniPay expects the dapp to connect without a prompt.
      connect({ connector: injected({ shimDisconnect: true }) })
    }
  }, [connect])

  return { isMiniPay }
}
