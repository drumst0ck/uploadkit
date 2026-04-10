'use client'

import { useInView, useMotionValue, useSpring } from 'motion/react'
import { useCallback, useEffect, useRef } from 'react'

interface CountUpProps {
  to: number
  from?: number
  direction?: 'up' | 'down'
  delay?: number
  duration?: number
  className?: string
  startWhen?: boolean
  separator?: string
  prefix?: string
  suffix?: string
  decimals?: number
}

export function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 1.5,
  className = '',
  startWhen = true,
  separator = ',',
  prefix = '',
  suffix = '',
  decimals,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === 'down' ? to : from)

  const damping = 20 + 40 * (1 / duration)
  const stiffness = 100 * (1 / duration)

  const springValue = useSpring(motionValue, { damping, stiffness })
  const isInView = useInView(ref, { once: true, margin: '0px' })

  const inferDecimals = (n: number): number => {
    const s = n.toString()
    if (s.includes('.')) {
      const d = s.split('.')[1] ?? ''
      if (parseInt(d) !== 0) return d.length
    }
    return 0
  }

  const maxDecimals =
    decimals ?? Math.max(inferDecimals(from), inferDecimals(to))

  const formatValue = useCallback(
    (latest: number) => {
      const options: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: maxDecimals,
        maximumFractionDigits: maxDecimals,
      }
      const formatted = Intl.NumberFormat('en-US', options).format(latest)
      return `${prefix}${separator ? formatted.replace(/,/g, separator) : formatted}${suffix}`
    },
    [maxDecimals, separator, prefix, suffix]
  )

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatValue(direction === 'down' ? to : from)
    }
  }, [from, to, direction, formatValue])

  useEffect(() => {
    if (isInView && startWhen) {
      const timeoutId = window.setTimeout(() => {
        motionValue.set(direction === 'down' ? from : to)
      }, delay * 1000)
      return () => window.clearTimeout(timeoutId)
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay])

  useEffect(() => {
    const unsub = springValue.on('change', (latest: number) => {
      if (ref.current) ref.current.textContent = formatValue(latest)
    })
    return () => unsub()
  }, [springValue, formatValue])

  return <span className={className} ref={ref} />
}

export default CountUp
