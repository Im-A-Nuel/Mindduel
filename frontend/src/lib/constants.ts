// ── Celo / chain config ───────────────────────────────────────────────
export const CELO_CHAIN_ID = 42220
export const CELO_RPC_URL =
  process.env.NEXT_PUBLIC_CELO_RPC_URL ?? 'https://forno.celo.org'

/** Deployed MindDuelRanking contract (set after `forge script` deploy). */
export const RANKING_CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_RANKING_CONTRACT_ADDRESS ?? ''
) as `0x${string}` | ''

export const CELO_EXPLORER = 'https://celoscan.io'

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

// ── Ranking ladder ────────────────────────────────────────────────────
/** Rating every new player starts at (mirrors the contract's START). */
export const START_POINTS = 1000

/**
 * Rank tiers by points. A win raises your points (and can promote you);
 * a loss lowers them. No staking, no betting - pure skill ladder.
 */
export const RANK_TIERS = [
  { id: 'bronze',   label: 'Bronze',   min: 0,    color: '#CD7F32' },
  { id: 'silver',   label: 'Silver',   min: 1000, color: '#A8A9AD' },
  { id: 'gold',     label: 'Gold',     min: 1200, color: '#F5B301' },
  { id: 'platinum', label: 'Platinum', min: 1400, color: '#43C6DB' },
  { id: 'diamond',  label: 'Diamond',  min: 1600, color: '#6C8CFF' },
  { id: 'master',   label: 'Master',   min: 1850, color: '#B14BF4' },
] as const

export type RankTier = (typeof RANK_TIERS)[number]

/** Resolve the tier for a points total. */
export function tierForPoints(points: number): RankTier {
  let tier: RankTier = RANK_TIERS[0]
  for (const t of RANK_TIERS) {
    if (points >= t.min) tier = t
  }
  return tier
}

// ── Game modes (unchanged from the original duel) ─────────────────────
export const GAME_MODES = [
  {
    id: 'classic',
    label: 'Classic Duel',
    description: 'Standard 3×3 Tic Tac Toe. Answer to move.',
    tag: 'MVP',
    available: true,
  },
  {
    id: 'shifting',
    label: 'Shifting Board',
    description: 'Rows and columns shift every 3 rounds.',
    tag: 'Beta',
    available: true,
  },
  {
    id: 'scaleup',
    label: 'Scale Up',
    description: 'Board grows 3×3 → 4×4 → 5×5 as you answer.',
    tag: 'Beta',
    available: true,
  },
  {
    id: 'blitz',
    label: 'Blitz',
    description: '5-second answers. No mercy.',
    tag: 'NEW',
    available: true,
  },
  {
    id: 'vs-ai',
    label: 'vs AI',
    description: 'Play vs MindDuel AI. Practice - not ranked.',
    tag: 'NEW',
    available: true,
  },
] as const

// ── Hints (now FREE, limited uses per match - no payment) ─────────────
/** Seconds added to the trivia timer by the "Extra Time" hint. */
export const EXTRA_TIME_HINT_SECONDS = 8

/** Total free hints a player may use in a single match. */
export const FREE_HINTS_PER_MATCH = 3

export const HINTS = [
  { id: 'eliminate2',   label: 'Eliminate 2',   description: 'Remove 2 wrong answers',                          iconId: 'scissors'   },
  { id: 'category',     label: 'Category',      description: 'Reveal the question category',                    iconId: 'tag'        },
  { id: 'extra-time',   label: 'Extra Time',    description: `+${EXTRA_TIME_HINT_SECONDS} seconds on the clock`, iconId: 'timer-plus' },
  { id: 'first-letter', label: 'First Letter',  description: 'Reveal the first letter',                         iconId: 'type'       },
  { id: 'skip',         label: 'Skip',          description: 'Skip this question entirely',                      iconId: 'skip'       },
] as const

export const TURN_TIMEOUT_SECONDS = 86400
export const BLITZ_TIMEOUT_SECONDS = 300

// ── Support / contact ─────────────────────────────────────────────────
// Single source of truth: the support page, the terms page and the footer
// all read these, so a channel is never listed in one place and stale in
// another.
export const SUPPORT_EMAIL    = 'putrafaot@gmail.com'
export const SUPPORT_TELEGRAM = 'imanuelPF'
export const SUPPORT_TELEGRAM_URL = `https://t.me/${SUPPORT_TELEGRAM}`
export const GITHUB_REPO_URL  = 'https://github.com/Im-A-Nuel/Mindduel'

/** Shown on the terms page so players can see whether it has changed. */
export const TERMS_LAST_UPDATED = '17 July 2026'
