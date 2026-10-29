'use client'

import { useEffect } from 'react'

/**
 * Entrances for every `.rise` element under `.hm`, once, as it scrolls into view.
 * The hidden start state exists only in CSS under `@media (scripting: enabled)`, so
 * no-JS and reduced-motion visitors always see the content.
 */
export function Reveal() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('.hm .rise'))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }
    })
    items.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 3) * 70}ms`
      io.observe(el)
    })
    return () => io.disconnect()
  }, [])
  return null
}
