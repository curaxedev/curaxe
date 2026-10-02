/** Ricerche luogo recenti (sessione browser) — stile Homely Care. */

export type RecentPlace = {
  id: string
  label: string
  sublabel?: string
  istat?: string
  q?: string
  at: number
}

const STORAGE_KEY = 'cx:recent-places'
const MAX = 6

export function readRecentPlaces(): RecentPlace[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentPlace[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((p) => p && typeof p.label === 'string').slice(0, MAX)
  } catch {
    return []
  }
}

export function pushRecentPlace(place: Omit<RecentPlace, 'at' | 'id'> & { id?: string }): RecentPlace[] {
  const entry: RecentPlace = {
    id: place.id ?? `p-${Date.now()}`,
    label: place.label.trim(),
    sublabel: place.sublabel?.trim() || undefined,
    istat: place.istat,
    q: place.q,
    at: Date.now(),
  }
  if (!entry.label) return readRecentPlaces()
  const prev = readRecentPlaces().filter(
    (p) => p.label.toLowerCase() !== entry.label.toLowerCase() && p.id !== entry.id,
  )
  const next = [entry, ...prev].slice(0, MAX)
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export const SUGGESTED_DESTINATIONS: Array<{ label: string; sublabel: string; q: string }> = [
  { label: 'Milano', sublabel: 'Hub di assistenza e strutture in Lombardia', q: 'Milano' },
  { label: 'Torino', sublabel: 'Professionisti e famiglie in Piemonte', q: 'Torino' },
  { label: 'Roma', sublabel: 'Assistenza a domicilio e strutture nel Lazio', q: 'Roma' },
  { label: 'Firenze', sublabel: 'Cura e supporto in Toscana', q: 'Firenze' },
  { label: 'Napoli', sublabel: 'Reti di assistenza in Campania', q: 'Napoli' },
  { label: 'Bologna', sublabel: 'Professionisti in Emilia-Romagna', q: 'Bologna' },
  { label: 'Modena', sublabel: 'Assistenza e strutture nel Modenese', q: 'Modena' },
]
