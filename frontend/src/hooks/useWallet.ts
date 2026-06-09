'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

/**
 * Thin wallet facade over wagmi used across the app. Exposes the connected
 * Celo address as a lowercased hex string plus connect/disconnect helpers.
 *
 * Pages use `address` (a lowercased 0x string) as the player identifier.
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
