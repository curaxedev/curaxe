/**
 * Admin B2B job moderation — mock / Laravel.
 */
import type {
  AdminJobModerationQueueItem,
  AdminJobModerationRejectInput,
} from './adminJobModerationTypes'
import { AdminJobModerationError } from './adminJobModerationTypes'
import {
  approveAdminJobModerationItem,
  fetchAdminJobModerationQueue,
  rejectAdminJobModerationItem,
  ADMIN_JOB_OWNER_TYPE_LABELS,
  formatAdminJobModerationDate,
} from '../services/adminJobModerationService'
import { HttpError, httpGet, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type {
  AdminJobModerationQueueItem,
  AdminJobModerationRejectInput,
} from './adminJobModerationTypes'
export { AdminJobModerationError } from './adminJobModerationTypes'
export { ADMIN_JOB_OWNER_TYPE_LABELS, formatAdminJobModerationDate }

function toError(err: unknown, fallback: string): AdminJobModerationError {
  if (err instanceof HttpError) {
    if (err.kind === 'not_found') return new AdminJobModerationError('not_found', err.message)
    if (err.kind === 'validation') return new AdminJobModerationError('validation', err.message)
    return new AdminJobModerationError('server', err.message || fallback)
  }
  return new AdminJobModerationError('server', fallback)
}

function mapItem(row: Record<string, unknown>): AdminJobModerationQueueItem {
  return {
    id: String(row.id),
    ownerId: String(row.ownerId ?? ''),
    ownerType: row.ownerType === 'structure' ? 'structure' : 'agency',
    ownerDisplayName: String(row.ownerDisplayName ?? 'Organizzazione'),
    title: String(row.title ?? ''),
    roleId: String(row.roleId ?? 'caregiver') as AdminJobModerationQueueItem['roleId'],
    locationLabel: String(row.locationLabel ?? '—'),
    submittedAt: String(row.submittedAt ?? new Date().toISOString()),
  }
}

export async function getAdminJobModerationPending(
  actorEmail?: string,
): Promise<AdminJobModerationQueueItem[]> {
  if (isMockApiEnabled()) return fetchAdminJobModerationQueue(actorEmail)
  try {
    const rows = await httpGet<Array<Record<string, unknown>>>('/api/v1/admin/job-postings/pending')
    return rows.map(mapItem)
  } catch (err) {
    throw toError(err, 'Impossibile caricare la coda annunci.')
  }
}

export async function postAdminJobModerationApprove(
  item: Pick<AdminJobModerationQueueItem, 'id' | 'ownerId' | 'ownerType' | 'title'>,
  actorEmail?: string,
): Promise<AdminJobModerationQueueItem> {
  if (isMockApiEnabled()) return approveAdminJobModerationItem(item, actorEmail)
  try {
    await httpPost(`/api/v1/admin/job-postings/${item.id}/approve`)
    return { ...item, submittedAt: new Date().toISOString(), ownerDisplayName: '', roleId: 'caregiver', locationLabel: '' }
  } catch (err) {
    throw toError(err, 'Approvazione annuncio non riuscita.')
  }
}

export async function postAdminJobModerationReject(
  item: Pick<AdminJobModerationQueueItem, 'id' | 'ownerId' | 'ownerType' | 'title'>,
  input: AdminJobModerationRejectInput,
  actorEmail?: string,
): Promise<AdminJobModerationQueueItem> {
  if (isMockApiEnabled()) return rejectAdminJobModerationItem(item, input, actorEmail)
  try {
    await httpPost(`/api/v1/admin/job-postings/${item.id}/reject`, { body: { reason: input.reason } })
    return { ...item, submittedAt: new Date().toISOString(), ownerDisplayName: '', roleId: 'caregiver', locationLabel: '' }
  } catch (err) {
    throw toError(err, 'Rifiuto annuncio non riuscito.')
  }
}
