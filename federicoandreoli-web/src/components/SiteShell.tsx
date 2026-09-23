import type { ReactNode } from 'react'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

export type SiteShellProps = {
  children: ReactNode
  /** Classi aggiuntive sul wrapper `shell` (es. `isl`). */
  className?: string
  /** Nasconde il footer (es. landing con CTA in pagina). */
  hideFooter?: boolean
}

/**
 * Layout pagine pubbliche del sito: header completo, contenuto, footer.
 * Per accedi / registrazione usare `AuthShell` (nessun header/footer principale).
 */
export function SiteShell({ children, className, hideFooter = false }: SiteShellProps) {
  const rootClass = ['shell', className].filter(Boolean).join(' ')
  return (
    <div className={rootClass}>
      <a href="#main-content" className="skip-link">
        Salta al contenuto
      </a>
      <SiteHeader />
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      {hideFooter ? null : <SiteFooter />}
    </div>
  )
}
