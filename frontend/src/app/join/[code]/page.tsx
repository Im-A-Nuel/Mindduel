'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { joinMatch, getGuestId, getMatchForPlayer } from '@/lib/api'
import { useWallet } from '@/hooks/useWallet'
import { useMiniPay } from '@/hooks/useMiniPay'
import { WalletButton } from '@/components/wallet/WalletButton'

const BLUE       = '#0071E3'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const FAINT      = 'var(--mdd-faint)'
const BG         = 'var(--mdd-bg)'
const RED        = '#A81C13'

type Phase = 'connecting' | 'need-wallet' | 'joining' | 'error'

/**
 * Invite landing page: `/join/<CODE>`.
 *
 * The match creator shares this link; opening it joins the match and drops the
 * player straight into the game's waiting room, with no need to copy a code
 * into the lobby by hand. Mirrors the lobby's join flow exactly (same
 * sessionStorage handoff), so the game page behaves identically either way.
 *
 * A Ranked match needs a connected wallet to record the joiner's on-chain
 * result, so we wait for the wallet (MiniPay auto-connects) before joining.
 */
export default function JoinByLinkPage({ params }: { params: { code: string } }) {
  const router = useRouter()
  const { address, isConnected, isConnecting } = useWallet()
  const { isMiniPay } = useMiniPay()

  const [phase, setPhase] = useState<Phase>('connecting')
  const [error, setError] = useState('')
  // Guards against double-submitting the join (React StrictMode double-mounts
  // effects in dev, and the wallet can settle in more than one render).
  const attempted = useRef(false)

  const code = decodeURIComponent(params.code ?? '').toUpperCase()

  const doJoin = useCallback(async () => {
    if (attempted.current) return
    attempted.current = true
    setPhase('joining')
    try {
      const playerId = address ?? getGuestId()
      const result = await joinMatch(code, playerId)
      if (!result) {
        // A join only succeeds while the match is still 'waiting'. Re-opening
        // or refreshing this link after we already joined therefore fails even
        // though we belong in the match, so fall back to our active match
        // rather than showing a dead end.
        const active = await getMatchForPlayer(playerId)
        if (active?.matchId) {
          router.replace(`/game/${active.matchId}`)
          return
        }
        setError('This invite is no longer valid. The match may have already started, or the code is wrong.')
        setPhase('error')
        return
      }
      if (result.ranked && !address) {
        setError('This is a Ranked match. Connect your wallet to join.')
        setPhase('need-wallet')
        attempted.current = false  // allow a retry once the wallet connects
        return
      }
      // Compare case-insensitively: the wallet hands us an EIP-55 checksummed
      // address while the stored one may be lowercase.
      if (result.playerOne && address && result.playerOne.toLowerCase() === address.toLowerCase()) {
        setError('You created this match. Share the link with your opponent instead.')
        setPhase('error')
        return
      }

      sessionStorage.setItem('mddMyMark', 'O')
      sessionStorage.setItem('mddVsAI', '0')
      sessionStorage.setItem('mddMode', result.mode)
      sessionStorage.setItem('mddRanked', result.ranked ? '1' : '0')
      // Inherit the creator's difficulty + categories so both players draw from
      // the same trivia pool.
      if (result.difficulty) sessionStorage.setItem('mddDifficulty', result.difficulty)
      sessionStorage.setItem('mddCategories', JSON.stringify(result.categories ?? []))
      router.replace(`/game/${result.matchId}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(/network|fetch/i.test(msg) ? 'Network error. Check your connection and try again.' : 'Could not join this match. Try again.')
      setPhase('error')
      attempted.current = false
    }
  }, [address, code, router])

  useEffect(() => {
    if (!code) { setError('This invite link is missing a match code.'); setPhase('error'); return }
    // Wait for the wallet to settle before deciding. We cannot tell whether the
    // match is Ranked until we ask the server, and Ranked needs an address, so
    // give the connector a moment rather than joining as a guest immediately.
    if (isConnecting) { setPhase('connecting'); return }
    if (isConnected && address) { void doJoin(); return }
    setPhase('need-wallet')
  }, [code, isConnected, isConnecting, address, doJoin])

  const title = phase === 'error' ? 'Cannot join' : phase === 'need-wallet' ? 'Join the duel' : 'Joining the duel'
  const detail = phase === 'error' ? error
    : phase === 'need-wallet'
      ? (isMiniPay ? 'Connect to accept the invite.' : 'Connect your wallet to accept the invite.')
      : 'Getting you into the waiting room.'

  return (
    <div style={{ minHeight: '100vh', background: BG, color: INK, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <nav className="glass-nav" style={{ height: 64, flexShrink: 0 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image src="/icon-192.png" alt="MindDuel" width={28} height={28} style={{ borderRadius: 8 }} />
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.4 }}>MindDuel</span>
          </div>
          <WalletButton />
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}
        >
          <div style={{
            width: 62, height: 62, borderRadius: 20,
            background: phase === 'error' ? '#FDECEB' : 'var(--mdd-bg-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {phase === 'error' ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.2" strokeLinecap="round">
                <line x1="7" y1="7" x2="17" y2="17"/><line x1="17" y1="7" x2="7" y2="17"/>
              </svg>
            ) : phase === 'need-wallet' ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 9.5h18"/>
              </svg>
            ) : (
              <span style={{ width: 26, height: 26, borderRadius: '50%', border: `3px solid ${BLUE}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
            )}
          </div>

          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, margin: '0 0 6px' }}>{title}</h1>
            <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.5 }}>{detail}</p>
          </div>

          <div style={{ background: 'var(--mdd-bg-soft)', borderRadius: 12, padding: '10px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: FAINT, marginBottom: 2 }}>MATCH CODE</div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>{code || '-'}</div>
          </div>

          {phase === 'need-wallet' && (
            <p style={{ fontSize: 12.5, color: FAINT, margin: 0 }}>
              Use the Connect button above. You will join automatically.
            </p>
          )}

          {phase === 'error' && (
            <a href="/lobby" style={{ width: '100%', textDecoration: 'none' }}>
              <button style={{ appearance: 'none', border: 'none', width: '100%', padding: '14px', background: BLUE, color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,113,227,0.25)' }}>
                Go to Lobby
              </button>
            </a>
          )}
        </motion.div>
      </div>
    </div>
  )
}
