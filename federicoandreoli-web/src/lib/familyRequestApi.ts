/**
 * Family assistance request API — doppio binario mock / Laravel.
 *
 * Endpoint reali:
 *   GET   /api/v1/requests
 *   POST  /api/v1/requests
 *   PATCH /api/v1/requests/:id
 *   GET   /api/v1/requests/:id/applications
 */
import {
  createFamilyRequest,
  fetchFamilyRequests,
  patchFamilyApplicationStatus,
  patchFamilyRequestStatus,
} from '../services/familyRequestService'
import type {
  FamilyApplication,
  FamilyCandidateStatus,
  FamilyRequest,
  FamilyRequestCreateInput,
  FamilyRequestStatus,
  FamilyRequestStore,
} from './familyRequestTypes'
import { FamilyRequestError } from './familyRequestTypes'
import { familyStatusToApplicationStatus } from './applicationTypes'
import { HttpError, httpGet, httpPatch, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type {
  FamilyApplication,
  FamilyCandidateStatus,
  FamilyRequest,
  FamilyRequestCreateInput,
  FamilyRequestStatus,
  FamilyRequestStore,
} from './familyRequestTypes'
export { FamilyRequestError, FREE_PLAN_MAX_ACTIVE_REQUESTS } from './familyRequestTypes'

function toFamilyError(err: unknown, fallback: string): FamilyRequestError {
  if (err instanceof HttpError) {
    if (err.code === 'plan_limit') return new FamilyRequestError('plan_limit', err.message)
    if (err.kind === 'not_found' || err.code === 'not_found') {
      return new FamilyRequestError('not_found', err.message)
    }
    if (err.kind === 'validation') {
      return new FamilyRequestError('validation', err.message, {
        comune: err.firstError('comune'),
        days: err.firstError('days'),
        assistanceType: err.firstError('assistanceType'),
        beneficiary: err.firstError('beneficiary'),
        employmentType: err.firstError('employmentType'),
      })
    }
    return new FamilyRequestError('server', err.message || fallback)
  }
  return new FamilyRequestError('server', fallback)
}

export async function getFamilyRequests(userId: string): Promise<FamilyRequestStore> {
  if (isMockApiEnabled()) return fetchFamilyRequests(userId)
  try {
    return await httpGet<FamilyRequestStore>('/api/v1/requests')
  } catch (err) {
    throw toFamilyError(err, 'Impossibile caricare le richieste.')
  }
}

export async function postFamilyRequest(
  userId: string,
  input: FamilyRequestCreateInput,
  options?: { asDraft?: boolean },
): Promise<FamilyRequest> {
  if (isMockApiEnabled()) return createFamilyRequest(userId, input, options)
  try {
    return await httpPost<FamilyRequest>('/api/v1/requests', {
      body: { ...input, asDraft: options?.asDraft ?? false },
    })
  } catch (err) {
    throw toFamilyError(err, 'Creazione richiesta non riuscita.')
  }
}

export async function updateFamilyRequestStatus(
  userId: string,
  requestId: string,
  status: FamilyRequestStatus,
): Promise<FamilyRequest> {
  if (isMockApiEnabled()) return patchFamilyRequestStatus(userId, requestId, status)
  try {
    return await httpPatch<FamilyRequest>(`/api/v1/requests/${requestId}`, {
      body: { status },
    })
  } catch (err) {
    throw toFamilyError(err, 'Aggiornamento richiesta non riuscito.')
  }
}

export async function updateFamilyApplicationStatus(
  userId: string,
  applicationId: string,
  status: FamilyCandidateStatus,
): Promise<FamilyApplication> {
  if (isMockApiEnabled()) return patchFamilyApplicationStatus(userId, applicationId, status)
  try {
    await httpPatch(`/api/v1/applications/${applicationId}`, {
      body: { status: familyStatusToApplicationStatus(status) },
    })
    const store = await httpGet<FamilyRequestStore>('/api/v1/requests')
    const app = store.applications.find((a) => a.id === applicationId)
    if (!app) throw new FamilyRequestError('not_found', 'Candidatura non trovata.')
    return app
  } catch (err) {
    if (err instanceof FamilyRequestError) throw err
    throw toFamilyError(err, 'Aggiornamento candidatura non riuscito.')
  }
}
