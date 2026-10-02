/** Demo annunci «Offro assistenza»: allineati al parametro URL `citta` (hero). */

export const OPEN_POSITION_ROLE_IDS = ['nurse', 'oss', 'caregiver', 'assistant', 'facility'] as const
export type OpenPositionRoleId = (typeof OPEN_POSITION_ROLE_IDS)[number]

export type OpenPositionPoster = 'famiglia' | 'agenzia' | 'struttura'

/** Sintesi contrattuale per filtri home (modalità offro). */
export type OpenPositionContractBucket = 'hourly' | 'ccnl' | 'other'

/** Aspettative su spostamenti (opzionale, es. da annuncio datore). */
export type OpenPositionMobilityLevel = 'required' | 'preferred' | 'not_required'

export type OpenPositionMobility = {
  driverLicense: OpenPositionMobilityLevel
  ownCar: OpenPositionMobilityLevel
  maxCommuteKm?: number
  note?: string
}

export type MockOpenPosition = {
  id: string
  category: OpenPositionRoleId
  posterType: OpenPositionPoster
  posterDisplayName: string
  contractBucket: OpenPositionContractBucket
  title: string
  excerpt: string
  locationLabel: string
  rateLabel: string
  scheduleLabel: string
  urgency?: 'urgente'
  badge?: string
  descriptionIntro: string
  duties: string[]
  requirements: string[]
  mobility?: OpenPositionMobility
}

export const OPEN_POSITION_ROLE_LABELS: Record<OpenPositionRoleId, string> = {
  nurse: 'Infermieri',
  oss: 'OSS',
  caregiver: 'Badanti',
  assistant: 'Assistenti familiari',
  facility: 'Strutture',
}

export const MOCK_OPEN_POSITIONS: MockOpenPosition[] = []

/** Legacy curated ids (vuoto in produzione — nessun annuncio demo). */
const CURATED_DEMO_IDS = [] as const

export type OpenPositionPosterFilter = 'all' | 'famiglia' | 'organizzazione'

export const OPEN_POSITION_CONTRACT_FILTER_IDS = ['hourly', 'ccnl', 'other'] as const
export type OpenPositionContractFilterId = (typeof OPEN_POSITION_CONTRACT_FILTER_IDS)[number]

export const OPEN_POSITION_CONTRACT_FILTER_LABELS: Record<OpenPositionContractFilterId, string> = {
  hourly: 'Orario / part-time',
  ccnl: 'CCNL / dipendente',
  other: 'Convivenza, pool o negoziabile',
}

export function locationMatchesCity(cityQuery: string, locationLabel: string): boolean {
  const q = cityQuery.trim().toLowerCase()
  if (!q) return false
  const loc = locationLabel.toLowerCase()
  if (loc.includes(q)) return true
  const firstTok = q.split(/[\s,]+/)[0] ?? q
  return firstTok.length >= 2 && loc.includes(firstTok)
}

export function getOpenPositionById(id: string): MockOpenPosition | undefined {
  return MOCK_OPEN_POSITIONS.find((row) => row.id === id)
}

/** Schede correlate in fondo al dettaglio: con `citta` in query filtra la demo geografica, altrimenti stessa figura. */
export function listNearbyOpenPositions(job: MockOpenPosition, cityQuery: string, limit = 4): MockOpenPosition[] {
  const q = cityQuery.trim()
  const others = MOCK_OPEN_POSITIONS.filter((row) => row.id !== job.id)
  if (q) {
    const geo = others.filter((row) => locationMatchesCity(q, row.locationLabel))
    if (geo.length) return geo.slice(0, limit)
  }
  const sameCat = others.filter((row) => row.category === job.category)
  const rest = others.filter((row) => row.category !== job.category)
  const ordered = [...sameCat, ...rest]
  const seen = new Set<string>()
  const out: MockOpenPosition[] = []
  for (const row of ordered) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
    if (out.length >= limit) break
  }
  return out
}

export type OpenPositionFilters = {
  cityQuery: string
  roleId: OpenPositionRoleId | 'all'
  poster: OpenPositionPosterFilter
  contract: 'all' | OpenPositionContractBucket
}

function posterMatches(poster: OpenPositionFilters['poster'], row: MockOpenPosition): boolean {
  if (poster === 'all') return true
  if (poster === 'famiglia') return row.posterType === 'famiglia'
  return row.posterType === 'agenzia' || row.posterType === 'struttura'
}

function contractMatches(contract: OpenPositionFilters['contract'], row: MockOpenPosition): boolean {
  if (contract === 'all') return true
  return row.contractBucket === contract
}

function roleMatches(roleId: OpenPositionFilters['roleId'], row: MockOpenPosition): boolean {
  if (roleId === 'all') return true
  return row.category === roleId
}

/** Senza città: sottoinsieme curato multi-città. Con città: match geografico. */
export function listOpenPositionsForHome(filters: OpenPositionFilters): MockOpenPosition[] {
  const trimmed = filters.cityQuery.trim()
  let pool: MockOpenPosition[]
  if (!trimmed) {
    pool = MOCK_OPEN_POSITIONS.filter((row) => (CURATED_DEMO_IDS as readonly string[]).includes(row.id))
  } else {
    pool = MOCK_OPEN_POSITIONS.filter((row) => locationMatchesCity(trimmed, row.locationLabel))
  }
  return pool.filter(
    (row) => roleMatches(filters.roleId, row) && posterMatches(filters.poster, row) && contractMatches(filters.contract, row)
  )
}

export function posterLabel(type: OpenPositionPoster): string {
  switch (type) {
    case 'famiglia':
      return 'Famiglia'
    case 'agenzia':
      return 'Agenzia / cooperativa'
    case 'struttura':
      return 'Struttura'
    default: {
      const _x: never = type
      return _x
    }
  }
}
