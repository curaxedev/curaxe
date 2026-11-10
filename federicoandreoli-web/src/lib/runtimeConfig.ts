function trimTrailingSlash(url: string | undefined): string {
  return (url ?? '').replace(/\/$/, '')
}

/** Base URL API (no slash finale). Vuota in sviluppo: le richieste `/api` passano dal proxy Vite. */
export function getApiBaseUrl(): string {
  return trimTrailingSlash(import.meta.env.VITE_API_URL)
}

/** Origine del sito (no slash finale), es. `https://federico.backsoftware.it`. Vuota se non impostata. */
export function getSiteOrigin(): string {
  return trimTrailingSlash(import.meta.env.VITE_SITE_ORIGIN)
}

/**
 * Fail-closed: i mock sono ON solo se `VITE_USE_MOCKS` è esplicitamente true/1.
 * In produzione (`import.meta.env.PROD`) i mock sono sempre disabilitati.
 */
export function isMockApiEnabled(): boolean {
  if (import.meta.env.PROD) return false
  const raw = import.meta.env.VITE_USE_MOCKS
  if (raw === undefined || raw === '') return false
  return raw === 'true' || raw === '1'
}
