'use client'

// Real @uploadkitdev/react components, themed only through --uk-* variables (see home.css).
// Uploads never reach a backend: the provider receives a client whose upload() is simulated
// in the browser. This is the same approach the existing landing showcase uses.

import '@uploadkitdev/react/styles.css'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  FileList,
  ProxyUploadKitClient,
  UploadAvatar,
  UploadButton,
  UploadDropzone,
  UploadKitProvider,
  UploadProgressBar,
} from '@uploadkitdev/react'
import type { UploadResult } from '@uploadkitdev/react'

class DemoClient extends ProxyUploadKitClient {
  constructor() {
    super({ endpoint: '/unused' }) // never called: upload() below does not use the network
  }
  override async upload(options: {
    file: File
    route: string
    metadata?: Record<string, unknown>
    onProgress?: (percentage: number) => void
    signal?: AbortSignal
  }): Promise<UploadResult> {
    const { file, onProgress, signal } = options
    const fast = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const steps = fast ? 2 : 10
    for (let i = 1; i <= steps; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      await new Promise<void>((r) => setTimeout(r, fast ? 40 : 110))
      onProgress?.(Math.round((i / steps) * 100))
    }
    const id = `demo-${Math.random().toString(36).slice(2, 10)}`
    return {
      id,
      key: id,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : `#${id}`,
      status: 'uploaded',
      createdAt: new Date().toISOString(),
    }
  }
}

const SEED: UploadResult[] = [
  { id: 's1', key: 'seed-invoice', name: 'invoice-march.pdf', size: 1258291, type: 'application/pdf', url: '#seed-invoice', status: 'uploaded', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 's2', key: 'seed-brief', name: 'brief-v3.docx', size: 86016, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', url: '#seed-brief', status: 'uploaded', createdAt: '2025-01-01T00:00:00.000Z' },
]

function Lab({ name, text, children }: { name: string; text: string; children: ReactNode }) {
  return (
    <div>
      <div className="sdk-lab">
        <h3>{name}</h3>
        <p>{text}</p>
      </div>
      {children}
    </div>
  )
}

export function LiveComponents() {
  const client = useMemo(() => new DemoClient(), [])
  const [files, setFiles] = useState(SEED)
  const add = useCallback((r: UploadResult[]) => setFiles((f) => [...r, ...f].slice(0, 5)), [])
  const remove = useCallback((key: string) => setFiles((f) => f.filter((x) => x.key !== key)), [])

  return (
    <UploadKitProvider client={client}>
      <div className="sdk-top">
        <Lab name="UploadDropzone" text="Drag and drop with a file picker fallback.">
          <UploadDropzone route="demo" accept={['image/*', 'application/pdf']} maxSize={4 * 1024 * 1024} config={{ mode: 'auto' }} onUploadComplete={add} />
        </Lab>
        <Lab name="FileList" text="Fills as you upload. Delete works too.">
          <FileList files={files} onDelete={remove} />
        </Lab>
      </div>
      <div className="sdk-row">
        <Lab name="UploadButton" text="One button that opens the system file picker.">
          <UploadButton route="demo" accept={['image/*']} />
        </Lab>
        <Lab name="UploadProgressBar" text="Per-file progress, announced to screen readers.">
          <UploadProgressBar route="demo" accept={['image/*']} />
        </Lab>
        <Lab name="UploadAvatar" text="Circular crop with a progress ring.">
          <UploadAvatar route="demo" />
        </Lab>
      </div>
    </UploadKitProvider>
  )
}
