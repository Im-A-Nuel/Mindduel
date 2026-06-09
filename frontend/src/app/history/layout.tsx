import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Match History',
  description: 'Your complete match history on MindDuel - ranked wins, losses, and on-chain points changes on Celo.',
}

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
