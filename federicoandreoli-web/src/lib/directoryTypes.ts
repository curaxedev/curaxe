/** API-shaped public directory types — swap transport in `directoryApi.ts` when Laravel is ready. */

import type { ItaliaGeoRow } from './italiaGeo/italiaComuniTypes'
import type {
  CompetenceIconKey,
  DayPartAvailability,
  ExperienceIconKey,
  HelpServiceIconKey,
  MockProfile,
  ProfileCategory,
  ProfileCompetence,
  ProfileExperienceBlock,
  ProfileHelpService,
  ProfileReference,
} from './mockProfiles'
import type {
  MockOpenPosition,
  OpenPositionFilters,
  OpenPositionPoster,
  OpenPositionRoleId,
} from './mockOpenPositions'

export type ListingIntent = 'cerco' | 'offro'

export type DirectoryGeoMatch = {
  istat: string
  comune: string
  cap: string
  regione: string
}

export type DirectoryEntityType = 'professional' | 'facility'

/** Card row in `/profili` directory (UT-003). */
export type DirectoryProfileSummary = {
  id: string
  listingIntent: ListingIntent
  category: ProfileCategory | string
  type: DirectoryEntityType
  name: string
  role: string
  stars: number
  locationLabel: string
  location: boolean
  online: boolean
  shift?: string
  viaAgencyName?: string
  imageUrl: string
  match: DirectoryGeoMatch
  /** KYC badge (UT-004) — from admin approval store when mock-backed. */
  verified?: boolean
}

/** Full professional profile for `/profili/:id` (UT-004). */
export type DirectoryProfessionalDetail = MockProfile & {
  verified: boolean
}

export type StructureKind = 'facility' | 'agency'

/** Sede operativa (STR-P02 multi-sede). */
export type StructureBranch = {
  id: string
  name: string
  comune: string
  cap: string
  addressHint?: string
  phoneHint?: string
}

/** Public structure/agency detail (STR-P02). */
export type StructureDetail = {
  id: string
  kind: StructureKind
  listingIntent: ListingIntent
  name: string
  role: string
  stars: number
  reviewCount: number
  locationLabel: string
  online: boolean
  imageUrl: string
  shift?: string
  bio: string
  coverageHint: string
  match: DirectoryGeoMatch
  branches: StructureBranch[]
  services: string[]
}

export type DirectorySearchParams = {
  intent: ListingIntent
  /** Selected place from Italia geo combobox. */
  place?: ItaliaGeoRow | null
  page?: number
  pageSize?: number
}

export type DirectorySearchMeta = {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type DirectorySearchResult = {
  data: DirectoryProfileSummary[]
  meta: DirectorySearchMeta
}

export type DirectoryErrorCode = 'not_found' | 'server' | 'validation'

export class DirectoryError extends Error {
  readonly code: DirectoryErrorCode

  constructor(code: DirectoryErrorCode, message: string) {
    super(message)
    this.name = 'DirectoryError'
    this.code = code
  }
}

export type {
  OpenPositionFilters,
  CompetenceIconKey,
  DayPartAvailability,
  ExperienceIconKey,
  HelpServiceIconKey,
  MockOpenPosition,
  OpenPositionPoster,
  OpenPositionRoleId,
  ProfileCategory,
  ProfileCompetence,
  ProfileExperienceBlock,
  ProfileHelpService,
  ProfileReference,
}
