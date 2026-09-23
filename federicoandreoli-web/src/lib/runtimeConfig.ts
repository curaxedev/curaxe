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

/** True (default): i facade `*Api.ts` usano i mock in-browser; false: chiamano Laravel. */
export function isMockApiEnabled(): boolean {
  const raw = import.meta.env.VITE_USE_MOCKS
  if (raw === undefined || raw === '') return true
  return raw === 'true' || raw === '1'
}
