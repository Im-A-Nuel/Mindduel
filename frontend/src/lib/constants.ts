export const PROGRAM_ID = '8XZTXNux374128LFJSVhp5XSNyYMPNZpfw4vyjWmSJkN'
export const TREASURY_ADDRESS = 'CPoofbZho4bJmSAyVJxfeMK9CoZpXpDYftctghwUJX86'

/**
 * Mock USDC SPL mint on devnet. Set after running `npm run setup:usdc` in backend.
 * Read from NEXT_PUBLIC_MOCK_USDC_MINT to allow override per environment.
 */
export const MOCK_USDC_MINT =
  process.env.NEXT_PUBLIC_MOCK_USDC_MINT ?? ''
export const USDC_DECIMALS = 6
export const FAUCET_AMOUNT_USDC = 100
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

export const RPC_ENDPOINT = {
  devnet:  'https://api.devnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
} as const

export const STAKE_TIERS = [
  {
    id: 'casual',
    label: 'Casual',
    min: 0.01,
    max: 0.1,
    color: '#34C759',
    description: 'Low risk, great for beginners',
  },
  {
    id: 'challenger',
    label: 'Challenger',
    min: 0.1,
    max: 1,
    color: '#0071E3',
    description: 'Balanced risk for serious players',
  },
  {
    id: 'high-stakes',
    label: 'High Stakes',
    min: 1,
    max: null,
    color: '#FF9500',
    description: 'Maximum risk, maximum reward',
  },
] as const

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
    description: 'Play vs MindDuel AI. Perfect for practice.',
    tag: 'NEW',
    available: true,
  },
] as const

/** Seconds added to the trivia timer by the "Extra Time" hint. */
export const EXTRA_TIME_HINT_SECONDS = 8

export const HINTS = [
  { id: 'eliminate2',   label: 'Eliminate 2',   price: 0.002, description: 'Remove 2 wrong answers',                              iconId: 'scissors'    },
  { id: 'category',     label: 'Category',      price: 0.001, description: 'Reveal the question category',                       iconId: 'tag'         },
  { id: 'extra-time',   label: 'Extra Time',    price: 0.003, description: `+${EXTRA_TIME_HINT_SECONDS} seconds on the clock`,     iconId: 'timer-plus'  },
  { id: 'first-letter', label: 'First Letter',  price: 0.001, description: 'Reveal the first letter',                            iconId: 'type'        },
  { id: 'skip',         label: 'Skip',          price: 0.005, description: 'Skip this question entirely',                        iconId: 'skip'        },
] as const

export const PLATFORM_FEE_BPS    = 250
export const TURN_TIMEOUT_SECONDS = 86400
export const BLITZ_TIMEOUT_SECONDS = 300
