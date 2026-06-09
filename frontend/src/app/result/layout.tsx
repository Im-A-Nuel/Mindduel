import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Match Result',
  description: 'See your match summary, accuracy, and on-chain settle signature.',
}

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return children
}
