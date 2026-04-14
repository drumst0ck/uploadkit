'use client'

import { useCallback, useState } from 'react'
import { Check, Copy, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

const INSTALL_CMD = 'npx -y @uploadkitdev/mcp'

const EDITORS = [
  'Claude Code',
  'Cursor',
  'Windsurf',
  'Zed',
  'Continue',
] as const

const CAPABILITIES = [
  'Knows all 40+ components by name',
  'Scaffolds the Next.js route handler',
  'Wires the UploadKitProvider',
  'Generates BYOS config (S3 · R2 · GCS · B2)',
] as const

export function McpSection() {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable — fail silently */
    }
  }, [])

  return (
    <section
      id="mcp"
      className="py-24 md:py-32"
      aria-labelledby="mcp-headline"
    >
      <div className="mx-auto max-w-[1200px] px-6">
        <div
          className="relative overflow-hidden rounded-[var(--radius-lg)] border border-white/[0.06] px-6 py-16 md:px-16 md:py-20"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 65%), #0A0A0B',
          }}
        >
          {/* Kicker */}
          <div className="mb-6 flex justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{
                background: 'rgba(99,102,241,0.08)',
                color: '#a5b4fc',
              }}
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              AI-Native
            </span>
          </div>

          {/* Headline */}
          <h2
            id="mcp-headline"
            className="mx-auto max-w-[720px] text-center font-display text-4xl font-black leading-[1.05] md:text-5xl"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            Your AI already knows UploadKit.
          </h2>

          {/* Sub */}
          <p
            className="mx-auto mt-5 max-w-[620px] text-center text-lg leading-[1.7]"
            style={{ color: '#71717A' }}
          >
            Install the official MCP server and Claude Code, Cursor, Windsurf, or
            Zed gain first-class knowledge of every component and scaffold. No API
            key. No config. Runs locally.
          </p>

          {/* Install command pill */}
          <div className="mt-10 flex justify-center">
            <div
              className="group flex items-center gap-3 rounded-full border border-white/[0.08] px-5 py-3 font-mono text-sm"
              style={{
                background: 'rgba(255,255,255,0.02)',
                color: '#e4e4e7',
              }}
            >
              <span className="text-white/30 select-none">$</span>
              <code>{INSTALL_CMD}</code>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy install command"
                className="ml-1 flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/[0.08]"
                style={{ color: '#a1a1aa' }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Check className="h-4 w-4" style={{ color: '#6ee7b7' }} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Copy className="h-4 w-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>

          {/* Capability bullets */}
          <ul className="mx-auto mt-12 grid max-w-[720px] gap-3 sm:grid-cols-2">
            {CAPABILITIES.map((cap) => (
              <li
                key={cap}
                className="flex items-center gap-2 text-sm"
                style={{ color: '#a1a1aa' }}
              >
                <Check
                  className="h-4 w-4 shrink-0"
                  style={{ color: '#818cf8' }}
                  aria-hidden="true"
                />
                <span>{cap}</span>
              </li>
            ))}
          </ul>

          {/* Editor pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {EDITORS.map((editor) => (
              <span
                key={editor}
                className="rounded-full border border-white/[0.08] px-3 py-1 text-xs"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  color: '#a1a1aa',
                }}
              >
                {editor}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 flex justify-center">
            <a
              href="https://docs.uploadkit.dev/docs/guides/mcp"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white"
              style={{ color: '#a5b4fc' }}
            >
              Read the MCP guide
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
