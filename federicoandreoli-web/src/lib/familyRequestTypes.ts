/** API-shaped family assistance request types — swap transport in `familyRequestApi.ts` when Laravel is ready. */

export type FamilyRequestStatus = 'active' | 'paused' | 'closed' | 'draft'

export type FamilyAssistanceType = 'badante' | 'oss' | 'infermiere' | 'family_assistant' | 'other'

export type FamilyBeneficiaryType =
  | 'self_sufficient_elderly'
  | 'non_autosufficient_elderly'
  | 'disabled'
  | 'post_surgery'
  | 'other'

export type FamilyEmploymentType = 'live_in' | 'hourly' | 'part_time' | 'weekend' | 'night_only'

export type FamilyCandidateStatus = 'new' | 'contacted' | 'in-selection' | 'discarded'

export type FamilyRequest = {
  id: string
  familyUserId: string
  title: string
  status: FamilyRequestStatus
  assistanceType: FamilyAssistanceType
  beneficiary: FamilyBeneficiaryType
  employmentType: FamilyEmploymentType
  comune: string
  budgetMonthly: number | null
  days: string[]
  notes: string
  applicationCount: number
  createdAt: string
}

export type FamilyRequestCreateInput = {
  assistanceType: FamilyAssistanceType
  beneficiary: FamilyBeneficiaryType
  employmentType: FamilyEmploymentType
  comune: string
  budgetMonthly: number | null
  days: string[]
  notes: string
}

export type FamilyApplication = {
  id: string
  requestId: string
  familyUserId: string
  professionalId: string
  name: string
  initials: string
  category: string
  zone: string
  stars: number
  preview: string
  status: FamilyCandidateStatus
}

export type FamilyRequestStore = {
  requests: FamilyRequest[]
  applications: FamilyApplication[]
}

export type FamilyRequestFieldErrors = Partial<
  Record<'comune' | 'days' | 'assistanceType' | 'beneficiary' | 'employmentType', string>
>

export type FamilyRequestErrorCode = 'validation' | 'plan_limit' | 'not_found' | 'server'

export class FamilyRequestError extends Error {
  readonly code: FamilyRequestErrorCode
  readonly fieldErrors?: FamilyRequestFieldErrors

  constructor(
    code: FamilyRequestErrorCode,
    message: string,
    fieldErrors?: FamilyRequestFieldErrors,
  ) {
    super(message)
    this.name = 'FamilyRequestError'
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export const FREE_PLAN_MAX_ACTIVE_REQUESTS = 1
