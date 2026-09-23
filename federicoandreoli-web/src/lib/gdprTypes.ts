export type ConsentRecord = {
  termini: boolean
  privacy: boolean
  maggiorenne: boolean
  comunicazioni: boolean
  profilazione: boolean
  version: string
  recordedAt: string
  source: 'registration' | 'settings'
}

export type GdprExportPayload = {
  exportedAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  consents: ConsentRecord | null
  accountSettings: unknown
  professionalProfile: unknown
  familyRequests: unknown
  savedProfiles: unknown
  messagingThreads: unknown
  cookieConsent: unknown
}

export class GdprError extends Error {
  readonly code: 'not_found' | 'validation' | 'server'

  constructor(code: GdprError['code'], message: string) {
    super(message)
    this.name = 'GdprError'
    this.code = code
  }
}

export const CONSENT_POLICY_VERSION = '2026-06'
