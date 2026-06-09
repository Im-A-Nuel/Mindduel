import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Profile',
  description: 'Your MindDuel profile, badges (NFTs), and stats.',
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
