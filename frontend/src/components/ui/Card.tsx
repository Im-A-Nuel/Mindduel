import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  hover?: boolean
  gradient?: boolean
}

export function Card({ children, className, glow, hover, gradient }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border-subtle bg-bg-surface',
        'shadow-card',
        glow && 'shadow-glow-violet border-primary/20',
        hover && 'transition-all duration-300 hover:shadow-card-hover hover:border-border-default cursor-pointer',
        gradient && 'bg-gradient-card',
        className,
      )}
    >
      {children}
    </div>
  )
}
