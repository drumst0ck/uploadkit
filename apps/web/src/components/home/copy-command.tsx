'use client'

import { useEffect, useRef, useState } from 'react'

/** A command in a code element with a Copy button. Without JS the command stays selectable. */
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
    } catch {
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="install">
      <code>{command}</code>
      <button type="button" className="pd-button pd-button--ghost" onClick={copy} aria-label={`Copy command: ${command}`}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span className="sr" aria-live="polite">{copied ? 'Copied to clipboard.' : ''}</span>
    </div>
  )
}
