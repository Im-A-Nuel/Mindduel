'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { GAME_MODES } from '@/lib/constants'

interface GameHeaderProps {
  matchId: string
  mode: string
  ranked?: boolean
  isVsAI?: boolean
  className?: string
}

export function GameHeader({ matchId, mode, ranked = false, isVsAI = false, className }: GameHeaderProps) {
  const modeInfo = GAME_MODES.find(m => m.id === mode)

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
        ) : ranked ? (
          <Badge variant="success" dot>Ranked</Badge>
        ) : (
          <Badge variant="primary">Casual</Badge>
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
          LIVE · CELO
        </motion.div>
      </div>
    </header>
  )
}
