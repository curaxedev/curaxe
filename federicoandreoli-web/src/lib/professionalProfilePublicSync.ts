import type { HomeProfileWeekAvailability } from '../components/HomeProfileCarousel'
import type { MockProfile } from './mockProfiles'
import type { ProfessionalProfile } from './professionalProfileTypes'
import { DASHBOARD_PROFILE_IDS, loadProfessionalProfile } from '../services/professionalProfileService'

const NO_DAYS: HomeProfileWeekAvailability = [false, false, false, false, false, false, false]

const DAY_INDEX: Record<string, number> = {
  Lun: 0,
  Mar: 1,
  Mer: 2,
  Gio: 3,
  Ven: 4,
  Sab: 5,
  Dom: 6,
}

function daysToWeekAvailability(days: string[]): HomeProfileWeekAvailability {
  const flags = [false, false, false, false, false, false, false]
  for (const day of days) {
    const idx = DAY_INDEX[day]
    if (idx !== undefined) {
      flags[idx] = true
    }
  }
  return [flags[0], flags[1], flags[2], flags[3], flags[4], flags[5], flags[6]]
}

function buildPublicProfileFromProfessional(profile: ProfessionalProfile): MockProfile {
  const displayName = `${profile.identity.firstName} ${profile.identity.lastName.charAt(0)}.`
  const weekAvailable = daysToWeekAvailability(profile.availability.days)

  return {
    id: profile.id,
    listingIntent: 'cerco',
    category: 'caregiver',
    type: 'professional',
    name: displayName,
    age: new Date().getFullYear() - profile.identity.birthYear,
    role: profile.identity.professionalTitle || profile.professional.category,
    stars: 4.8,
    reviewCount: 9,
    locationLabel: profile.primaryZone.split(',')[0]?.trim() || 'Milano',
    online: true,
    shift: profile.availability.employmentTypes[0] ?? 'A ore',
    rateLabel: `€${profile.rates.hourly} / ora`,
    experienceLabel: profile.professional.experienceYears,
    weekAvailable,
    match: { istat: '015146', comune: 'Milano', cap: '201xx', regione: 'Lombardia' },
    imageUrl:
      profile.identity.photoUrl ??
      '/images/profile-mock/Screenshot%202026-05-11%20alle%2023.37.47.png',
    bio: profile.identity.bio,
    bioMore:
      'Profilo aggiornato dalla dashboard professionista. In anteprima i dati sono dimostrativi.',
    traits: ['Affidabile', 'Empatica', 'Puntuale'],
    competences: profile.professional.specializations.slice(0, 4).map((label, index) => ({
      id: `spec-${index}`,
      label,
      iconKey: 'heart' as const,
    })),
    experiences: [
      {
        ageOrPatient: profile.professional.specializations[0] ?? 'Assistenza domiciliare',
        yearsLabel: profile.professional.experienceYears,
        iconKey: 'senior' as const,
      },
    ],
    servicesCanDo: profile.availability.employmentTypes,
    servicesCanHelpWith: [
      { label: 'Assistenza quotidiana', iconKey: 'home' as const },
      { label: 'Compagnia', iconKey: 'companion' as const },
    ],
    availability: {
      morning: weekAvailable,
      afternoon: weekAvailable,
      evening: NO_DAYS,
    },
    availableFor: profile.availability.employmentTypes,
    references: [],
    coverageHint: profile.radiusKm
      ? `Entro ${profile.radiusKm} km da ${profile.primaryZone || 'zona principale'}${
          profile.zones.length ? ` · anche ${profile.zones.join(', ')}` : ''
        }`
      : profile.zones.join(', ') || profile.primaryZone,
  }
}

/** Merge dashboard profile onto public `/profili/:id` mock when available. */
export function resolvePublicProfileById(id: string): MockProfile | undefined {
  if (!DASHBOARD_PROFILE_IDS.has(id)) {
    return undefined
  }
  const profile = loadProfessionalProfile(id)
  return buildPublicProfileFromProfessional(profile)
}
