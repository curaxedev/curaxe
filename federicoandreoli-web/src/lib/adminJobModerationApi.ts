/**
 * Admin B2B job moderation API — mock today; swap to Laravel when backend is ready.
 * GET   /api/v1/admin/job-postings/pending
 * POST  /api/v1/admin/job-postings/:id/approve
 * POST  /api/v1/admin/job-postings/:id/reject
 */
import type {
  AdminJobModerationQueueItem,
  AdminJobModerationRejectInput,
} from './adminJobModerationTypes'
import {
  approveAdminJobModerationItem,
  fetchAdminJobModerationQueue,
  rejectAdminJobModerationItem,
} from '../services/adminJobModerationService'

export type {
  AdminJobModerationQueueItem,
  AdminJobModerationRejectInput,
} from './adminJobModerationTypes'
export { AdminJobModerationError } from './adminJobModerationTypes'
export {
  ADMIN_JOB_OWNER_TYPE_LABELS,
  formatAdminJobModerationDate,
} from '../services/adminJobModerationService'

export async function getAdminJobModerationPending(
  actorEmail?: string,
): Promise<AdminJobModerationQueueItem[]> {
  return fetchAdminJobModerationQueue(actorEmail)
}

export async function postAdminJobModerationApprove(
  item: Pick<AdminJobModerationQueueItem, 'id' | 'ownerId' | 'ownerType' | 'title'>,
  actorEmail?: string,
): Promise<AdminJobModerationQueueItem> {
  return approveAdminJobModerationItem(item, actorEmail)
}

export async function postAdminJobModerationReject(
  item: Pick<AdminJobModerationQueueItem, 'id' | 'ownerId' | 'ownerType' | 'title'>,
  input: AdminJobModerationRejectInput,
  actorEmail?: string,
): Promise<AdminJobModerationQueueItem> {
  return rejectAdminJobModerationItem(item, input, actorEmail)
}
