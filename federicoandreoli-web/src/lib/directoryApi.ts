/**
 * Public directory API — doppio binario mock / Laravel.
 *
 * Endpoint reali:
 *   GET  /api/v1/profiles?comune=&intent=&page=
 *   GET  /api/v1/profiles/:id
 *   GET  /api/v1/structures/:id
 *   GET  /api/v1/open-positions
 *   GET  /api/v1/open-positions/:id
 */
import {
  fetchDirectoryProfessionalById,
  fetchDirectorySearch,
  fetchNearbyOpenPositions,
  fetchOpenPositionById,
  fetchOpenPositionsForHome,
  fetchStructureById,
} from '../services/directoryService'
import type {
  DirectoryProfessionalDetail,
  DirectorySearchParams,
  DirectorySearchResult,
  MockOpenPosition,
  OpenPositionFilters,
  StructureDetail,
} from './directoryTypes'
import { DirectoryError } from './directoryTypes'
import { HttpError, httpGet } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type {
  DirectoryProfessionalDetail,
  DirectoryProfileSummary,
  DirectorySearchMeta,
  DirectorySearchParams,
  DirectorySearchResult,
  ListingIntent,
  OpenPositionFilters,
  StructureBranch,
  StructureDetail,
  StructureKind,
} from './directoryTypes'
export { DirectoryError } from './directoryTypes'
export {
  filterAndSortDirectoryProfiles,
  listSimilarProfiles,
  normalizeGeoPart,
  profileHasDetailPage,
} from '../services/directoryService'

function toDirectoryError(err: unknown, fallback: string): DirectoryError {
  if (err instanceof HttpError) {
    if (err.kind === 'not_found' || err.code === 'not_found') {
      return new DirectoryError('not_found', err.message)
    }
    if (err.kind === 'validation') return new DirectoryError('validation', err.message)
    return new DirectoryError('server', err.message || fallback)
  }
  return new DirectoryError('server', fallback)
}

export async function searchDirectoryProfiles(
  params: DirectorySearchParams,
): Promise<DirectorySearchResult> {
  if (isMockApiEnabled()) return fetchDirectorySearch(params)
  try {
    return await httpGet<DirectorySearchResult>('/api/v1/profiles', {
      anonymous: true,
      query: {
        intent: params.intent,
        comune: params.place?.comune,
        regione: params.place?.regione,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 12,
      },
    })
  } catch (err) {
    throw toDirectoryError(err, 'Ricerca profili non riuscita.')
  }
}

export async function getDirectoryProfessional(id: string): Promise<DirectoryProfessionalDetail> {
  if (isMockApiEnabled()) return fetchDirectoryProfessionalById(id)
  try {
    return await httpGet<DirectoryProfessionalDetail>(`/api/v1/profiles/${id}`, { anonymous: true })
  } catch (err) {
    throw toDirectoryError(err, 'Profilo non disponibile.')
  }
}

export async function getDirectoryStructure(id: string): Promise<StructureDetail> {
  if (isMockApiEnabled()) return fetchStructureById(id)
  try {
    return await httpGet<StructureDetail>(`/api/v1/structures/${id}`, { anonymous: true })
  } catch (err) {
    throw toDirectoryError(err, 'Struttura non disponibile.')
  }
}

export async function getDirectoryOpenPosition(id: string): Promise<MockOpenPosition> {
  if (isMockApiEnabled()) return fetchOpenPositionById(id)
  try {
    return await httpGet<MockOpenPosition>(`/api/v1/open-positions/${id}`, { anonymous: true })
  } catch (err) {
    throw toDirectoryError(err, 'Posizione non disponibile.')
  }
}

export async function getDirectoryOpenPositionsForHome(
  filters: OpenPositionFilters,
): Promise<MockOpenPosition[]> {
  if (isMockApiEnabled()) return fetchOpenPositionsForHome(filters)
  try {
    const result = await httpGet<{ data: MockOpenPosition[] }>('/api/v1/open-positions', {
      anonymous: true,
      query: {
        citta: filters.cityQuery || undefined,
        category: filters.roleId !== 'all' ? filters.roleId : undefined,
        pageSize: 50,
      },
    })
    return result.data
  } catch (err) {
    throw toDirectoryError(err, 'Caricamento posizioni non riuscito.')
  }
}

export async function getDirectoryNearbyOpenPositions(
  job: MockOpenPosition,
  cityQuery: string,
  limit?: number,
): Promise<MockOpenPosition[]> {
  if (isMockApiEnabled()) return fetchNearbyOpenPositions(job, cityQuery, limit)
  try {
    const result = await httpGet<{ data: MockOpenPosition[] }>('/api/v1/open-positions', {
      anonymous: true,
      query: {
        citta: cityQuery || undefined,
        pageSize: limit ?? 6,
      },
    })
    return result.data.filter((item) => item.id !== job.id)
  } catch (err) {
    throw toDirectoryError(err, 'Caricamento posizioni vicine non riuscito.')
  }
}
