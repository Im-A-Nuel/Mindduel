import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Tournaments',
  description: 'Single-elimination 4 or 8 player brackets — stake SOL/USDC and crown a champion on-chain.',
}

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return children
}
