'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { RANKING_ABI } from '@/lib/contract'
import { RANKING_CONTRACT_ADDRESS } from '@/lib/constants'
import { recordCheckIn, fetchCheckInStats, type CheckInStats } from '@/lib/api'

/**
 * Daily on-chain check-in. The player signs a checkIn() tx from their own
 * wallet once per UTC day — a distinct-sender on-chain action that drives daily
 * active users + transactions + gas. The confirmed tx is mirrored to the
 * backend so we can show consecutive-day streaks (not stored on-chain).
 */
export function useCheckIn() {
  const { address } = useAccount()
  const addr = (RANKING_CONTRACT_ADDRESS || undefined) as `0x${string}` | undefined
  const enabled = !!addr && !!address

  const { data: lastDay, refetch } = useReadContract({
    address: addr, abi: RANKING_ABI, functionName: 'lastCheckInDay',
    args: address ? [address] : undefined, query: { enabled },
  })

  const { writeContractAsync, isPending } = useWriteContract()
  const [stats, setStats] = useState<CheckInStats | null>(null)

  const loadStats = useCallback(() => {
    if (!address) { setStats(null); return }
    void fetchCheckInStats(address).then(setStats)
  }, [address])

  useEffect(() => { loadStats() }, [loadStats])

  const todayIdx = BigInt(Math.floor(Date.now() / 1000 / 86400))
  const checkedInToday =
    (lastDay !== undefined && BigInt(lastDay as bigint) === todayIdx) || (stats?.checkedInToday ?? false)

  async function checkIn() {
    if (!addr || !address) return
    const hash = await writeContractAsync({ address: addr, abi: RANKING_ABI, functionName: 'checkIn' })
    // Mirror to backend for streak tracking (best-effort).
    const updated = await recordCheckIn(address, hash ?? null)
    setStats(updated)
    setTimeout(() => void refetch(), 4000)
  }

  return {
    configured: !!addr,
    checkedInToday,
    currentStreak: stats?.currentStreak ?? 0,
    bestStreak: stats?.bestStreak ?? 0,
    count: stats?.count ?? 0,
    checkIn,
    isPending,
  }
}
