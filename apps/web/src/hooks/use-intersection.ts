'use client'
import { useEffect, useRef } from 'react'

export function useIntersection(className = 'in-view', options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry?.isIntersecting) {
        ref.current?.classList.add(className)
        observer.disconnect()
      }
    }, { threshold: 0.15, ...options })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [className])
  return ref
}
