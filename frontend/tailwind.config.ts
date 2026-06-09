import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#F5F5F7',
          surface: '#ffffff',
          elevated: '#F2F2F7',
        },
        ink: {
          DEFAULT: '#1D1D1F',
          muted: '#6E6E73',
          faint: '#AEAEB2',
        },
        primary: {
          DEFAULT: '#0071E3',
          hover: '#0077ED',
          dark: '#005EC9',
          light: '#E5F0FD',
        },
        success: {
          DEFAULT: '#34C759',
          dark: '#0A7A2D',
          light: '#E8F7EE',
        },
        danger: {
          DEFAULT: '#FF3B30',
          dark: '#A81C13',
          light: '#FDECEB',
        },
        warning: {
          DEFAULT: '#FF9500',
          light: '#FFF4E0',
          dark: '#8A5A00',
        },
        sol: '#34C759',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.06)',
        'nav': '0 0 0 0.5px rgba(0,0,0,0.08)',
        'blue-glow': '0 4px 14px rgba(0,113,227,0.25)',
        'blue-ring': '0 0 0 2px #0071E3, 0 4px 12px rgba(0,113,227,0.22)',
        'cell-filled': '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.03)',
      },
      borderColor: {
        subtle: 'rgba(0,0,0,0.06)',
        default: 'rgba(0,0,0,0.10)',
        bright: 'rgba(0,0,0,0.18)',
      },
      animation: {
        'float': 'float 7s ease-in-out infinite',
        'pulse-dot': 'pulseDot 1.4s ease-out infinite',
        'spin': 'spin 1s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'confetti': 'confettiFall 5s linear infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        pulseDot: {
          '0%':    { transform: 'scale(1)', opacity: '0.6' },
          '100%':  { transform: 'scale(2.2)', opacity: '0' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        confettiFall: {
          '0%':   { transform: 'translateY(-40px) rotate(0deg)', opacity: '0' },
          '10%':  { opacity: '1' },
          '100%': { transform: 'translateY(120vh) rotate(720deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
