import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Watch Live',
  description: 'Spectate a live MindDuel match — read-only, no wallet required.',
}

export default function SpectateLayout({ children }: { children: React.ReactNode }) {
  return children
}
