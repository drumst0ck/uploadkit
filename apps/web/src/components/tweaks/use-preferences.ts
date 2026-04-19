'use client'

// Shared client hook for theme + accent preferences.
// Both the Navbar sun/moon and the TweaksPanel consume this — one source of truth.
// Persists to localStorage (uk-theme / uk-accent) and reflects changes across the tab
// via the 'storage' event.

import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
export type Accent = 'violet' | 'blue' | 'green' | 'orange' | 'pink'

const THEME_KEY = 'uk-theme'
const ACCENT_KEY = 'uk-accent'

const VALID_THEMES: readonly Theme[] = ['dark', 'light']
const VALID_ACCENTS: readonly Accent[] = ['violet', 'blue', 'green', 'orange', 'pink']

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark') return attr
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* swallow */
  }
  return 'dark'
}

function readAccent(): Accent {
  if (typeof document === 'undefined') return 'violet'
  const attr = document.documentElement.getAttribute('data-accent')
  if (attr && (VALID_ACCENTS as readonly string[]).includes(attr)) return attr as Accent
  try {
    const stored = localStorage.getItem(ACCENT_KEY)
    if (stored && (VALID_ACCENTS as readonly string[]).includes(stored)) return stored as Accent
  } catch {
    /* swallow */
  }
  return 'violet'
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* swallow */
  }
}

function applyAccent(accent: Accent) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-accent', accent)
  try {
    localStorage.setItem(ACCENT_KEY, accent)
  } catch {
    /* swallow */
  }
}

export interface UsePreferencesReturn {
  theme: Theme
  accent: Accent
  setTheme: (t: Theme) => void
  setAccent: (a: Accent) => void
  toggleTheme: () => void
  ready: boolean
}

/**
 * Shared client hook for UploadKit landing theme + accent.
 *
 * - Defaults: theme=dark, accent=violet.
 * - On mount, syncs state with documentElement attributes (set by the pre-hydration
 *   script in layout.tsx) to avoid FOUC.
 * - On change, writes to both documentElement attribute and localStorage.
 * - Cross-component sync via the 'storage' event (another tab flips the value).
 */
export function usePreferences(): UsePreferencesReturn {
  // Start with safe SSR defaults. The pre-hydration inline script in layout.tsx
  // already applied the correct data-* attributes to <html>, so the first paint is
  // correct; this state just mirrors it for React.
  const [theme, setThemeState] = useState<Theme>('dark')
  const [accent, setAccentState] = useState<Accent>('violet')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setThemeState(readTheme())
    setAccentState(readAccent())
    setReady(true)

    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        const v = e.newValue
        if (v === 'light' || v === 'dark') {
          setThemeState(v)
          document.documentElement.setAttribute('data-theme', v)
        }
      } else if (e.key === ACCENT_KEY) {
        const v = e.newValue
        if (v && (VALID_ACCENTS as readonly string[]).includes(v)) {
          setAccentState(v as Accent)
          document.documentElement.setAttribute('data-accent', v)
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    if (!VALID_THEMES.includes(next)) return
    applyTheme(next)
    setThemeState(next)
  }, [])

  const setAccent = useCallback((next: Accent) => {
    if (!VALID_ACCENTS.includes(next)) return
    applyAccent(next)
    setAccentState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return { theme, accent, setTheme, setAccent, toggleTheme, ready }
}
