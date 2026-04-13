'use client'

import { useState, useMemo, useRef, type ReactNode } from 'react'
import {
  UploadKitProvider,
  ProxyUploadKitClient,
  UploadDropzoneGlass,
  UploadDropzoneAurora,
  UploadDropzoneNeon,
  UploadDropzoneMinimal,
  UploadButtonShimmer,
  UploadButtonGradient,
  UploadProgressRadial,
  UploadProgressWave,
  UploadProgressLiquid,
  UploadCloudRain,
  UploadVinyl,
  UploadEnvelope,
  UploadBlueprint,
  UploadDataStream,
  UploadScannerFrame,
  UploadKanban,
} from '@uploadkitdev/react'
import type { UploadResult } from '@uploadkitdev/react'

// ─────────────────────────────────────────────────────────
// Mock client
// ─────────────────────────────────────────────────────────

class MockClient extends ProxyUploadKitClient {
  constructor() {
    super({ endpoint: '/api/noop' })
  }
  override async upload(options: {
    file: File
    route: string
    metadata?: Record<string, unknown>
    onProgress?: (percentage: number) => void
    signal?: AbortSignal
  }): Promise<UploadResult> {
    const { file, onProgress, signal } = options
    const steps = 14
    const delay = 160
    for (let i = 1; i <= steps; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      await new Promise<void>((r) => setTimeout(r, delay))
      onProgress?.(Math.round((i / steps) * 100))
    }
    return {
      id: `mock-${Date.now()}`,
      key: `demo/${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      status: 'uploaded',
      createdAt: new Date().toISOString(),
    }
  }
}

// ─────────────────────────────────────────────────────────
// Curated component list — only the most visually striking
// ─────────────────────────────────────────────────────────

type ShowcaseEntry = {
  id: string
  label: string
  description: string
  multiFile: boolean
  stageHeight: number
  render: () => ReactNode
}

const SHOWCASE: ShowcaseEntry[] = [
  {
    id: 'glass',
    label: 'Glass',
    description: 'Frosted glass with indigo glow halo',
    multiFile: true,
    stageHeight: 320,
    render: () => <UploadDropzoneGlass route="demo" />,
  },
  {
    id: 'aurora',
    label: 'Aurora',
    description: 'Animated conic-gradient mesh',
    multiFile: true,
    stageHeight: 320,
    render: () => <UploadDropzoneAurora route="demo" />,
  },
  {
    id: 'neon',
    label: 'Neon',
    description: 'Cyberpunk glow traces and scanlines',
    multiFile: true,
    stageHeight: 320,
    render: () => <UploadDropzoneNeon route="demo" />,
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Stripe-inspired ultra-clean dropzone',
    multiFile: true,
    stageHeight: 300,
    render: () => <UploadDropzoneMinimal route="demo" />,
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    description: 'Technical schematic with crosshairs',
    multiFile: true,
    stageHeight: 340,
    render: () => <UploadBlueprint route="demo" />,
  },
  {
    id: 'data-stream',
    label: 'Data Stream',
    description: 'Matrix-style character rain',
    multiFile: true,
    stageHeight: 340,
    render: () => <UploadDataStream route="demo" columns={16} />,
  },
  {
    id: 'envelope',
    label: 'Envelope',
    description: '3D envelope with wax seal',
    multiFile: true,
    stageHeight: 380,
    render: () => <UploadEnvelope route="demo" />,
  },
  {
    id: 'kanban',
    label: 'Kanban',
    description: 'Pipeline columns: Queued → Done',
    multiFile: true,
    stageHeight: 360,
    render: () => <UploadKanban route="demo" />,
  },
  {
    id: 'shimmer',
    label: 'Shimmer',
    description: 'Shimmer sweep with indigo glow',
    multiFile: false,
    stageHeight: 200,
    render: () => <UploadButtonShimmer route="demo" />,
  },
  {
    id: 'gradient',
    label: 'Gradient',
    description: 'Rotating conic gradient ring',
    multiFile: false,
    stageHeight: 200,
    render: () => <UploadButtonGradient route="demo" />,
  },
  {
    id: 'radial',
    label: 'Radial',
    description: 'Activity-ring progress with splash',
    multiFile: false,
    stageHeight: 260,
    render: () => <UploadProgressRadial route="demo" size={150} />,
  },
  {
    id: 'wave',
    label: 'Wave',
    description: 'Audio waveform fills left-to-right',
    multiFile: false,
    stageHeight: 220,
    render: () => <UploadProgressWave route="demo" bars={28} />,
  },
  {
    id: 'liquid',
    label: 'Liquid',
    description: 'Sine-wave liquid fill vessel',
    multiFile: false,
    stageHeight: 320,
    render: () => <UploadProgressLiquid route="demo" width={150} height={200} />,
  },
  {
    id: 'vinyl',
    label: 'Vinyl',
    description: 'Spinning record with groove fill',
    multiFile: false,
    stageHeight: 300,
    render: () => <UploadVinyl route="demo" size={200} />,
  },
  {
    id: 'scanner',
    label: 'Scanner',
    description: 'ID viewfinder with sweep line',
    multiFile: false,
    stageHeight: 320,
    render: () => <UploadScannerFrame route="demo" frameAspect="landscape" />,
  },
  {
    id: 'cloud-rain',
    label: 'Cloud Rain',
    description: 'Cloud fills as files upload',
    multiFile: true,
    stageHeight: 320,
    render: () => <UploadCloudRain route="demo" />,
  },
]

// ─────────────────────────────────────────────────────────
// Fake file helper
// ─────────────────────────────────────────────────────────

function makeFakeFile(i: number): File {
  const size = 120_000 + Math.floor(Math.random() * 80_000)
  const hue = (i * 57) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><linearGradient id="g"><stop offset="0%" stop-color="hsl(${hue},70%,55%)"/><stop offset="100%" stop-color="hsl(${(hue + 60) % 360},70%,45%)"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/></svg>`
  const padded = svg + ' '.repeat(Math.max(0, size - svg.length))
  return new File([padded], `sample-${i + 1}.svg`, { type: 'image/svg+xml' })
}

function triggerFakeUpload(container: HTMLElement, count: number) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) return
  const dt = new DataTransfer()
  for (let i = 0; i < count; i++) dt.items.add(makeFakeFile(i))
  try {
    input.files = dt.files
  } catch {
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true })
  }
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export function LandingShowcase() {
  const [activeId, setActiveId] = useState('glass')
  const stageRef = useRef<HTMLDivElement>(null)
  const mockClient = useMemo(() => new MockClient(), [])

  const active = SHOWCASE.find((c) => c.id === activeId) ?? SHOWCASE[0]!

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6">
      {/* ─── Selector: horizontal pill grid ─── */}
      <div className="flex flex-wrap justify-center gap-2">
        {SHOWCASE.map((comp) => {
          const isActive = activeId === comp.id
          return (
            <button
              key={comp.id}
              type="button"
              onClick={() => setActiveId(comp.id)}
              className="group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200"
              style={{
                background: isActive
                  ? 'rgba(99,102,241,0.15)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: isActive ? '#c7d2fe' : '#52525b',
                boxShadow: isActive ? '0 0 20px -6px rgba(99,102,241,0.3)' : 'none',
              }}
            >
              {isActive && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: '#818cf8', boxShadow: '0 0 6px #818cf8' }}
                />
              )}
              {comp.label}
            </button>
          )
        })}
      </div>

      {/* ─── Preview stage ─── */}
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-2xl transition-[min-height] duration-300 ease-out"
        style={{
          minHeight: active.stageHeight,
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.1), transparent 60%), #08080a',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <UploadKitProvider client={mockClient}>
          <div
            ref={stageRef}
            className="flex w-full max-w-[600px] items-center justify-center p-6 md:p-10"
          >
            {active.render()}
          </div>
        </UploadKitProvider>

        {/* Simulate button */}
        <button
          type="button"
          onClick={() => {
            if (stageRef.current) triggerFakeUpload(stageRef.current, active.multiFile ? 3 : 1)
          }}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide transition-all duration-150"
          style={{
            border: '1px solid rgba(99,102,241,0.35)',
            background: 'rgba(99,102,241,0.12)',
            color: '#c7d2fe',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'
            e.currentTarget.style.background = 'rgba(99,102,241,0.22)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'
            e.currentTarget.style.background = 'rgba(99,102,241,0.12)'
          }}
          aria-label="Simulate upload"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: '#818cf8', boxShadow: '0 0 8px #818cf8' }}
            aria-hidden="true"
          />
          Simulate
        </button>

        {/* Component description */}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <span
            className="text-xs font-medium"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {active.description}
          </span>
          <span
            className="text-[11px] tabular-nums"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            {SHOWCASE.indexOf(active) + 1} / {SHOWCASE.length}
          </span>
        </div>
      </div>

      {/* ─── "See all" link ─── */}
      <div className="flex justify-center">
        <a
          href="https://docs.uploadkit.dev/docs/sdk/react/upload-dropzone-glass"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200"
          style={{ color: '#71717a' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#a5b4fc' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#71717a' }}
        >
          Explore all 40+ components in the docs
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  )
}
