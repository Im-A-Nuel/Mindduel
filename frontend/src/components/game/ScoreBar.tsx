'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { shortenAddress } from '@/lib/utils'
import { IconZap, IconBot } from '@/components/ui/Icons'

interface Player {
  address: string
  mark: 'X' | 'O'
  score: number
  isActive: boolean
  isBot?: boolean
}

interface ScoreBarProps {
  playerOne: Player
  playerTwo: Player
  pot: number
  round: number
  maxRounds?: number
  dramaScore?: number
  className?: string
}

export function ScoreBar({
  playerOne,
  playerTwo,
  pot,
  round,
  maxRounds = 9,
  dramaScore = 0,
  className,
}: ScoreBarProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 bg-white/[0.03] rounded-2xl border border-white/[0.06] backdrop-blur-sm',
      className,
    )}>
      <PlayerChip player={playerOne} />

      {/* Center */}
      <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-accent tabular-nums text-sm">
            {pot.toFixed(3)} SOL
          </span>
          <span className="text-text-muted text-xs font-mono">pot</span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: maxRounds }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all duration-300',
                i < round ? 'bg-primary' : 'bg-white/[0.12]',
              )}
            />
          ))}
        </div>
        {dramaScore > 60 && (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex items-center gap-1 text-xs font-mono text-warning"
          >
            <IconZap className="w-3 h-3" />
            <span>Drama x{(dramaScore / 100).toFixed(1)}</span>
          </motion.div>
        )}
      </div>

      <PlayerChip player={playerTwo} reversed />
    </div>
  )
}

function PlayerChip({ player, reversed }: { player: Player; reversed?: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-2 flex-1 min-w-0',
      reversed && 'flex-row-reverse',
    )}>
      {/* Mark indicator */}
      <div className={cn(
        'w-8 h-8 rounded-lg border flex items-center justify-center font-display font-bold text-sm shrink-0 transition-all duration-300',
        player.isActive ? (
          player.mark === 'X'
            ? 'bg-danger/12 border-danger/40 text-danger shadow-glow-danger'
            : 'bg-accent/12 border-accent/40 text-accent shadow-glow-cyan'
        ) : 'bg-white/[0.04] border-white/[0.08] text-text-muted',
      )}>
        {player.mark}
      </div>

      <div className={cn('min-w-0', reversed ? 'text-right' : 'text-left')}>
        <div className={cn('font-mono text-xs text-text-secondary truncate flex items-center gap-1', reversed && 'justify-end')}>
          {player.isBot && <IconBot className="w-3 h-3 text-accent/60 shrink-0" />}
          <span>{player.isBot ? 'MindDuel AI' : shortenAddress(player.address)}</span>
        </div>
        <p className="font-display font-bold text-lg leading-none text-text-primary tabular-nums">
          {player.score}
        </p>
      </div>

      {/* Active indicator */}
      {player.isActive && (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            player.mark === 'X' ? 'bg-danger' : 'bg-accent',
          )}
        />
      )}
    </div>
  )
}
