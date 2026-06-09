'use client'

import { useEffect, useState, useCallback } from 'react'
import { getPlayerRanking, type PlayerRanking } from '@/lib/contract'

/**
 * Read a player's on-chain ranking (points, rank tier, W/L/D). Defaults to the
 * connected wallet via `address`. Re-reads whenever the address changes or
 * `refresh()` is called (e.g. after a ranked match settles on-chain).
 */
export function useRanking(address: string | undefined) {
  const [data, setData] = useState<PlayerRanking | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!address) {
      setData(null)
      return
    }
    setLoading(true)
    try {
      setData(await getPlayerRanking(address))
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    void load()
  }, [load])

  return { ranking: data, loading, refresh: load }
}
