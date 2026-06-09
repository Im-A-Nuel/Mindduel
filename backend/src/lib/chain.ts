import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  type Account,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'

/**
 * Celo relayer for MindDuelRanking.
 *
 * The backend is the contract `owner`: it submits ranked match results via
 * recordMatch() and pays the CELO gas. Players never sign or pay to be ranked.
 * If the contract address / relayer key are unset (e.g. local dev), the helpers
 * degrade gracefully so the rest of the app still runs (DB-only, no on-chain).
 */

const RPC_URL = process.env.CELO_RPC_URL ?? process.env.RPC_URL ?? 'https://forno.celo.org'
const CONTRACT = (process.env.RANKING_CONTRACT_ADDRESS ?? '').trim() as `0x${string}` | ''
const RELAYER_PK = (process.env.RELAYER_PRIVATE_KEY ?? '').trim()

const RANKING_ABI = [
  {
    type: 'function', name: 'recordMatch', stateMutability: 'nonpayable',
    inputs: [
      { name: 'winner', type: 'address' },
      { name: 'loser', type: 'address' },
      { name: 'draw', type: 'bool' },
      { name: 'matchId', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'getPlayer', stateMutability: 'view',
    inputs: [{ name: 'who', type: 'address' }],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'points', type: 'uint256' },
        { name: 'wins', type: 'uint64' },
        { name: 'losses', type: 'uint64' },
        { name: 'draws', type: 'uint64' },
        { name: 'lastPlayed', type: 'uint64' },
        { name: 'exists', type: 'bool' },
      ],
    }],
  },
  {
    type: 'function', name: 'playerCount', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', name: 'getPlayers', stateMutability: 'view',
    inputs: [{ name: 'start', type: 'uint256' }, { name: 'count', type: 'uint256' }],
    outputs: [
      { name: 'addrs', type: 'address[]' },
      {
        name: 'data', type: 'tuple[]',
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

type PlayerTuple = { points: bigint; wins: bigint; losses: bigint; draws: bigint; lastPlayed: bigint; exists: boolean }

export function isChainConfigured(): boolean {
  return !!CONTRACT && !!RELAYER_PK
}

let _account: Account | null = null
function relayerAccount(): Account {
  if (!_account) _account = privateKeyToAccount(RELAYER_PK as `0x${string}`)
  return _account
}

const publicClient = createPublicClient({ chain: celo, transport: http(RPC_URL) })

function walletClient() {
  return createWalletClient({ account: relayerAccount(), chain: celo, transport: http(RPC_URL) })
}

/** Deterministically map a match id string to bytes32 for idempotency. */
function matchKey(matchId: string): `0x${string}` {
  return keccak256(toBytes(matchId))
}

async function readPoints(addr: string): Promise<number> {
  try {
    const p = (await publicClient.readContract({
      address: CONTRACT as `0x${string}`, abi: RANKING_ABI, functionName: 'getPlayer',
      args: [addr as `0x${string}`],
    })) as PlayerTuple
    return p.exists ? Number(p.points) : 1000
  } catch {
    return 1000
  }
}

export interface RecordResult {
  txHash: string | null
  winnerDelta: number
  loserDelta: number
  winnerPoints: number | null
  loserPoints: number | null
}

/**
 * Record a ranked match result on-chain. Idempotent per matchId — a second call
 * (e.g. the loser's client) hits AlreadySettled and we just read current points.
 * Returns null only if the chain isn't configured.
 */
export async function recordMatchOnChain(args: {
  winner: string
  loser: string
  draw: boolean
  matchId: string
}): Promise<RecordResult | null> {
  if (!isChainConfigured()) return null

  const key = matchKey(args.matchId)
  const beforeW = await readPoints(args.winner)
  const beforeL = await readPoints(args.loser)

  let txHash: string | null = null
  try {
    const { request } = await publicClient.simulateContract({
      account: relayerAccount(),
      address: CONTRACT as `0x${string}`,
      abi: RANKING_ABI,
      functionName: 'recordMatch',
      args: [args.winner as `0x${string}`, args.loser as `0x${string}`, args.draw, key],
    })
    const hash = await walletClient().writeContract(request)
    await publicClient.waitForTransactionReceipt({ hash })
    txHash = hash
  } catch (e) {
    // AlreadySettled (idempotent replay) or transient — fall through to read
    // current on-chain points so the caller still gets accurate values.
    const msg = e instanceof Error ? e.message : String(e)
    if (!/AlreadySettled/i.test(msg)) {
      console.error('[chain] recordMatch failed:', msg.slice(0, 160))
    }
  }

  const afterW = await readPoints(args.winner)
  const afterL = await readPoints(args.loser)

  return {
    txHash,
    winnerDelta: afterW - beforeW,
    loserDelta: afterL - beforeL,
    winnerPoints: afterW,
    loserPoints: afterL,
  }
}

export interface OnchainPlayer {
  address: string
  points: number
  wins: number
  losses: number
  draws: number
}

export async function getPlayerOnchain(addr: string): Promise<OnchainPlayer | null> {
  if (!CONTRACT) return null
  try {
    const p = (await publicClient.readContract({
      address: CONTRACT as `0x${string}`, abi: RANKING_ABI, functionName: 'getPlayer',
      args: [addr as `0x${string}`],
    })) as PlayerTuple
    if (!p.exists) return null
    return { address: addr, points: Number(p.points), wins: Number(p.wins), losses: Number(p.losses), draws: Number(p.draws) }
  } catch {
    return null
  }
}

/** Full roster sorted by points, for the leaderboard. Empty if unconfigured. */
export async function getLeaderboardOnchain(limit = 100): Promise<OnchainPlayer[]> {
  if (!CONTRACT) return []
  try {
    const count = (await publicClient.readContract({
      address: CONTRACT as `0x${string}`, abi: RANKING_ABI, functionName: 'playerCount',
    })) as bigint
    const n = Number(count)
    if (n === 0) return []
    const [addrs, data] = (await publicClient.readContract({
      address: CONTRACT as `0x${string}`, abi: RANKING_ABI, functionName: 'getPlayers',
      args: [BigInt(0), BigInt(n)],
    })) as [string[], PlayerTuple[]]
    const rows = addrs.map((a, i) => ({
      address: a,
      points: Number(data[i].points),
      wins: Number(data[i].wins),
      losses: Number(data[i].losses),
      draws: Number(data[i].draws),
    }))
    rows.sort((a, b) => b.points - a.points)
    return rows.slice(0, limit)
  } catch {
    return []
  }
}
