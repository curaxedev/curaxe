import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'

export type AuthShellProps = {
  children: ReactNode
  /** Classi sul wrapper (es. `auth-page auth-page--login`). */
  className?: string
  /** Wizard registrazione: link per uscire e tornare alla home. */
  registerExit?: boolean
  /** Login: nessuna barra in alto — solo il contenuto (link home nel form). */
  hideBrandBar?: boolean
}

/**
 * Layout dedicato ad accedi / registrazione: niente header né footer del sito principale;
 * barra brand opzionale (registrazione) o assente (login full-focus).
 */
export function AuthShell({ children, className, registerExit = false, hideBrandBar = false }: AuthShellProps) {
  const rootClass = ['auth-shell', 'auth-shell--glass', hideBrandBar ? 'auth-shell--bare' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={rootClass}>
      <a href="#auth-main-content" className="skip-link">
        Salta al contenuto
      </a>
      {hideBrandBar ? null : (
        <header className="auth-shell__bar">
          <BrandLogo size="sm" className="auth-shell__brand" />
          {registerExit && (
            <Link to="/" className="auth-shell__exit" title="Torna alla home e interrompi la registrazione">
              <span className="auth-shell__exit-long">Esci dalla registrazione</span>
              <span className="auth-shell__exit-short">Esci</span>
            </Link>
          )}
        </header>
      )}
      <div id="auth-main-content" className="auth-shell__body" tabIndex={-1}>
        {children}
      </div>
    </div>
  )
}
