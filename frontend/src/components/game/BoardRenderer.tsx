'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export type CellValue = 'X' | 'O' | null
export type WinLine = [number, number, number] | null

interface BoardRendererProps {
  board: CellValue[]
  onCellClick: (index: number) => void
  currentPlayer: 'X' | 'O'
  myMark: 'X' | 'O'
  winLine?: WinLine
  pendingCell?: number | null
  disabled?: boolean
  className?: string
  /** Edge length of the active grid (3, 4, or 5). Defaults to inferred from board.length. */
  size?: number
}

export function BoardRenderer({
  board,
  onCellClick,
  currentPlayer,
  myMark,
  winLine,
  pendingCell = null,
  disabled = false,
  className,
  size,
}: BoardRendererProps) {
  const isMyTurn = currentPlayer === myMark
  const canClick = isMyTurn && !disabled
  const inferredSize = Math.round(Math.sqrt(board.length))
  const gridSize = size ?? (inferredSize * inferredSize === board.length ? inferredSize : 3)
  const cells = board.slice(0, gridSize * gridSize)

  return (
    <div className={cn('select-none', className)}>
      {/* Turn indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <motion.div
          animate={{ opacity: isMyTurn ? 1 : 0.4 }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-display font-semibold border',
            isMyTurn
              ? 'bg-primary/10 border-primary/35 text-primary-hover'
              : 'bg-white/[0.03] border-white/[0.07] text-text-muted',
          )}
        >
          <motion.span
            animate={{ scale: isMyTurn ? [1, 1.2, 1] : 1 }}
            transition={{ repeat: isMyTurn ? Infinity : 0, duration: 1.5 }}
            className={cn('w-2 h-2 rounded-full', isMyTurn ? 'bg-primary' : 'bg-text-muted')}
          />
          {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
        </motion.div>
      </div>

      {/* Board grid */}
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-xl pointer-events-none" />

        <div
          className="relative grid gap-2 p-3 bg-white/[0.025] rounded-2xl border border-white/[0.08] backdrop-blur-sm"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {cells.map((cell, index) => {
            const isWinCell = winLine?.includes(index) ?? false
            const isEmpty = cell === null
            const clickable = canClick && isEmpty && pendingCell === null
            const isPending = pendingCell === index

            return (
              <Cell
                key={index}
                value={cell}
                isWin={isWinCell}
                clickable={clickable}
                isPending={isPending}
                myMark={myMark}
                onClick={() => clickable && onCellClick(index)}
              />
            )
          })}
        </div>

        {/* Win line overlay — only renders for 3x3; larger boards rely on the per-cell win glow. */}
        <AnimatePresence>
          {winLine && gridSize === 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 rounded-2xl pointer-events-none"
            >
              <WinLineOverlay winLine={winLine} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface CellProps {
  value: CellValue
  isWin: boolean
  clickable: boolean
  isPending: boolean
  myMark: 'X' | 'O'
  onClick: () => void
}

function Cell({ value, isWin, clickable, isPending, myMark, onClick }: CellProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={!clickable && !isPending}
      whileHover={clickable ? { scale: 1.04 } : {}}
      whileTap={clickable ? { scale: 0.96 } : {}}
      className={cn(
        'relative aspect-square rounded-xl border transition-all duration-200',
        'flex items-center justify-center',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        'bg-white/[0.03] border-white/[0.07]',
        clickable && 'hover:bg-primary/10 hover:border-primary/40 cursor-pointer',
        isWin && 'bg-primary/12 border-primary/50 shadow-glow-violet animate-win-flash',
        isPending && 'bg-primary/15 border-primary/50 ring-1 ring-primary/40 cursor-default',
        !clickable && !value && !isPending && 'cursor-default opacity-50',
      )}
    >
      {/* Pending pulse ring */}
      {isPending && (
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none"
        />
      )}

      <AnimatePresence>
        {value && (
          <motion.div
            key={value}
            initial={{ scale: 0, rotate: -15, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {value === 'X' ? <XMark isWin={isWin} /> : <OMark isWin={isWin} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover hint for clickable empty cells */}
      {clickable && !value && (
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {myMark === 'X' ? <XMark isWin={false} faint /> : <OMark isWin={false} faint />}
        </motion.div>
      )}
    </motion.button>
  )
}

function XMark({ isWin, faint }: { isWin: boolean; faint?: boolean }) {
  const color = faint
    ? 'text-danger/20'
    : isWin
    ? 'text-danger drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
    : 'text-danger/80'
  return (
    <svg viewBox="0 0 40 40" className={cn('w-10 h-10', color)} fill="none" strokeLinecap="round">
      <motion.line x1="8" y1="8" x2="32" y2="32" stroke="currentColor" strokeWidth="4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2 }} />
      <motion.line x1="32" y1="8" x2="8" y2="32" stroke="currentColor" strokeWidth="4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2, delay: 0.1 }} />
    </svg>
  )
}

function OMark({ isWin, faint }: { isWin: boolean; faint?: boolean }) {
  const color = faint
    ? 'stroke-accent/20'
    : isWin
    ? 'stroke-accent drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]'
    : 'stroke-accent/80'
  return (
    <svg viewBox="0 0 40 40" className={cn('w-10 h-10', color)} fill="none">
      <motion.circle cx="20" cy="20" r="12" strokeWidth="4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
    </svg>
  )
}

function WinLineOverlay({ winLine }: { winLine: [number, number, number] }) {
  const lines: Record<string, { x1: string; y1: string; x2: string; y2: string }> = {
    '0,1,2': { x1: '16.7%', y1: '16.7%', x2: '83.3%', y2: '16.7%' },
    '3,4,5': { x1: '16.7%', y1: '50%',   x2: '83.3%', y2: '50%'   },
    '6,7,8': { x1: '16.7%', y1: '83.3%', x2: '83.3%', y2: '83.3%' },
    '0,3,6': { x1: '16.7%', y1: '16.7%', x2: '16.7%', y2: '83.3%' },
    '1,4,7': { x1: '50%',   y1: '16.7%', x2: '50%',   y2: '83.3%' },
    '2,5,8': { x1: '83.3%', y1: '16.7%', x2: '83.3%', y2: '83.3%' },
    '0,4,8': { x1: '16.7%', y1: '16.7%', x2: '83.3%', y2: '83.3%' },
    '2,4,6': { x1: '83.3%', y1: '16.7%', x2: '16.7%', y2: '83.3%' },
  }

  const key = winLine.join(',')
  const line = lines[key]
  if (!line) return null

  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <motion.line
        {...line}
        stroke="rgba(124, 58, 237, 0.9)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        filter="url(#glow)"
      />
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
    </svg>
  )
}
