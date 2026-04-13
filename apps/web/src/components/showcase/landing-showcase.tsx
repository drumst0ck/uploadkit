'use client'

import { useState, useMemo, type ReactNode } from 'react'
import {
  UploadKitProvider,
  ProxyUploadKitClient,
  UploadDropzoneGlass,
  UploadDropzoneAurora,
  UploadDropzoneTerminal,
  UploadDropzoneBrutal,
  UploadDropzoneMinimal,
  UploadDropzoneNeon,
  UploadButtonShimmer,
  UploadButtonMagnetic,
  UploadButtonPulse,
  UploadButtonGradient,
  UploadProgressRadial,
  UploadProgressWave,
  UploadProgressLiquid,
  UploadCloudRain,
  UploadParticles,
  UploadVinyl,
  UploadEnvelope,
  UploadBlueprint,
  UploadDataStream,
  UploadScannerFrame,
  UploadBookFlip,
  UploadPolaroid,
  UploadKanban,
  UploadStickyBoard,
  UploadTimeline,
  UploadAttachmentTray,
} from '@uploadkitdev/react'
import type { UploadResult } from '@uploadkitdev/react'

// ─────────────────────────────────────────────────────────
// Mock client — identical to the docs preview mock
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
// Component registry
// ─────────────────────────────────────────────────────────

type ComponentEntry = {
  id: string
  name: string
  tag: string
  multiFile: boolean
  render: () => ReactNode
}

const COMPONENTS: ComponentEntry[] = [
  // Premium dropzones
  { id: 'glass', name: 'Glass', tag: 'Dropzone', multiFile: true, render: () => <UploadDropzoneGlass route="demo" /> },
  { id: 'aurora', name: 'Aurora', tag: 'Dropzone', multiFile: true, render: () => <UploadDropzoneAurora route="demo" /> },
  { id: 'terminal', name: 'Terminal', tag: 'Dropzone', multiFile: true, render: () => <UploadDropzoneTerminal route="demo" /> },
  { id: 'brutal', name: 'Brutal', tag: 'Dropzone', multiFile: true, render: () => <UploadDropzoneBrutal route="demo" /> },
  { id: 'minimal', name: 'Minimal', tag: 'Dropzone', multiFile: true, render: () => <UploadDropzoneMinimal route="demo" /> },
  { id: 'neon', name: 'Neon', tag: 'Dropzone', multiFile: true, render: () => <UploadDropzoneNeon route="demo" /> },
  { id: 'blueprint', name: 'Blueprint', tag: 'Themed', multiFile: true, render: () => <UploadBlueprint route="demo" /> },
  { id: 'data-stream', name: 'Data Stream', tag: 'Themed', multiFile: true, render: () => <UploadDataStream route="demo" columns={16} /> },
  { id: 'envelope', name: 'Envelope', tag: 'Themed', multiFile: true, render: () => <UploadEnvelope route="demo" /> },
  { id: 'sticky-board', name: 'Sticky Board', tag: 'Themed', multiFile: true, render: () => <UploadStickyBoard route="demo" /> },
  // Buttons
  { id: 'shimmer', name: 'Shimmer', tag: 'Button', multiFile: false, render: () => <UploadButtonShimmer route="demo" /> },
  { id: 'magnetic', name: 'Magnetic', tag: 'Button', multiFile: false, render: () => <UploadButtonMagnetic route="demo" /> },
  { id: 'pulse', name: 'Pulse', tag: 'Button', multiFile: false, render: () => <UploadButtonPulse route="demo" /> },
  { id: 'gradient', name: 'Gradient', tag: 'Button', multiFile: false, render: () => <UploadButtonGradient route="demo" /> },
  // Progress
  { id: 'radial', name: 'Radial', tag: 'Progress', multiFile: false, render: () => <UploadProgressRadial route="demo" size={140} /> },
  { id: 'wave', name: 'Wave', tag: 'Progress', multiFile: false, render: () => <UploadProgressWave route="demo" bars={28} /> },
  { id: 'liquid', name: 'Liquid', tag: 'Progress', multiFile: false, render: () => <UploadProgressLiquid route="demo" width={140} height={180} /> },
  { id: 'vinyl', name: 'Vinyl', tag: 'Specialty', multiFile: false, render: () => <UploadVinyl route="demo" size={180} /> },
  { id: 'scanner', name: 'Scanner', tag: 'Specialty', multiFile: false, render: () => <UploadScannerFrame route="demo" frameAspect="landscape" /> },
  { id: 'book-flip', name: 'Book Flip', tag: 'Specialty', multiFile: false, render: () => <UploadBookFlip route="demo" /> },
  // Multi-file visualizers
  { id: 'cloud-rain', name: 'Cloud Rain', tag: 'Visualizer', multiFile: true, render: () => <UploadCloudRain route="demo" /> },
  { id: 'particles', name: 'Particles', tag: 'Visualizer', multiFile: true, render: () => <UploadParticles route="demo" /> },
  { id: 'polaroid', name: 'Polaroid', tag: 'Visualizer', multiFile: true, render: () => <UploadPolaroid route="demo" /> },
  { id: 'kanban', name: 'Kanban', tag: 'Visualizer', multiFile: true, render: () => <UploadKanban route="demo" /> },
  { id: 'timeline', name: 'Timeline', tag: 'Visualizer', multiFile: true, render: () => <UploadTimeline route="demo" /> },
  { id: 'attachment-tray', name: 'Attachment Tray', tag: 'Visualizer', multiFile: true, render: () => <UploadAttachmentTray route="demo" /> },
]

const TAGS = ['All', 'Dropzone', 'Themed', 'Button', 'Progress', 'Specialty', 'Visualizer'] as const

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
// Landing Showcase Component
// ─────────────────────────────────────────────────────────

export function LandingShowcase() {
  const [activeId, setActiveId] = useState('glass')
  const [activeTag, setActiveTag] = useState<string>('All')
  const stageRef = useState<HTMLDivElement | null>(null)
  const mockClient = useMemo(() => new MockClient(), [])

  const active = COMPONENTS.find((c) => c.id === activeId) ?? COMPONENTS[0]!
  const filtered = activeTag === 'All' ? COMPONENTS : COMPONENTS.filter((c) => c.tag === activeTag)

  return (
    <div
      className="mx-auto grid max-w-[1200px] gap-6 px-6 lg:grid-cols-[280px_1fr]"
    >
      {/* ─── Sidebar: filter tabs + component list ─── */}
      <div className="flex flex-col gap-4">
        {/* Tag filter pills */}
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setActiveTag(tag)
                // If current active component is not in the new filter, switch to first
                if (tag !== 'All') {
                  const inFilter = COMPONENTS.find((c) => c.tag === tag && c.id === activeId)
                  if (!inFilter) {
                    const first = COMPONENTS.find((c) => c.tag === tag)
                    if (first) setActiveId(first.id)
                  }
                }
              }}
              className="rounded-full px-3 py-1 text-xs font-medium transition-all duration-200"
              style={{
                background: activeTag === tag ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${activeTag === tag ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: activeTag === tag ? '#a5b4fc' : '#71717a',
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Component list */}
        <div
          className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible lg:pb-0"
          style={{ maxHeight: 'calc(100vh - 300px)' }}
        >
          {filtered.map((comp) => (
            <button
              key={comp.id}
              type="button"
              onClick={() => setActiveId(comp.id)}
              className="flex flex-shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200"
              style={{
                background: activeId === comp.id
                  ? 'rgba(99,102,241,0.1)'
                  : 'transparent',
                border: `1px solid ${activeId === comp.id ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
              }}
            >
              <span
                className="flex h-2 w-2 flex-shrink-0 rounded-full"
                style={{
                  background: activeId === comp.id ? '#818cf8' : 'rgba(255,255,255,0.12)',
                  boxShadow: activeId === comp.id ? '0 0 8px rgba(129,140,248,0.5)' : 'none',
                }}
              />
              <span
                className="text-sm font-medium whitespace-nowrap"
                style={{ color: activeId === comp.id ? '#e0e7ff' : '#71717a' }}
              >
                {comp.name}
              </span>
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: '#52525b',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                {comp.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Preview stage ─── */}
      <div
        className="relative flex min-h-[400px] items-center justify-center overflow-hidden rounded-2xl"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.1), transparent 60%), #08080a',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <UploadKitProvider client={mockClient}>
          <div
            ref={(el) => { stageRef[1](el) }}
            className="flex w-full max-w-[560px] items-center justify-center p-8"
          >
            {active.render()}
          </div>
        </UploadKitProvider>

        {/* Simulate upload button */}
        <button
          type="button"
          onClick={() => {
            if (stageRef[0]) triggerFakeUpload(stageRef[0], active.multiFile ? 3 : 1)
          }}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.02em] transition-all duration-150"
          style={{
            border: '1px solid rgba(99,102,241,0.35)',
            background: 'rgba(99,102,241,0.12)',
            color: '#c7d2fe',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'
            e.currentTarget.style.background = 'rgba(99,102,241,0.2)'
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

        {/* Component name badge */}
        <div
          className="absolute bottom-3 left-4 flex items-center gap-2"
        >
          <span
            className="text-[11px] font-medium uppercase tracking-[0.04em]"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            {active.name}
          </span>
        </div>

        {/* Component count badge */}
        <div
          className="absolute bottom-3 right-4"
        >
          <span
            className="text-[11px] font-medium"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            {COMPONENTS.length} components
          </span>
        </div>
      </div>
    </div>
  )
}
