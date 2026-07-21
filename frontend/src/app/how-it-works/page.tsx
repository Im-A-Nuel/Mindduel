'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { NavBar } from '@/components/layout/NavBar'
import { sounds } from '@/lib/sounds'
import {
  RANK_TIERS,
  START_POINTS,
  RANKING_CONTRACT_ADDRESS,
  CELO_EXPLORER,
} from '@/lib/constants'

const BLUE  = '#0071E3'
const INK   = 'var(--mdd-ink)'
const MUTED = 'var(--mdd-muted)'
const FAINT = 'var(--mdd-faint)'
const CARD  = 'var(--mdd-card)'

function shortAddr(a: string) {
  return a.slice(0, 6) + '…' + a.slice(-4)
}

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
      style={{ marginBottom: 40 }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: INK, margin: '0 0 12px' }}>{title}</h2>
      <div style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.65 }}>{children}</div>
    </motion.section>
  )
}

function QA({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <div style={{ background: CARD, borderRadius: 16, padding: '18px 20px', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: INK, marginBottom: 6 }}>{q}</div>
      <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>{a}</div>
    </div>
  )
}

/**
 * How It Works.
 *
 * The homepage deliberately avoids blockchain vocabulary - most players
 * arriving from MiniPay are not crypto users, and the Celo Foundation review
 * flagged the old landing page for leading with it. The detail still matters
 * to the people who want it, so it lives here instead: opt-in, one click from
 * the footer, and ordered so the plain-language answers come first and the
 * technical ones last.
 */
export default function HowItWorksPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--mdd-bg)', color: INK, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif" }}>
      <NavBar active="play" showBottomTab={false} />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 36 }}
        >
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1.2, margin: '0 0 10px' }}>How MindDuel works</h1>
          <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.6, margin: 0 }}>
            The short version: it is Tic Tac Toe, and you answer a question to claim each square.
            Everything else on this page is optional reading.
          </p>
        </motion.div>

        <Section title="Playing a match">
          <QA
            q="How do I take a turn?"
            a="Tap an empty square. A question appears with four options and a countdown. Answer correctly and the square is yours. Answer wrong, or run out of time, and your turn passes to your opponent."
          />
          <QA
            q="How do I win?"
            a="Line up three of your marks in a row, column, or diagonal. In Scale Up the board grows, but the goal stays the same."
          />
          <QA
            q="What are hints?"
            a="Three per match, free. They can remove two wrong answers, reveal the category, show the first letter, add time, or skip the question entirely."
          />
        </Section>

        <Section title="Ranked, Casual and vs-AI" delay={0.05}>
          <QA
            q="What is the difference?"
            a={<>
              <strong style={{ color: INK }}>Ranked</strong> matches move your points up or down and appear on the leaderboard.{' '}
              <strong style={{ color: INK }}>Casual</strong> and <strong style={{ color: INK }}>vs-AI</strong> change nothing: they are for practice and for fun.
            </>}
          />
          <QA
            q="How are points calculated?"
            a={<>Everyone starts at {START_POINTS}. A win takes points from your opponent and adds them to you, so the ladder stays balanced. Beating a stronger player is worth more than beating a weaker one.</>}
          />
        </Section>

        <Section title="Rank tiers" delay={0.1}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {RANK_TIERS.map(t => (
              <div key={t.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 14px', borderRadius: 12, background: CARD,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)',
              }}>
                <span style={{ width: 9, height: 9, borderRadius: 5, background: t.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{t.label}</span>
                <span style={{ fontSize: 12, color: FAINT, fontVariantNumeric: 'tabular-nums' }}>
                  {t.min === 0 ? 'below 1000' : `${t.min}+`}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Accounts and cost" delay={0.15}>
          <QA
            q="Do I need an account?"
            a="No. You can play straight away as a guest. Guest results are not saved between devices, so connect a wallet if you want your rank to follow you."
          />
          <QA
            q="Does it cost anything?"
            a="No. There is no entry fee, no deposit, and nothing to buy. You never pay to play a match, and you cannot lose money by losing a match."
          />
          <QA
            q="What is a wallet used for?"
            a="Only as your name and your save file. It identifies you on the leaderboard and keeps your rank and badges. Nothing is ever taken from it."
          />
        </Section>

        <Section title="The technical part" delay={0.2}>
          <p style={{ marginTop: 0 }}>
            You do not need any of this to play. It is here for people who want to know what happens behind the scenes.
          </p>
          <QA
            q="Where is my rank stored?"
            a="Ranked results are written to a smart contract on the Celo blockchain. That means the leaderboard is public and nobody, including us, can quietly edit it after the fact."
          />
          <QA
            q="Who pays the transaction fees?"
            a="We do. A backend service (the relayer) submits each ranked result and covers the network fee. That is why you never sign a transaction or need funds in your wallet to play."
          />
          <QA
            q="How do you stop cheating on the answers?"
            a="The correct answer is never sent to your browser with the question. The server stores a fingerprint of it and only checks your choice against that fingerprint once you have committed to an answer."
          />
          <QA
            q="Are badges NFTs?"
            a="No. Badges are records tied to your address in our database, not minted tokens. They cannot be traded or sold."
          />
          {RANKING_CONTRACT_ADDRESS && (
            <div style={{ marginTop: 14, fontSize: 13.5 }}>
              Ranking contract:{' '}
              <a
                href={`${CELO_EXPLORER}/address/${RANKING_CONTRACT_ADDRESS}`}
                target="_blank" rel="noopener noreferrer"
                onClick={() => sounds.tap()}
                style={{ color: BLUE, textDecoration: 'none', fontFamily: 'ui-monospace, monospace' }}
              >
                {shortAddr(RANKING_CONTRACT_ADDRESS)} ↗
              </a>
            </div>
          )}
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
              Play a match
            </button>
          </Link>
          <Link href="/support" onClick={() => sounds.tap()} style={{ textDecoration: 'none', flex: '0 1 auto' }}>
            <button style={{ appearance: 'none', border: '1.5px solid var(--mdd-border-strong)', padding: '14px 22px', background: CARD, color: INK, borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Still stuck? Contact us
            </button>
          </Link>
        </motion.div>
      </main>
    </div>
  )
}
