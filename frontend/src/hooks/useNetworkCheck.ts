'use client'

import { useAccount } from 'wagmi'
import { CELO_CHAIN_ID } from '@/lib/constants'

export type NetworkCheckState =
  | { status: 'checking' }
  | { status: 'celo' }
  | { status: 'wrong-network'; chainId: number }
  | { status: 'disconnected' }

/**
 * Verifies the connected wallet is on Celo mainnet (chainId 42220). Ranked
 * results are recorded by the backend regardless, but we surface a banner if
 * the user's wallet is pointed at the wrong network so balances/identity read
 * correctly.
 */
export function useNetworkCheck(): NetworkCheckState {
  const { isConnected, isConnecting, chainId } = useAccount()

  if (isConnecting) return { status: 'checking' }
  if (!isConnected) return { status: 'disconnected' }
  if (chainId === CELO_CHAIN_ID) return { status: 'celo' }
  return { status: 'wrong-network', chainId: chainId ?? 0 }
}
