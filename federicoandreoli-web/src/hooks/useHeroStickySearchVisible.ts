import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const HERO_SEARCH_ANCHOR_ID = 'search'

function readHeaderInsetPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim()
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? Math.round(n) + 10 : 82
}

/**
 * `true` quando il blocco hero `#search` non è più visibile sotto l’header (scroll verso il basso).
 * Solo sulla home (`/`).
 */
export function useHeroStickySearchVisible(): boolean {
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (pathname !== '/') {
      const id = requestAnimationFrame(() => setVisible(false))
      return () => cancelAnimationFrame(id)
    }

    const el = document.getElementById(HERO_SEARCH_ANCHOR_ID)
    if (!el) {
      const id = requestAnimationFrame(() => setVisible(false))
      return () => cancelAnimationFrame(id)
    }

    const topInset = readHeaderInsetPx()
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        setVisible(!entry.isIntersecting)
      },
      {
        root: null,
        rootMargin: `-${topInset}px 0px 0px 0px`,
        threshold: 0,
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [pathname])

  return visible
}
