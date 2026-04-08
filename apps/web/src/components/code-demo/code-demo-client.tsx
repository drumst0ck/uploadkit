'use client'

import { useState } from 'react'
import { UploadKitProvider, UploadButton, UploadDropzone } from '@uploadkit/react'
import '@uploadkit/react/styles.css'

type Tab = 'nextjs' | 'react' | 'api'
type Theme = 'dark' | 'light'

interface CodeDemoClientProps {
  nextjsHtml: string
  reactHtml: string
  apiHtml: string
}

const TAB_LABELS: Record<Tab, string> = {
  nextjs: 'Next.js',
  react: 'React',
  api: 'REST API',
}

const TABS: Tab[] = ['nextjs', 'react', 'api']

// Mock JSON response for the API tab preview
function ApiMockResponse() {
  return (
    <div className="api-mock-response">
      <div className="api-mock-label">Response</div>
      <pre className="api-mock-pre">
        {`{
  "uploadId": "upl_abc123",
  "url": "https://cdn.uploadkit.dev/images/photo.jpg",
  "key": "images/photo.jpg",
  "size": 204800,
  "contentType": "image/jpeg",
  "status": "uploaded"
}`}
      </pre>
    </div>
  )
}

export function CodeDemoClient({ nextjsHtml, reactHtml, apiHtml }: CodeDemoClientProps) {
  const [tab, setTab] = useState<Tab>('nextjs')
  const [theme, setTheme] = useState<Theme>('dark')

  const htmlMap: Record<Tab, string> = {
    nextjs: nextjsHtml,
    react: reactHtml,
    api: apiHtml,
  }

  return (
    <div className="code-demo-wrapper" data-animate>
      {/* Tab bar */}
      <div className="code-demo-tabs" role="tablist" aria-label="Code examples">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            className={`code-demo-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Code + Preview layout */}
      <div className="code-demo-body">
        {/* Left: Shiki-highlighted code */}
        <div
          id={`panel-${tab}`}
          role="tabpanel"
          className="code-demo-pane"
          // Safe: all HTML comes from hardcoded constants run through Shiki server-side
          dangerouslySetInnerHTML={{ __html: htmlMap[tab] }}
        />

        {/* Right: Live component preview */}
        <div
          className="code-demo-preview"
          data-theme={theme}
        >
          <div className="preview-topbar">
            <span className="preview-label">Live Preview</span>
            <button
              className="theme-toggle"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          <div className="preview-content">
            <UploadKitProvider apiKey="demo">
              {tab === 'nextjs' && (
                <UploadButton
                  route="imageUploader"
                />
              )}
              {tab === 'react' && (
                <UploadDropzone
                  route="imageUploader"
                />
              )}
              {tab === 'api' && <ApiMockResponse />}
            </UploadKitProvider>
          </div>
        </div>
      </div>
    </div>
  )
}
