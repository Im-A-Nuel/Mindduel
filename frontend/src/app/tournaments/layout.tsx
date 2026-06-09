import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Tournaments',
  description: 'Single-elimination 4 or 8 player brackets — Ranked or Casual. Climb the points ladder and crown a champion on-chain on Celo.',
}

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return children
}
