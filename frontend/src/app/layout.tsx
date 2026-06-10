import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClientProviders } from '@/components/ClientProviders'
import { Footer } from '@/components/layout/Footer'
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
    default:  'MindDuel - Prove Your Mind. Climb the Ranks.',
    template: '%s · MindDuel',
  },
  description: 'Trivia-gated PvP Tic Tac Toe with on-chain points & ranking on Celo. No staking - pure skill.',
  keywords: ['celo', 'minipay', 'web3', 'game', 'pvp', 'trivia', 'ranking', 'tic tac toe', 'mindduel'],
  // Talent.app (Celo Proof of Ship) domain ownership verification.
  other: {
    'talentapp:project_verification': 'd1b99b43635d13e6adb59143e9696829fdd3abf8d9e9003ecfa42a834d4d2df51bd35e65ef56acfd0c967eaf9b85074bf9b9fe1e37bf1f1ef3ec1d8add6f167c',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title:       'MindDuel - Prove Your Mind. Climb the Ranks.',
    description: 'Trivia-gated PvP Tic Tac Toe with on-chain points & ranking on Celo.',
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
        </ClientProviders>
      </body>
    </html>
  )
}
