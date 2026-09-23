import type { JobPostingOwnerType, JobPostingRoleId } from './jobPostingTypes'

export type AdminJobModerationQueueItem = {
  id: string
  ownerId: string
  ownerType: JobPostingOwnerType
  ownerDisplayName: string
  title: string
  roleId: JobPostingRoleId
  locationLabel: string
  submittedAt: string
}

export type AdminJobModerationRejectInput = {
  reason: string
}

export type AdminJobModerationErrorCode = 'validation' | 'not_found' | 'server'

export class AdminJobModerationError extends Error {
  readonly code: AdminJobModerationErrorCode

  constructor(code: AdminJobModerationErrorCode, message: string) {
    super(message)
    this.name = 'AdminJobModerationError'
    this.code = code
  }
}
