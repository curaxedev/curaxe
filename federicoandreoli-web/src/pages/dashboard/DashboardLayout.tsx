import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardPathForRole } from '../../auth/roleDashboard'
import { useAuth } from '../../auth/useAuth'
import {
  IconBell,
  IconLogout,
  IconMenu,
  IconStar,
  IconSupport,
} from '../../components/icons/DashboardIcons'
import { BrandLogo } from '../../components/BrandLogo'
import { contattiPath } from '../../lib/siteRoutes'

export type AccountType = 'professional' | 'family' | 'agency' | 'structure' | 'admin'

export type NavItem = {
  id: string
  label: string
  /** Etichetta breve per la tab bar mobile (opzionale; altrimenti si usa `label` con clamp a 2 righe in CSS) */
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

/** Azioni primary in tab bar (max 4) + voce Altro che apre la sidebar. */
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const brandPath = user ? getDashboardPathForRole(user.role) : '/'

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
    setSidebarOpen(false)
  }

  const preferredIds = mobileTabIds ?? DEFAULT_MOBILE_TAB_IDS[accountType]
  const tabItems = preferredIds
    .map((id) => navItems.find((item) => item.id === id))
    .filter((item): item is NavItem => Boolean(item))
    .slice(0, 4)

  const activeInTabs = tabItems.some((item) => item.id === activeSection)

  return (
    <div className="dash-shell dash-shell--glass">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="dash-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`dash-sidebar${sidebarOpen ? ' dash-sidebar--open' : ''}`}>
        {/* Brand */}
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

        {/* Professional profile section */}
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

        {/* Nav */}
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

        {/* Footer */}
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
          <button
            className="dash-sidebar__support"
            onClick={() => navigate(contattiPath)}
          >
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

      {/* Main area */}
      <div className="dash-main">
        {/* Top header */}
        <header className="dash-header">
          <div className="dash-header__left">
            <button
              className="dash-mobile-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Apri menu"
            >
              <IconMenu size={20} />
            </button>
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

        {/* Content */}
        <main className="dash-content">
          <div key={activeSection} className="polish-dash-section">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="dash-tab-bar" aria-label="Navigazione principale">
        {tabItems.map((item) => (
          <button
            key={item.id}
            className={`dash-tab-bar__btn${activeSection === item.id ? ' dash-tab-bar__btn--active' : ''}`}
            onClick={() => handleNav(item.id)}
            aria-label={item.label}
          >
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className="dash-tab-bar__badge">{item.badge}</span>
            )}
            <span className="dash-tab-bar__icon-wrap">{item.icon}</span>
            <span className="dash-tab-bar__label">{item.tabLabel ?? item.label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`dash-tab-bar__btn${!activeInTabs ? ' dash-tab-bar__btn--active' : ''}`}
          onClick={() => setSidebarOpen(true)}
          aria-label="Altre sezioni"
        >
          <span className="dash-tab-bar__icon-wrap">
            <IconMenu size={18} />
          </span>
          <span className="dash-tab-bar__label">Altro</span>
        </button>
      </nav>
    </div>
  )
}
