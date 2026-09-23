/** API-shaped admin KYC queue types — swap transport in `adminKycApi.ts` when Laravel is ready. */

export type AdminKycDocumentType =
  | 'id_card'
  | 'diploma'
  | 'license'
  | 'criminal_record'
  | 'other'

export type AdminKycDocumentStatus = 'pending' | 'approved' | 'rejected'

export type AdminKycDocument = {
  id: string
  type: AdminKycDocumentType
  label: string
  url: string
  mimeType: 'image' | 'pdf'
  status: AdminKycDocumentStatus
}

export type AdminKycQueueItem = {
  id: string
  professionalId: string
  name: string
  initials: string
  email: string
  category: string
  documents: AdminKycDocument[]
  submittedAt: string
}

export type AdminKycDecision = 'approved' | 'rejected'

export type AdminKycHistoryEntry = {
  id: string
  professionalId: string
  name: string
  decision: AdminKycDecision
  reason?: string
  decidedAt: string
}

export type AdminKycQueueStore = {
  pending: AdminKycQueueItem[]
  history: AdminKycHistoryEntry[]
}

export type AdminKycRejectInput = {
  reason: string
}

export type AdminKycErrorCode = 'validation' | 'not_found' | 'server'

export class AdminKycError extends Error {
  readonly code: AdminKycErrorCode

  constructor(code: AdminKycErrorCode, message: string) {
    super(message)
    this.name = 'AdminKycError'
    this.code = code
  }
}
