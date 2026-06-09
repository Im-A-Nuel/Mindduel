'use client'

import { useMemo } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import type { Wallet } from '@coral-xyz/anchor'
import { buildAnchorClient, type AnchorClient } from '@/lib/anchor-client'

export function useAnchorClient(): AnchorClient | null {
  const { publicKey, signTransaction, signAllTransactions } = useWallet()
  const { connection } = useConnection()

  return useMemo(() => {
    if (!publicKey || !signTransaction || !signAllTransactions) return null
    const wallet = { publicKey, signTransaction, signAllTransactions } as Wallet
    try {
      return buildAnchorClient(wallet, connection)
    } catch {
      return null
    }
  }, [publicKey, signTransaction, signAllTransactions, connection])
}
