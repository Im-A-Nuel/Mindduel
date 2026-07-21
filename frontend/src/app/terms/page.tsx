'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { NavBar } from '@/components/layout/NavBar'
import { sounds } from '@/lib/sounds'
import {
  SUPPORT_EMAIL,
  SUPPORT_TELEGRAM,
  SUPPORT_TELEGRAM_URL,
  TERMS_LAST_UPDATED,
} from '@/lib/constants'

const BLUE  = '#0071E3'
const INK   = 'var(--mdd-ink)'
const MUTED = 'var(--mdd-muted)'
const FAINT = 'var(--mdd-faint)'
const CARD  = 'var(--mdd-card)'

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
      style={{ marginBottom: 34 }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: INK, margin: '0 0 12px' }}>{title}</h2>
      <div style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.7 }}>{children}</div>
    </motion.section>
  )
}

/**
 * Terms & Privacy.
 *
 * Written to the Celo Foundation brief: "simpel & jujur". No legalese, no
 * boilerplate liability wall. It says in plain language that the game is free,
 * that no real money is at stake, and exactly which two things we store. Most
 * players arrive from MiniPay and are not crypto users - a page they can
 * actually read is worth more than one that is airtight and unread.
 */
export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--mdd-bg)', color: INK, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif" }}>
      <NavBar active="play" showBottomTab={false} />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 30 }}
        >
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1.2, margin: '0 0 10px' }}>Terms &amp; Privacy</h1>
          <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.6, margin: '0 0 8px' }}>
            No legal maze. Here is the honest deal in plain language: what MindDuel is,
            what we keep, and what you can expect.
          </p>
          <p style={{ fontSize: 13, color: FAINT, margin: 0 }}>Last updated {TERMS_LAST_UPDATED}</p>
        </motion.div>

        {/* The one-line summary up top, so nobody has to read the rest to get it. */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          style={{ background: CARD, borderRadius: 18, padding: '20px 22px', marginBottom: 34, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: FAINT, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>In one line</div>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: INK, lineHeight: 1.55 }}>
            MindDuel is a free game. There is no real money at stake, we store only your
            wallet address and your match results, and you can walk away any time.
          </div>
        </motion.div>

        <Section title="It is free, and it is a game">
          <p style={{ marginTop: 0 }}>
            MindDuel costs nothing to play. There is no entry fee, no deposit, no tokens to
            buy, and nothing to win except points and bragging rights. You cannot lose money
            by losing a match, because no money was ever on the table.
          </p>
          <p style={{ marginBottom: 0 }}>
            Your rank is a score in a game. It is not an investment, and it has no cash value.
          </p>
        </Section>

        <Section title="What we store" delay={0.05}>
          <p style={{ marginTop: 0 }}>Only two things, and only to make the game work:</p>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: INK }}>Your wallet address</strong> — used as your name and your save file, so
              your rank and badges follow you. If you play as a guest, we do not even have this.
            </li>
            <li>
              <strong style={{ color: INK }}>Your match results</strong> — who played, who won, and the points that
              changed. Ranked results are also written to a public smart contract on Celo.
            </li>
          </ul>
          <p style={{ marginBottom: 0 }}>
            We do not ask for your name, email, or phone number to play. We do not track you
            across other sites, and we do not sell anything about you — there is nothing to sell.
          </p>
        </Section>

        <Section title="Your wallet is safe" delay={0.1}>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            You never sign a transaction to play, and you never need funds in your wallet.
            We use your address only to know who you are. Nothing is ever taken from it, and
            we can never move anything out of it. If a page ever asks you to approve a payment
            to play a normal match, that is not us — close it.
          </p>
        </Section>

        <Section title="Badges and rank" delay={0.15}>
          <p style={{ marginTop: 0 }}>
            Badges are records tied to your address in our database. They are not NFTs — they
            cannot be traded, sold, or moved to another app.
          </p>
          <p style={{ marginBottom: 0 }}>
            This is a hackathon build under active development. Ranks and badges may be reset
            while we fix things, tune the scoring, or start a new season. We will avoid it
            where we can, but treat your score as part of a game in progress, not a permanent record.
          </p>
        </Section>

        <Section title="Play fair" delay={0.2}>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Do not cheat, script, or abuse other players. We may remove a score or block an
            account that does. That is about it — play the game, be decent, have fun.
          </p>
        </Section>

        <Section title="No warranty" delay={0.25}>
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            We build MindDuel with care, but it is provided as-is. Things can break, go down,
            or change. Since the game is free and no money is at stake, we cannot take on
            liability for losses from using it. If something goes wrong, tell us and we will
            do our best to fix it.
          </p>
        </Section>

        <Section title="Questions" delay={0.3}>
          <p style={{ marginTop: 0 }}>
            Ask us anything. Message{' '}
            <a href={SUPPORT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" onClick={() => sounds.tap()} style={{ color: BLUE, textDecoration: 'none', fontWeight: 600 }}>
              @{SUPPORT_TELEGRAM}
            </a>{' '}
            on Telegram, or email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}?subject=MindDuel%20terms`} onClick={() => sounds.tap()} style={{ color: BLUE, textDecoration: 'none', fontWeight: 600 }}>
              {SUPPORT_EMAIL}
            </a>. More on how the game works is on the{' '}
            <Link href="/how-it-works" onClick={() => sounds.tap()} style={{ color: BLUE, textDecoration: 'none', fontWeight: 600 }}>how it works</Link>{' '}
            page.
          </p>
          <p style={{ marginBottom: 0 }}>
            If we change anything important here, we will update the date at the top.
          </p>
        </Section>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45 }}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}
        >
          <Link href="/lobby" onClick={() => sounds.click()} style={{ textDecoration: 'none', flex: '1 1 180px' }}>
            <button style={{ appearance: 'none', border: 'none', width: '100%', padding: '14px', background: BLUE, color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,113,227,0.25)' }}>
              Back to playing
            </button>
          </Link>
          <Link href="/support" onClick={() => sounds.tap()} style={{ textDecoration: 'none', flex: '0 1 auto' }}>
            <button style={{ appearance: 'none', border: '1.5px solid var(--mdd-border-strong)', padding: '14px 22px', background: CARD, color: INK, borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Contact us
            </button>
          </Link>
        </motion.div>
      </main>
    </div>
  )
}
