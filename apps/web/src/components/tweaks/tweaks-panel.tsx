'use client'

// Fixed bottom-right Tweaks panel — cycles theme + accent and persists both to
// localStorage via `usePreferences`. Always mounted; not gated by an edit-mode prop.
// Rendered outside <main> in page.tsx (after the footer) so it stays above content.

import { usePreferences, type Accent, type Theme } from './use-preferences'

// Accent swatch display colors — map to the project's hex palette (NO yellow).
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

  return (
    <div
      data-surface-tweaks="design-v2"
      role="dialog"
      aria-label="Tweaks"
    >
      <h5>
        <span>Tweaks</span>
        <span style={{ color: 'var(--fg-faint)' }}>live</span>
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
  )
}

export default TweaksPanel
