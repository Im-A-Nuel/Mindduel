import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Leaderboard',
  description: 'Top MindDuel players by on-chain points and rank, derived from ranked matches on Celo.',
  openGraph: {
    title:       'MindDuel Leaderboard',
    description: 'Top players ranked by on-chain points.',
  },
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
