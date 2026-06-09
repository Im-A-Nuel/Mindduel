import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Leaderboard',
  description: 'Top MindDuel players by wins and SOL/USDC earned, derived from on-chain settled matches.',
  openGraph: {
    title:       'MindDuel Leaderboard',
    description: 'Top players ranked by wins and earnings.',
  },
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
