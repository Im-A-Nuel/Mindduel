import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Lobby',
  description: 'Pick a mode, set your stake, and create or join a duel on Solana devnet.',
  openGraph: {
    title:       'MindDuel Lobby',
    description: 'Trivia-gated PvP Tic Tac Toe — stake SOL or Mock USDC and play.',
  },
}

export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  return children
}
