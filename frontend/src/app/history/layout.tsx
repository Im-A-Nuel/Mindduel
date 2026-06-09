import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Match History',
  description: 'Your complete match history on MindDuel — wins, losses, stakes, and on-chain settle signatures.',
}

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
