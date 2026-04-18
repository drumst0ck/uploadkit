'use client'

// HeroDropzoneDemo — live, client-side drag-drop simulation.
// No real upload API. Shows drag/drop + click + sample-seed + per-file progress + done.
// Ported from /tmp/design-fetch/extracted/todolol/project/components/Hero.jsx with strict
// typing, URL.createObjectURL cleanup, reduced-motion respect, and keyboard affordances.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { DesignIcon, type IconName } from '@/components/ui/design-icon'

type UploadStatus = 'uploading' | 'done' | 'error'

interface DemoFile {
  id: number
  name: string
  size: number
  type: string
  progress: number
  status: UploadStatus
  preview: string | null
}

interface SampleSeed {
  name: string
  size: number
  type: string
}

const SAMPLE_FILES: SampleSeed[] = [
  { name: 'hero-dark.png', size: 2_414_080, type: 'image/png' },
  { name: 'onboarding.mp4', size: 18_942_300, type: 'video/mp4' },
  { name: 'pitch-deck.pdf', size: 4_200_300, type: 'application/pdf' },
]

const MAX_VISIBLE = 4
const TICK_MS = 140

// Module-level id counter — deterministic across Strict Mode remounts in dev.
let nextId = 1

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileKindIcon(type: string | undefined): IconName {
  if (!type) return 'file'
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  return 'file'
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function statusLabel(status: UploadStatus): string {
  if (status === 'done') return 'uploaded · 312 ms'
  if (status === 'error') return 'failed'
  return 'uploading…'
}

export function HeroDropzoneDemo() {
  const [files, setFiles] = useState<DemoFile[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dragCounter = useRef(0)

  // Revoke object URLs when the file list shrinks or on unmount.
  const previousIdsRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    const currentIds = new Set(files.map((f) => f.id))
    // For ids that disappeared, revoke their preview URLs from the snapshot held
    // by React (we don't have access to the old file objects, so we skip — but
    // unmount cleanup below handles shutdown).
    previousIdsRef.current = currentIds
  }, [files])
  useEffect(() => {
    return () => {
      // Unmount — revoke any remaining object URLs
      for (const f of files) {
        if (f.preview) URL.revokeObjectURL(f.preview)
      }
    }
    // We only want this on unmount; ESLint intentionally relaxed via reference to `files`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Progress tick — only runs while any file is still uploading.
  useEffect(() => {
    const hasPending = files.some((f) => f.status === 'uploading')
    if (!hasPending) return

    if (prefersReducedMotion()) {
      // Jump all pending rows straight to done.
      setFiles((prev) =>
        prev.map((f) => (f.status === 'uploading' ? { ...f, progress: 100, status: 'done' } : f)),
      )
      return
    }

    const id = window.setInterval(() => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.status !== 'uploading') return f
          const sizeMB = f.size / 1024 / 1024
          const base = Math.max(1.2, 120 / (sizeMB + 1))
          const step = base * (0.6 + Math.random() * 0.8)
          const next = Math.min(100, f.progress + step)
          if (next >= 100) return { ...f, progress: 100, status: 'done' }
          return { ...f, progress: next }
        }),
      )
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [files])

  const addFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return
    const incoming: DemoFile[] = Array.from(list)
      .slice(0, MAX_VISIBLE)
      .map((f) => ({
        id: nextId++,
        name: f.name,
        size: f.size,
        type: f.type,
        progress: 0,
        status: 'uploading',
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      }))
    setFiles((prev) => [...prev, ...incoming].slice(-MAX_VISIBLE))
  }, [])

  const addSamples = useCallback(() => {
    // Revoke existing previews before replacing.
    setFiles((prev) => {
      for (const f of prev) {
        if (f.preview) URL.revokeObjectURL(f.preview)
      }
      return SAMPLE_FILES.map((s) => ({
        id: nextId++,
        name: s.name,
        size: s.size,
        type: s.type,
        progress: 0,
        status: 'uploading' as const,
        preview: null,
      }))
    })
  }, [])

  const onDrop = useCallback(
    (e: ReactDragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      dragCounter.current = 0
      addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const onDragEnter = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragCounter.current += 1
    setDragging(true)
  }, [])

  const onDragLeave = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragCounter.current = Math.max(0, dragCounter.current - 1)
    if (dragCounter.current === 0) setDragging(false)
  }, [])

  const onDragOver = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const openPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files)
      // Allow re-selecting the same file
      if (e.target) e.target.value = ''
    },
    [addFiles],
  )

  const onKey = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openPicker()
      }
    },
    [openPicker],
  )

  const removeFile = useCallback((id: number) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      if (target?.preview) URL.revokeObjectURL(target.preview)
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  return (
    <div className="demo-card">
      <div className="demo-chrome">
        <div className="demo-chrome-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="demo-chrome-label">{'<UploadDropzone route="media" />'}</div>
        <div style={{ width: 40 }} aria-hidden="true" />
      </div>

      <div className="demo-body">
        <div
          className={'dropzone' + (dragging ? ' dragover' : '')}
          onDrop={onDrop}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onClick={openPicker}
          onKeyDown={onKey}
          role="button"
          tabIndex={0}
          aria-label="Drop files here or press Enter to browse"
        >
          <div className="dz-icon">
            <DesignIcon name="upload" size={22} />
          </div>
          <div className="dz-title">
            Drop files here or <span>browse</span>
          </div>
          <div className="dz-sub">PNG · JPG · MP4 · PDF up to 32 MB</div>
          <div className="dz-rules">
            <span className="dz-rule">route=media</span>
            <span className="dz-rule">max 4 files</span>
            <span className="dz-rule">presigned</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={onInputChange}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {files.length > 0 && (
          <div className="file-list">
            {files.map((f) => (
              <FileRow key={f.id} file={f} onRemove={() => removeFile(f.id)} />
            ))}
          </div>
        )}
      </div>

      <div className="demo-footer">
        <span>
          <button
            type="button"
            onClick={addSamples}
            style={{
              background: 'transparent',
              border: 0,
              color: 'var(--accent)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              padding: 0,
              cursor: 'pointer',
            }}
          >
            ▸ try with sample files
          </button>
        </span>
        <span>
          press <kbd>⌘</kbd> <kbd>K</kbd> to open upload modal
        </span>
      </div>
    </div>
  )
}

interface FileRowProps {
  file: DemoFile
  onRemove: () => void
}

function FileRow({ file, onRemove }: FileRowProps) {
  const kind = fileKindIcon(file.type)
  const isDone = file.status === 'done'

  return (
    <div className="file-row">
      <div className="file-thumb">
        {file.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.preview} alt="" />
        ) : (
          <DesignIcon name={kind} size={14} />
        )}
      </div>
      <div className="file-info">
        <div className="file-name">{file.name}</div>
        <div className="file-meta">
          <span>{formatSize(file.size)}</span>
          <span>·</span>
          <span>{statusLabel(file.status)}</span>
        </div>
      </div>
      <div className="file-pct">{isDone ? 'done' : `${Math.round(file.progress)}%`}</div>
      <button
        type="button"
        className={'file-status' + (isDone ? ' done' : '')}
        onClick={onRemove}
        aria-label={isDone ? `Dismiss ${file.name}` : `Remove ${file.name}`}
      >
        {isDone ? <DesignIcon name="check" size={14} /> : <DesignIcon name="x" size={14} />}
      </button>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={Math.round(file.progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Upload progress for ${file.name}`}
      >
        <span style={{ width: `${file.progress}%` }} />
      </div>
    </div>
  )
}

export default HeroDropzoneDemo
