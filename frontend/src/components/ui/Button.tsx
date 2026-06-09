'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  children: React.ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary: [
    'bg-primary text-white font-semibold',
    'hover:bg-primary-hover hover:shadow-glow-violet',
    'active:bg-primary-dark',
  ].join(' '),
  secondary: [
    'bg-transparent text-primary-hover font-semibold',
    'border border-primary/40',
    'hover:bg-primary/10 hover:border-primary/60',
    'active:bg-primary/15',
  ].join(' '),
  ghost: [
    'bg-transparent text-text-secondary font-medium',
    'border border-white/[0.06]',
    'hover:bg-white/[0.05] hover:text-text-primary hover:border-white/[0.10]',
    'active:bg-white/[0.08]',
  ].join(' '),
  danger: [
    'bg-danger/10 text-danger font-semibold',
    'border border-danger/30',
    'hover:bg-danger/18 hover:border-danger/50',
    'active:bg-danger/24',
  ].join(' '),
  accent: [
    'bg-accent/10 text-accent font-semibold',
    'border border-accent/30',
    'hover:bg-accent/18 hover:shadow-glow-cyan',
    'active:bg-accent/24',
  ].join(' '),
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-base rounded-xl gap-2',
  xl: 'px-10 py-4 text-base rounded-2xl gap-2.5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'inline-flex items-center justify-center font-display transition-all duration-200',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
          {children}
        </>
      ) : children}
    </motion.button>
  )
}
