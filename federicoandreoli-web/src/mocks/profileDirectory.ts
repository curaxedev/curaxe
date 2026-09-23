import { MOCK_PROFILES, toDirectoryCard } from '../lib/mockProfiles'
import type { DirectoryProfileSummary } from '../lib/directoryTypes'

export type { ListingIntent, DirectoryProfileSummary as DirectoryProfileMock } from '../lib/directoryTypes'
export { filterAndSortDirectoryProfiles, normalizeGeoPart } from '../services/directoryService'

/**
 * Vista "directory" derivata da `MOCK_PROFILES` (legacy export).
 * Prefer `searchDirectoryProfiles` via `directoryApi` for new code.
 */
export const DIRECTORY_PROFILE_MOCKS: DirectoryProfileSummary[] = MOCK_PROFILES.map(toDirectoryCard)
