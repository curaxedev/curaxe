/** Apri l’explorer Homely (sheet mobile / panel desktop) da sticky o altri trigger. */

export const OPEN_HOMELY_SEARCH_EVENT = 'cx:open-homely-search'

export type HomelySearchPanel = 'dove' | 'mode'

export type OpenHomelySearchDetail = {
  panel?: HomelySearchPanel
}

export function openHomelySearch(panel: HomelySearchPanel = 'dove'): void {
  window.dispatchEvent(
    new CustomEvent<OpenHomelySearchDetail>(OPEN_HOMELY_SEARCH_EVENT, {
      detail: { panel },
    }),
  )
}
