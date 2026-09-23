import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const PROFILI_GEO_ANCHOR_ID = 'prof-dir-geo-search'

function readHeaderInsetPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim()
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? Math.round(n) + 10 : 82
}

/**
 * `true` quando il campo geografico principale della directory profili non è più visibile sotto l’header.
 * Stessa logica della barra sticky home (`#search`).
 */
export function useProfiliStickySearchVisible(): boolean {
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (pathname !== '/profili') {
      const id = requestAnimationFrame(() => setVisible(false))
      return () => cancelAnimationFrame(id)
    }

    const el = document.getElementById(PROFILI_GEO_ANCHOR_ID)
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
      },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [pathname])

  return visible
}
