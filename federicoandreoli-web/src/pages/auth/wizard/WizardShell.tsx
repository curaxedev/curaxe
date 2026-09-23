import { Link } from 'react-router-dom'
import { IconChevronLeft } from '../../../components/icons/DashboardIcons'
import './register-wizard.css'

type WizardShellProps = {
  backTo?: string
  backLabel?: string
  progressFraction: number
  title?: string
  children: React.ReactNode
}

export function WizardShell({
  backTo,
  backLabel = 'Indietro',
  progressFraction,
  title,
  children,
}: WizardShellProps) {
  const pct = Math.min(100, Math.max(0, Math.round(progressFraction * 100)))

  return (
    <div className="wz-shell wz-shell--glass">
      <a href="#wz-main-content" className="skip-link">
        Salta al contenuto
      </a>
      <header className="wz-header">
        {backTo ? (
          <Link className="wz-header__back" to={backTo}>
            <IconChevronLeft size={16} aria-hidden />
            {backLabel}
          </Link>
        ) : (
          <span />
        )}
        <Link className="wz-header__brand" to="/">
          Federico Andreoli
        </Link>
        <Link className="wz-header__exit" to="/" title="Esci dalla registrazione">
          Esci
        </Link>
      </header>
      <div className="wz-progress" aria-hidden>
        <div className="wz-progress__inner" style={{ width: `${pct}%` }} />
      </div>
      <p className="visually-hidden" aria-live="polite">
        Avanzamento registrazione: {pct} per cento
      </p>
      <main id="wz-main-content" className="wz-body" tabIndex={-1}>
        {title ? <h1 className="wz-title">{title}</h1> : null}
        {children}
      </main>
    </div>
  )
}
