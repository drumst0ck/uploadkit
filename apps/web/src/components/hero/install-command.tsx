'use client'

import { useState, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

const PACKAGES = '@uploadkitdev/next @uploadkitdev/react'

const MANAGERS = [
  { id: 'pnpm', label: 'pnpm', cmd: `pnpm add ${PACKAGES}` },
  { id: 'npm', label: 'npm', cmd: `npm install ${PACKAGES}` },
  { id: 'yarn', label: 'yarn', cmd: `yarn add ${PACKAGES}` },
  { id: 'bun', label: 'bun', cmd: `bun add ${PACKAGES}` },
] as const

type ManagerId = (typeof MANAGERS)[number]['id']

export function InstallCommand() {
  const [active, setActive] = useState<ManagerId>('pnpm')
  const [copied, setCopied] = useState(false)

  const current = MANAGERS.find((m) => m.id === active) ?? MANAGERS[0]

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(current.cmd)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable — fail silently */
    }
  }, [current.cmd])

  return (
    <div className="group relative mb-14 inline-flex flex-col items-stretch">
      {/* Package manager tabs */}
      <div
        className="flex items-center gap-1 self-center rounded-t-xl border border-b-0 px-1 pt-1"
        style={{
          background: 'rgba(255,255,255,0.02)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {MANAGERS.map((m) => {
          const isActive = m.id === active
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(m.id)}
              className="relative rounded-md px-3 py-1 font-mono text-xs font-medium transition-colors"
              style={{
                color: isActive ? '#fafafa' : '#71717A',
              }}
            >
              {isActive && (
                <motion.span
                  layoutId="pkg-manager-pill"
                  className="absolute inset-0 rounded-md"
                  style={{
                    background: 'rgba(129,140,248,0.15)',
                    border: '1px solid rgba(129,140,248,0.35)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10">{m.label}</span>
            </button>
          )
        })}
      </div>

      {/* Pill */}
      <div
        className="relative flex items-center gap-3 overflow-hidden rounded-2xl px-5 py-3 transition-colors duration-300 group-hover:border-white/20"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Animated glow sweep on copy */}
        <AnimatePresence>
          {copied && (
            <motion.span
              key="glow"
              initial={{ opacity: 0, x: '-100%' }}
              animate={{ opacity: 1, x: '100%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(129,140,248,0.25) 50%, transparent 100%)',
              }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        <span
          className="flex-shrink-0 select-none font-mono text-sm"
          style={{ color: '#52525B' }}
          aria-hidden="true"
        >
          $
        </span>

        <AnimatePresence mode="wait">
          <motion.code
            key={current.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative z-10 whitespace-nowrap font-mono text-sm"
            style={{ color: '#d4d4d8' }}
          >
            {current.cmd}
          </motion.code>
        </AnimatePresence>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy install command'}
          className="relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors duration-200 hover:bg-white/[0.08]"
          style={{
            color: copied ? '#4ade80' : '#71717A',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0.5, opacity: 0, rotate: 90 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.5, opacity: 0, rotate: -90 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Copied! tooltip */}
        <AnimatePresence>
          {copied && (
            <motion.span
              key="tooltip"
              initial={{ opacity: 0, y: 4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.9 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-none absolute -top-8 right-2 rounded-md px-2 py-1 font-mono text-[11px] font-medium"
              style={{
                background: 'rgba(74, 222, 128, 0.12)',
                border: '1px solid rgba(74, 222, 128, 0.4)',
                color: '#4ade80',
              }}
              aria-live="polite"
            >
              Copied!
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default InstallCommand
