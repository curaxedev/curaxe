import type {
  AdminJobModerationQueueItem,
  AdminJobModerationRejectInput,
} from '../lib/adminJobModerationTypes'
import { AdminJobModerationError } from '../lib/adminJobModerationTypes'
import type { JobPosting } from '../lib/jobPostingTypes'
import {
  approveJobPostingModeration,
  formatJobPostingDate,
  listPendingReviewJobPostings,
  rejectJobPostingModeration,
} from './jobPostingService'

const MOCK_DELAY_MS = 400

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldSimulateServerError(actorEmail?: string): boolean {
  return Boolean(actorEmail?.toLowerCase().includes('server-error'))
}

function toQueueItem(posting: JobPosting): AdminJobModerationQueueItem {
  const locationLabel = posting.location.address.trim()
    ? `${posting.location.comune}, ${posting.location.address}`
    : posting.location.comune

  return {
    id: posting.id,
    ownerId: posting.ownerId,
    ownerType: posting.ownerType,
    ownerDisplayName: posting.ownerDisplayName,
    title: posting.title,
    roleId: posting.roleId,
    locationLabel,
    submittedAt: posting.updatedAt,
  }
}

export const ADMIN_JOB_OWNER_TYPE_LABELS = {
  agency: 'Agenzia',
  structure: 'Struttura RSA',
} as const

export async function fetchAdminJobModerationQueue(
  actorEmail?: string,
): Promise<AdminJobModerationQueueItem[]> {
  await delay()
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminJobModerationError(
      'server',
      'Servizio temporaneamente non disponibile. Riprova tra poco.',
    )
  }
  return listPendingReviewJobPostings()
    .map(toQueueItem)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

export function validateAdminJobModerationReject(
  input: AdminJobModerationRejectInput,
): AdminJobModerationError | null {
  if (!input.reason.trim()) {
    return new AdminJobModerationError('validation', 'Indica un motivo per il rifiuto.')
  }
  if (input.reason.trim().length < 10) {
    return new AdminJobModerationError('validation', 'Il motivo deve contenere almeno 10 caratteri.')
  }
  return null
}

export async function approveAdminJobModerationItem(
  item: Pick<AdminJobModerationQueueItem, 'id' | 'ownerId' | 'ownerType'>,
  actorEmail?: string,
): Promise<AdminJobModerationQueueItem> {
  await delay(300)
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminJobModerationError(
      'server',
      'Servizio temporaneamente non disponibile. Riprova tra poco.',
    )
  }

  try {
    await approveJobPostingModeration(item.ownerId, item.ownerType, item.id)
  } catch {
    throw new AdminJobModerationError('not_found', 'Annuncio non trovato.')
  }

  return item as AdminJobModerationQueueItem
}

export async function rejectAdminJobModerationItem(
  item: Pick<AdminJobModerationQueueItem, 'id' | 'ownerId' | 'ownerType' | 'title'>,
  input: AdminJobModerationRejectInput,
  actorEmail?: string,
): Promise<AdminJobModerationQueueItem> {
  await delay(300)
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminJobModerationError(
      'server',
      'Servizio temporaneamente non disponibile. Riprova tra poco.',
    )
  }

  const validationError = validateAdminJobModerationReject(input)
  if (validationError) throw validationError

  try {
    await rejectJobPostingModeration(
      item.ownerId,
      item.ownerType,
      item.id,
      input.reason.trim(),
    )
  } catch {
    throw new AdminJobModerationError('not_found', 'Annuncio non trovato.')
  }

  return item as AdminJobModerationQueueItem
}

export function formatAdminJobModerationDate(iso: string): string {
  return formatJobPostingDate(iso)
}
