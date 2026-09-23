import type { AssistenzaHeroMode } from './assistenzaHeroMode'
import type { ListingIntent } from './directoryTypes'
import { profilesDirectoryPath } from './siteRoutes'

export const PROFILI_ISTAT_PARAM = 'istat'
export const PROFILI_Q_PARAM = 'q'
export const PROFILI_INTENT_PARAM = 'intent'

export function listingIntentFromAssistenzaMode(mode: AssistenzaHeroMode): ListingIntent {
  return mode === 'offro' ? 'offro' : 'cerco'
}

export function parseListingIntentParam(raw: string | null): ListingIntent | null {
  if (raw === 'cerco' || raw === 'offro') return raw
  return null
}

export function buildProfilesDirectoryHref(opts: {
  istat?: string
  q?: string
  intent?: ListingIntent
}): string {
  const p = new URLSearchParams()
  const istat = opts.istat?.trim()
  const q = opts.q?.trim()
  if (istat) {
    p.set(PROFILI_ISTAT_PARAM, istat)
  } else if (q) {
    p.set(PROFILI_Q_PARAM, q)
  }
  if (opts.intent) {
    p.set(PROFILI_INTENT_PARAM, opts.intent)
  }
  const qs = p.toString()
  return qs ? `${profilesDirectoryPath}?${qs}` : profilesDirectoryPath
}
