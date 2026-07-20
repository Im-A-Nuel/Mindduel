'use client'

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Small localStorage-backed preference store.
 *
 * Added on Celo Foundation feedback ("ingat pilihan user"): the lobby used to
 * reset every choice on each visit. These helpers remember a player's last
 * selections so returning feels like picking up where they left off.
 *
 * localStorage (not sessionStorage) so choices survive closing the app - the
 * gameplay handoff still uses sessionStorage separately.
 */
const PREFIX = 'mddPref:'

export function loadPref<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function savePref<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Quota/private-mode failures are non-fatal - the choice just won't persist.
  }
}

/**
 * useState that persists to localStorage.
 *
 * SSR-safe: renders `fallback` on the server and the first client paint (so no
 * hydration mismatch), then swaps in the stored value on mount. The first save
 * is skipped so restoring a value never clobbers a fresh choice.
 */
export function usePersistentState<T>(
  key: string,
  fallback: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(fallback)
  const firstSave = useRef(true)

  // Load the stored value once, after the first paint.
  useEffect(() => {
    const stored = loadPref<T>(key, fallback)
    setState(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Persist on change, but skip the initial fallback render.
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false
      return
    }
    savePref(key, state)
  }, [key, state])

  return [state, setState]
}
