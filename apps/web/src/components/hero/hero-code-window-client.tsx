'use client'

import { useState } from 'react'

type Tab = 'route' | 'page'

interface HeroCodeWindowClientProps {
  routeHtml: string
  pageHtml: string
}

export function HeroCodeWindowClient({ routeHtml, pageHtml }: HeroCodeWindowClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('route')

  const htmlMap: Record<Tab, string> = {
    route: routeHtml,
    page: pageHtml,
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'route', label: 'route.ts' },
    { id: 'page', label: 'page.tsx' },
  ]

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-md)] text-left"
      style={{
        background: '#0d1117',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 80px -20px rgba(0,0,0,0.6)',
      }}
    >
      {/* Window chrome: traffic lights + tabs */}
      <div
        className="flex items-center gap-0 border-b"
        style={{
          background: '#161b22',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        {/* Traffic light dots — hidden on mobile to save space */}
        <div className="hidden items-center gap-1.5 px-4 py-3 sm:flex">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#ff5f57' }} aria-hidden="true" />
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#febc2e' }} aria-hidden="true" />
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#28c840' }} aria-hidden="true" />
        </div>

        {/* Tab buttons */}
        <div className="flex" role="tablist" aria-label="Code file tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`hero-code-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className="border-b-2 px-3 py-2.5 text-xs font-medium transition-colors duration-150 sm:px-4 sm:py-3"
              style={
                activeTab === tab.id
                  ? {
                      borderColor: '#6366f1',
                      color: '#e6edf3',
                      background: 'transparent',
                    }
                  : {
                      borderColor: 'transparent',
                      color: '#8b949e',
                      background: 'transparent',
                    }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Code panel — Shiki HTML injected, safe (hardcoded constants only) */}
      <div
        id={`hero-code-panel-${activeTab}`}
        role="tabpanel"
        className="hero-code-panel overflow-x-auto p-3 text-[11px] leading-relaxed sm:p-5 sm:text-sm"
        style={{ maxHeight: '340px', overflowY: 'auto' }}
        // Safe: HTML from Shiki highlighting hardcoded string constants (no user input)
        dangerouslySetInnerHTML={{ __html: htmlMap[activeTab] }}
      />
    </div>
  )
}
