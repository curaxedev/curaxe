import type { ItaliaGeoRow } from './italiaGeo/italiaComuniTypes'

export type ReverseGeoHint = {
  comuneCandidates: string[]
  cap?: string
  provinciaHint?: string
  rawLabel?: string
}

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9'\s-]/g, '')
    .replace(/\s+/g, ' ')
}

/** Reverse geocode browser-friendly (BigDataCloud client API). */
async function reverseViaBigDataCloud(lat: number, lng: number): Promise<ReverseGeoHint | null> {
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client` +
    `?latitude=${encodeURIComponent(String(lat))}` +
    `&longitude=${encodeURIComponent(String(lng))}` +
    `&localityLanguage=it`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as {
    countryCode?: string
    city?: string
    locality?: string
    postcode?: string
    principalSubdivision?: string
    principalSubdivisionCode?: string
    localityInfo?: {
      administrative?: Array<{ name?: string; adminLevel?: number }>
    }
  }
  if (data.countryCode && data.countryCode.toUpperCase() !== 'IT') {
    return null
  }

  const candidates: string[] = []
  const push = (v?: string) => {
    const t = v?.trim()
    if (!t) return
    if (!candidates.some((c) => normalizeKey(c) === normalizeKey(t))) candidates.push(t)
  }

  push(data.city)
  push(data.locality)
  const admins = data.localityInfo?.administrative ?? []
  // adminLevel 8 ≈ comune in molti dataset OSM-derived
  for (const a of admins) {
    if (a.adminLevel === 8 || a.adminLevel === 7) push(a.name)
  }
  for (const a of admins) push(a.name)

  const cap = data.postcode?.trim().match(/^\d{5}$/)?.[0]
  return {
    comuneCandidates: candidates,
    cap,
    provinciaHint: data.principalSubdivision?.trim() || data.principalSubdivisionCode?.trim(),
    rawLabel: data.city || data.locality,
  }
}

/** Fallback Nominatim (OpenStreetMap). */
async function reverseViaNominatim(lat: number, lng: number): Promise<ReverseGeoHint | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${encodeURIComponent(String(lat))}` +
    `&lon=${encodeURIComponent(String(lng))}` +
    `&addressdetails=1&accept-language=it`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    address?: Record<string, string>
  }
  const a = data.address ?? {}
  if (a.country_code && a.country_code.toLowerCase() !== 'it') return null

  const candidates: string[] = []
  const push = (v?: string) => {
    const t = v?.trim()
    if (!t) return
    if (!candidates.some((c) => normalizeKey(c) === normalizeKey(t))) candidates.push(t)
  }
  push(a.municipality)
  push(a.city)
  push(a.town)
  push(a.village)
  push(a.city_district)
  push(a.suburb)

  const cap = a.postcode?.trim().match(/^\d{5}$/)?.[0]
  return {
    comuneCandidates: candidates,
    cap,
    provinciaHint: a.county || a.state,
    rawLabel: a.municipality || a.city || a.town || a.village,
  }
}

export async function reverseGeocodeItaly(lat: number, lng: number): Promise<ReverseGeoHint | null> {
  try {
    const primary = await reverseViaBigDataCloud(lat, lng)
    if (primary && primary.comuneCandidates.length > 0) return primary
  } catch {
    /* fall through */
  }
  try {
    return await reverseViaNominatim(lat, lng)
  } catch {
    return null
  }
}

function scoreRow(
  row: ItaliaGeoRow,
  hint: ReverseGeoHint,
): number {
  let score = 0
  const comuneKey = normalizeKey(row.comune)

  for (let i = 0; i < hint.comuneCandidates.length; i++) {
    const cand = normalizeKey(hint.comuneCandidates[i]!)
    if (!cand) continue
    if (comuneKey === cand) score = Math.max(score, 100 - i)
    else if (comuneKey.startsWith(cand) || cand.startsWith(comuneKey)) score = Math.max(score, 70 - i)
    else if (comuneKey.includes(cand) || cand.includes(comuneKey)) score = Math.max(score, 40 - i)
  }

  if (hint.cap && row.cap === hint.cap) score += 35
  else if (hint.cap && row.cap.startsWith(hint.cap.slice(0, 3))) score += 8

  if (hint.provinciaHint) {
    const p = normalizeKey(hint.provinciaHint)
    if (
      normalizeKey(row.provincia).includes(p) ||
      normalizeKey(row.regione).includes(p) ||
      p.includes(normalizeKey(row.provincia))
    ) {
      score += 12
    }
  }

  return score
}

/**
 * Abbina coordinate GPS a un comune del dataset Curaxe (ISTAT).
 */
export function matchItaliaGeoFromHint(
  hint: ReverseGeoHint,
  search: (query: string, limit?: number) => ItaliaGeoRow[],
): ItaliaGeoRow | null {
  const pool = new Map<string, ItaliaGeoRow>()

  if (hint.cap) {
    for (const row of search(hint.cap, 20)) pool.set(row.id, row)
  }
  for (const name of hint.comuneCandidates.slice(0, 6)) {
    for (const row of search(name, 12)) pool.set(row.id, row)
  }

  const rows = [...pool.values()]
  if (rows.length === 0) return null

  let best: ItaliaGeoRow | null = null
  let bestScore = -1
  for (const row of rows) {
    const s = scoreRow(row, hint)
    if (s > bestScore) {
      bestScore = s
      best = row
    }
  }

  // soglia minima: evita match spuri
  if (!best || bestScore < 40) {
    // se CAP coincide esatto su un solo comune, ok anche con score basso-medio
    if (hint.cap) {
      const byCap = rows.filter((r) => r.cap === hint.cap)
      if (byCap.length === 1) return byCap[0]!
      if (byCap.length > 1 && best && byCap.some((r) => r.id === best.id)) return best
    }
    return bestScore >= 30 ? best : null
  }
  return best
}

export async function resolveComuneNearMe(
  search: (query: string, limit?: number) => ItaliaGeoRow[],
): Promise<
  | { ok: true; row: ItaliaGeoRow; coords: { lat: number; lng: number } }
  | { ok: false; reason: 'unsupported' | 'denied' | 'timeout' | 'outside_it' | 'no_match' | 'unavailable' }
> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { ok: false, reason: 'unsupported' }
  }

  let position: GeolocationPosition
  try {
    position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60_000,
      })
    })
  } catch (err) {
    const code = (err as GeolocationPositionError | undefined)?.code
    if (code === 1) return { ok: false, reason: 'denied' }
    if (code === 3) return { ok: false, reason: 'timeout' }
    return { ok: false, reason: 'unavailable' }
  }

  const lat = position.coords.latitude
  const lng = position.coords.longitude

  const hint = await reverseGeocodeItaly(lat, lng)
  if (!hint) return { ok: false, reason: 'outside_it' }

  const row = matchItaliaGeoFromHint(hint, search)
  if (!row) return { ok: false, reason: 'no_match' }

  return { ok: true, row, coords: { lat, lng } }
}

export function nearMeErrorMessage(
  reason: 'unsupported' | 'denied' | 'timeout' | 'outside_it' | 'no_match' | 'unavailable',
): string {
  switch (reason) {
    case 'unsupported':
      return 'Il browser non supporta la geolocalizzazione'
    case 'denied':
      return 'Attiva la posizione dal browser per continuare'
    case 'timeout':
      return 'Posizione non rilevata in tempo — riprova'
    case 'outside_it':
      return 'Posizione fuori Italia — cerca un comune manualmente'
    case 'no_match':
      return 'Non siamo riusciti ad abbinare un comune — cerca manualmente'
    case 'unavailable':
    default:
      return 'Posizione non disponibile — riprova o cerca un comune'
  }
}
