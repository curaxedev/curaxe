/**
 * B2B job posting API — doppio binario mock / Laravel.
 *
 * Endpoint reali:
 *   GET    /api/v1/b2b/job-postings
 *   POST   /api/v1/b2b/job-postings
 *   PATCH  /api/v1/b2b/job-postings/:id
 *   DELETE /api/v1/b2b/job-postings/:id
 */
import type {
  JobPosting,
  JobPostingCreateInput,
  JobPostingOwnerType,
  JobPostingStatus,
  JobPostingUpdateInput,
} from './jobPostingTypes'
import { JobPostingError } from './jobPostingTypes'
import {
  createJobPosting,
  deleteJobPosting,
  fetchJobPostings,
  patchJobPostingStatus,
  updateJobPosting,
} from '../services/jobPostingService'
import { HttpError, httpDelete, httpGet, httpPatch, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type {
  JobPosting,
  JobPostingCreateInput,
  JobPostingFormInput,
  JobPostingOwnerType,
  JobPostingStatus,
  JobPostingUpdateInput,
  JobPostingWizardStepId,
} from './jobPostingTypes'
export { JobPostingError, JOB_POSTING_WIZARD_STEPS } from './jobPostingTypes'

function toJobError(err: unknown, fallback: string): JobPostingError {
  if (err instanceof HttpError) {
    if (err.kind === 'not_found' || err.code === 'not_found') {
      return new JobPostingError('not_found', err.message)
    }
    if (err.kind === 'validation') return new JobPostingError('validation', err.message)
    return new JobPostingError('server', err.message || fallback)
  }
  return new JobPostingError('server', fallback)
}

export async function getJobPostings(
  ownerId: string,
  ownerType: JobPostingOwnerType,
): Promise<JobPosting[]> {
  if (isMockApiEnabled()) return fetchJobPostings(ownerId, ownerType)
  try {
    return await httpGet<JobPosting[]>('/api/v1/b2b/job-postings')
  } catch (err) {
    throw toJobError(err, 'Impossibile caricare gli annunci.')
  }
}

export async function postJobPosting(
  ownerId: string,
  ownerType: JobPostingOwnerType,
  input: JobPostingCreateInput,
): Promise<JobPosting> {
  if (isMockApiEnabled()) return createJobPosting(ownerId, ownerType, input)
  try {
    return await httpPost<JobPosting>('/api/v1/b2b/job-postings', { body: input })
  } catch (err) {
    throw toJobError(err, 'Creazione annuncio non riuscita.')
  }
}

export async function patchJobPosting(
  ownerId: string,
  ownerType: JobPostingOwnerType,
  postingId: string,
  input: JobPostingUpdateInput,
): Promise<JobPosting> {
  if (isMockApiEnabled()) return updateJobPosting(ownerId, ownerType, postingId, input)
  try {
    return await httpPatch<JobPosting>(`/api/v1/b2b/job-postings/${postingId}`, { body: input })
  } catch (err) {
    throw toJobError(err, 'Aggiornamento annuncio non riuscito.')
  }
}

export async function removeJobPosting(
  ownerId: string,
  ownerType: JobPostingOwnerType,
  postingId: string,
): Promise<void> {
  if (isMockApiEnabled()) return deleteJobPosting(ownerId, ownerType, postingId)
  try {
    await httpDelete(`/api/v1/b2b/job-postings/${postingId}`)
  } catch (err) {
    throw toJobError(err, 'Eliminazione annuncio non riuscita.')
  }
}

export async function updateJobPostingStatus(
  ownerId: string,
  ownerType: JobPostingOwnerType,
  postingId: string,
  status: JobPostingStatus,
): Promise<JobPosting> {
  if (isMockApiEnabled()) return patchJobPostingStatus(ownerId, ownerType, postingId, status)
  try {
    return await httpPatch<JobPosting>(`/api/v1/b2b/job-postings/${postingId}`, {
      body: { publishAs: status },
    })
  } catch (err) {
    throw toJobError(err, 'Aggiornamento stato annuncio non riuscito.')
  }
}

export type B2BOverview = {
  organization: {
    id: string
    name: string
    kind: string
    comune: string
    coverageHint: string
    bio: string | null
    services: string[]
    roleLabel: string
  }
  stats: {
    activePostings: number
    applicationsReceived: number
    networkProfessionals: number
  }
  chartLast30Days: number[]
  latestPostings: Array<{ id: string; title: string; applications: number; status: string }>
}

export async function fetchB2BOverview(): Promise<B2BOverview> {
  if (isMockApiEnabled()) {
    return {
      organization: {
        id: 'org-mock',
        name: 'Agenzia AuraCare Srl',
        kind: 'agency',
        comune: 'Milano',
        coverageHint: 'Milano, Monza-Brianza',
        bio: 'Agenzia specializzata nell’assistenza domiciliare.',
        services: ['Badanti', 'OSS', 'Infermieri'],
        roleLabel: 'Agenzia di assistenza domiciliare',
      },
      stats: { activePostings: 4, applicationsReceived: 31, networkProfessionals: 24 },
      chartLast30Days: Array.from({ length: 30 }, (_, i) => 8 + ((i * 3) % 17)),
      latestPostings: [],
    }
  }
  return httpGet<B2BOverview>('/api/v1/b2b/overview')
}

export async function patchB2BOrganization(body: Record<string, unknown>): Promise<B2BOverview> {
  if (isMockApiEnabled()) {
    const current = await fetchB2BOverview()
    return {
      ...current,
      organization: {
        ...current.organization,
        name: String(body.name ?? current.organization.name),
        bio: (body.bio as string | undefined) ?? current.organization.bio,
        coverageHint: String(body.coverageHint ?? current.organization.coverageHint),
        comune: String(body.comune ?? current.organization.comune),
        services: (body.services as string[] | undefined) ?? current.organization.services,
      },
    }
  }
  return httpPatch<B2BOverview>('/api/v1/b2b/organization', { body })
}
