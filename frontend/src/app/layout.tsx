import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClientProviders } from '@/components/ClientProviders'
import { Footer } from '@/components/layout/Footer'
import { SigningBanner } from '@/components/SigningBanner'
import { themeBootstrapScript } from '@/components/ThemeProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default:  'MindDuel — Prove Your Mind. Win On-Chain.',
    template: '%s · MindDuel',
  },
  description: 'Trivia-gated PvP Tic Tac Toe with real SOL/USDC wagering on Solana devnet.',
  keywords: ['solana', 'web3', 'game', 'pvp', 'trivia', 'nft', 'tic tac toe', 'mindduel'],
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title:       'MindDuel — Prove Your Mind. Win On-Chain.',
    description: 'Trivia-gated PvP Tic Tac Toe with real SOL/USDC wagering on Solana.',
    type:        'website',
    siteName:    'MindDuel',
    images:      [{ url: '/icon-512.png', width: 512, height: 512 }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'MindDuel',
    description: 'Prove Your Mind. Win On-Chain.',
    images:      ['/icon-512.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          // Run before any React hydration so the page paints with the
          // correct theme on first frame (avoids light-flash for dark users).
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className="bg-bg-base text-ink antialiased" suppressHydrationWarning>
        <ClientProviders>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <div style={{ flex: 1 }}>{children}</div>
            <Footer />
          </div>
          <SigningBanner />
        </ClientProviders>
      </body>
    </html>
  )
}
