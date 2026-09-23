import type { FamilyApplication, FamilyCandidateStatus } from '../lib/familyRequestTypes'
import type {
  Application,
  ApplicationActorRole,
  ApplicationApplyInput,
  ApplicationPublisherKind,
  ApplicationStatus,
  ApplicationTargetType,
} from '../lib/applicationTypes'
import {
  ApplicationError,
  familyStatusToApplicationStatus,
  toFamilyDisplayStatus,
  validateApplicationStatusTransition,
} from '../lib/applicationTypes'
import type { JobPosting, JobPostingOwnerType } from '../lib/jobPostingTypes'
import type { FamilyRequest } from '../lib/familyRequestTypes'
import {
  loadJobPostings,
  resolveJobPostingIdFromOpenPositionId,
} from './jobPostingService'

const FAMILY_REQUEST_STORAGE_PREFIX = 'fa:family-requests:'

const MOCK_DELAY_MS = 500
const STORAGE_KEY = 'fa:applications:global'

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function findFamilyRequest(requestId: string): FamilyRequest | null {
  const userIds = ['fam-1']
  for (const userId of userIds) {
    try {
      const raw = localStorage.getItem(`${FAMILY_REQUEST_STORAGE_PREFIX}${userId}`)
      if (!raw) continue
      const store = JSON.parse(raw) as { requests: FamilyRequest[] }
      const found = store.requests.find((r) => r.id === requestId)
      if (found) return found
    } catch {
      continue
    }
  }
  return null
}

function readAll(): Application[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Application[]
  } catch {
    return []
  }
}

function writeAll(applications: Application[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications))
}

function findJobPosting(
  postingId: string,
): { posting: JobPosting; ownerType: JobPostingOwnerType } | null {
  const owners: Array<{ id: string; type: JobPostingOwnerType }> = [
    { id: 'agency-1', type: 'agency' },
    { id: 'struct-1', type: 'structure' },
  ]
  for (const { id, type } of owners) {
    const posting = loadJobPostings(id, type).find((p) => p.id === postingId)
    if (posting) return { posting, ownerType: type }
  }
  return null
}

function publisherKindFromOwnerType(ownerType: JobPostingOwnerType): ApplicationPublisherKind {
  return ownerType === 'structure' ? 'struttura' : 'agenzia'
}

function syncJobPostingApplicationCounts(): void {
  const owners: Array<{ id: string; type: JobPostingOwnerType }> = [
    { id: 'agency-1', type: 'agency' },
    { id: 'struct-1', type: 'structure' },
  ]
  const apps = readAll().filter(
    (a) =>
      a.targetType === 'job_posting' &&
      a.status !== 'withdrawn',
  )

  for (const { id, type } of owners) {
    const postings = loadJobPostings(id, type)
    const counts = new Map<string, number>()
    for (const app of apps) {
      if (postings.some((p) => p.id === app.targetId)) {
        counts.set(app.targetId, (counts.get(app.targetId) ?? 0) + 1)
      }
    }
    const next = postings.map((p) => ({
      ...p,
      applicationCount: counts.get(p.id) ?? 0,
    }))
    localStorage.setItem(`fa:job-postings:${id}`, JSON.stringify(next))
  }
}

function professionalProfile(applicantId: string): {
  name: string
  initials: string
  category: string
  zone: string
  stars: number
  preview: string
} {
  const profiles: Record<string, ReturnType<typeof professionalProfile>> = {
    'prof-1': {
      name: 'Maria Rossi',
      initials: 'MR',
      category: 'Badante',
      zone: 'Milano',
      stars: 5,
      preview: 'Disponibile subito, esperienza 9 anni con anziani non autosufficienti.',
    },
  }
  return (
    profiles[applicantId] ?? {
      name: 'Professionista',
      initials: 'PR',
      category: 'Badante',
      zone: 'Milano',
      stars: 4,
      preview: 'Profilo professionista registrato sulla piattaforma.',
    }
  )
}

function createSeedApplications(): Application[] {
  const now = '2026-05-05T10:00:00.000Z'
  const agencyPosting = findJobPosting('jp-agency-1-1')
  const structPosting = findJobPosting('jp-struct-1-1')

  const seeds: Application[] = []

  if (agencyPosting) {
    const { posting } = agencyPosting
    seeds.push(
      {
        id: 'app-jp-1',
        targetType: 'job_posting',
        targetId: posting.id,
        ownerId: posting.ownerId,
        applicantId: 'prof-1',
        applicantName: 'Maria Rossi',
        applicantInitials: 'MR',
        applicantCategory: 'Badante',
        applicantZone: 'Milano',
        applicantStars: 5,
        applicantPreview: 'Disponibile subito, esperienza 9 anni.',
        targetTitle: posting.title,
        targetPublisherName: posting.ownerDisplayName,
        targetPublisherKind: 'agenzia',
        status: 'submitted',
        createdAt: '2026-05-09T08:00:00.000Z',
        updatedAt: '2026-05-09T08:00:00.000Z',
      },
      {
        id: 'app-jp-2',
        targetType: 'job_posting',
        targetId: posting.id,
        ownerId: posting.ownerId,
        applicantId: 'prof-8',
        applicantName: 'Luciana Toma',
        applicantInitials: 'LT',
        applicantCategory: 'Badante',
        applicantZone: 'Sesto S.G.',
        applicantStars: 4,
        applicantPreview: 'OSS certificata, patente B.',
        targetTitle: posting.title,
        targetPublisherName: posting.ownerDisplayName,
        targetPublisherKind: 'agenzia',
        status: 'viewed',
        createdAt: '2026-05-06T09:00:00.000Z',
        updatedAt: '2026-05-07T11:00:00.000Z',
      },
      {
        id: 'app-jp-3',
        targetType: 'job_posting',
        targetId: 'jp-agency-1-2',
        ownerId: posting.ownerId,
        applicantId: 'prof-3',
        applicantName: 'Florentina Pop',
        applicantInitials: 'FP',
        applicantCategory: 'OSS',
        applicantZone: 'Milano',
        applicantStars: 5,
        applicantPreview: '15 anni di esperienza.',
        targetTitle: 'OSS part-time mattino',
        targetPublisherName: posting.ownerDisplayName,
        targetPublisherKind: 'agenzia',
        status: 'shortlisted',
        createdAt: '2026-05-02T10:00:00.000Z',
        updatedAt: '2026-05-04T14:00:00.000Z',
      },
    )
  }

  if (structPosting) {
    const { posting } = structPosting
    seeds.push({
      id: 'app-jp-4',
      targetType: 'job_posting',
      targetId: posting.id,
      ownerId: posting.ownerId,
      applicantId: 'prof-4',
      applicantName: 'Giulia Bianchi',
      applicantInitials: 'GB',
      applicantCategory: 'Infermiere',
      applicantZone: 'Monza',
      applicantStars: 4,
      applicantPreview: 'Esperienza RSA notturna.',
      targetTitle: posting.title,
      targetPublisherName: posting.ownerDisplayName,
      targetPublisherKind: 'struttura',
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    })
  }

  const familyApps: Application[] = [
    {
      id: 'app-1',
      targetType: 'family_request',
      targetId: 'req-1',
      ownerId: 'fam-1',
      applicantId: 'prof-1',
      applicantName: 'Maria Rossi',
      applicantInitials: 'MR',
      applicantCategory: 'Badante',
      applicantZone: 'Milano',
      applicantStars: 5,
      applicantPreview: 'Disponibile subito, esperienza 9 anni con anziani non autosufficienti.',
      targetTitle: 'Badante per nonna anziana a Milano',
      targetPublisherName: 'Famiglia',
      targetPublisherKind: 'famiglia',
      status: 'submitted',
      createdAt: '2026-05-05T10:00:00.000Z',
      updatedAt: '2026-05-05T10:00:00.000Z',
    },
    {
      id: 'app-2',
      targetType: 'family_request',
      targetId: 'req-1',
      ownerId: 'fam-1',
      applicantId: 'prof-8',
      applicantName: 'Luciana Toma',
      applicantInitials: 'LT',
      applicantCategory: 'Badante',
      applicantZone: 'Sesto S.G.',
      applicantStars: 4,
      applicantPreview: 'OSS certificata, patente B, disponibile convivente.',
      targetTitle: 'Badante per nonna anziana a Milano',
      targetPublisherName: 'Famiglia',
      targetPublisherKind: 'famiglia',
      status: 'shortlisted',
      createdAt: '2026-05-04T09:00:00.000Z',
      updatedAt: '2026-05-06T12:00:00.000Z',
    },
    {
      id: 'app-3',
      targetType: 'family_request',
      targetId: 'req-1',
      ownerId: 'fam-1',
      applicantId: 'prof-3',
      applicantName: 'Florentina Pop',
      applicantInitials: 'FP',
      applicantCategory: 'Badante',
      applicantZone: 'Milano',
      applicantStars: 5,
      applicantPreview: '15 anni di esperienza, referenze eccellenti.',
      targetTitle: 'Badante per nonna anziana a Milano',
      targetPublisherName: 'Famiglia',
      targetPublisherKind: 'famiglia',
      status: 'accepted',
      createdAt: '2026-05-03T08:00:00.000Z',
      updatedAt: '2026-05-07T10:00:00.000Z',
    },
    {
      id: 'app-4',
      targetType: 'family_request',
      targetId: 'req-1',
      ownerId: 'fam-1',
      applicantId: 'prof-4',
      applicantName: 'Adelina Marin',
      applicantInitials: 'AM',
      applicantCategory: 'Badante',
      applicantZone: 'Cologno M.',
      applicantStars: 4,
      applicantPreview: 'Disponibile part-time mattino, automunita.',
      targetTitle: 'Badante per nonna anziana a Milano',
      targetPublisherName: 'Famiglia',
      targetPublisherKind: 'famiglia',
      status: 'submitted',
      createdAt: '2026-05-02T11:00:00.000Z',
      updatedAt: '2026-05-02T11:00:00.000Z',
    },
    {
      id: 'app-5',
      targetType: 'family_request',
      targetId: 'req-1',
      ownerId: 'fam-1',
      applicantId: 'prof-5',
      applicantName: 'Carmen Ionescu',
      applicantInitials: 'CI',
      applicantCategory: 'Badante',
      applicantZone: 'Milano',
      applicantStars: 3,
      applicantPreview: 'Italiana madre lingua, diplomata in servizi sociali.',
      targetTitle: 'Badante per nonna anziana a Milano',
      targetPublisherName: 'Famiglia',
      targetPublisherKind: 'famiglia',
      status: 'discarded',
      createdAt: '2026-05-01T09:00:00.000Z',
      updatedAt: '2026-05-08T09:00:00.000Z',
    },
    {
      id: 'app-6',
      targetType: 'family_request',
      targetId: 'req-1',
      ownerId: 'fam-1',
      applicantId: 'prof-6',
      applicantName: 'Giuseppina Sarti',
      applicantInitials: 'GS',
      applicantCategory: 'Badante',
      applicantZone: 'Rho',
      applicantStars: 4,
      applicantPreview: 'Ex dipendente RSA, disponibile weekend e notti.',
      targetTitle: 'Badante per nonna anziana a Milano',
      targetPublisherName: 'Famiglia',
      targetPublisherKind: 'famiglia',
      status: 'submitted',
      createdAt: '2026-04-30T08:00:00.000Z',
      updatedAt: '2026-04-30T08:00:00.000Z',
    },
  ]

  seeds.push(
    {
      id: 'app-pro-out-1',
      targetType: 'job_posting',
      targetId: 'jp-agency-1-2',
      ownerId: 'agency-1',
      applicantId: 'prof-1',
      applicantName: 'Maria Rossi',
      applicantInitials: 'MR',
      applicantCategory: 'Badante',
      applicantZone: 'Milano',
      applicantStars: 5,
      applicantPreview: 'Disponibile per turni mattutini.',
      targetTitle: 'OSS part-time mattino',
      targetPublisherName: 'AuraCare Srl',
      targetPublisherKind: 'agenzia',
      status: 'viewed',
      createdAt: '2026-05-06T09:00:00.000Z',
      updatedAt: '2026-05-07T11:00:00.000Z',
    },
  )

  return [...seeds, ...familyApps]
}

export function loadApplications(): Application[] {
  const stored = readAll()
  if (stored.length) return stored
  const seed = createSeedApplications()
  writeAll(seed)
  syncJobPostingApplicationCounts()
  return seed
}

export function toFamilyApplication(app: Application): FamilyApplication {
  return {
    id: app.id,
    requestId: app.targetId,
    familyUserId: app.ownerId,
    professionalId: app.applicantId,
    name: app.applicantName,
    initials: app.applicantInitials,
    category: app.applicantCategory,
    zone: app.applicantZone,
    stars: app.applicantStars,
    preview: app.applicantPreview,
    status: toFamilyDisplayStatus(app.status),
  }
}

export function listApplicationsForFamilyUser(familyUserId: string): FamilyApplication[] {
  return loadApplications()
    .filter((a) => a.targetType === 'family_request' && a.ownerId === familyUserId)
    .map(toFamilyApplication)
}

export function countApplicationsForFamilyRequests(
  familyUserId: string,
  requestIds: string[],
): Map<string, number> {
  const ids = new Set(requestIds)
  const counts = new Map<string, number>()
  for (const app of loadApplications()) {
    if (
      app.targetType === 'family_request' &&
      app.ownerId === familyUserId &&
      ids.has(app.targetId) &&
      app.status !== 'withdrawn'
    ) {
      counts.set(app.targetId, (counts.get(app.targetId) ?? 0) + 1)
    }
  }
  return counts
}

export async function fetchApplicationsByRole(
  userId: string,
  role: ApplicationActorRole,
): Promise<Application[]> {
  await delay()
  if (!userId) throw new ApplicationError('not_found', 'Sessione non valida.')
  if (userId.toLowerCase().includes('server-error')) {
    throw new ApplicationError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const all = loadApplications()

  switch (role) {
    case 'professional':
      return all.filter((a) => a.applicantId === userId && a.status !== 'withdrawn')
    case 'agency':
    case 'structure':
      return all.filter(
        (a) => a.targetType === 'job_posting' && a.ownerId === userId,
      )
    case 'public_user':
      return all.filter(
        (a) => a.targetType === 'family_request' && a.ownerId === userId,
      )
    default: {
      const _x: never = role
      return _x
    }
  }
}

export async function applyToJobPosting(
  applicantId: string,
  openPositionId: string,
  _input?: ApplicationApplyInput,
): Promise<Application> {
  await delay()
  if (!applicantId) throw new ApplicationError('not_found', 'Sessione non valida.')

  const postingId = resolveJobPostingIdFromOpenPositionId(openPositionId)
  if (!postingId) {
    throw new ApplicationError('not_found', 'Annuncio non trovato.')
  }

  const found = findJobPosting(postingId)
  if (!found) {
    throw new ApplicationError('not_found', 'Annuncio non trovato.')
  }

  const { posting } = found
  if (posting.status !== 'active') {
    throw new ApplicationError('validation', 'Questo annuncio non accetta candidature.')
  }

  const all = loadApplications()
  const duplicate = all.find(
    (a) =>
      a.targetType === 'job_posting' &&
      a.targetId === postingId &&
      a.applicantId === applicantId &&
      a.status !== 'withdrawn',
  )
  if (duplicate) {
    throw new ApplicationError('duplicate', 'Hai già inviato una candidatura per questo annuncio.')
  }

  const profile = professionalProfile(applicantId)
  const now = new Date().toISOString()
  const application: Application = {
    id: `app-${Date.now()}`,
    targetType: 'job_posting',
    targetId: postingId,
    ownerId: posting.ownerId,
    applicantId,
    applicantName: profile.name,
    applicantInitials: profile.initials,
    applicantCategory: profile.category,
    applicantZone: profile.zone,
    applicantStars: profile.stars,
    applicantPreview: profile.preview,
    targetTitle: posting.title,
    targetPublisherName: posting.ownerDisplayName,
    targetPublisherKind: publisherKindFromOwnerType(posting.ownerType),
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
  }

  writeAll([application, ...all])
  syncJobPostingApplicationCounts()
  return application
}

export async function applyToFamilyRequest(
  applicantId: string,
  requestId: string,
  input?: ApplicationApplyInput,
): Promise<Application> {
  await delay()
  if (!applicantId) throw new ApplicationError('not_found', 'Sessione non valida.')

  const all = loadApplications()
  const duplicate = all.find(
    (a) =>
      a.targetType === 'family_request' &&
      a.targetId === requestId &&
      a.applicantId === applicantId &&
      a.status !== 'withdrawn',
  )
  if (duplicate) {
    throw new ApplicationError('duplicate', 'Hai già inviato una candidatura per questa richiesta.')
  }

  const request = findFamilyRequest(requestId)
  if (!request) {
    throw new ApplicationError('not_found', 'Richiesta non trovata.')
  }
  if (request.status !== 'active') {
    throw new ApplicationError('validation', 'Questa richiesta non accetta candidature.')
  }

  const profile = professionalProfile(applicantId)
  const preview = input?.message?.trim() || profile.preview
  const now = new Date().toISOString()

  const application: Application = {
    id: `app-${Date.now()}`,
    targetType: 'family_request',
    targetId: requestId,
    ownerId: request.familyUserId,
    applicantId,
    applicantName: profile.name,
    applicantInitials: profile.initials,
    applicantCategory: profile.category,
    applicantZone: profile.zone,
    applicantStars: profile.stars,
    applicantPreview: preview,
    targetTitle: request.title,
    targetPublisherName: 'Famiglia',
    targetPublisherKind: 'famiglia',
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
  }

  writeAll([application, ...all])
  return application
}

export async function patchApplicationStatus(
  actorId: string,
  actorRole: ApplicationActorRole,
  applicationId: string,
  status: ApplicationStatus,
): Promise<Application> {
  await delay(200)
  if (!actorId) throw new ApplicationError('not_found', 'Sessione non valida.')

  const all = loadApplications()
  const index = all.findIndex((a) => a.id === applicationId)
  if (index === -1) {
    throw new ApplicationError('not_found', 'Candidatura non trovata.')
  }

  const current = all[index]

  if (actorRole === 'professional' && current.applicantId !== actorId) {
    throw new ApplicationError('not_found', 'Candidatura non trovata.')
  }
  if (
    (actorRole === 'agency' || actorRole === 'structure') &&
    (current.ownerId !== actorId || current.targetType !== 'job_posting')
  ) {
    throw new ApplicationError('not_found', 'Candidatura non trovata.')
  }
  if (
    actorRole === 'public_user' &&
    (current.ownerId !== actorId || current.targetType !== 'family_request')
  ) {
    throw new ApplicationError('not_found', 'Candidatura non trovata.')
  }

  if (!validateApplicationStatusTransition(actorRole, current.targetType, current.status, status)) {
    throw new ApplicationError('validation', 'Transizione di stato non consentita.')
  }

  const now = new Date().toISOString()
  const updated: Application = { ...current, status, updatedAt: now }
  const next = [...all]
  next[index] = updated
  writeAll(next)
  syncJobPostingApplicationCounts()
  return updated
}

export async function patchFamilyApplicationStatus(
  familyUserId: string,
  applicationId: string,
  status: FamilyCandidateStatus,
): Promise<FamilyApplication> {
  const canonical = familyStatusToApplicationStatus(status)
  const updated = await patchApplicationStatus(
    familyUserId,
    'public_user',
    applicationId,
    canonical,
  )
  return toFamilyApplication(updated)
}

export async function withdrawApplication(
  applicantId: string,
  applicationId: string,
): Promise<Application> {
  return patchApplicationStatus(applicantId, 'professional', applicationId, 'withdrawn')
}

export function hasAppliedToOpenPosition(
  applicantId: string,
  openPositionId: string,
): boolean {
  const postingId = resolveJobPostingIdFromOpenPositionId(openPositionId)
  if (!postingId || !applicantId) return false
  return loadApplications().some(
    (a) =>
      a.targetType === 'job_posting' &&
      a.targetId === postingId &&
      a.applicantId === applicantId &&
      a.status !== 'withdrawn',
  )
}

export function formatApplicationDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function getApplicationById(applicationId: string): Application | null {
  return loadApplications().find((a) => a.id === applicationId) ?? null
}

export async function markApplicationContacted(
  actorId: string,
  actorRole: 'agency' | 'structure',
  applicationId: string,
): Promise<Application> {
  await delay(150)
  const application = getApplicationById(applicationId)
  if (
    !application ||
    application.ownerId !== actorId ||
    application.targetType !== 'job_posting'
  ) {
    throw new ApplicationError('not_found', 'Candidatura non trovata.')
  }

  if (application.status === 'submitted') {
    return patchApplicationStatus(actorId, actorRole, applicationId, 'viewed')
  }

  return application
}

export type { Application, ApplicationStatus, ApplicationTargetType }
