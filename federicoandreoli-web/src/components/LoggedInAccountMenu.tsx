import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDashboardPathForRole } from '../auth/roleDashboard'
import { useAuth } from '../auth/useAuth'
import { IconLogout } from './icons/DashboardIcons'

function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

export type LoggedInAccountMenuProps = {
  /** Variante stile: sito pubblico o header dashboard */
  variant?: 'site' | 'dashboard'
  className?: string
}

/**
 * Chip avatar + nome + menu (Area riservata / Esci).
 * Stesso blocco su header pubblico e dashboard, così la sessione resta evidente ovunque.
 */
export function LoggedInAccountMenu({ variant = 'site', className }: LoggedInAccountMenuProps) {
  const { user, isAuthenticated, isLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  if (isLoading || !isAuthenticated || !user) return null

  const dashboardPath = getDashboardPathForRole(user.role)
  const rootClass = [
    'account-menu',
    `account-menu--${variant}`,
    open ? 'is-open' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
      setOpen(false)
      navigate('/')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className={rootClass} ref={wrapRef}>
      <button
        type="button"
        className="account-menu__trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="account-menu__avatar" aria-hidden>
          {initialsFromName(user.name)}
        </span>
        <span className="account-menu__meta">
          <span className="account-menu__name">{user.name}</span>
          <span className="account-menu__hint">Account attivo</span>
        </span>
      </button>
      {open ? (
        <div id={menuId} className="account-menu__dropdown" role="menu">
          <Link
            role="menuitem"
            className="account-menu__item"
            to={dashboardPath}
            onClick={() => setOpen(false)}
          >
            Area riservata
          </Link>
          <button
            type="button"
            role="menuitem"
            className="account-menu__item account-menu__item--danger"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
          >
            <IconLogout size={16} aria-hidden />
            {signingOut ? 'Uscita…' : 'Esci'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
