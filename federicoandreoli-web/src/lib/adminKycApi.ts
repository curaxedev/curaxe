/**
 * Admin KYC verification API client — mock implementation today; swap to fetch + Laravel when backend is ready.
 * GET   /api/v1/admin/kyc/pending
 * POST  /api/v1/admin/kyc/:id/approve
 * POST  /api/v1/admin/kyc/:id/reject
 */
import type {
  AdminKycQueueItem,
  AdminKycRejectInput,
} from './adminKycTypes'
import {
  approveAdminKycItem,
  fetchAdminKycQueue,
  rejectAdminKycItem,
} from '../services/adminKycService'

export type { AdminKycDocument, AdminKycQueueItem, AdminKycRejectInput } from './adminKycTypes'
export { AdminKycError } from './adminKycTypes'
export {
  formatAdminKycDate,
  formatAdminKycDocumentsSummary,
  isProfessionalKycVerified,
  KYC_DOCUMENT_TYPE_LABELS,
} from '../services/adminKycService'

export async function getAdminKycPending(actorEmail?: string): Promise<AdminKycQueueItem[]> {
  return fetchAdminKycQueue(actorEmail)
}

export async function postAdminKycApprove(
  verificationId: string,
  actorEmail?: string,
): Promise<AdminKycQueueItem> {
  return approveAdminKycItem(verificationId, actorEmail)
}

export async function postAdminKycReject(
  verificationId: string,
  input: AdminKycRejectInput,
  actorEmail?: string,
): Promise<AdminKycQueueItem> {
  return rejectAdminKycItem(verificationId, input, actorEmail)
}
