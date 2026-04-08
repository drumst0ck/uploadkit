'use client'
import { useEffect } from 'react'

/**
 * AnimateObserver — document-level IntersectionObserver that adds 'in-view'
 * to all [data-animate] elements as they enter the viewport.
 *
 * Renders nothing — purely a scroll animation activator.
 * Placed once in page.tsx; keeps all content sections as zero-JS Server Components.
 *
 * prefers-reduced-motion: CSS already disables transitions via media query (globals.css).
 * The observer still adds 'in-view' but the CSS transition is `none`, so the effect
 * is instant visibility — fully accessible.
 */
export function AnimateObserver() {
  useEffect(() => {
    const elements = document.querySelectorAll('[data-animate]')
    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return null
}
