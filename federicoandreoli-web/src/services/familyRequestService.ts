import type {
  FamilyAssistanceType,
  FamilyBeneficiaryType,
  FamilyCandidateStatus,
  FamilyEmploymentType,
  FamilyRequest,
  FamilyRequestCreateInput,
  FamilyRequestStatus,
  FamilyRequestStore,
} from '../lib/familyRequestTypes'
import {
  FamilyRequestError,
  FREE_PLAN_MAX_ACTIVE_REQUESTS,
} from '../lib/familyRequestTypes'
import { ApplicationError } from '../lib/applicationTypes'
import type { FamilyApplication } from '../lib/familyRequestTypes'
import {
  countApplicationsForFamilyRequests,
  listApplicationsForFamilyUser,
  patchFamilyApplicationStatus as patchApplicationForFamily,
} from './applicationService'

const MOCK_DELAY_MS = 500
const STORAGE_PREFIX = 'fa:family-requests:'

export const ASSISTANCE_TYPE_LABELS: Record<FamilyAssistanceType, string> = {
  badante: 'Badante',
  oss: 'OSS (Operatore Socio-Sanitario)',
  infermiere: 'Infermiere',
  family_assistant: 'Assistente familiare',
  other: 'Altro',
}

export const BENEFICIARY_TYPE_LABELS: Record<FamilyBeneficiaryType, string> = {
  self_sufficient_elderly: 'Anziano autosufficiente',
  non_autosufficient_elderly: 'Anziano non autosufficiente',
  disabled: 'Disabile',
  post_surgery: 'Post-operatorio',
  other: 'Altro',
}

export const EMPLOYMENT_TYPE_LABELS: Record<FamilyEmploymentType, string> = {
  live_in: 'Convivente',
  hourly: 'A ore',
  part_time: 'Part-time',
  weekend: 'Weekend',
  night_only: 'Solo notturno',
}

export const REQUEST_STATUS_LABELS: Record<FamilyRequestStatus, string> = {
  active: 'Attiva',
  paused: 'In pausa',
  closed: 'Chiusa',
  draft: 'Bozza',
}

export const CANDIDATE_STATUS_LABELS: Record<FamilyCandidateStatus, string> = {
  new: 'Nuova',
  contacted: 'Contattata',
  'in-selection': 'In selezione',
  discarded: 'Scartata',
}

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

function readStore(userId: string): FamilyRequestStore | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as FamilyRequestStore
  } catch {
    return null
  }
}

function writeStore(userId: string, store: FamilyRequestStore): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(store))
}

function buildTitle(input: FamilyRequestCreateInput): string {
  const assistance = ASSISTANCE_TYPE_LABELS[input.assistanceType]
  const beneficiary = BENEFICIARY_TYPE_LABELS[input.beneficiary]
  return `${assistance} per ${beneficiary.toLowerCase()} a ${input.comune}`
}

function countActiveRequests(requests: FamilyRequest[]): number {
  return requests.filter((r) => r.status === 'active').length
}

function syncApplicationCounts(store: FamilyRequestStore): FamilyRequestStore {
  const familyUserId = store.requests[0]?.familyUserId ?? ''
  const counts = countApplicationsForFamilyRequests(
    familyUserId,
    store.requests.map((r) => r.id),
  )
  return {
    ...store,
    requests: store.requests.map((r) => ({
      ...r,
      applicationCount: counts.get(r.id) ?? 0,
    })),
    applications: listApplicationsForFamilyUser(familyUserId),
  }
}

function createSeedStore(userId: string): FamilyRequestStore {
  const requestActiveId = 'req-1'
  const requestClosedId = 'req-2'

  const requests: FamilyRequest[] = [
    {
      id: requestActiveId,
      familyUserId: userId,
      title: 'Badante per nonna anziana a Milano',
      status: 'active',
      assistanceType: 'badante',
      beneficiary: 'non_autosufficient_elderly',
      employmentType: 'live_in',
      comune: 'Milano',
      budgetMonthly: 1200,
      days: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'],
      notes: 'Nonna 87 anni, cammina con deambulatore.',
      applicationCount: 0,
      createdAt: '2026-05-02T10:00:00.000Z',
    },
    {
      id: requestClosedId,
      familyUserId: userId,
      title: 'Assistenza domiciliare post-operatoria',
      status: 'closed',
      assistanceType: 'infermiere',
      beneficiary: 'post_surgery',
      employmentType: 'hourly',
      comune: 'Monza',
      budgetMonthly: 900,
      days: ['Lun', 'Mer', 'Ven'],
      notes: '',
      applicationCount: 0,
      createdAt: '2026-03-10T09:00:00.000Z',
    },
  ]

  return syncApplicationCounts({ requests, applications: listApplicationsForFamilyUser(userId) })
}

export function loadFamilyRequestStore(userId: string): FamilyRequestStore {
  const stored = readStore(userId)
  if (stored) {
    return syncApplicationCounts(stored)
  }
  const seed = createSeedStore(userId)
  writeStore(userId, seed)
  return seed
}

export function validateFamilyRequestCreate(
  input: FamilyRequestCreateInput,
): FamilyRequestError | null {
  const fieldErrors: NonNullable<FamilyRequestError['fieldErrors']> = {}

  if (!input.comune.trim()) {
    fieldErrors.comune = 'Seleziona un comune.'
  }
  if (input.days.length === 0) {
    fieldErrors.days = 'Seleziona almeno un giorno.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return new FamilyRequestError('validation', 'Controlla i campi evidenziati.', fieldErrors)
  }

  return null
}

export async function fetchFamilyRequests(userId: string): Promise<FamilyRequestStore> {
  await delay()
  if (!userId) {
    throw new FamilyRequestError('not_found', 'Sessione non valida.')
  }
  if (userId.toLowerCase().includes('server-error')) {
    throw new FamilyRequestError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }
  return loadFamilyRequestStore(userId)
}

export async function createFamilyRequest(
  userId: string,
  input: FamilyRequestCreateInput,
  options?: { asDraft?: boolean },
): Promise<FamilyRequest> {
  await delay()
  if (!userId) {
    throw new FamilyRequestError('not_found', 'Sessione non valida.')
  }
  if (userId.toLowerCase().includes('server-error')) {
    throw new FamilyRequestError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const validationError = validateFamilyRequestCreate(input)
  if (validationError) {
    throw validationError
  }

  const store = loadFamilyRequestStore(userId)
  const asDraft = options?.asDraft ?? false
  const status: FamilyRequestStatus = asDraft ? 'draft' : 'active'

  if (!asDraft && countActiveRequests(store.requests) >= FREE_PLAN_MAX_ACTIVE_REQUESTS) {
    throw new FamilyRequestError(
      'plan_limit',
      'Con il piano Gratuito puoi avere al massimo 1 richiesta attiva. Chiudi o metti in pausa una richiesta esistente, oppure passa a Premium.',
    )
  }

  const request: FamilyRequest = {
    id: `req-${Date.now()}`,
    familyUserId: userId,
    title: buildTitle(input),
    status,
    assistanceType: input.assistanceType,
    beneficiary: input.beneficiary,
    employmentType: input.employmentType,
    comune: input.comune.trim(),
    budgetMonthly: input.budgetMonthly,
    days: [...input.days],
    notes: input.notes.trim(),
    applicationCount: 0,
    createdAt: new Date().toISOString(),
  }

  const updated = syncApplicationCounts({
    requests: [request, ...store.requests],
    applications: store.applications,
  })
  writeStore(userId, updated)
  return request
}

export async function patchFamilyRequestStatus(
  userId: string,
  requestId: string,
  status: FamilyRequestStatus,
): Promise<FamilyRequest> {
  await delay()
  if (!userId) {
    throw new FamilyRequestError('not_found', 'Sessione non valida.')
  }

  const store = loadFamilyRequestStore(userId)
  const index = store.requests.findIndex((r) => r.id === requestId)
  if (index === -1) {
    throw new FamilyRequestError('not_found', 'Richiesta non trovata.')
  }

  if (status === 'active' && store.requests[index].status !== 'active') {
    const otherActive = countActiveRequests(store.requests.filter((r) => r.id !== requestId))
    if (otherActive >= FREE_PLAN_MAX_ACTIVE_REQUESTS) {
      throw new FamilyRequestError(
        'plan_limit',
        'Con il piano Gratuito puoi avere al massimo 1 richiesta attiva. Passa a Premium per pubblicarne di più.',
      )
    }
  }

  const requests = [...store.requests]
  requests[index] = { ...requests[index], status }
  const updated = syncApplicationCounts({ ...store, requests })
  writeStore(userId, updated)
  return updated.requests[index]
}

export async function patchFamilyApplicationStatus(
  userId: string,
  applicationId: string,
  status: FamilyCandidateStatus,
): Promise<FamilyApplication> {
  try {
    return await patchApplicationForFamily(userId, applicationId, status)
  } catch (err) {
    if (err instanceof ApplicationError) {
      const code = err.code === 'validation' ? 'validation' : 'not_found'
      throw new FamilyRequestError(code, err.message)
    }
    throw new FamilyRequestError('not_found', 'Candidatura non trovata.')
  }
}

export function formatFamilyRequestDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export type {
  FamilyApplication,
  FamilyRequest,
  FamilyRequestCreateInput,
  FamilyRequestStatus,
  FamilyCandidateStatus,
}
