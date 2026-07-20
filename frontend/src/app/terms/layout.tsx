import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Terms & Privacy',
  description: 'The plain-language deal: MindDuel is free, no real money is at stake, and here is exactly what we store.',
  openGraph: {
    title:       'MindDuel Terms & Privacy',
    description: 'The plain-language deal: MindDuel is free, no real money is at stake, and here is exactly what we store.',
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
