'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeCtx {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeCtx | null>(null)

const STORAGE_KEY = 'mddTheme'

/**
 * Reads the theme synchronously from localStorage so the dark class is set
 * BEFORE first paint. Returns 'light' fallback during SSR.
 */
function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'dark' || v === 'light') return v
  } catch {}
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  // On mount, sync from storage
  useEffect(() => {
    const initial = readInitialTheme()
    setThemeState(initial)
    document.documentElement.dataset.theme = initial
  }, [])

  function setTheme(next: Theme) {
    setThemeState(next)
    document.documentElement.dataset.theme = next
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
  }

  function toggle() { setTheme(theme === 'dark' ? 'light' : 'dark') }

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}

/**
 * Inline script string to set the `data-theme` attribute on <html> as early
 * as possible — before React hydrates — so the dark theme paints from the
 * first frame instead of flashing light.
 */
export const themeBootstrapScript = `
try {
  var t = localStorage.getItem('${STORAGE_KEY}');
  if (t !== 'dark' && t !== 'light') {
    t = 'light';
  }
  document.documentElement.dataset.theme = t;
} catch (e) {}
`.trim()
