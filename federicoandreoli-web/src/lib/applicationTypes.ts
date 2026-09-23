/** API-shaped application types — swap transport in `applicationApi.ts` when Laravel is ready. */

import type { FamilyCandidateStatus } from './familyRequestTypes'

export type ApplicationTargetType = 'job_posting' | 'family_request'

/** Canonical status stored in mock persistence. */
export type ApplicationStatus =
  | 'submitted'
  | 'viewed'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'discarded'

export type ApplicationPublisherKind = 'famiglia' | 'agenzia' | 'struttura'

export type Application = {
  id: string
  targetType: ApplicationTargetType
  targetId: string
  ownerId: string
  applicantId: string
  applicantName: string
  applicantInitials: string
  applicantCategory: string
  applicantZone: string
  applicantStars: number
  applicantPreview: string
  targetTitle: string
  targetPublisherName: string
  targetPublisherKind: ApplicationPublisherKind
  status: ApplicationStatus
  createdAt: string
  updatedAt: string
}

export type ApplicationApplyInput = {
  message?: string
}

export type ApplicationActorRole = 'professional' | 'agency' | 'structure' | 'public_user'

export type ApplicationErrorCode =
  | 'validation'
  | 'not_found'
  | 'duplicate'
  | 'plan_limit'
  | 'server'

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode

  constructor(code: ApplicationErrorCode, message: string) {
    super(message)
    this.name = 'ApplicationError'
    this.code = code
  }
}

export const OUTGOING_STATUS_LABELS: Record<
  'pending' | 'viewed' | 'accepted' | 'rejected' | 'withdrawn',
  string
> = {
  pending: 'In attesa',
  viewed: 'Visualizzata',
  accepted: 'Accettata',
  rejected: 'Rifiutata',
  withdrawn: 'Ritirata',
}

export const B2B_RECEIVED_STATUS_LABELS: Record<
  'new' | 'viewed' | 'in-selection' | 'interview' | 'offer' | 'hired' | 'rejected',
  string
> = {
  new: 'Nuova',
  viewed: 'In valutazione',
  'in-selection': 'In selezione',
  interview: 'Colloquio',
  offer: 'Offerta',
  hired: 'Assunto',
  rejected: 'Rifiutata',
}

/** Ordine pipeline HR B2B per timeline UI. */
export const B2B_PIPELINE_ORDER: (keyof typeof B2B_RECEIVED_STATUS_LABELS)[] = [
  'new',
  'viewed',
  'in-selection',
  'interview',
  'offer',
  'hired',
]

export function toOutgoingDisplayStatus(
  status: ApplicationStatus,
): keyof typeof OUTGOING_STATUS_LABELS {
  switch (status) {
    case 'submitted':
      return 'pending'
    case 'viewed':
    case 'shortlisted':
    case 'interview':
    case 'offer':
      return 'viewed'
    case 'accepted':
    case 'hired':
      return 'accepted'
    case 'rejected':
    case 'discarded':
      return 'rejected'
    case 'withdrawn':
      return 'withdrawn'
    default: {
      const _x: never = status
      return _x
    }
  }
}

export function toB2BDisplayStatus(
  status: ApplicationStatus,
): keyof typeof B2B_RECEIVED_STATUS_LABELS {
  switch (status) {
    case 'submitted':
      return 'new'
    case 'viewed':
      return 'viewed'
    case 'shortlisted':
      return 'in-selection'
    case 'interview':
      return 'interview'
    case 'offer':
      return 'offer'
    case 'hired':
    case 'accepted':
      return 'hired'
    case 'rejected':
    case 'discarded':
    case 'withdrawn':
      return 'rejected'
    default: {
      const _x: never = status
      return _x
    }
  }
}

export function toFamilyDisplayStatus(status: ApplicationStatus): FamilyCandidateStatus {
  switch (status) {
    case 'submitted':
      return 'new'
    case 'viewed':
    case 'shortlisted':
    case 'interview':
    case 'offer':
      return 'contacted'
    case 'accepted':
    case 'hired':
      return 'in-selection'
    case 'discarded':
    case 'rejected':
    case 'withdrawn':
      return 'discarded'
    default: {
      const _x: never = status
      return _x
    }
  }
}

export function familyStatusToApplicationStatus(status: FamilyCandidateStatus): ApplicationStatus {
  switch (status) {
    case 'new':
      return 'submitted'
    case 'contacted':
      return 'shortlisted'
    case 'in-selection':
      return 'accepted'
    case 'discarded':
      return 'discarded'
    default: {
      const _x: never = status
      return _x
    }
  }
}

export function b2bStatusToApplicationStatus(
  status: keyof typeof B2B_RECEIVED_STATUS_LABELS,
): ApplicationStatus {
  switch (status) {
    case 'new':
      return 'submitted'
    case 'viewed':
      return 'viewed'
    case 'in-selection':
      return 'shortlisted'
    case 'interview':
      return 'interview'
    case 'offer':
      return 'offer'
    case 'hired':
      return 'hired'
    case 'rejected':
      return 'rejected'
    default: {
      const _x: never = status
      return _x
    }
  }
}

export function validateApplicationStatusTransition(
  actorRole: ApplicationActorRole,
  targetType: ApplicationTargetType,
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  if (from === to) return true

  if (actorRole === 'professional') {
    return (
      targetType === 'job_posting' || targetType === 'family_request'
    ) && from === 'submitted' && to === 'withdrawn'
  }

  if (actorRole === 'agency' || actorRole === 'structure') {
    if (targetType !== 'job_posting') return false
    const allowed: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
      submitted: ['viewed', 'rejected'],
      viewed: ['shortlisted', 'rejected'],
      shortlisted: ['interview', 'rejected'],
      interview: ['offer', 'rejected'],
      offer: ['hired', 'rejected'],
      hired: [],
    }
    return allowed[from]?.includes(to) ?? false
  }

  if (actorRole === 'public_user') {
    if (targetType !== 'family_request') return false
    const allowed: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
      submitted: ['shortlisted', 'discarded'],
      shortlisted: ['accepted', 'discarded'],
      accepted: ['discarded'],
    }
    return allowed[from]?.includes(to) ?? false
  }

  return false
}
