const ANALYTICS_ID = import.meta.env.VITE_ANALYTICS_ID?.trim()

let initialized = false
let scriptElement: HTMLScriptElement | null = null

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function isAnalyticsConfigured(): boolean {
  return Boolean(ANALYTICS_ID)
}

/**
 * Carica lo script analytics solo dopo consenso esplicito (categoria «analitici»).
 * In dev, con `VITE_ANALYTICS_ID` impostato, logga in console invece di chiamare terze parti.
 */
export function initAnalytics(): void {
  if (!ANALYTICS_ID || initialized) return
  initialized = true

  if (import.meta.env.DEV) {
    console.info('[analytics] init (dev stub)', { measurementId: ANALYTICS_ID })
    return
  }

  window.dataLayer = window.dataLayer ?? []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args)
  }
  window.gtag('js', new Date())
  window.gtag('config', ANALYTICS_ID, { anonymize_ip: true })

  scriptElement = document.createElement('script')
  scriptElement.async = true
  scriptElement.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_ID)}`
  document.head.appendChild(scriptElement)
}

/** Interrompe il tracciamento e rimuove lo script iniettato. */
export function revokeAnalytics(): void {
  if (!initialized) return
  initialized = false

  scriptElement?.remove()
  scriptElement = null
  delete window.gtag
  window.dataLayer = []

  for (const name of ['_ga', '_gid', '_gat']) {
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${window.location.hostname}`
    document.cookie = `${name}=; Max-Age=0; path=/`
  }

  if (import.meta.env.DEV && ANALYTICS_ID) {
    console.info('[analytics] revoked (dev stub)')
  }
}

/** Invia un pageview solo se analytics è attivo e configurato. */
export function trackPageView(path: string): void {
  if (!initialized || !ANALYTICS_ID) return

  if (import.meta.env.DEV) {
    console.info('[analytics] pageview (dev stub)', path)
    return
  }

  window.gtag?.('event', 'page_view', { page_path: path })
}
