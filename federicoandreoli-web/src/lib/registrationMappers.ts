import type { DayKey, PrimaryRole, RegisterDraft } from '../pages/auth/registerDraft'
import type {
  ProfessionalAvailabilityPayload,
  ProfessionalDocumentsPayload,
  ProfessionalRegistrationPayload,
  ProfessionalRoleApi,
  RegistrationAddress,
  RegistrationConsents,
  SeekerRegistrationPayload,
} from './registrationTypes'
import { isRegistrationDocumentUploadEnabled } from './registrationFeatures'

const DAY_LABELS: Record<DayKey, string> = {
  lun: 'Lun',
  mar: 'Mar',
  mer: 'Mer',
  gio: 'Gio',
  ven: 'Ven',
  sab: 'Sab',
  dom: 'Dom',
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  const parts = trimmed.split(/\s+/)
  if (parts.length <= 1) {
    return { firstName: trimmed, lastName: trimmed }
  }
  const lastName = parts.pop() ?? ''
  const firstName = parts.join(' ')
  return { firstName, lastName }
}

function parseAddress(line: string | undefined): RegistrationAddress {
  const raw = (line ?? '').trim()
  if (!raw) {
    return { line: '' }
  }
  const capMatch = raw.match(/\b(\d{5})\b/)
  const cap = capMatch?.[1]
  const withoutCap = cap ? raw.replace(cap, '').replace(/,\s*$/, '').trim() : raw
  const segments = withoutCap.split(',').map((s) => s.trim()).filter(Boolean)
  const comune = segments.length > 0 ? segments[segments.length - 1] : withoutCap
  return { line: raw, comune, cap }
}

function mapPrimaryRole(role: PrimaryRole | undefined): ProfessionalRoleApi {
  switch (role) {
    case 'nurse':
      return 'infermiere'
    case 'oss':
      return 'oss'
    case 'caregiver':
      return 'badante'
    case 'other':
    default:
      return 'altro'
  }
}

function mapConsents(draft: RegisterDraft): RegistrationConsents {
  return {
    termini: draft.consentTermini,
    privacy: draft.consentPrivacy,
    maggiorenne: draft.consentMaggiorenne,
    comunicazioni: draft.consentComunicazioni,
    profilazione: draft.consentProfilazione,
  }
}

function availabilityFromDraft(draft: RegisterDraft): ProfessionalAvailabilityPayload {
  const days: string[] = []
  const slotsByDay: Record<string, string[]> = {}

  for (const [key, slots] of Object.entries(draft.availability) as [DayKey, { morning: boolean; afternoon: boolean; evening: boolean }][]) {
    const activeSlots: string[] = []
    if (slots.morning) activeSlots.push('Mattina')
    if (slots.afternoon) activeSlots.push('Pomeriggio')
    if (slots.evening) activeSlots.push('Sera')
    if (activeSlots.length > 0) {
      days.push(DAY_LABELS[key])
      slotsByDay[DAY_LABELS[key]] = activeSlots
    }
  }

  return {
    mode: draft.availabilityMode,
    days,
    slotsByDay: Object.keys(slotsByDay).length > 0 ? slotsByDay : undefined,
  }
}

function languagesFromDraft(draft: RegisterDraft): string[] {
  const langs = new Set<string>()
  if (draft.motherLanguage) {
    langs.add(draft.motherLanguage)
  }
  for (const l of draft.otherLanguages) {
    langs.add(l)
  }
  return [...langs]
}

function birthYearFromDate(birthDate: string | undefined): number | undefined {
  if (!birthDate) return undefined
  const y = new Date(birthDate).getFullYear()
  return Number.isFinite(y) ? y : undefined
}

function documentsPayload(): ProfessionalDocumentsPayload {
  if (isRegistrationDocumentUploadEnabled()) {
    return { status: 'uploaded' }
  }
  return {
    status: 'upload_pending',
    note: 'Caricamento documenti sarà disponibile a breve; la registrazione non è bloccata.',
  }
}

export function draftToProfessionalPayload(draft: RegisterDraft): ProfessionalRegistrationPayload {
  const { firstName, lastName } = splitFullName(draft.fullName ?? '')
  const ex = draft.extraToggles ?? {}

  return {
    role: mapPrimaryRole(draft.primaryRole),
    experienceYears: draft.experienceYears ?? '',
    references: draft.references,
    gender: draft.gender,
    birthYear: birthYearFromDate(draft.birthDate),
    birthDate: draft.birthDate,
    languages: languagesFromDraft(draft),
    concurrentClients: draft.concurrentClients,
    hourlyRateBand: draft.hourlyRate,
    availability: availabilityFromDraft(draft),
    traits: [...draft.traitKeys],
    skills: [...draft.skillKeys],
    helpTasks: [...draft.helpTaskKeys],
    extra: {
      smokes: ex.smokes,
      hasDriverLicense: ex.hasDriverLicense,
      hasCar: ex.hasCar,
      firstAid: ex.firstAid,
      criminalRecord: ex.criminalRecord,
    },
    bio: draft.bio?.trim(),
    photoSkipped: draft.photoSkipped,
    firstName,
    lastName,
    address: parseAddress(draft.addressLine),
    coverage: {
      mode: draft.coverageMode ?? undefined,
      regions: draft.coverageRegions ? [...draft.coverageRegions] : undefined,
      radiusKm: draft.coverageRadiusKm,
    },
    documents: documentsPayload(),
    consents: mapConsents(draft),
  }
}

export function draftToSeekerPayload(draft: RegisterDraft): SeekerRegistrationPayload {
  const { firstName, lastName } = splitFullName(draft.fullName ?? '')

  return {
    careType: draft.seekerCareType ?? '',
    forWhom: draft.seekerForWhom ?? '',
    frequency: draft.seekerFrequency ?? '',
    urgency: draft.seekerUrgency ?? '',
    fullName: (draft.fullName ?? '').trim(),
    firstName,
    lastName,
    address: parseAddress(draft.addressLine),
    notes: draft.seekerNotes?.trim() || undefined,
    consents: mapConsents(draft),
  }
}
