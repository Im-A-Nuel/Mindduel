'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import { NavBar } from '@/components/layout/NavBar'
import { useToast } from '@/components/ui/Toast'
import {
  listTournaments,
  createTournament,
  joinTournamentApi,
  type TournamentSummary,
} from '@/lib/api'
import { StateIconTrophy, IconTrophySm } from '@/components/ui/StateIcons'

const BLUE       = '#0071E3'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const GREEN_DARK = '#0A7A2D'
const BG = 'var(--mdd-bg)'

export default function TournamentsPage() {
  const { publicKey } = useWallet()
  const toast = useToast()
  const [tournaments, setTournaments] = useState<TournamentSummary[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName]   = useState('Friday Night Cup')
  const [size, setSize]   = useState<4 | 8>(4)
  const [stake, setStake] = useState(0.05)

  async function refresh() {
    try { setTournaments(await listTournaments()) }
    catch { setTournaments([]) }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 8000)
    return () => clearInterval(id)
  }, [])

  async function handleCreate() {
    if (!publicKey) { toast('Connect wallet first', 'warning'); return }
    if (!name.trim()) { toast('Tournament name is required', 'warning'); return }
    if (stake < 0.01) { toast('Min stake is 0.01 SOL', 'warning'); return }

    setCreating(true)
    try {
      await createTournament({
        name: name.trim(), size, stake, currency: 'sol', mode: 'classic',
        createdBy: publicKey.toBase58(),
      })
      toast('Tournament created — waiting for players to join.', 'success')
      await refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Create failed', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(t: TournamentSummary) {
    if (!publicKey) { toast('Connect wallet first', 'warning'); return }
    try {
      const r = await joinTournamentApi(t.tournamentId, publicKey.toBase58())
      if (r.started) {
        toast('Bracket full — tournament started!', 'success')
      } else {
        toast(`Joined. ${r.tournament.registered}/${r.tournament.size} players.`, 'success')
      }
      await refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Join failed', 'error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif", color: INK }}>
      <NavBar active="play" />


      <div className="page-content has-bottom-tab" style={{ maxWidth: 960, margin: '0 auto', padding: '40px 32px 80px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Phase 4 · Bonus</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, margin: '0 0 4px' }}>Tournaments</h1>
          <p style={{ margin: 0, fontSize: 14, color: MUTED }}>Single-elimination brackets · 4 or 8 players</p>
        </motion.div>

        {/* Create form */}
        <div style={{ background: 'var(--mdd-card)', borderRadius: 20, padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Create new tournament</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} maxLength={40}
                style={{ display: 'block', marginTop: 4, width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>Size</label>
              <select value={size} onChange={e => setSize(Number(e.target.value) as 4 | 8)}
                style={{ display: 'block', marginTop: 4, width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--mdd-card)' }}>
                <option value={4}>4 players</option>
                <option value={8}>8 players</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>Stake (SOL)</label>
              <input type="number" min={0.01} step={0.01} value={stake} onChange={e => setStake(parseFloat(e.target.value) || 0.01)}
                style={{ display: 'block', marginTop: 4, width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleCreate} disabled={creating}
              style={{ appearance: 'none', border: 'none', background: creating ? '#AEAEB2' : BLUE, color: '#fff', padding: '11px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tournaments === null ? (
            <div style={{ background: 'var(--mdd-card)', borderRadius: 16, padding: 48, textAlign: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${BLUE}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
              <div style={{ fontSize: 13, color: MUTED }}>Loading tournaments…</div>
            </div>
          ) : tournaments.length === 0 ? (
            <div style={{ background: 'var(--mdd-card)', borderRadius: 16, padding: 48, textAlign: 'center' }}>
              <StateIconTrophy size={56} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>No open tournaments</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Create the first one above.</div>
            </div>
          ) : (
            tournaments.map(t => {
              const full = t.registered >= t.size
              const myWallet = publicKey?.toBase58()
              const youCreated = myWallet === t.createdBy
              return (
                <div key={t.tournamentId} style={{ background: 'var(--mdd-card)', borderRadius: 16, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                      {t.size} players · {t.stake} {t.currency.toUpperCase()} stake · {t.mode} mode
                      {youCreated && <span style={{ color: BLUE, marginLeft: 6 }}>· yours</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: full ? GREEN_DARK : INK, fontVariantNumeric: 'tabular-nums' }}>
                      {t.registered}/{t.size}
                    </span>
                    {t.status === 'open' && !full && (
                      <button onClick={() => handleJoin(t)}
                        style={{ appearance: 'none', border: 'none', background: BLUE, color: '#fff', padding: '8px 16px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Join
                      </button>
                    )}
                    {t.status !== 'open' && (
                      <Link href={`/tournaments/${t.tournamentId}`}>
                        <button style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)', background: 'var(--mdd-card)', color: INK, padding: '8px 16px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          View bracket
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
