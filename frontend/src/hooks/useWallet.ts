'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

/**
 * Thin wallet facade over wagmi used across the app. Exposes the connected
 * Celo address as a lowercased hex string plus connect/disconnect helpers.
 *
 * Replaces the old Solana `useWallet()` — pages should use `address` (string)
 * wherever they previously used `publicKey.toBase58()`.
 */
export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  return {
    address: address ? (address.toLowerCase() as string) : undefined,
    isConnected,
    isConnecting,
    connect: () => connect({ connector: injected({ shimDisconnect: true }) }),
    disconnect,
  }
}
