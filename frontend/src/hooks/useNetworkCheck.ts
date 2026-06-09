'use client'

import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'

/**
 * Devnet's permanent genesis hash. If our connection (via the configured
 * RPC) returns this hash, we're really on devnet. Anything else means the
 * RPC was misconfigured and our `claim_hint`/`settle_game` txs would land
 * on the wrong cluster — better to surface a banner and block actions.
 */
const DEVNET_GENESIS_HASH = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'

export type NetworkCheckState =
  | { status: 'checking' }
  | { status: 'devnet' }
  | { status: 'wrong-network'; cluster: string }
  | { status: 'rpc-error' }

/**
 * Verifies the configured RPC is actually pointing at devnet. We can't
 * detect what network the user's *wallet* is set to (Phantom doesn't
 * expose it cross-version), but we CAN verify the connection layer is
 * sane — which is what actually matters for tx routing.
 */
export function useNetworkCheck(): NetworkCheckState {
  const { connection } = useConnection()
  const [state, setState] = useState<NetworkCheckState>({ status: 'checking' })

  useEffect(() => {
    let cancelled = false
    connection.getGenesisHash()
      .then(hash => {
        if (cancelled) return
        if (hash === DEVNET_GENESIS_HASH) {
          setState({ status: 'devnet' })
        } else {
          // Identify common networks for a friendlier message.
          const known: Record<string, string> = {
            '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d': 'mainnet-beta',
            '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY': 'testnet',
          }
          setState({ status: 'wrong-network', cluster: known[hash] ?? `unknown (${hash.slice(0, 8)}…)` })
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'rpc-error' })
      })
    return () => { cancelled = true }
  }, [connection])

  return state
}
