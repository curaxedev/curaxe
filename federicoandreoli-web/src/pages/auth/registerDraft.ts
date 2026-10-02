export type RegisterIntent = 'seeker' | 'offer'

export type PrimaryRole = 'nurse' | 'oss' | 'caregiver' | 'other'

/** Chi cerca assistenza: famiglia o agenzia per il lavoro. */
export type SeekerOrgKind = 'family' | 'agency'

export type DayKey = 'lun' | 'mar' | 'mer' | 'gio' | 'ven' | 'sab' | 'dom'

export type SlotKey = 'morning' | 'afternoon' | 'evening'

export type DayAvailability = Record<SlotKey, boolean>

/** Copertura geografica per chi offre assistenza (dopo indirizzo base). */
export type OfferCoverageMode = 'italy' | 'regions' | 'radius'

export type RegisterDraft = {
  intent: RegisterIntent | null
  primaryRole?: PrimaryRole
  experienceYears?: string
  references?: 'yes' | 'no'
  gender?: 'f' | 'm' | 'other'
  birthDate?: string
  motherLanguage?: string
  otherLanguages: string[]
  concurrentClients?: string
  hourlyRate?: string
  availabilityMode?: 'fixed' | 'occasional'
  availability: Record<DayKey, DayAvailability>
  traitKeys: string[]
  skillKeys: string[]
  helpTaskKeys: string[]
  extraToggles: {
    smokes?: boolean
    /** Patente di guida (B o superiore). */
    hasDriverLicense?: boolean
    hasCar?: boolean
    firstAid?: boolean
    criminalRecord?: boolean
  }
  bio?: string
  photoSkipped?: boolean
  fullName?: string
  /** Email account (raccolta allo step account; mock finché non c’è Laravel). */
  email?: string
  addressLine?: string
  /** Zona di lavoro: tutta Italia, elenco regioni, o raggio dall’indirizzo indicato. */
  coverageMode?: OfferCoverageMode | null
  coverageRegions?: string[]
  coverageRadiusKm?: number | null
  seekerOrgKind?: SeekerOrgKind
  seekerCareType?: string
  seekerForWhom?: string
  seekerFrequency?: string
  seekerUrgency?: string
  seekerNotes?: string
  // Consensi legali (compliance GDPR / normativa italiana)
  consentTermini: boolean
  consentPrivacy: boolean
  consentMaggiorenne: boolean
  consentComunicazioni?: boolean
  consentProfilazione?: boolean
}

const DAYS: DayKey[] = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']

function emptyDay(): DayAvailability {
  return { morning: false, afternoon: false, evening: false }
}

export function createEmptyAvailability(): Record<DayKey, DayAvailability> {
  return DAYS.reduce(
    (acc, d) => {
      acc[d] = emptyDay()
      return acc
    },
    {} as Record<DayKey, DayAvailability>,
  )
}

export function initialRegisterDraft(): RegisterDraft {
  return {
    intent: null,
    otherLanguages: [],
    availability: createEmptyAvailability(),
    traitKeys: [],
    skillKeys: [],
    helpTaskKeys: [],
    extraToggles: {},
    consentTermini: false,
    consentPrivacy: false,
    consentMaggiorenne: false,
    consentComunicazioni: false,
    consentProfilazione: false,
  }
}

const STORAGE_PREFIX = 'fa-register-draft:'

export function loadDraftFromStorage(intent: RegisterIntent): RegisterDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + intent)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as RegisterDraft
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    return {
      ...initialRegisterDraft(),
      ...parsed,
      intent,
      otherLanguages: Array.isArray(parsed.otherLanguages) ? parsed.otherLanguages : [],
      availability: { ...createEmptyAvailability(), ...parsed.availability },
      traitKeys: Array.isArray(parsed.traitKeys) ? parsed.traitKeys : [],
      skillKeys: Array.isArray(parsed.skillKeys) ? parsed.skillKeys : [],
      helpTaskKeys: Array.isArray(parsed.helpTaskKeys) ? parsed.helpTaskKeys : [],
      extraToggles: parsed.extraToggles && typeof parsed.extraToggles === 'object' ? parsed.extraToggles : {},
      coverageRegions: Array.isArray(parsed.coverageRegions) ? parsed.coverageRegions : [],
    }
  } catch {
    return null
  }
}

export function saveDraftToStorage(draft: RegisterDraft): void {
  if (!draft.intent) {
    return
  }
  try {
    sessionStorage.setItem(STORAGE_PREFIX + draft.intent, JSON.stringify(draft))
  } catch {
    /* ignore quota */
  }
}

export function clearDraftStorage(intent: RegisterIntent): void {
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + intent)
  } catch {
    /* ignore */
  }
}
