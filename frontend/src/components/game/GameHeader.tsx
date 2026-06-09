'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { GAME_MODES, STAKE_TIERS } from '@/lib/constants'

interface GameHeaderProps {
  matchId: string
  mode: string
  stakeAmount: number
  stakeTier: string
  isVsAI?: boolean
  className?: string
}

export function GameHeader({ matchId, mode, stakeAmount, stakeTier, isVsAI = false, className }: GameHeaderProps) {
  const modeInfo = GAME_MODES.find(m => m.id === mode)
  const tierInfo = STAKE_TIERS.find(t => t.id === stakeTier)

  return (
    <header className={cn(
      'flex items-center justify-between px-5 py-3',
      'bg-bg-elevated/70 border-b border-white/[0.06] backdrop-blur-sm',
      className,
    )}>
      {/* Left: logo + match ID */}
      <div className="flex items-center gap-4">
        <Link href="/" className="font-display font-extrabold text-lg tracking-tight text-text-primary hover:text-primary-hover transition-colors">
          Mind<span className="text-primary">Duel</span>
        </Link>
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-text-muted">
          <span>Match</span>
          <span className="text-text-secondary">{matchId.slice(0, 8)}…</span>
        </div>
      </div>

      {/* Center: mode + stake */}
      <div className="flex items-center gap-2">
        {modeInfo && (
          <Badge variant="primary">
            {modeInfo.label}
          </Badge>
        )}
        {isVsAI ? (
          <Badge variant="accent">Practice</Badge>
        ) : tierInfo && stakeAmount > 0 && (
          <Badge variant={
            stakeTier === 'casual' ? 'success' :
            stakeTier === 'challenger' ? 'primary' : 'accent'
          } dot>
            {stakeAmount} SOL
          </Badge>
        )}
      </div>

      {/* Right: live indicator */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex items-center gap-1.5 text-xs font-mono text-success"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          LIVE · DEVNET
        </motion.div>
      </div>
    </header>
  )
}
