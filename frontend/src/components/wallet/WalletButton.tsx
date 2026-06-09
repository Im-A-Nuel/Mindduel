'use client'

import { useState } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { useMiniPay } from '@/hooks/useMiniPay'
import { CELO_EXPLORER } from '@/lib/constants'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const RED        = '#FF3B30'
const GREEN_DARK = '#0A7A2D'

function shortAddr(a: string) {
  return a.slice(0, 6) + '…' + a.slice(-4)
}

interface WalletButtonProps {
  className?: string
}

export function WalletButton({ className }: WalletButtonProps) {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet()
  const { isMiniPay } = useMiniPay()
  const { address: rawAddress } = useAccount()
  const { data: bal, isFetching: loadingBal, refetch } = useBalance({ address: rawAddress })
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  if (!isConnected || !address) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => connect()}
        disabled={isConnecting}
        className={`wallet-chip ${className ?? ''}`}
        style={{
          appearance: 'none', border: 'none',
          background: 'var(--mdd-dark-surface)', color: '#fff',
          padding: '9px 18px', borderRadius: 999,
          fontSize: 13, fontWeight: 600,
          cursor: isConnecting ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          opacity: isConnecting ? 0.7 : 1,
          transition: 'opacity 150ms ease',
          whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1,
        }}
      >
        {isConnecting ? (
          <>
            <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
            <span className="wallet-addr">Connecting…</span>
          </>
        ) : (
          <>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: 'linear-gradient(135deg, #FCFF52, #35D07F)', flexShrink: 0 }} />
            <span className="wallet-addr">{isMiniPay ? 'Connect MiniPay' : 'Connect Wallet'}</span>
            <span className="wallet-addr-short" style={{ display: 'none' }}>Connect</span>
          </>
        )}
      </motion.button>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowMenu(v => !v)}
        className={`wallet-chip ${className ?? ''}`}
        style={{
          appearance: 'none', border: 'none',
          background: 'var(--mdd-dark-surface)', color: '#fff',
          padding: '9px 16px', borderRadius: 999,
          fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1,
        }}
      >
        <div style={{ width: 18, height: 18, borderRadius: 9, background: 'linear-gradient(135deg, #FCFF52, #35D07F)', flexShrink: 0 }} />
        <span className="wallet-addr" style={{ fontVariantNumeric: 'tabular-nums' }}>{shortAddr(address)}</span>
        <span className="wallet-addr-short" style={{ display: 'none', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{address.slice(0, 6)}</span>
        <span className="wallet-network-badge" style={{ fontSize: 9, fontWeight: 700, color: '#35D07F', background: 'rgba(53,208,127,0.16)', padding: '2px 6px', borderRadius: 6, letterSpacing: 0.4, flexShrink: 0 }}>CELO</span>
        <svg style={{ width: 12, height: 12, transform: showMenu ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease', opacity: 0.7, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <>
            <div
              onClick={() => setShowMenu(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="glass-elevated"
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                width: 260, borderRadius: 16,
                overflow: 'hidden', zIndex: 50,
              }}
            >
              <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Balance</span>
                  <button
                    onClick={() => refetch()}
                    disabled={loadingBal}
                    aria-label="Refresh balance"
                    style={{ appearance: 'none', border: 'none', background: 'transparent', padding: 4, cursor: loadingBal ? 'wait' : 'pointer', color: MUTED, display: 'flex', alignItems: 'center' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loadingBal ? 'spin 0.8s linear infinite' : 'none' }}>
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: INK, fontWeight: 500 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 9, background: 'linear-gradient(135deg, #FCFF52, #35D07F)', display: 'inline-block' }} />
                    CELO
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>
                    {bal ? Number(bal.formatted).toFixed(4) : '—'}
                  </span>
                </div>
              </div>

              <div style={{ padding: 6 }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(address)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1200)
                  }}
                  style={{ appearance: 'none', border: 'none', display: 'block', width: '100%', padding: '9px 12px', background: 'transparent', borderRadius: 10, textAlign: 'left', fontSize: 13, fontWeight: 500, color: copied ? GREEN_DARK : INK, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 120ms ease' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--mdd-bg-soft)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {copied ? '✓ Copied!' : '⎘ Copy Address'}
                </button>
                <button
                  onClick={() => { window.open(`${CELO_EXPLORER}/address/${address}`, '_blank'); setShowMenu(false) }}
                  style={{ appearance: 'none', border: 'none', display: 'block', width: '100%', padding: '9px 12px', background: 'transparent', borderRadius: 10, textAlign: 'left', fontSize: 13, fontWeight: 500, color: INK, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 120ms ease' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--mdd-bg-soft)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  ↗ View on Celoscan
                </button>
                <div style={{ height: 0.5, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
                <button
                  onClick={() => { setShowMenu(false); setConfirmDisconnect(true) }}
                  style={{ appearance: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', background: 'transparent', borderRadius: 10, textAlign: 'left', fontSize: 13, fontWeight: 500, color: RED, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 120ms ease' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FDECEB')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Disconnect
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDisconnect}
        title="Disconnect wallet?"
        message="You can reconnect anytime to keep climbing the ranked ladder."
        confirmLabel="Disconnect"
        cancelLabel="Stay connected"
        tone="danger"
        onConfirm={() => { disconnect(); setConfirmDisconnect(false) }}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </div>
  )
}
