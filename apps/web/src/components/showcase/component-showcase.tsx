'use client'

import { useState } from 'react'
import {
  UploadKitProvider,
  UploadButton,
  UploadDropzone,
  UploadModal,
} from '@uploadkit/react'
import '@uploadkit/react/styles.css'

type Theme = 'dark' | 'light'

interface DemoPanel {
  name: string
  component: (theme: Theme) => React.ReactNode
}

function ModalDemo({ theme: _theme }: { theme: Theme }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <button
        onClick={() => setOpen(true)}
        className="showcase-open-btn"
        aria-haspopup="dialog"
      >
        Open modal
      </button>
      {open && (
        <UploadModal
          route="imageUploader"
          open={open}
          onClose={() => setOpen(false)}
          onUploadComplete={() => { setOpen(false) }}
        />
      )}
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
        Click to open the upload modal
      </p>
    </div>
  )
}

const demos: DemoPanel[] = [
  {
    name: 'UploadButton',
    component: () => (
      <UploadButton
        route="imageUploader"
      />
    ),
  },
  {
    name: 'UploadDropzone',
    component: () => (
      <UploadDropzone
        route="imageUploader"
      />
    ),
  },
  {
    name: 'UploadModal',
    component: (theme) => <ModalDemo theme={theme} />,
  },
]

export function ComponentShowcase() {
  const [theme, setTheme] = useState<Theme>('dark')

  return (
    <section id="showcase" className="showcase-section">
      <div className="container">
        <div className="section-header" data-animate>
          <p className="section-label">Components</p>
          <h2 className="section-title">Components that just work</h2>
          <p className="section-subtitle">
            Drop-in React components with premium design. Dark mode, accessibility, and
            drag-and-drop — all included.
          </p>
        </div>

        <div className="showcase-wrapper" data-animate data-theme={theme}>
          {/* Theme toggle */}
          <div className="showcase-topbar">
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>

          {/* Demo panels */}
          <div className="showcase-grid">
            {demos.map((demo) => (
              <div key={demo.name} className="showcase-card">
                <div className="showcase-card-label">{demo.name}</div>
                <div className="showcase-card-content">
                  <UploadKitProvider endpoint="/api/uploadkit">
                    {demo.component(theme)}
                  </UploadKitProvider>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
