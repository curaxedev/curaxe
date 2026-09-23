import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { IconClose, IconInfo, IconMenu } from './icons/DashboardIcons'
import { assistenzaHeroCercoLink, assistenzaHeroOffroLink } from '../lib/assistenzaHeroMode'
import { BRAND_NAME } from '../lib/brand'
import { comeFunzionaPath, profilesDirectoryPath } from '../lib/siteRoutes'
import { registerWorkerProfileHref } from '../pages/auth/registerQuery'

export function SiteHeader() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const onIscriviti = pathname === '/iscriviti'
  const onLogin = pathname === '/accedi'
  const onRegister = pathname.startsWith('/registrazione')
  const registerStartHref = onIscriviti ? registerWorkerProfileHref : '/registrazione/intent'
  const onComeFunziona = pathname === comeFunzionaPath

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

  /**
   * I link «Cerca/Offri assistenza» devono sempre atterrare in cima alla home.
   * Se siamo già su `/` il pathname non cambia e `<ScrollToTop />` non si attiverebbe:
   * forziamo lo scroll qui per coprire anche quel caso.
   */
  function scrollToTopOfPage() {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }

  function closeDrawer() {
    setMobileOpen(false)
  }

  return (
    <header className={`topbar${scrolled ? ' topbar--scrolled' : ''}${mobileOpen ? ' topbar--drawer-open' : ''}`}>
      <div className="topbar__inner">
        <Link className="brand" to="/">
          {BRAND_NAME}
        </Link>

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
          {!onRegister && (
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
          )}
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
              <p className="topbar__drawer-head-sub">Scegli una sezione o accedi al tuo account.</p>
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
              <div className="topbar__drawer-actions" role="group" aria-label="Accesso account">
                <Link
                  to="/accedi"
                  className={`topbar__drawer-btn topbar__drawer-btn--ghost${onLogin ? ' is-active' : ''}`}
                  onClick={closeDrawer}
                  aria-current={onLogin ? 'page' : undefined}
                >
                  Accedi
                </Link>
                <Link to={registerStartHref} className="topbar__drawer-btn topbar__drawer-btn--primary" onClick={closeDrawer}>
                  Registrati
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
