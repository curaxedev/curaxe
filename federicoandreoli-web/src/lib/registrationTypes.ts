/** API-shaped registration types — swap transport in `registrationApi.ts` when Laravel is ready. */

export type ProfessionalRoleApi = 'infermiere' | 'oss' | 'badante' | 'altro'

export type RegistrationAddress = {
  line: string
  comune?: string
  cap?: string
}

export type RegistrationConsents = {
  termini: boolean
  privacy: boolean
  maggiorenne: boolean
  comunicazioni?: boolean
  profilazione?: boolean
}

export type ProfessionalAvailabilityPayload = {
  mode?: 'fixed' | 'occasional'
  days: string[]
  slotsByDay?: Record<string, string[]>
}

export type ProfessionalDocumentsPayload = {
  status: 'upload_pending' | 'uploaded' | 'skipped'
  note?: string
}

export type ProfessionalRegistrationPayload = {
  role: ProfessionalRoleApi
  experienceYears: string
  references?: 'yes' | 'no'
  gender?: 'f' | 'm' | 'other'
  birthYear?: number
  birthDate?: string
  languages: string[]
  concurrentClients?: string
  hourlyRateBand?: string
  availability: ProfessionalAvailabilityPayload
  traits: string[]
  skills: string[]
  helpTasks: string[]
  extra: RegisterDraftExtraApi
  bio?: string
  photoSkipped?: boolean
  firstName: string
  lastName: string
  address: RegistrationAddress
  coverage: {
    mode?: 'italy' | 'regions' | 'radius'
    regions?: string[]
    radiusKm?: number | null
  }
  documents: ProfessionalDocumentsPayload
  consents: RegistrationConsents
}

export type RegisterDraftExtraApi = {
  smokes?: boolean
  hasDriverLicense?: boolean
  hasCar?: boolean
  firstAid?: boolean
  criminalRecord?: boolean
}

export type SeekerRegistrationPayload = {
  careType: string
  forWhom: string
  frequency: string
  urgency: string
  fullName: string
  firstName: string
  lastName: string
  address: RegistrationAddress
  notes?: string
  consents: RegistrationConsents
}

export type RegistrationSuccessResponse = {
  id: string
  intent: 'seeker' | 'offer'
  emailVerificationRequired: boolean
  documentsUploadPending?: boolean
  message?: string
}

export type RegistrationFieldErrors = Record<string, string[]>

export type RegistrationErrorCode = 'validation' | 'network' | 'server'

export class RegistrationError extends Error {
  readonly code: RegistrationErrorCode
  readonly fieldErrors?: RegistrationFieldErrors

  constructor(
    code: RegistrationErrorCode,
    message: string,
    fieldErrors?: RegistrationFieldErrors,
  ) {
    super(message)
    this.name = 'RegistrationError'
    this.code = code
    this.fieldErrors = fieldErrors
  }
}
