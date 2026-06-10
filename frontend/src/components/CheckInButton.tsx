'use client'

import { motion } from 'framer-motion'
import { useCheckIn } from '@/hooks/useCheckIn'
import { useWallet } from '@/hooks/useWallet'
import { useToast } from '@/components/ui/Toast'

const GREEN_DARK = '#0A7A2D'
const BLUE = '#0071E3'

/**
 * Daily on-chain check-in button. Player signs the tx from their wallet —
 * drives daily active users + transactions on-chain.
 */
export function CheckInButton() {
  const { isConnected } = useWallet()
  const { configured, checkedInToday, count, checkIn, isPending } = useCheckIn()
  const toast = useToast()

  if (!configured || !isConnected) return null

  const label = checkedInToday
    ? `✓ Checked in${count > 0 ? ` · ${count}` : ''}`
    : isPending
      ? 'Confirm in wallet…'
      : 'Daily Check-in'

  async function onClick() {
    if (checkedInToday || isPending) return
    try {
      await checkIn()
      toast('Checked in on-chain ✓', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Check-in failed'
      if (/reject|denied/i.test(msg)) toast('Check-in cancelled', 'info')
      else toast(msg.slice(0, 80), 'error')
    }
  }

  return (
    <motion.button
      whileTap={checkedInToday ? {} : { scale: 0.97 }}
      onClick={onClick}
      disabled={checkedInToday || isPending}
      title="Sign a daily on-chain check-in"
      style={{
        appearance: 'none', fontFamily: 'inherit',
        padding: '9px 16px', borderRadius: 999,
        border: 'none', flexShrink: 0,
        background: checkedInToday ? '#E8F7EE' : BLUE,
        color: checkedInToday ? GREEN_DARK : '#fff',
        fontSize: 13, fontWeight: 700,
        cursor: checkedInToday || isPending ? 'default' : 'pointer',
        boxShadow: checkedInToday ? 'none' : '0 4px 12px rgba(0,113,227,0.22)',
        opacity: isPending ? 0.8 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </motion.button>
  )
}
