'use client'

// Floating tweaks control — collapsed by default (circular trigger).
// Click the trigger to reveal the panel; click the close icon or outside to collapse.

import { useEffect, useRef, useState } from 'react'
import { DesignIcon } from '@/components/ui/design-icon'
import { usePreferences, type Accent, type Theme } from './use-preferences'

const SWATCHES: Array<{ key: Accent; color: string }> = [
  { key: 'violet', color: '#6366f1' },
  { key: 'blue', color: '#3b82f6' },
  { key: 'green', color: '#22c55e' },
  { key: 'orange', color: '#f97316' },
  { key: 'pink', color: '#ec4899' },
]

const THEMES: Theme[] = ['dark', 'light']

export function TweaksPanel() {
  const { theme, accent, setTheme, setAccent } = usePreferences()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} data-surface-tweaks="design-v2" data-open={open ? 'true' : 'false'}>
      {!open && (
        <button
          type="button"
          className="tweaks-trigger"
          aria-label="Open tweaks"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <DesignIcon name="palette" size={18} />
        </button>
      )}

      {open && (
        <div className="tweaks-panel" role="dialog" aria-label="Tweaks">
          <h5>
            <span>Tweaks</span>
            <button
              type="button"
              className="tweaks-close"
              aria-label="Close tweaks"
              onClick={() => setOpen(false)}
            >
              <DesignIcon name="x" size={14} />
            </button>
          </h5>

          <div className="tweaks-row">
            <div className="tweaks-row-label">Theme</div>
            <div className="tweaks-seg" role="group" aria-label="Theme">
              {THEMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={theme === t ? 'active' : ''}
                  onClick={() => setTheme(t)}
                  aria-pressed={theme === t}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="tweaks-row">
            <div className="tweaks-row-label">Accent</div>
            <div className="tweaks-colors" role="group" aria-label="Accent color">
              {SWATCHES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={'tweaks-swatch' + (accent === s.key ? ' active' : '')}
                  style={{ background: s.color }}
                  onClick={() => setAccent(s.key)}
                  aria-label={s.key}
                  aria-pressed={accent === s.key}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TweaksPanel
