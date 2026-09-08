import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Leaderboard',
  description: 'Top MindDuel players by points and rank, derived from ranked matches on Celo.',
  openGraph: {
    title:       'MindDuel Leaderboard',
    description: 'Top players ranked by points.',
  },
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
