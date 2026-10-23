/**
 * Admin KYC — mock / Laravel.
 */
import type { AdminKycQueueItem, AdminKycRejectInput } from './adminKycTypes'
import { AdminKycError } from './adminKycTypes'
import {
  approveAdminKycItem,
  fetchAdminKycQueue,
  rejectAdminKycItem,
  formatAdminKycDate,
  formatAdminKycDocumentsSummary,
  isProfessionalKycVerified,
  KYC_DOCUMENT_TYPE_LABELS,
} from '../services/adminKycService'
import { withAdminStepUp } from './adminSecurityApi'
import { HttpError, httpGet, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type { AdminKycDocument, AdminKycQueueItem, AdminKycRejectInput } from './adminKycTypes'
export { AdminKycError } from './adminKycTypes'
export {
  formatAdminKycDate,
  formatAdminKycDocumentsSummary,
  isProfessionalKycVerified,
  KYC_DOCUMENT_TYPE_LABELS,
}

function toError(err: unknown, fallback: string): AdminKycError {
  if (err instanceof HttpError && err.code === 'step_up_required') {
    throw err
  }
  if (err instanceof HttpError) {
    if (err.kind === 'not_found') return new AdminKycError('not_found', err.message)
    if (err.kind === 'validation') return new AdminKycError('validation', err.message)
    return new AdminKycError('server', err.message || fallback)
  }
  return new AdminKycError('server', fallback)
}

export async function getAdminKycPending(actorEmail?: string): Promise<AdminKycQueueItem[]> {
  if (isMockApiEnabled()) return fetchAdminKycQueue(actorEmail)
  try {
    return await httpGet<AdminKycQueueItem[]>('/api/v1/admin/kyc/pending')
  } catch (err) {
    throw toError(err, 'Impossibile caricare la coda verifica.')
  }
}

export async function postAdminKycApprove(
  verificationId: string,
  actorEmail?: string,
): Promise<AdminKycQueueItem> {
  if (isMockApiEnabled()) return approveAdminKycItem(verificationId, actorEmail)
  try {
    await withAdminStepUp('kyc.decide', (token) =>
      httpPost(`/api/v1/admin/kyc/${verificationId}/approve`, {
        headers: token ? { 'X-Step-Up-Token': token } : undefined,
      }),
    )
    return {
      id: verificationId,
      professionalId: verificationId,
      name: '',
      initials: '',
      email: '',
      category: '',
      documents: [],
      submittedAt: new Date().toISOString(),
    }
  } catch (err) {
    throw toError(err, 'Approvazione KYC non riuscita.')
  }
}

export async function postAdminKycReject(
  verificationId: string,
  input: AdminKycRejectInput,
  actorEmail?: string,
): Promise<AdminKycQueueItem> {
  if (isMockApiEnabled()) return rejectAdminKycItem(verificationId, input, actorEmail)
  try {
    await withAdminStepUp('kyc.decide', (token) =>
      httpPost(`/api/v1/admin/kyc/${verificationId}/reject`, {
        body: { reason: input.reason },
        headers: token ? { 'X-Step-Up-Token': token } : undefined,
      }),
    )
    return {
      id: verificationId,
      professionalId: verificationId,
      name: '',
      initials: '',
      email: '',
      category: '',
      documents: [],
      submittedAt: new Date().toISOString(),
    }
  } catch (err) {
    throw toError(err, 'Rifiuto KYC non riuscito.')
  }
}
