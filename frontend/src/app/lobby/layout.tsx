import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Lobby',
  description: 'Pick a mode and create or join a duel. Play Casual or climb the public Ranked ladder on Celo - no staking.',
  openGraph: {
    title:       'MindDuel Lobby',
    description: 'Trivia-gated PvP Tic Tac Toe on Celo - Casual or Ranked, public leaderboard, no staking.',
  },
}

export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  return children
}
