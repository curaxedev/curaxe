import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Riporta lo scroll a (0, 0) ad ogni cambio di route (pathname).
 *
 * Eccezioni:
 * - se l'URL contiene un hash anchor (es. `#search`, `#faq`), lascia che il browser
 *   gestisca il salto all'ancora.
 * - se la navigazione è di tipo `POP` (back/forward) e non c'è hash, ripristiniamo
 *   comunque (0, 0): il browser tipicamente terrebbe la posizione precedente, ma per
 *   le nostre pagine demo è più utile ricominciare dall'alto.
 *
 * Le sole modifiche di `search` (query string, es. filtri /profili?istat=...) NON
 * triggerano lo scroll, perché dipendiamo solo da `pathname` e `hash`.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (hash && hash.length > 1) {
      const id = hash.slice(1)
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ block: 'start' })
        return
      }
    }

    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, hash, navigationType])

  return null
}
