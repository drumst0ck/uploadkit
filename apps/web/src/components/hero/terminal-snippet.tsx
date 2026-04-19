'use client'

import { useCallback, useState } from 'react'
import { copyToClipboard } from '@/lib/copy'
import { DesignIcon } from '@/components/ui/design-icon'

interface TerminalSnippetProps {
  /** Leading emphasized token rendered before the rest of the command (e.g. `npx`). */
  emphasized?: string
  /** Remaining command text. */
  command: string
  /** Ariable label for the copy button. */
  ariaLabel?: string
}

/**
 * Compact terminal pill used inside the Install section's secondary cards.
 * Mirrors the .install-terminal visual but adds a working copy button.
 */
export function TerminalSnippet({
  emphasized,
  command,
  ariaLabel = 'Copy command',
}: TerminalSnippetProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const full = emphasized ? `${emphasized} ${command}` : command
    const ok = await copyToClipboard(full)
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }, [emphasized, command])

  return (
    <div className="install-terminal">
      <span className="prompt">$</span>
      <span className="cmd">
        {emphasized ? <em>{emphasized}</em> : null}
        {emphasized ? ' ' : ''}
        {command}
      </span>
      <button
        type="button"
        className={'install-copy' + (copied ? ' copied' : '')}
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : ariaLabel}
      >
        <DesignIcon name={copied ? 'check' : 'copy'} size={11} />
        {copied ? 'copied' : 'copy'}
      </button>
    </div>
  )
}
