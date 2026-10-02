import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardPathForRole } from '../../auth/roleDashboard'
import { useAuth } from '../../auth/useAuth'
import {
  IconBell,
  IconClose,
  IconLogout,
  IconMoreDots,
  IconStar,
  IconSupport,
} from '../../components/icons/DashboardIcons'
import { BrandLogo } from '../../components/BrandLogo'
import { contattiPath } from '../../lib/siteRoutes'

export type AccountType = 'professional' | 'family' | 'agency' | 'structure' | 'admin'

export type NavItem = {
  id: string
  label: string
  /** Etichetta breve per la tab bar mobile (opzionale; altrimenti si usa `label`) */
  tabLabel?: string
  icon: React.ReactNode
  badge?: number
}

type DashboardLayoutProps = {
  accountType: AccountType
  userName: string
  userRole: string
  navItems: NavItem[]
  activeSection: string
  onSectionChange: (id: string) => void
  children: React.ReactNode
  profileCompletion?: number
  planType?: 'free' | 'premium'
  /** Override esplicito delle tab mobile (max 4). Se omesso, usa default per ruolo. */
  mobileTabIds?: string[]
}

const ACCOUNT_BADGE_LABELS: Record<AccountType, string> = {
  professional: 'Professionista',
  family: 'Famiglia',
  agency: 'Agenzia',
  structure: 'Struttura RSA',
  admin: 'Admin',
}

/** Azioni primary in tab bar (max 4) + voce Altro → bottom sheet. */
const DEFAULT_MOBILE_TAB_IDS: Record<AccountType, string[]> = {
  family: ['home', 'richieste', 'nuova-richiesta', 'messaggi'],
  professional: ['home', 'profilo', 'messaggi', 'posizioni'],
  agency: ['overview', 'annunci', 'candidature', 'messaggi'],
  structure: ['overview', 'turni', 'candidature', 'messaggi'],
  admin: ['overview', 'utenti', 'verifica', 'moderazione'],
}

export function DashboardLayout({
  accountType,
  userName,
  userRole,
  navItems,
  activeSection,
  onSectionChange,
  children,
  profileCompletion,
  planType,
  mobileTabIds,
}: DashboardLayoutProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const brandPath = user ? getDashboardPathForRole(user.role) : '/'
  const sheetTitleId = useId()

  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [moreOpen])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await signOut()
      navigate('/accedi', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const activeLabel = navItems.find((n) => n.id === activeSection)?.label ?? ''
  const totalUnread = navItems.reduce((sum, n) => sum + (n.badge ?? 0), 0)

  const handleNav = (id: string) => {
    onSectionChange(id)
    setMoreOpen(false)
  }

  const preferredIds = mobileTabIds ?? DEFAULT_MOBILE_TAB_IDS[accountType]
  const tabItems = preferredIds
    .map((id) => navItems.find((item) => item.id === id))
    .filter((item): item is NavItem => Boolean(item))
    .slice(0, 4)

  const tabIdSet = new Set(tabItems.map((t) => t.id))
  const moreItems = navItems.filter((item) => !tabIdSet.has(item.id))
  const activeInTabs = tabItems.some((item) => item.id === activeSection)
  const moreActive = moreOpen || !activeInTabs

  return (
    <div className="dash-shell dash-shell--glass">
      {/* Sidebar — solo desktop */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar__brand">
          <button
            className="dash-sidebar__brand-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
            onClick={() => navigate(brandPath)}
          >
            <BrandLogo link={false} size="sm" wordmarkOnly className="dash-sidebar__brand-name" />
            <div className="dash-sidebar__brand-sub">Dashboard {ACCOUNT_BADGE_LABELS[accountType]}</div>
          </button>
        </div>

        {accountType === 'professional' && (
          <div className="dash-sidebar__profile">
            <div className="dash-sidebar__profile-avatar">{initials}</div>
            <div className="dash-sidebar__profile-name">{userName}</div>
            <div className="dash-sidebar__profile-role">{userRole}</div>
            {typeof profileCompletion === 'number' && (
              <div className="dash-sidebar__profile-progress-wrap">
                <div className="dash-sidebar__profile-progress-track">
                  <div
                    className="dash-sidebar__profile-progress-bar"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <div className="dash-sidebar__profile-progress-label">
                  Profilo {profileCompletion}%
                </div>
              </div>
            )}
            {planType && (
              <span className={`dash-sidebar__plan-badge dash-sidebar__plan-badge--${planType}`}>
                {planType === 'premium' ? (
                  <>
                    <IconStar size={12} />
                    Premium
                  </>
                ) : (
                  'FREE'
                )}
              </span>
            )}
          </div>
        )}

        <nav className="dash-sidebar__nav" aria-label="Navigazione dashboard">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`dash-sidebar__nav-btn${activeSection === item.id ? ' dash-sidebar__nav-btn--active' : ''}`}
              onClick={() => handleNav(item.id)}
            >
              <span className="dash-sidebar__nav-icon">{item.icon}</span>
              {item.label}
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="dash-sidebar__nav-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="dash-sidebar__footer">
          {accountType !== 'professional' && (
            <div className="dash-sidebar__user">
              <div className="dash-sidebar__avatar">{initials}</div>
              <div>
                <div className="dash-sidebar__user-name">{userName}</div>
                <div className="dash-sidebar__user-role">{userRole}</div>
              </div>
            </div>
          )}
          <button className="dash-sidebar__support" onClick={() => navigate(contattiPath)}>
            <IconSupport size={14} />
            Supporto
          </button>
          <button
            type="button"
            className="dash-sidebar__logout"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
          >
            <IconLogout size={16} />
            {loggingOut ? 'Uscita…' : 'Esci dalla dashboard'}
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-header">
          <div className="dash-header__left">
            <div className="dash-header__avatar">{initials}</div>
            <nav className="dash-breadcrumb" aria-label="Breadcrumb">
              <span>Dashboard</span>
              <span className="dash-breadcrumb__sep">/</span>
              <span className="dash-breadcrumb__current">{activeLabel}</span>
            </nav>
          </div>

          <div className="dash-header__right">
            <span className={`dash-account-badge dash-account-badge--${accountType}`}>
              {ACCOUNT_BADGE_LABELS[accountType]}
            </span>
            {planType === 'free' ? (
              <span className="dash-header__plan-chip">FREE</span>
            ) : null}
            <button
              className="dash-notif-btn"
              aria-label="Notifiche"
              onClick={() => handleNav('notifiche')}
            >
              <IconBell size={18} />
              {totalUnread > 0 && <span className="dash-notif-dot" />}
            </button>
          </div>
        </header>

        <main className="dash-content">
          <div key={activeSection} className="polish-dash-section">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile floating tab bar — Backclub light */}
      <nav className="dash-dock" aria-label="Navigazione principale">
        <div className="dash-dock__pill">
          {tabItems.map((item) => {
            const active = activeSection === item.id && !moreOpen
            return (
              <button
                key={item.id}
                type="button"
                className={`dash-dock__btn${active ? ' is-active' : ''}`}
                onClick={() => handleNav(item.id)}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <span className="dash-dock__badge">{item.badge > 9 ? '9+' : item.badge}</span>
                ) : null}
                <span className="dash-dock__icon" aria-hidden>
                  {item.icon}
                </span>
                <span className="dash-dock__label">{item.tabLabel ?? item.label}</span>
              </button>
            )
          })}
          <button
            type="button"
            className={`dash-dock__btn${moreActive ? ' is-active' : ''}`}
            onClick={() => setMoreOpen(true)}
            aria-label="Altre sezioni"
            aria-expanded={moreOpen}
            aria-controls="dash-more-sheet"
          >
            <span className="dash-dock__icon" aria-hidden>
              <IconMoreDots size={18} />
            </span>
            <span className="dash-dock__label">Altro</span>
          </button>
        </div>
      </nav>

      {/* Bottom sheet “Altro” — sostituisce la sidebar mobile */}
      {moreOpen ? (
        <div className="dash-more" role="presentation">
          <button
            type="button"
            className="dash-more__backdrop"
            aria-label="Chiudi menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            id="dash-more-sheet"
            className="dash-more__sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={sheetTitleId}
          >
            <div className="dash-more__handle" aria-hidden />
            <div className="dash-more__head">
              <h2 id={sheetTitleId} className="dash-more__title">
                Altro
              </h2>
              <button
                type="button"
                className="dash-more__close"
                aria-label="Chiudi"
                onClick={() => setMoreOpen(false)}
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="dash-more__profile">
              <div className="dash-more__avatar">{initials}</div>
              <div className="dash-more__profile-text">
                <strong>{userName}</strong>
                <span>{userRole || ACCOUNT_BADGE_LABELS[accountType]}</span>
              </div>
            </div>

            <ul className="dash-more__list">
              {moreItems.map((item) => {
                const active = activeSection === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`dash-more__item${active ? ' is-active' : ''}`}
                      onClick={() => handleNav(item.id)}
                    >
                      <span className="dash-more__item-icon" aria-hidden>
                        {item.icon}
                      </span>
                      <span className="dash-more__item-label">{item.label}</span>
                      {typeof item.badge === 'number' && item.badge > 0 ? (
                        <span className="dash-more__item-badge">{item.badge}</span>
                      ) : (
                        <span className="dash-more__chevron" aria-hidden>
                          ›
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="dash-more__footer">
              <button type="button" className="dash-more__footer-btn" onClick={() => navigate(contattiPath)}>
                <IconSupport size={16} />
                Supporto
              </button>
              <button
                type="button"
                className="dash-more__footer-btn dash-more__footer-btn--danger"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
              >
                <IconLogout size={16} />
                {loggingOut ? 'Uscita…' : 'Esci'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
