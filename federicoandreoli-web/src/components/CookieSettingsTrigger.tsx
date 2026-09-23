import { useLocation } from 'react-router-dom'
import { useCookieConsent } from '../context/CookieConsentContext'

export function CookieSettingsTrigger() {
  const { pathname } = useLocation()
  const { hasDecided, openPanel } = useCookieConsent()

  if (!hasDecided) return null

  /* In dashboard il trigger è nella sidebar/footer: il pulsante fisso coprirebbe la tab bar mobile */
  if (pathname.startsWith('/dashboard')) return null

  return (
    <button
      type="button"
      className="cookie-trigger"
      aria-label="Gestisci le preferenze cookie"
      onClick={openPanel}
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="20" y2="6"/>
        <line x1="4" y1="12" x2="20" y2="12"/>
        <line x1="4" y1="18" x2="20" y2="18"/>
        <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/>
        <circle cx="9" cy="18" r="2" fill="currentColor" stroke="none"/>
      </svg>
      <span>Cookie</span>
    </button>
  )
}
