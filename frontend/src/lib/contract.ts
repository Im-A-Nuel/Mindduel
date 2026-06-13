import { createPublicClient, http } from 'viem'
import { celo } from 'viem/chains'
import { CELO_RPC_URL, RANKING_CONTRACT_ADDRESS, START_POINTS, tierForPoints } from './constants'

/**
 * Read-only access to the MindDuelRanking contract on Celo.
 *
 * Writes (recordMatch) are submitted by the backend relayer that owns the
 * contract - the frontend never sends transactions to be ranked. Here we only
 * read points/rank for profiles and the leaderboard.
 */

export const RANKING_ABI = [
  {
    type: 'function',
    name: 'getPlayer',
    stateMutability: 'view',
    inputs: [{ name: 'who', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'points', type: 'uint256' },
          { name: 'wins', type: 'uint64' },
          { name: 'losses', type: 'uint64' },
          { name: 'draws', type: 'uint64' },
          { name: 'lastPlayed', type: 'uint64' },
          { name: 'exists', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'playerCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'checkIn',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'lastCheckInDay',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'checkInCount',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'totalCheckIns',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getPlayers',
    stateMutability: 'view',
    inputs: [
      { name: 'start', type: 'uint256' },
      { name: 'count', type: 'uint256' },
    ],
    outputs: [
      { name: 'addrs', type: 'address[]' },
      {
        name: 'data',
        type: 'tuple[]',
        components: [
          { name: 'points', type: 'uint256' },
          { name: 'wins', type: 'uint64' },
          { name: 'losses', type: 'uint64' },
          { name: 'draws', type: 'uint64' },
          { name: 'lastPlayed', type: 'uint64' },
          { name: 'exists', type: 'bool' },
        ],
      },
    ],
  },
] as const

export interface PlayerRanking {
  address: string
  points: number
  wins: number
  losses: number
  draws: number
  exists: boolean
  tier: string
  tierColor: string
}

export interface LeaderboardRow extends PlayerRanking {
  rank: number
  winRate: number
}

export const publicClient = createPublicClient({
  chain: celo,
  transport: http(CELO_RPC_URL),
})

function isConfigured(): boolean {
  return !!RANKING_CONTRACT_ADDRESS
}

function toRanking(address: string, p: {
  points: bigint; wins: bigint; losses: bigint; draws: bigint; exists: boolean
}): PlayerRanking {
  const points = p.exists ? Number(p.points) : START_POINTS
  const tier = tierForPoints(points)
  return {
    address,
    points,
    wins: Number(p.wins),
    losses: Number(p.losses),
    draws: Number(p.draws),
    exists: p.exists,
    tier: tier.label,
    tierColor: tier.color,
  }
}

/** On-chain ranking for one player. Returns a default (unranked) shape if the
 * contract is unset or the player has no record yet. */
export async function getPlayerRanking(address: string): Promise<PlayerRanking> {
  const fallback = toRanking(address, {
    points: BigInt(0), wins: BigInt(0), losses: BigInt(0), draws: BigInt(0), exists: false,
  })
  if (!isConfigured() || !address) return fallback
  try {
    const p = (await publicClient.readContract({
      address: RANKING_CONTRACT_ADDRESS as `0x${string}`,
      abi: RANKING_ABI,
      functionName: 'getPlayer',
      args: [address as `0x${string}`],
    })) as { points: bigint; wins: bigint; losses: bigint; draws: bigint; lastPlayed: bigint; exists: boolean }
    return toRanking(address, p)
  } catch {
    return fallback
  }
}

/** Global on-chain daily check-in count (0 if unconfigured/unreachable). */
export async function getTotalCheckIns(): Promise<number> {
  if (!isConfigured()) return 0
  try {
    const n = (await publicClient.readContract({
      address: RANKING_CONTRACT_ADDRESS as `0x${string}`,
      abi: RANKING_ABI,
      functionName: 'totalCheckIns',
    })) as bigint
    return Number(n)
  } catch {
    return 0
  }
}

/** Top players from the on-chain roster, sorted by points. */
export async function getOnchainLeaderboard(limit = 100): Promise<LeaderboardRow[]> {
  if (!isConfigured()) return []
  try {
    const count = (await publicClient.readContract({
      address: RANKING_CONTRACT_ADDRESS as `0x${string}`,
      abi: RANKING_ABI,
      functionName: 'playerCount',
    })) as bigint

    const n = Number(count)
    if (n === 0) return []

    const [addrs, data] = (await publicClient.readContract({
      address: RANKING_CONTRACT_ADDRESS as `0x${string}`,
      abi: RANKING_ABI,
      functionName: 'getPlayers',
      args: [BigInt(0), BigInt(n)],
    })) as [string[], { points: bigint; wins: bigint; losses: bigint; draws: bigint; lastPlayed: bigint; exists: boolean }[]]

    const rows = addrs.map((a, i) => {
      const r = toRanking(a, data[i])
      const games = r.wins + r.losses
      return {
        ...r,
        rank: 0,
        winRate: games > 0 ? r.wins / games : 0,
      } as LeaderboardRow
    })

    rows.sort((a, b) => b.points - a.points)
    rows.forEach((r, i) => (r.rank = i + 1))
    return rows.slice(0, limit)
  } catch {
    return []
  }
}
