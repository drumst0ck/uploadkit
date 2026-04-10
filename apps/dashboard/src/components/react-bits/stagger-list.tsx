'use client'

import { motion } from 'motion/react'
import { Children, type ReactNode } from 'react'

interface StaggerListProps {
  children: ReactNode
  className?: string
  delay?: number
  stagger?: number
  duration?: number
}

/**
 * Subtle mount stagger wrapper — wraps each child in a motion.div
 * that fades + slides in with a cascading delay. No opinions on layout.
 */
export function StaggerList({
  children,
  className = '',
  delay = 0,
  stagger = 0.05,
  duration = 0.35,
}: StaggerListProps) {
  const items = Children.toArray(children)
  return (
    <div className={className}>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration,
            delay: delay + i * stagger,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

export default StaggerList
