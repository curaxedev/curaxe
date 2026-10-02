import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getDashboardPathForRole } from '../auth/roleDashboard'
import { useAuth } from '../auth/useAuth'
import { BrandLogo } from './BrandLogo'
import { IconClose, IconInfo, IconLogout, IconMenu } from './icons/DashboardIcons'
import { assistenzaHeroCercoLink, assistenzaHeroOffroLink } from '../lib/assistenzaHeroMode'
import { comeFunzionaPath, profilesDirectoryPath } from '../lib/siteRoutes'
import { registerWorkerProfileHref } from '../pages/auth/registerQuery'

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

export function SiteHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, signOut } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const accountMenuId = useId()
  const accountWrapRef = useRef<HTMLDivElement>(null)

  const onIscriviti = pathname === '/iscriviti'
  const onLogin = pathname === '/accedi'
  const onRegister = pathname.startsWith('/registrazione')
  const registerStartHref = onIscriviti ? registerWorkerProfileHref : '/registrazione/intent'
  const onComeFunziona = pathname === comeFunzionaPath
  const dashboardPath = user ? getDashboardPathForRole(user.role) : '/dashboard'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chiudi menu alla navigazione
    setMobileOpen(false)
    setAccountOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen && !accountOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
        setAccountOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen, accountOpen])

  useEffect(() => {
    if (!accountOpen) return
    function onPointerDown(e: MouseEvent) {
      if (!accountWrapRef.current?.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [accountOpen])

  function scrollToTopOfPage() {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }

  function closeDrawer() {
    setMobileOpen(false)
  }

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
      setAccountOpen(false)
      closeDrawer()
      navigate('/')
    } finally {
      setSigningOut(false)
    }
  }

  const showGuestAuth = !isLoading && !isAuthenticated
  const showAccount = !isLoading && isAuthenticated && user

  return (
    <header className={`topbar${scrolled ? ' topbar--scrolled' : ''}${mobileOpen ? ' topbar--drawer-open' : ''}`}>
      <div className="topbar__inner">
        <BrandLogo size="md" />

        {!onRegister && (
          <nav className="topbar__nav" aria-label="Principale">
            <div className="topbar__path-cluster" role="group" aria-label="Percorsi principali">
              <Link className="topbar__path-link" to={assistenzaHeroCercoLink} onClick={scrollToTopOfPage}>
                Cerca assistenza
              </Link>
              <span className="topbar__path-sep" aria-hidden>
                |
              </span>
              <Link className="topbar__path-link" to={assistenzaHeroOffroLink} onClick={scrollToTopOfPage}>
                Offri assistenza
              </Link>
            </div>
            <Link
              className={`topbar__how-link${onComeFunziona ? ' is-active' : ''}`}
              to={comeFunzionaPath}
              aria-label="Come funziona"
              aria-current={onComeFunziona ? 'page' : undefined}
            >
              <IconInfo size={18} aria-hidden />
            </Link>
          </nav>
        )}

        <div className="topbar__actions">
          {!onRegister && showGuestAuth ? (
            <div className="topbar__auth" role="group" aria-label="Accesso account">
              <Link
                to="/accedi"
                className={`topbar__login${onLogin ? ' is-active' : ''}`}
                aria-current={onLogin ? 'page' : undefined}
              >
                Accedi
              </Link>
              <Link to={registerStartHref} className="topbar__register">
                Registrati
              </Link>
            </div>
          ) : null}

          {!onRegister && showAccount ? (
            <div className="topbar__account" ref={accountWrapRef}>
              <button
                type="button"
                className={`topbar__account-trigger${accountOpen ? ' is-open' : ''}`}
                aria-expanded={accountOpen}
                aria-controls={accountMenuId}
                aria-haspopup="menu"
                onClick={() => setAccountOpen((v) => !v)}
              >
                <span className="topbar__account-avatar" aria-hidden>
                  {initialsFromName(user.name)}
                </span>
                <span className="topbar__account-name">{user.name}</span>
              </button>
              {accountOpen ? (
                <div id={accountMenuId} className="topbar__account-menu" role="menu">
                  <Link
                    role="menuitem"
                    className="topbar__account-item"
                    to={dashboardPath}
                    onClick={() => setAccountOpen(false)}
                  >
                    Area riservata
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="topbar__account-item topbar__account-item--danger"
                    disabled={signingOut}
                    onClick={() => void handleSignOut()}
                  >
                    <IconLogout size={16} aria-hidden />
                    {signingOut ? 'Uscita…' : 'Esci'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {!onRegister && (
          <button
            type="button"
            className={`topbar__hamburger${mobileOpen ? ' topbar__hamburger--open' : ''}`}
            aria-label={mobileOpen ? 'Chiudi menu' : 'Apri menu'}
            aria-expanded={mobileOpen}
            aria-controls="topbar-drawer"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <IconClose size={24} aria-hidden /> : <IconMenu size={22} aria-hidden />}
          </button>
        )}
      </div>

      {!onRegister && mobileOpen && (
        <>
          <button type="button" className="topbar__drawer-backdrop" aria-label="Chiudi menu" onClick={closeDrawer} />
          <div
            id="topbar-drawer"
            className="topbar__drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="topbar-drawer-title"
          >
            <div className="topbar__drawer-head">
              <p id="topbar-drawer-title" className="topbar__drawer-head-title">
                Menu
              </p>
              <p className="topbar__drawer-head-sub">
                {showAccount
                  ? `Ciao ${user.name.split(' ')[0]}, gestisci il tuo account.`
                  : 'Scegli una sezione o accedi al tuo account.'}
              </p>
            </div>

            <nav className="topbar__drawer-body" aria-label="Menu mobile">
              <p className="topbar__drawer-kicker">Percorsi assistenza</p>
              <Link
                className="topbar__drawer-link"
                to={assistenzaHeroCercoLink}
                onClick={() => {
                  closeDrawer()
                  scrollToTopOfPage()
                }}
              >
                Cerca assistenza
              </Link>
              <Link
                className="topbar__drawer-link"
                to={assistenzaHeroOffroLink}
                onClick={() => {
                  closeDrawer()
                  scrollToTopOfPage()
                }}
              >
                Offri assistenza
              </Link>

              <p className="topbar__drawer-kicker">Informazioni</p>
              <Link
                className={`topbar__drawer-link${onComeFunziona ? ' is-active' : ''}`}
                to={comeFunzionaPath}
                onClick={closeDrawer}
                aria-current={onComeFunziona ? 'page' : undefined}
              >
                Come funziona
              </Link>
              <Link className="topbar__drawer-link" to={profilesDirectoryPath} onClick={closeDrawer}>
                Directory profili
              </Link>

              <p className="topbar__drawer-kicker">Il tuo account</p>
              {showGuestAuth ? (
                <div className="topbar__drawer-actions" role="group" aria-label="Accesso account">
                  <Link
                    to="/accedi"
                    className={`topbar__drawer-btn topbar__drawer-btn--ghost${onLogin ? ' is-active' : ''}`}
                    onClick={closeDrawer}
                    aria-current={onLogin ? 'page' : undefined}
                  >
                    Accedi
                  </Link>
                  <Link
                    to={registerStartHref}
                    className="topbar__drawer-btn topbar__drawer-btn--primary"
                    onClick={closeDrawer}
                  >
                    Registrati
                  </Link>
                </div>
              ) : null}

              {showAccount ? (
                <div className="topbar__drawer-actions topbar__drawer-actions--account" role="group">
                  <div className="topbar__drawer-user">
                    <span className="topbar__account-avatar" aria-hidden>
                      {initialsFromName(user.name)}
                    </span>
                    <span className="topbar__drawer-user-name">{user.name}</span>
                  </div>
                  <Link
                    to={dashboardPath}
                    className="topbar__drawer-btn topbar__drawer-btn--primary"
                    onClick={closeDrawer}
                  >
                    Area riservata
                  </Link>
                  <button
                    type="button"
                    className="topbar__drawer-btn topbar__drawer-btn--ghost"
                    disabled={signingOut}
                    onClick={() => void handleSignOut()}
                  >
                    {signingOut ? 'Uscita…' : 'Esci'}
                  </button>
                </div>
              ) : null}
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
