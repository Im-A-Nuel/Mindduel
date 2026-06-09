import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Match',
  description: 'Live MindDuel match — answer trivia to claim cells.',
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return children
}
