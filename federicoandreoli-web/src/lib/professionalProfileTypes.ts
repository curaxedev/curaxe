/** API-shaped professional profile types — swap transport in `professionalProfileApi.ts` when Laravel is ready. */

export type ProfessionalProfileIdentity = {
  firstName: string
  lastName: string
  professionalTitle: string
  /** Opzionale / legacy — non richiesto in UI. */
  birthYear?: number | null
  /** Opzionale / legacy — non richiesto in UI. */
  nationality?: string | null
  /** Solo Premium: visibile in chat + WhatsApp. */
  phone: string | null
  bio: string
  photoUrl: string | null
  /** Presente se l’utente ha scelto un avatar dalla libreria. */
  avatarPresetId?: string | null
}

export type ProfessionalProfileProfessional = {
  category: string
  experienceYears: string
  specializations: string[]
  languages: string[]
  hasLicense: boolean
  hasCar: boolean
}

export type ProfessionalProfileAvailability = {
  employmentTypes: string[]
  days: string[]
  shifts: string[]
  availableFrom: string
}

export type ProfessionalProfileRates = {
  hourly: number
  monthlyLiveIn: number
}

export type ProfessionalProfile = {
  id: string
  completionPercent: number
  missingFields: string[]
  identity: ProfessionalProfileIdentity
  professional: ProfessionalProfileProfessional
  availability: ProfessionalProfileAvailability
  rates: ProfessionalProfileRates
  zones: string[]
  primaryZone: string
  /** Codice ISTAT del comune della zona principale (per ricerca geo precisa). */
  primaryIstat: string | null
  /** Raggio operativo in km dalla zona principale (null = non impostato). */
  radiusKm: number | null
  availableToMove: boolean
  certifications: string[]
}

export type ProfessionalProfilePatch = {
  identity?: Partial<ProfessionalProfileIdentity>
  professional?: Partial<ProfessionalProfileProfessional>
  availability?: Partial<ProfessionalProfileAvailability>
  rates?: Partial<ProfessionalProfileRates>
  zones?: string[]
  primaryZone?: string
  primaryIstat?: string | null
  radiusKm?: number | null
  availableToMove?: boolean
  certifications?: string[]
}

export class ProfessionalProfileError extends Error {
  readonly code: 'not_found' | 'server'

  constructor(code: ProfessionalProfileError['code'], message: string) {
    super(message)
    this.name = 'ProfessionalProfileError'
    this.code = code
  }
}
