/**
 * Applications API — doppio binario mock / Laravel.
 *
 * Endpoint reali:
 *   POST   /api/v1/applications/job-postings/:id
 *   POST   /api/v1/applications/family-requests/:id
 *   GET    /api/v1/applications?role=
 *   PATCH  /api/v1/applications/:id
 */
import type { FamilyApplication, FamilyCandidateStatus } from './familyRequestTypes'
import type {
  Application,
  ApplicationActorRole,
  ApplicationApplyInput,
  ApplicationStatus,
} from './applicationTypes'
import { ApplicationError } from './applicationTypes'
import {
  applyToFamilyRequest,
  applyToJobPosting,
  fetchApplicationsByRole,
  patchApplicationStatus,
  patchFamilyApplicationStatus,
  withdrawApplication,
} from '../services/applicationService'
import { familyStatusToApplicationStatus } from './applicationTypes'
import { HttpError, httpGet, httpPatch, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type {
  Application,
  ApplicationActorRole,
  ApplicationApplyInput,
  ApplicationStatus,
  ApplicationTargetType,
} from './applicationTypes'
export {
  ApplicationError,
  B2B_PIPELINE_ORDER,
  B2B_RECEIVED_STATUS_LABELS,
  OUTGOING_STATUS_LABELS,
  toB2BDisplayStatus,
  toOutgoingDisplayStatus,
  b2bStatusToApplicationStatus,
} from './applicationTypes'

function toAppError(err: unknown, fallback: string): ApplicationError {
  if (err instanceof HttpError) {
    if (err.code === 'duplicate') return new ApplicationError('duplicate', err.message)
    if (err.code === 'plan_limit') return new ApplicationError('plan_limit', err.message)
    if (err.kind === 'not_found' || err.code === 'not_found') {
      return new ApplicationError('not_found', err.message)
    }
    if (err.kind === 'validation') return new ApplicationError('validation', err.message)
    return new ApplicationError('server', err.message || fallback)
  }
  return new ApplicationError('server', fallback)
}

export async function getApplicationsByRole(
  userId: string,
  role: ApplicationActorRole,
): Promise<Application[]> {
  if (isMockApiEnabled()) return fetchApplicationsByRole(userId, role)
  try {
    return await httpGet<Application[]>('/api/v1/applications', { query: { role } })
  } catch (err) {
    throw toAppError(err, 'Impossibile caricare le candidature.')
  }
}

export async function postJobPostingApplication(
  applicantId: string,
  openPositionId: string,
  input?: ApplicationApplyInput,
): Promise<Application> {
  if (isMockApiEnabled()) return applyToJobPosting(applicantId, openPositionId, input)
  try {
    return await httpPost<Application>(`/api/v1/applications/job-postings/${openPositionId}`, {
      body: input ?? {},
    })
  } catch (err) {
    throw toAppError(err, 'Candidatura non inviata.')
  }
}

export async function postFamilyRequestApplication(
  applicantId: string,
  requestId: string,
  input?: ApplicationApplyInput,
): Promise<Application> {
  if (isMockApiEnabled()) return applyToFamilyRequest(applicantId, requestId, input)
  try {
    return await httpPost<Application>(`/api/v1/applications/family-requests/${requestId}`, {
      body: input ?? {},
    })
  } catch (err) {
    throw toAppError(err, 'Candidatura non inviata.')
  }
}

export async function updateApplicationStatus(
  actorId: string,
  actorRole: ApplicationActorRole,
  applicationId: string,
  status: ApplicationStatus,
): Promise<Application> {
  if (isMockApiEnabled()) return patchApplicationStatus(actorId, actorRole, applicationId, status)
  try {
    return await httpPatch<Application>(`/api/v1/applications/${applicationId}`, {
      body: { status },
    })
  } catch (err) {
    throw toAppError(err, 'Aggiornamento candidatura non riuscito.')
  }
}

export async function updateFamilyApplicationStatus(
  familyUserId: string,
  applicationId: string,
  status: FamilyCandidateStatus,
): Promise<FamilyApplication> {
  if (isMockApiEnabled()) return patchFamilyApplicationStatus(familyUserId, applicationId, status)
  try {
    await httpPatch(`/api/v1/applications/${applicationId}`, {
      body: { status: familyStatusToApplicationStatus(status) },
    })
    return {
      id: applicationId,
      requestId: '',
      familyUserId,
      professionalId: '',
      name: '',
      initials: '',
      category: '',
      zone: '',
      stars: 0,
      preview: '',
      status,
    }
  } catch (err) {
    throw toAppError(err, 'Aggiornamento candidatura non riuscito.')
  }
}

export async function withdrawJobApplication(
  applicantId: string,
  applicationId: string,
): Promise<Application> {
  if (isMockApiEnabled()) return withdrawApplication(applicantId, applicationId)
  try {
    return await httpPatch<Application>(`/api/v1/applications/${applicationId}`, {
      body: { status: 'withdrawn' },
    })
  } catch (err) {
    throw toAppError(err, 'Ritiro candidatura non riuscito.')
  }
}
