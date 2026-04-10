'use client'

import Link from 'next/link'
import { motion, useMotionValue, useMotionTemplate } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { type ReactNode, type MouseEvent } from 'react'

type Variant = 'primary' | 'ghost' | 'accent'

interface Props {
  href: string
  children: ReactNode
  variant?: Variant
  external?: boolean
  showArrow?: boolean
  className?: string
  fullWidth?: boolean
}

export function AnimatedButton({
  href,
  children,
  variant = 'primary',
  external = false,
  showArrow = true,
  className = '',
  fullWidth = false,
}: Props) {
  // Track cursor for radial highlight (ghost + accent)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  const highlightBg = useMotionTemplate`radial-gradient(180px circle at ${mouseX}px ${mouseY}px, rgba(129,140,248,0.22), transparent 70%)`

  const externalProps = external
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {}

  const base =
    'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-sm)] px-6 py-2.5 text-sm font-semibold transition-all duration-300 ease-out will-change-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]'

  const widthCls = fullWidth ? 'w-full' : ''

  // ─────────────────────────────────────────────────
  // PRIMARY — white with shimmer + growing glow
  // ─────────────────────────────────────────────────
  if (variant === 'primary') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className={fullWidth ? 'w-full' : 'inline-block'}
      >
        <Link
          href={href}
          {...externalProps}
          className={`${base} ${widthCls} bg-white text-[#09090b] shadow-[0_0_20px_-5px_rgba(255,255,255,0.35),inset_0_1px_0_0_rgba(255,255,255,1)] hover:shadow-[0_0_50px_-10px_rgba(255,255,255,0.7),inset_0_1px_0_0_rgba(255,255,255,1)] ${className}`}
        >
          {/* Diagonal dark shimmer sweep */}
          <span
            className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-zinc-900/15 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-[120%]"
            aria-hidden="true"
          />
          {/* Subtle zinc tint gradient */}
          <span
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white to-zinc-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden="true"
          />
          <span className="relative z-10 flex items-center gap-2">
            {children}
            {showArrow && (
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
                aria-hidden="true"
              />
            )}
          </span>
        </Link>
      </motion.div>
    )
  }

  // ─────────────────────────────────────────────────
  // ACCENT — indigo filled with shine
  // ─────────────────────────────────────────────────
  if (variant === 'accent') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className={fullWidth ? 'w-full' : 'inline-block'}
      >
        <Link
          href={href}
          {...externalProps}
          className={`${base} ${widthCls} bg-indigo-600 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.6),inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:bg-indigo-500 hover:shadow-[0_0_50px_-8px_rgba(99,102,241,0.9),inset_0_1px_0_0_rgba(255,255,255,0.25)] ${className}`}
        >
          <span
            className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-[120%]"
            aria-hidden="true"
          />
          <span className="relative z-10 flex items-center gap-2">
            {children}
            {showArrow && (
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
                aria-hidden="true"
              />
            )}
          </span>
        </Link>
      </motion.div>
    )
  }

  // ─────────────────────────────────────────────────
  // GHOST — dark with cursor-tracking radial + border fade
  // ─────────────────────────────────────────────────
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={fullWidth ? 'w-full' : 'inline-block'}
    >
      <Link
        href={href}
        {...externalProps}
        onMouseMove={handleMouseMove}
        className={`${base} ${widthCls} border border-white/[0.12] font-medium text-zinc-400 hover:border-white/[0.22] hover:text-white ${className}`}
      >
        {/* Cursor-following radial highlight */}
        <motion.span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: highlightBg }}
          aria-hidden="true"
        />
        <span className="relative z-10 flex items-center gap-2">
          {children}
          {showArrow && (
            <ArrowRight
              className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100"
              aria-hidden="true"
            />
          )}
        </span>
      </Link>
    </motion.div>
  )
}

export default AnimatedButton
