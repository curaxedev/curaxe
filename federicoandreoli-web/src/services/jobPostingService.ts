import type { ItaliaGeoRow } from '../lib/italiaGeo/italiaComuniTypes'
import type {
  JobPosting,
  JobPostingContractType,
  JobPostingCreateInput,
  JobPostingFormInput,
  JobPostingOwnerType,
  JobPostingStatus,
  JobPostingUpdateInput,
  JobPostingWizardStepId,
} from '../lib/jobPostingTypes'
import {
  JobPostingError,
  JOB_POSTING_WIZARD_STEPS,
  contractTypeToOpenBucket,
} from '../lib/jobPostingTypes'
import type {
  MockOpenPosition,
  OpenPositionFilters,
  OpenPositionPoster,
} from '../lib/mockOpenPositions'
import { locationMatchesCity } from '../lib/mockOpenPositions'

const MOCK_DELAY_MS = 500
const STORAGE_PREFIX = 'fa:job-postings:'

export const JOB_POSTING_CONTRACT_LABELS: Record<JobPostingContractType, string> = {
  permanent: 'Indeterminato',
  fixed_term: 'Determinato',
  part_time: 'Part-time',
  hourly: 'A ore / turni',
  freelance: 'Partita IVA / collaborazione',
  seasonal: 'Stagionale',
}

export const JOB_POSTING_STATUS_LABELS: Record<JobPostingStatus, string> = {
  draft: 'Bozza',
  pending_review: 'In revisione',
  active: 'Attivo',
  paused: 'In pausa',
  closed: 'Chiuso',
  rejected: 'Rifiutato',
}

export const JOB_POSTING_WIZARD_STEP_LABELS: Record<JobPostingWizardStepId, string> = {
  ruolo: 'Ruolo',
  descrizione: 'Descrizione',
  requisiti: 'Requisiti',
  disponibilita: 'Disponibilità',
  retribuzione: 'Retribuzione',
  sede: 'Sede',
  pubblicazione: 'Pubblicazione',
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'] as const

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function storageKey(ownerId: string): string {
  return `${STORAGE_PREFIX}${ownerId}`
}

function readStore(ownerId: string): JobPosting[] | null {
  try {
    const raw = localStorage.getItem(storageKey(ownerId))
    if (!raw) return null
    return JSON.parse(raw) as JobPosting[]
  } catch {
    return null
  }
}

function writeStore(ownerId: string, postings: JobPosting[]): void {
  localStorage.setItem(storageKey(ownerId), JSON.stringify(postings))
}

function ownerMeta(
  ownerId: string,
  ownerType: JobPostingOwnerType,
): { ownerDisplayName: string; posterType: OpenPositionPoster } {
  if (ownerType === 'structure' || ownerId.startsWith('struct')) {
    return { ownerDisplayName: 'RSA Villa Serena', posterType: 'struttura' }
  }
  return { ownerDisplayName: 'AuraCare Srl', posterType: 'agenzia' }
}

function parseRequirements(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function buildScheduleLabel(availability: JobPosting['availability']): string {
  const days =
    availability.days.length > 0 ? availability.days.join(', ') : 'Da concordare'
  const notes = availability.scheduleNotes.trim()
  return notes ? `${days} · ${notes}` : days
}

function buildRateLabel(compensation: JobPosting['compensation']): string {
  const { minAmount, maxAmount, period, notes } = compensation
  const suffix = period === 'monthly' ? '/ mese' : '/ ora'
  if (minAmount != null && maxAmount != null && minAmount !== maxAmount) {
    return `€${minAmount.toLocaleString('it-IT')} – ${maxAmount.toLocaleString('it-IT')}${suffix}`
  }
  if (minAmount != null) {
    return `€${minAmount.toLocaleString('it-IT')}${suffix}`
  }
  if (maxAmount != null) {
    return `€${maxAmount.toLocaleString('it-IT')}${suffix}`
  }
  if (notes.trim()) return notes.trim()
  return 'Da concordare'
}

export function loadJobPostings(ownerId: string, _ownerType: JobPostingOwnerType): JobPosting[] {
  const stored = readStore(ownerId)
  if (stored?.length) return stored
  // Nessun seed demo: store vuoto finché l’org non crea annunci reali
  return []
}

export function jobPostingToOpenPosition(posting: JobPosting): MockOpenPosition {
  const { posterType } = ownerMeta(posting.ownerId, posting.ownerType)
  const requirements = parseRequirements(posting.requirementsText)
  const locationLabel = posting.location.address.trim()
    ? `${posting.location.comune}, ${posting.location.address}`
    : posting.location.comune

  return {
    id: `jp-op-${posting.id}`,
    category: posting.roleId,
    posterType,
    posterDisplayName: posting.ownerDisplayName,
    contractBucket: contractTypeToOpenBucket(posting.contractType),
    title: posting.title,
    excerpt: posting.description.slice(0, 160) + (posting.description.length > 160 ? '…' : ''),
    locationLabel,
    rateLabel: buildRateLabel(posting.compensation),
    scheduleLabel: buildScheduleLabel(posting.availability),
    descriptionIntro: posting.description,
    duties: posting.department.trim()
      ? [`Reparto / area: ${posting.department}`, `Contratto: ${JOB_POSTING_CONTRACT_LABELS[posting.contractType]}`]
      : [`Contratto: ${JOB_POSTING_CONTRACT_LABELS[posting.contractType]}`],
    requirements: requirements.length ? requirements : ['Requisiti da definire con il datore di lavoro'],
  }
}

export function listPublishedOpenPositions(): MockOpenPosition[] {
  const owners: Array<{ id: string; type: JobPostingOwnerType }> = [
    { id: 'agency-1', type: 'agency' },
    { id: 'struct-1', type: 'structure' },
  ]
  const out: MockOpenPosition[] = []
  for (const { id, type } of owners) {
    const postings = loadJobPostings(id, type).filter((p) => p.status === 'active')
    for (const p of postings) {
      out.push(jobPostingToOpenPosition(p))
    }
  }
  return out
}

export function getPublishedOpenPositionById(id: string): MockOpenPosition | undefined {
  return listPublishedOpenPositions().find((row) => row.id === id)
}

/** Maps directory open-position id (`jp-op-…`) to persisted job posting id. */
export function resolveJobPostingIdFromOpenPositionId(openPositionId: string): string | null {
  const prefix = 'jp-op-'
  if (!openPositionId.startsWith(prefix)) return null
  return openPositionId.slice(prefix.length) || null
}

function posterFilterMatches(
  poster: OpenPositionFilters['poster'],
  posterType: OpenPositionPoster,
): boolean {
  if (poster === 'all') return true
  if (poster === 'famiglia') return posterType === 'famiglia'
  return posterType === 'agenzia' || posterType === 'struttura'
}

export function listPublishedOpenPositionsForHome(filters: OpenPositionFilters): MockOpenPosition[] {
  return listPublishedOpenPositions().filter((row) => {
    const cityOk =
      !filters.cityQuery.trim() || locationMatchesCity(filters.cityQuery, row.locationLabel)
    const roleOk = filters.roleId === 'all' || row.category === filters.roleId
    const posterOk = posterFilterMatches(filters.poster, row.posterType)
    const contractOk = filters.contract === 'all' || row.contractBucket === filters.contract
    return cityOk && roleOk && posterOk && contractOk
  })
}

export function validateJobPostingStep(
  stepId: JobPostingWizardStepId,
  input: JobPostingFormInput,
): JobPostingError | null {
  const fieldErrors: NonNullable<JobPostingError['fieldErrors']> = {}

  switch (stepId) {
    case 'ruolo':
      if (!input.title.trim()) fieldErrors.title = 'Inserisci un titolo per la posizione.'
      break
    case 'descrizione':
      if (input.description.trim().length < 40) {
        fieldErrors.description = 'La descrizione deve avere almeno 40 caratteri.'
      }
      break
    case 'requisiti':
      if (input.requirementsText.trim().length < 10) {
        fieldErrors.requirementsText = 'Indica almeno un requisito (una riga per punto).'
      }
      break
    case 'disponibilita':
      if (input.availability.days.length === 0) {
        fieldErrors.days = 'Seleziona almeno un giorno o fascia.'
      }
      break
    case 'retribuzione':
      if (
        input.compensation.minAmount == null &&
        input.compensation.maxAmount == null &&
        !input.compensation.notes.trim()
      ) {
        fieldErrors.minAmount = 'Indica una fascia retributiva o una nota.'
      }
      break
    case 'sede':
      if (!input.location.comune.trim()) fieldErrors.comune = 'Seleziona il comune della sede.'
      if (!input.contractType) fieldErrors.contractType = 'Seleziona il tipo di contratto.'
      break
    case 'pubblicazione':
      break
    default: {
      const _x: never = stepId
      return _x
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return new JobPostingError('validation', 'Controlla i campi evidenziati.', fieldErrors)
  }
  return null
}

export function validateJobPostingForm(input: JobPostingFormInput): JobPostingError | null {
  for (const stepId of JOB_POSTING_WIZARD_STEPS) {
    if (stepId === 'pubblicazione') continue
    const err = validateJobPostingStep(stepId, input)
    if (err) return err
  }
  return null
}

export function formatJobPostingDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function emptyJobPostingForm(ownerType: JobPostingOwnerType): JobPostingFormInput {
  return {
    roleId: ownerType === 'structure' ? 'oss' : 'caregiver',
    title: '',
    description: '',
    requirementsText: '',
    availability: { days: [], scheduleNotes: '', startDate: '' },
    compensation: { minAmount: null, maxAmount: null, period: 'monthly', notes: '' },
    contractType: ownerType === 'structure' ? 'permanent' : 'permanent',
    location: { comune: '', provincia: '', cap: '', address: '' },
    department: ownerType === 'structure' ? '' : '',
  }
}

export function jobPostingFormFromPosting(posting: JobPosting): JobPostingFormInput {
  return {
    roleId: posting.roleId,
    title: posting.title,
    description: posting.description,
    requirementsText: posting.requirementsText,
    availability: { ...posting.availability, days: [...posting.availability.days] },
    compensation: { ...posting.compensation },
    contractType: posting.contractType,
    location: { ...posting.location },
    department: posting.department,
  }
}

export function geoRowToJobLocation(place: ItaliaGeoRow): JobPosting['location'] {
  return {
    comune: place.comune,
    provincia: place.siglaProvincia,
    cap: place.cap,
    address: '',
    organizationLocationId: undefined,
  }
}

export async function fetchJobPostings(
  ownerId: string,
  ownerType: JobPostingOwnerType,
): Promise<JobPosting[]> {
  await delay()
  if (!ownerId) throw new JobPostingError('not_found', 'Sessione non valida.')
  if (ownerId.toLowerCase().includes('server-error')) {
    throw new JobPostingError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }
  return loadJobPostings(ownerId, ownerType)
}

export async function createJobPosting(
  ownerId: string,
  ownerType: JobPostingOwnerType,
  input: JobPostingCreateInput,
): Promise<JobPosting> {
  await delay()
  if (!ownerId) throw new JobPostingError('not_found', 'Sessione non valida.')

  const validationError = validateJobPostingForm(input)
  if (validationError) throw validationError

  const { ownerDisplayName } = ownerMeta(ownerId, ownerType)
  const now = new Date().toISOString()
  const status: JobPostingStatus =
    input.publishAs === 'draft' ? 'draft' : 'pending_review'

  const posting: JobPosting = {
    id: `jp-${ownerId}-${Date.now()}`,
    ownerId,
    ownerType,
    ownerDisplayName,
    roleId: input.roleId,
    title: input.title.trim(),
    description: input.description.trim(),
    requirementsText: input.requirementsText.trim(),
    availability: {
      days: [...input.availability.days],
      scheduleNotes: input.availability.scheduleNotes.trim(),
      startDate: input.availability.startDate.trim(),
    },
    compensation: { ...input.compensation },
    contractType: input.contractType,
    location: {
      comune: input.location.comune.trim(),
      provincia: input.location.provincia.trim(),
      cap: input.location.cap.trim(),
      address: input.location.address.trim(),
    },
    department: input.department.trim(),
    status,
    applicationCount: 0,
    createdAt: now,
    updatedAt: now,
    version: 1,
    changeHistory: [{ at: now, version: 1, summary: 'Annuncio creato' }],
  }

  const store = loadJobPostings(ownerId, ownerType)
  writeStore(ownerId, [posting, ...store])
  return posting
}

export async function updateJobPosting(
  ownerId: string,
  ownerType: JobPostingOwnerType,
  postingId: string,
  input: JobPostingUpdateInput,
): Promise<JobPosting> {
  await delay()
  if (!ownerId) throw new JobPostingError('not_found', 'Sessione non valida.')

  const store = loadJobPostings(ownerId, ownerType)
  const index = store.findIndex((p) => p.id === postingId)
  if (index === -1) throw new JobPostingError('not_found', 'Annuncio non trovato.')

  const current = store[index]
  const merged: JobPostingFormInput = {
    ...jobPostingFormFromPosting(current),
    ...input,
    availability: input.availability
      ? { ...current.availability, ...input.availability, days: input.availability.days ?? current.availability.days }
      : current.availability,
    compensation: input.compensation ? { ...current.compensation, ...input.compensation } : current.compensation,
    location: input.location ? { ...current.location, ...input.location } : current.location,
  }

  const validationError = validateJobPostingForm(merged)
  if (validationError) throw validationError

  const now = new Date().toISOString()
  const nextVersion = current.version + 1
  let status = current.status
  if (input.publishAs) {
    status =
      input.publishAs === 'active' && current.status === 'draft'
        ? 'pending_review'
        : input.publishAs
  }

  const updated: JobPosting = {
    ...current,
    ...merged,
    title: merged.title.trim(),
    description: merged.description.trim(),
    requirementsText: merged.requirementsText.trim(),
    status,
    updatedAt: now,
    version: nextVersion,
    changeHistory: [
      ...current.changeHistory,
      {
        at: now,
        version: nextVersion,
        summary: input.changeSummary?.trim() || 'Annuncio aggiornato',
      },
    ],
  }

  const next = [...store]
  next[index] = updated
  writeStore(ownerId, next)
  return updated
}

export async function deleteJobPosting(
  ownerId: string,
  ownerType: JobPostingOwnerType,
  postingId: string,
): Promise<void> {
  await delay(200)
  if (!ownerId) throw new JobPostingError('not_found', 'Sessione non valida.')

  const store = loadJobPostings(ownerId, ownerType)
  const next = store.filter((p) => p.id !== postingId)
  if (next.length === store.length) {
    throw new JobPostingError('not_found', 'Annuncio non trovato.')
  }
  writeStore(ownerId, next)
}

export async function patchJobPostingStatus(
  ownerId: string,
  ownerType: JobPostingOwnerType,
  postingId: string,
  status: JobPostingStatus,
): Promise<JobPosting> {
  const summary =
    status === 'paused'
      ? 'Messo in pausa'
      : status === 'active'
        ? 'Ripubblicato'
        : status === 'closed'
          ? 'Chiuso'
          : status === 'pending_review'
            ? 'Inviato in revisione'
            : 'Stato aggiornato'

  return updateJobPosting(ownerId, ownerType, postingId, {
    publishAs: status,
    changeSummary: summary,
  })
}

const MODERATION_OWNERS: Array<{ id: string; type: JobPostingOwnerType }> = [
  { id: 'agency-1', type: 'agency' },
  { id: 'struct-1', type: 'structure' },
]

export function listAllJobPostings(): JobPosting[] {
  const out: JobPosting[] = []
  for (const { id, type } of MODERATION_OWNERS) {
    out.push(...loadJobPostings(id, type))
  }
  return out
}

export function listPendingReviewJobPostings(): JobPosting[] {
  return listAllJobPostings().filter((p) => p.status === 'pending_review')
}

export async function approveJobPostingModeration(
  ownerId: string,
  ownerType: JobPostingOwnerType,
  postingId: string,
): Promise<JobPosting> {
  await delay(300)
  return patchJobPostingStatus(ownerId, ownerType, postingId, 'active')
}

export async function rejectJobPostingModeration(
  ownerId: string,
  ownerType: JobPostingOwnerType,
  postingId: string,
  reason?: string,
): Promise<JobPosting> {
  await delay(300)
  return updateJobPosting(ownerId, ownerType, postingId, {
    publishAs: 'rejected',
    changeSummary: reason?.trim()
      ? `Rifiutato in moderazione: ${reason.trim()}`
      : 'Rifiutato in moderazione',
  })
}

export { DAYS as JOB_POSTING_DAYS }
export type { JobPosting, JobPostingCreateInput, JobPostingFormInput, JobPostingStatus }
