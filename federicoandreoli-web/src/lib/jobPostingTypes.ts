/** API-shaped B2B job posting types — swap transport in `jobPostingApi.ts` when Laravel is ready. */

import type { OpenPositionContractBucket, OpenPositionRoleId } from './mockOpenPositions'

export type JobPostingOwnerType = 'agency' | 'structure'

export type JobPostingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'closed'
  | 'rejected'

export type JobPostingRoleId = OpenPositionRoleId

export type JobPostingContractType =
  | 'permanent'
  | 'fixed_term'
  | 'part_time'
  | 'hourly'
  | 'freelance'
  | 'seasonal'

export type JobPostingCompensationPeriod = 'monthly' | 'hourly'

export type JobPostingWizardStepId =
  | 'ruolo'
  | 'descrizione'
  | 'requisiti'
  | 'disponibilita'
  | 'retribuzione'
  | 'sede'
  | 'pubblicazione'

export const JOB_POSTING_WIZARD_STEPS: JobPostingWizardStepId[] = [
  'ruolo',
  'descrizione',
  'requisiti',
  'disponibilita',
  'retribuzione',
  'sede',
  'pubblicazione',
]

export type JobPostingLocation = {
  comune: string
  provincia: string
  cap: string
  address: string
  /** STR-P02: sede operativa selezionata dall'organizzazione. */
  organizationLocationId?: string
}

export type JobPostingAvailability = {
  days: string[]
  scheduleNotes: string
  startDate: string
}

export type JobPostingCompensation = {
  minAmount: number | null
  maxAmount: number | null
  period: JobPostingCompensationPeriod
  notes: string
}

export type JobPostingFormInput = {
  roleId: JobPostingRoleId
  title: string
  description: string
  requirementsText: string
  availability: JobPostingAvailability
  compensation: JobPostingCompensation
  contractType: JobPostingContractType
  location: JobPostingLocation
  department: string
}

export type JobPostingChangeEntry = {
  at: string
  version: number
  summary: string
}

export type JobPosting = JobPostingFormInput & {
  id: string
  ownerId: string
  ownerType: JobPostingOwnerType
  ownerDisplayName: string
  status: JobPostingStatus
  applicationCount: number
  createdAt: string
  updatedAt: string
  version: number
  changeHistory: JobPostingChangeEntry[]
}

export type JobPostingCreateInput = JobPostingFormInput & {
  publishAs?: 'draft' | 'active'
}

export type JobPostingUpdateInput = Partial<JobPostingFormInput> & {
  publishAs?: JobPostingStatus
  changeSummary?: string
}

export type JobPostingFieldErrors = Partial<
  Record<
    | 'roleId'
    | 'title'
    | 'description'
    | 'requirementsText'
    | 'days'
    | 'scheduleNotes'
    | 'comune'
    | 'contractType'
    | 'minAmount',
    string
  >
>

export type JobPostingErrorCode = 'validation' | 'not_found' | 'server'

export class JobPostingError extends Error {
  readonly code: JobPostingErrorCode
  readonly fieldErrors?: JobPostingFieldErrors

  constructor(
    code: JobPostingErrorCode,
    message: string,
    fieldErrors?: JobPostingFieldErrors,
  ) {
    super(message)
    this.name = 'JobPostingError'
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export function contractTypeToOpenBucket(type: JobPostingContractType): OpenPositionContractBucket {
  switch (type) {
    case 'hourly':
    case 'part_time':
      return 'hourly'
    case 'permanent':
    case 'fixed_term':
    case 'seasonal':
      return 'ccnl'
    case 'freelance':
      return 'other'
    default: {
      const _x: never = type
      return _x
    }
  }
}
