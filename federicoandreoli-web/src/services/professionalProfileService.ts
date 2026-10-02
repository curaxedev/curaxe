import type {
  ProfessionalProfile,
  ProfessionalProfilePatch,
} from '../lib/professionalProfileTypes'
import { ProfessionalProfileError } from '../lib/professionalProfileTypes'

const MOCK_DELAY_MS = 500
const STORAGE_PREFIX = 'fa:professional-profile:'

export const DASHBOARD_PROFILE_IDS = new Set(['prof-1'])

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

function readStoredProfile(userId: string): ProfessionalProfile | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as ProfessionalProfile
  } catch {
    return null
  }
}

function writeStoredProfile(userId: string, profile: ProfessionalProfile): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(profile))
}

function mergeProfile(
  base: ProfessionalProfile,
  patch: ProfessionalProfilePatch,
): Omit<ProfessionalProfile, 'completionPercent' | 'missingFields'> {
  return {
    ...base,
    ...patch,
    identity: { ...base.identity, ...patch.identity },
    professional: { ...base.professional, ...patch.professional },
    availability: { ...base.availability, ...patch.availability },
    rates: { ...base.rates, ...patch.rates },
    zones: patch.zones ?? base.zones,
    primaryZone: patch.primaryZone ?? base.primaryZone,
    availableToMove: patch.availableToMove ?? base.availableToMove,
    certifications: patch.certifications ?? base.certifications,
  }
}

export type ProfileCompletionSectionId =
  | 'foto'
  | 'bio'
  | 'titolo'
  | 'categoria'
  | 'specializzazioni'
  | 'lingue'
  | 'disponibilita'
  | 'tariffe'
  | 'zone'

type CompletionItem = {
  id: ProfileCompletionSectionId
  label: string
  hint: string
  weight: number
  ok: (profile: ProfessionalProfile) => boolean
}

function textLen(value: string | null | undefined): number {
  return (value ?? '').trim().length
}

const COMPLETION_ITEMS: CompletionItem[] = [
  {
    id: 'foto',
    label: 'Foto profilo',
    hint: 'Carica una foto chiara del volto',
    weight: 15,
    ok: (p) => Boolean(p.identity?.photoUrl),
  },
  {
    id: 'bio',
    label: 'Bio / presentazione',
    hint: 'Almeno 20 caratteri su esperienza e approccio',
    weight: 10,
    ok: (p) => textLen(p.identity?.bio) >= 20,
  },
  {
    id: 'titolo',
    label: 'Titolo professionale',
    hint: 'Es. Badante esperta — Milano e provincia',
    weight: 8,
    ok: (p) => textLen(p.identity?.professionalTitle) >= 5,
  },
  {
    id: 'categoria',
    label: 'Categoria e esperienza',
    hint: 'Ruolo e anni di esperienza',
    weight: 10,
    ok: (p) => Boolean(p.professional?.category && p.professional?.experienceYears),
  },
  {
    id: 'specializzazioni',
    label: 'Specializzazioni',
    hint: 'Almeno una competenza specifica',
    weight: 10,
    ok: (p) => (p.professional?.specializations?.length ?? 0) > 0,
  },
  {
    id: 'lingue',
    label: 'Lingue parlate',
    hint: 'Indica le lingue che parli',
    weight: 7,
    ok: (p) => (p.professional?.languages?.length ?? 0) > 0,
  },
  {
    id: 'disponibilita',
    label: 'Disponibilità aggiornata',
    hint: 'Tipo contratto e almeno 3 giorni',
    weight: 12,
    ok: (p) =>
      (p.availability?.employmentTypes?.length ?? 0) > 0 && (p.availability?.days?.length ?? 0) >= 3,
  },
  {
    id: 'tariffe',
    label: 'Tariffa oraria',
    hint: 'Imposta una tariffa oraria realistica',
    weight: 10,
    ok: (p) => (p.rates?.hourly ?? 0) >= 8,
  },
  {
    id: 'tariffe',
    label: 'Tariffa convivente',
    hint: 'Tariffa mensile se offri convivenza',
    weight: 8,
    ok: (p) => (p.rates?.monthlyLiveIn ?? 0) >= 800,
  },
  {
    id: 'zone',
    label: 'Province / regioni coperte',
    hint: 'Cerca comune, provincia o regione',
    weight: 10,
    ok: (p) => (p.zones?.length ?? 0) > 0 || textLen(p.primaryZone) > 0,
  },
]

export type ProfileChecklistItem = {
  id: ProfileCompletionSectionId
  label: string
  hint: string
  done: boolean
}

export function getProfileCompletionChecklist(profile: ProfessionalProfile | null): ProfileChecklistItem[] {
  if (!profile) return []
  const seen = new Set<string>()
  const items: ProfileChecklistItem[] = []
  for (const item of COMPLETION_ITEMS) {
    const key = `${item.id}:${item.label}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      id: item.id,
      label: item.label,
      hint: item.hint,
      done: item.ok(profile),
    })
  }
  return items
}

function withCompletion(
  profile: Omit<ProfessionalProfile, 'completionPercent' | 'missingFields'>,
): ProfessionalProfile {
  const totalWeight = COMPLETION_ITEMS.reduce((sum, item) => sum + item.weight, 0)
  const earned = COMPLETION_ITEMS.filter((item) => item.ok(profile as ProfessionalProfile)).reduce(
    (sum, item) => sum + item.weight,
    0,
  )
  const missingFields = COMPLETION_ITEMS.filter((item) => !item.ok(profile as ProfessionalProfile)).map(
    (item) => item.label,
  )

  return {
    ...profile,
    completionPercent: Math.round((earned / totalWeight) * 100),
    missingFields,
  }
}

function createDefaultProfile(userId: string): ProfessionalProfile {
  const seed: Omit<ProfessionalProfile, 'completionPercent' | 'missingFields'> = {
    id: userId,
    identity: {
      firstName: 'Maria',
      lastName: 'Rossi',
      professionalTitle: 'Badante esperta — Milano e provincia',
      birthYear: 1982,
      nationality: 'Rumena',
      bio:
        'Badante con 9 anni di esperienza nell\'assistenza ad anziani autosufficienti e non. Specializzata nell\'accompagnamento, cura e supporto emotivo.',
      photoUrl: null,
    },
    professional: {
      category: 'Badante',
      experienceYears: '6-9 anni',
      specializations: [],
      languages: ['Italiano', 'Rumeno'],
      hasLicense: true,
      hasCar: false,
    },
    availability: {
      employmentTypes: ['A ore'],
      days: ['Lun'],
      shifts: ['Mattina 7–13', 'Pomeriggio 13–19'],
      availableFrom: '2026-06-01',
    },
    rates: {
      hourly: 12,
      monthlyLiveIn: 1200,
    },
    zones: ['Milano Nord'],
    primaryZone: 'Milano, zona Nord',
    availableToMove: false,
    certifications: ['Qualifica OSS', 'Primo soccorso (BLS / BLSD)'],
  }

  return withCompletion(seed)
}

export function loadProfessionalProfile(userId: string): ProfessionalProfile {
  const stored = readStoredProfile(userId)
  if (stored) {
    return withCompletion(stored)
  }
  return createDefaultProfile(userId)
}

export async function fetchProfessionalProfile(userId: string): Promise<ProfessionalProfile> {
  await delay()
  if (!userId) {
    throw new ProfessionalProfileError('not_found', 'Profilo non trovato.')
  }
  if (userId.toLowerCase().includes('server-error')) {
    throw new ProfessionalProfileError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }
  return loadProfessionalProfile(userId)
}

export async function patchProfessionalProfile(
  userId: string,
  patch: ProfessionalProfilePatch,
): Promise<ProfessionalProfile> {
  await delay()
  if (!userId) {
    throw new ProfessionalProfileError('not_found', 'Profilo non trovato.')
  }
  if (userId.toLowerCase().includes('server-error')) {
    throw new ProfessionalProfileError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const current = loadProfessionalProfile(userId)
  const merged = mergeProfile(current, patch)
  const updated = withCompletion(merged)
  writeStoredProfile(userId, updated)
  return updated
}

export type { ProfessionalProfile, ProfessionalProfilePatch }
