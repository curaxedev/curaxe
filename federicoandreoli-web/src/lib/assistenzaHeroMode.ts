/** Query key for hero «Cerco / Offro assistenza»; kept in sync with header deep links. */
export const ASSISTENZA_HERO_PARAM = 'assistenza' as const

/** Hero home search: city / area (no role filter in URL). */
export const HERO_CITY_PARAM = 'citta' as const

export type AssistenzaHeroMode = 'cerco' | 'offro'

export function parseAssistenzaHeroMode(searchParams: URLSearchParams): AssistenzaHeroMode {
  const raw = searchParams.get(ASSISTENZA_HERO_PARAM)?.trim().toLowerCase()
  return raw === 'offro' ? 'offro' : 'cerco'
}

/**
 * Link header «Cerca assistenza»: porta in cima alla home in modalità «cerco».
 * Niente hash `#search` — l'utente vuole atterrare in cima alla pagina, non sulla barra di ricerca.
 */
export const assistenzaHeroCercoLink = { pathname: '/' as const, search: '', hash: '' }

/**
 * Link header «Offri assistenza»: porta in cima alla home in modalità «offro».
 * Niente hash `#search`.
 */
export const assistenzaHeroOffroLink = {
  pathname: '/' as const,
  search: `?${ASSISTENZA_HERO_PARAM}=offro`,
  hash: '',
}
