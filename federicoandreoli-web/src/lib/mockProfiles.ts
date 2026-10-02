import type { HomeProfileCarouselCard, HomeProfileWeekAvailability } from '../components/HomeProfileCarousel'
import type { DirectoryGeoMatch, DirectoryProfileSummary, ListingIntent } from './directoryTypes'
import { resolvePublicProfileById } from './professionalProfilePublicSync'

export type ProfileCategory =
  | 'caregiver'
  | 'nurse'
  | 'oss'
  | 'assistant'
  | 'agency'
  | 'facility'

export type CompetenceIconKey =
  | 'shield'
  | 'heart'
  | 'spark'
  | 'home'
  | 'med'
  | 'book'
  | 'hands'
  | 'pill'

export type ExperienceIconKey =
  | 'baby'
  | 'senior'
  | 'wheelchair'
  | 'alz'
  | 'oncology'
  | 'recovery'

export type HelpServiceIconKey =
  | 'home'
  | 'cook'
  | 'med'
  | 'shop'
  | 'transport'
  | 'companion'

/** Disponibilità giornaliera in 3 fasce: Mattina/Pomeriggio/Sera × Lun-Dom. */
export type DayPartAvailability = {
  morning: HomeProfileWeekAvailability
  afternoon: HomeProfileWeekAvailability
  evening: HomeProfileWeekAvailability
}

export type ProfileReference = {
  author: string
  date: string
  stars: number
  text: string
}

export type ProfileExperienceBlock = {
  ageOrPatient: string
  yearsLabel: string
  iconKey: ExperienceIconKey
}

export type ProfileCompetence = {
  id: string
  label: string
  iconKey: CompetenceIconKey
}

export type ProfileHelpService = {
  label: string
  iconKey: HelpServiceIconKey
}

export type MockProfile = {
  // ── card fields (compatibili con HomeProfileCarouselCard + DirectoryProfileMock)
  id: string
  listingIntent: ListingIntent
  category: ProfileCategory
  type: 'professional' | 'facility'
  name: string
  age?: number
  role: string
  stars: number
  reviewCount: number
  locationLabel: string
  online: boolean
  imageUrl: string
  rateLabel?: string
  experienceLabel?: string
  weekAvailable?: HomeProfileWeekAvailability
  shift?: string
  viaAgencyName?: string
  match: DirectoryGeoMatch

  // ── detail-only fields (omessi per agency/facility che non hanno pagina dettaglio in v1)
  bio: string
  bioMore?: string
  traits: string[]
  competences: ProfileCompetence[]
  experiences: ProfileExperienceBlock[]
  servicesCanDo: string[]
  servicesCanHelpWith: ProfileHelpService[]
  availability: DayPartAvailability
  availableFor: string[]
  references: ProfileReference[]
  coverageHint: string
}

const profileSeed: Omit<MockProfile, 'imageUrl'>[] = []

export const MOCK_PROFILES: MockProfile[] = profileSeed as MockProfile[]

export function getMockProfileById(id: string): MockProfile | undefined {
  const synced = resolvePublicProfileById(id)
  if (synced) return synced
  return MOCK_PROFILES.find((p) => p.id === id)
}

/** Returns true if the profile has a dedicated detail page in v1 (only individual professionals). */
export function profileHasDetailPage(p: Pick<MockProfile, 'type' | 'category'>): boolean {
  return p.type === 'professional' && p.category !== 'agency'
}

/**
 * Profili simili: stessa intent + stessa categoria, priorità a stessa regione e poi stesso comune ISTAT.
 * Esclude il profilo corrente. Limit default 8 per il carosello.
 */
export function listSimilarProfiles(p: MockProfile, limit = 8): MockProfile[] {
  const candidates = MOCK_PROFILES.filter(
    (other) =>
      other.id !== p.id &&
      other.listingIntent === p.listingIntent &&
      other.category === p.category &&
      profileHasDetailPage(other),
  )

  const sameIstat = candidates.filter((c) => c.match.istat === p.match.istat)
  const sameRegion = candidates.filter(
    (c) => c.match.istat !== p.match.istat && c.match.regione === p.match.regione,
  )
  const others = candidates.filter(
    (c) => c.match.istat !== p.match.istat && c.match.regione !== p.match.regione,
  )

  return [...sameIstat, ...sameRegion, ...others].slice(0, limit)
}

// ── Adapter di compatibilità verso i tipi card esistenti ──
export function toCarouselCard(p: MockProfile): HomeProfileCarouselCard {
  return {
    id: p.id,
    category: p.category,
    type: p.type,
    name: p.name,
    role: p.role,
    stars: p.stars,
    location: true,
    online: p.online,
    shift: p.shift,
    imageUrl: p.imageUrl,
    locationLabel: p.locationLabel,
    viaAgencyName: p.viaAgencyName,
    age: p.age,
    rateLabel: p.rateLabel,
    experienceLabel: p.experienceLabel,
    weekAvailable: p.weekAvailable,
  }
}

export function toDirectoryCard(p: MockProfile): DirectoryProfileSummary {
  return {
    id: p.id,
    listingIntent: p.listingIntent,
    category: p.category,
    type: p.type,
    name: p.name,
    role: p.role,
    stars: p.stars,
    locationLabel: p.locationLabel,
    location: true,
    online: p.online,
    shift: p.shift,
    viaAgencyName: p.viaAgencyName,
    imageUrl: p.imageUrl,
    match: p.match,
  }
}
