import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'How it works',
  description: 'How to play MindDuel: answer a question to claim a square, line up three to win. Free to play, no account needed.',
  openGraph: {
    title:       'How MindDuel works',
    description: 'Answer a question to claim a square, line up three to win. Free to play, no account needed.',
  },
}

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children
}
