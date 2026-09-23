/* eslint-disable react-refresh/only-export-components -- provider + hook condivisi */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { initAnalytics, revokeAnalytics } from '../lib/analytics'

const STORAGE_KEY = 'cookie_consent_v1'
const CONSENT_EXPIRY_MS = 12 * 30 * 24 * 60 * 60 * 1000 // ~12 mesi

export type CookieCategories = {
  necessary: true
  functional: boolean
  analytics: boolean
  marketing: boolean
}

type StoredConsent = {
  consent: CookieCategories
  timestamp: number
}

export type CookieConsentContextType = {
  consent: CookieCategories | null
  hasDecided: boolean
  isPanelOpen: boolean
  acceptAll: () => void
  rejectOptional: () => void
  saveCustom: (prefs: Omit<CookieCategories, 'necessary'>) => void
  openPanel: () => void
  closePanel: () => void
}

const CookieConsentContext = createContext<CookieConsentContextType | null>(null)

function loadFromStorage(): CookieCategories | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredConsent
    if (Date.now() - stored.timestamp > CONSENT_EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return stored.consent
  } catch {
    return null
  }
}

function saveToStorage(consent: CookieCategories): void {
  const stored: StoredConsent = { consent, timestamp: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieCategories | null>(loadFromStorage)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const hasDecided = consent !== null

  const applyConsent = useCallback((next: CookieCategories) => {
    saveToStorage(next)
    setConsent(next)
    setIsPanelOpen(false)
  }, [])

  const acceptAll = useCallback(() => {
    applyConsent({ necessary: true, functional: true, analytics: true, marketing: true })
  }, [applyConsent])

  const rejectOptional = useCallback(() => {
    applyConsent({ necessary: true, functional: false, analytics: false, marketing: false })
  }, [applyConsent])

  const saveCustom = useCallback(
    (prefs: Omit<CookieCategories, 'necessary'>) => {
      applyConsent({ necessary: true, ...prefs })
    },
    [applyConsent],
  )

  const openPanel = useCallback(() => setIsPanelOpen(true), [])
  const closePanel = useCallback(() => setIsPanelOpen(false), [])

  useEffect(() => {
    if (isPanelOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isPanelOpen])

  useEffect(() => {
    if (consent?.analytics) {
      initAnalytics()
    } else if (consent !== null) {
      revokeAnalytics()
    }
  }, [consent?.analytics, consent])

  const value = useMemo<CookieConsentContextType>(
    () => ({
      consent,
      hasDecided,
      isPanelOpen,
      acceptAll,
      rejectOptional,
      saveCustom,
      openPanel,
      closePanel,
    }),
    [consent, hasDecided, isPanelOpen, acceptAll, rejectOptional, saveCustom, openPanel, closePanel],
  )

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
}

export function useCookieConsent(): CookieConsentContextType {
  const v = useContext(CookieConsentContext)
  if (!v) throw new Error('useCookieConsent deve essere usato dentro CookieConsentProvider')
  return v
}
