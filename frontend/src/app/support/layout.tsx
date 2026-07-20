import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Support',
  description: 'Get help with MindDuel. Contact us on Telegram or by email, or report a bug.',
  openGraph: {
    title:       'MindDuel Support',
    description: 'Get help with MindDuel. Contact us on Telegram or by email, or report a bug.',
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
