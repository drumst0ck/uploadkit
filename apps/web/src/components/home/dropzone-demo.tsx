'use client'

// The page's live thing: a local simulation of the upload flow (queued, uploading, done,
// CDN URL). It reads the file name and size and sends nothing anywhere.

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'

type Phase = 'idle' | 'queued' | 'uploading' | 'done'
const STEPS: { id: Exclude<Phase, 'idle'>; label: string }[] = [
  { id: 'queued', label: 'Queued' },
  { id: 'uploading', label: 'Uploading' },
  { id: 'done', label: 'Done' },
]
const MAX_BYTES = 4 * 1024 * 1024

const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '') || 'file'
const fmt = (b: number) => (b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`)

export function DropzoneDemo() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [pct, setPct] = useState(0)
  const [file, setFile] = useState({ name: '', size: 0 })
  const [over, setOver] = useState(false)
  const [note, setNote] = useState('')
  const [live, setLive] = useState('')
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pick = useRef<HTMLLabelElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const url = `cdn.uploadkit.dev/p_7f3a2c/${slug(file.name)}`

  useEffect(() => () => clearTimeout(timer.current), [])

  const start = (name: string, size: number) => {
    clearTimeout(timer.current)
    if (size > MAX_BYTES) {
      setNote(`${name} is ${fmt(size)}. The demo accepts files up to 4 MB.`)
      return
    }
    const fast = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setNote('')
    setFile({ name, size })
    setPhase('queued')
    setPct(0)
    setLive(`${name} queued.`)
    let p = 0
    const finish = () => {
      setPhase('done')
      setPct(100)
      setLive(`Upload done. URL: cdn.uploadkit.dev/p_7f3a2c/${slug(name)}`)
    }
    const tick = () => {
      p = Math.min(100, p + 5 + Math.random() * 10)
      setPct(p)
      timer.current = setTimeout(p >= 100 ? finish : tick, p >= 100 ? 160 : 130)
    }
    timer.current = setTimeout(() => {
      setPhase('uploading')
      setLive(`Uploading ${name}.`)
      if (fast) finish()
      else tick()
    }, fast ? 0 : 700)
  }

  const reset = () => {
    clearTimeout(timer.current)
    setPhase('idle')
    setCopied(false)
    if (input.current) input.current.value = ''
    setLive('Ready for a file.')
    pick.current?.focus()
  }
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) start(f.name, f.size)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const f = e.dataTransfer.files[0]
    if (f) start(f.name, f.size)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setNote('Copy is blocked here. Select the URL instead.')
    }
  }
  const index = STEPS.findIndex((s) => s.id === phase)

  return (
    <div
      data-ui
      className={`dz${over ? ' is-over' : ''}`}
      data-state={phase}
      role="group"
      aria-label="Upload demo, local only"
      onDragEnter={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      {phase === 'idle' ? (
        <div>
          <p className="dz-title">Drop a file here</p>
          <p className="dz-note">Images and PDFs up to 4 MB. Demo only: nothing leaves your browser.</p>
          {note && <p className="dz-note" role="status">{note}</p>}
          <div className="dz-actions">
            <label ref={pick} className="pd-button pd-button--secondary dz-pick" htmlFor="demo-file">
              Choose a file
            </label>
            <input ref={input} className="sr" type="file" id="demo-file" accept="image/*,application/pdf" onChange={onChange} />
            <button type="button" className="pd-button pd-button--ghost" onClick={() => start('team-photo.jpg', 1887437)}>
              Use a sample
            </button>
          </div>
        </div>
      ) : (
        <div data-view="run">
          <p className="dz-file"><span>{file.name}</span><span className="dz-size">{fmt(file.size)}</span></p>
          <ol className="dz-steps" aria-label="Upload state">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                className={i < index ? 'is-past' : undefined}
                aria-current={i === index ? 'step' : undefined}
                data-step={s.id}
              >
                {s.label}
                {s.id === 'uploading' && phase === 'uploading' ? ` ${Math.round(pct)}%` : ''}
              </li>
            ))}
          </ol>
          <progress max={100} value={phase === 'queued' ? 0 : pct} aria-label="Upload progress" />
          {phase === 'done' && (
            <div>
              <code className="dz-url">{url}</code>
              <div className="dz-done">
                <button type="button" className="pd-button pd-button--secondary" onClick={copy}>
                  {copied ? 'Copied' : 'Copy URL'}
                </button>
                <button type="button" className="pd-button pd-button--ghost" onClick={reset}>
                  Upload another
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <p className="sr" aria-live="polite">{live}</p>
    </div>
  )
}
