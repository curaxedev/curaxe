import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getDashboardPathForRole } from '../auth/roleDashboard'
import { useAuth } from '../auth/useAuth'
import { useHeroSearchParams } from '../hooks/useHeroSearchParams'
import { openHomelySearch } from '../lib/homelySearchEvents'
import { assistenzaHeroCercoLink, assistenzaHeroOffroLink } from '../lib/assistenzaHeroMode'
import { comeFunzionaPath, profilesDirectoryPath } from '../lib/siteRoutes'
import { registerWorkerProfileHref } from '../pages/auth/registerQuery'
import { BrandLogo } from './BrandLogo'
import { HomelySearchExplorer } from './HomelySearchExplorer'
import { IconClose, IconMenu, IconSearch } from './icons/DashboardIcons'
import { LoggedInAccountMenu } from './LoggedInAccountMenu'

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

export function SiteHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, signOut } = useAuth()
  const heroSearch = useHeroSearchParams()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const onIscriviti = pathname === '/iscriviti'
  const onLogin = pathname === '/accedi'
  const onRegister = pathname.startsWith('/registrazione')
  const registerStartHref = onIscriviti ? registerWorkerProfileHref : '/registrazione/intent'
  const onComeFunziona = pathname === comeFunzionaPath
  const dashboardPath = user ? getDashboardPathForRole(user.role) : '/dashboard'

  const showGuestAuth = !isLoading && !isAuthenticated
  const showAccount = !isLoading && isAuthenticated && !!user
  const showSearch = !onRegister

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chiudi menu alla navigazione
    setMobileOpen(false)
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
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  function scrollToTopOfPage() {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }

  function closeDrawer() {
    setMobileOpen(false)
  }

  function openMobileSearch() {
    closeDrawer()
    openHomelySearch('dove')
  }

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
      closeDrawer()
      navigate('/')
    } finally {
      setSigningOut(false)
    }
  }

  const topbarClass = [
    'topbar',
    scrolled ? 'topbar--scrolled' : '',
    mobileOpen ? 'topbar--drawer-open' : '',
    showAccount ? 'topbar--authed' : '',
    showSearch ? 'topbar--with-search' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className={topbarClass}>
      <div className="topbar__inner">
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

        <BrandLogo size="md" className="topbar__brand" />

        {showSearch ? (
          <div className="topbar__nav topbar__nav--search" aria-label="Ricerca">
            <HomelySearchExplorer
              placement="header"
              mode={heroSearch.mode}
              cityValue={heroSearch.cityInUrl}
              onModeChange={heroSearch.setMode}
              onCityChange={heroSearch.onCityChange}
              setCityInUrl={heroSearch.setCityInUrl}
            />
          </div>
        ) : null}

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

          {!onRegister && showAccount ? <LoggedInAccountMenu variant="site" /> : null}
        </div>

        {showSearch ? (
          <button
            type="button"
            className="topbar__mobile-search"
            aria-label="Apri ricerca"
            onClick={openMobileSearch}
          >
            <IconSearch size={22} aria-hidden />
          </button>
        ) : null}
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
                {showAccount && user
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
              <button
                type="button"
                className="topbar__drawer-link"
                onClick={openMobileSearch}
              >
                Cerca zona
              </button>

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

              {showAccount && user ? (
                <div className="topbar__drawer-actions topbar__drawer-actions--account" role="group">
                  <div className="topbar__drawer-user">
                    <span className="account-menu__avatar" aria-hidden>
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
