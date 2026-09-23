/** Pagina spiegazione servizio e piattaforma (header «?», link aiuto). */
export const comeFunzionaPath = '/come-funziona'

/** Hub contatti e supporto (footer, dashboard sidebar). */
export const contattiPath = '/contatti'

/** Directory profili con ricerca geografica (demo / mock). */
export const profilesDirectoryPath = '/profili'

/** Pagina dettaglio profilo professionista (demo / mock). */
export function profileDetailPath(id: string): string {
  return `/profili/${id}`
}

/** Pagina dettaglio struttura o agenzia (STR-P02). */
export function structureDetailPath(id: string): string {
  return `/strutture/${id}`
}
