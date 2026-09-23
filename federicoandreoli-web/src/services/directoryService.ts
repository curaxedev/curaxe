import type { ItaliaGeoRow } from '../lib/italiaGeo/italiaComuniTypes'
import {
  getMockProfileById,
  listSimilarProfiles,
  MOCK_PROFILES,
  profileHasDetailPage,
  toDirectoryCard,
  type MockProfile,
} from '../lib/mockProfiles'
import {
  getOpenPositionById,
  listNearbyOpenPositions,
  listOpenPositionsForHome,
  type MockOpenPosition,
  type OpenPositionFilters,
} from '../lib/mockOpenPositions'
import {
  getPublishedOpenPositionById,
  listPublishedOpenPositionsForHome,
} from './jobPostingService'
import type {
  DirectoryProfessionalDetail,
  DirectoryProfileSummary,
  DirectorySearchParams,
  DirectorySearchResult,
  ListingIntent,
  StructureBranch,
  StructureDetail,
  StructureKind,
} from '../lib/directoryTypes'
import { DirectoryError } from '../lib/directoryTypes'
import { isProfessionalKycVerified } from './adminKycService'
import { resolvePublicStructureBranches } from './locationService'

const MOCK_DELAY_MS = 500
const DEFAULT_PAGE_SIZE = 12

export function normalizeGeoPart(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function enrichSummary(card: DirectoryProfileSummary): DirectoryProfileSummary {
  if (card.type !== 'professional' || card.category === 'agency') {
    return card
  }
  const verified = isProfessionalKycVerified(card.id)
  return verified ? { ...card, verified: true } : card
}

/**
 * When the user picks a place, keep profiles in the same regione amministrativa.
 * Sort: same comune or ISTAT first, then rest of region.
 */
export function filterAndSortDirectoryProfiles(
  rows: DirectoryProfileSummary[],
  place: ItaliaGeoRow | null,
): DirectoryProfileSummary[] {
  if (!place) return rows

  const regionNorm = normalizeGeoPart(place.regione)
  const inRegion = rows.filter((r) => normalizeGeoPart(r.match.regione) === regionNorm)

  const comuneNorm = normalizeGeoPart(place.comune)
  const scored = inRegion.map((p, index) => {
    let rank = 2
    if (p.match.istat === place.id) rank = 0
    else if (normalizeGeoPart(p.match.comune) === comuneNorm) rank = 1
    return { p, rank, index }
  })
  scored.sort((a, b) => a.rank - b.rank || a.index - b.index)
  return scored.map((s) => s.p)
}

function allDirectorySummaries(intent: ListingIntent): DirectoryProfileSummary[] {
  return MOCK_PROFILES.filter((p) => p.listingIntent === intent)
    .map(toDirectoryCard)
    .map(enrichSummary)
}

function paginate(
  items: DirectoryProfileSummary[],
  page: number,
  pageSize: number,
): DirectorySearchResult {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    data: items.slice(start, start + pageSize),
    meta: { total, page: safePage, pageSize, totalPages },
  }
}

function buildBranches(profile: MockProfile): StructureBranch[] {
  const primary: StructureBranch = {
    id: `${profile.id}-main`,
    name: profile.name,
    comune: profile.match.comune,
    cap: profile.match.cap,
    addressHint: profile.locationLabel,
  }

  const extras: StructureBranch[] = [
    {
      id: `${profile.id}-b2`,
      name: `${profile.name} — sede secondaria`,
      comune: profile.match.comune,
      cap: profile.match.cap,
      addressHint: `Zona ${profile.match.comune} nord`,
      phoneHint: 'Centralino demo',
    },
  ]

  if (profile.category === 'facility') {
    return [primary, ...extras]
  }

  return [primary]
}

function toStructureDetail(profile: MockProfile): StructureDetail {
  const kind: StructureKind = profile.category === 'agency' ? 'agency' : 'facility'
  const services =
    profile.shift && profile.shift.trim().length > 0
      ? [profile.shift.trim(), profile.role]
      : [profile.role]

  return {
    id: profile.id,
    kind,
    listingIntent: profile.listingIntent,
    name: profile.name,
    role: profile.role,
    stars: profile.stars,
    reviewCount: profile.reviewCount,
    locationLabel: profile.locationLabel,
    online: profile.online,
    imageUrl: profile.imageUrl,
    shift: profile.shift,
    bio: profile.bio,
    coverageHint: profile.coverageHint,
    match: profile.match,
    branches: resolvePublicStructureBranches(profile.id) ?? buildBranches(profile),
    services,
  }
}

function isStructureOrAgency(profile: MockProfile): boolean {
  return profile.type === 'facility' || profile.category === 'agency'
}

export async function fetchDirectorySearch(params: DirectorySearchParams): Promise<DirectorySearchResult> {
  await delay()

  if (params.intent === 'cerco' && params.place?.comune.toLowerCase().includes('server-error')) {
    throw new DirectoryError('server', 'Servizio directory temporaneamente non disponibile. Riprova tra poco.')
  }

  const page = params.page ?? 1
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
  const filtered = filterAndSortDirectoryProfiles(allDirectorySummaries(params.intent), params.place ?? null)
  return paginate(filtered, page, pageSize)
}

export async function fetchDirectoryProfessionalById(id: string): Promise<DirectoryProfessionalDetail> {
  await delay()

  if (id.toLowerCase().includes('server-error')) {
    throw new DirectoryError('server', 'Impossibile caricare il profilo. Riprova tra poco.')
  }

  const profile = getMockProfileById(id)
  if (!profile || !profileHasDetailPage(profile)) {
    throw new DirectoryError('not_found', 'Profilo non trovato.')
  }

  return {
    ...profile,
    verified: isProfessionalKycVerified(profile.id),
  }
}

export async function fetchStructureById(id: string): Promise<StructureDetail> {
  await delay()

  if (id.toLowerCase().includes('server-error')) {
    throw new DirectoryError('server', 'Impossibile caricare la scheda. Riprova tra poco.')
  }

  const profile = getMockProfileById(id)
  if (!profile || !isStructureOrAgency(profile)) {
    throw new DirectoryError('not_found', 'Organizzazione non trovata.')
  }

  return toStructureDetail(profile)
}

export async function fetchOpenPositionById(id: string): Promise<MockOpenPosition> {
  await delay()

  if (id.toLowerCase().includes('server-error')) {
    throw new DirectoryError('server', 'Impossibile caricare l’annuncio. Riprova tra poco.')
  }

  const published = getPublishedOpenPositionById(id)
  const position = published ?? getOpenPositionById(id)
  if (!position) {
    throw new DirectoryError('not_found', 'Annuncio non trovato.')
  }

  return position
}

export async function fetchOpenPositionsForHome(filters: OpenPositionFilters): Promise<MockOpenPosition[]> {
  await delay(300)
  const staticRows = listOpenPositionsForHome(filters)
  const publishedRows = listPublishedOpenPositionsForHome(filters)
  const seen = new Set<string>()
  const merged: MockOpenPosition[] = []
  for (const row of [...publishedRows, ...staticRows]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    merged.push(row)
  }
  return merged
}

export async function fetchNearbyOpenPositions(
  job: MockOpenPosition,
  cityQuery: string,
  limit = 4,
): Promise<MockOpenPosition[]> {
  await delay(200)
  return listNearbyOpenPositions(job, cityQuery, limit)
}

export { listSimilarProfiles, profileHasDetailPage }
