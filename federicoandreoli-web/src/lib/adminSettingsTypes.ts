/** API-shaped admin platform settings — swap transport in `adminSettingsApi.ts` when Laravel is ready. */

export type AdminEmailNotificationKey =
  | 'newRegistration'
  | 'newRequest'
  | 'paymentReceived'
  | 'paymentFailed'
  | 'profileVerified'

export type AdminEmailNotificationSettings = Record<AdminEmailNotificationKey, boolean>

export type AdminFeatureFlags = {
  b2bJobPostings: boolean
  familyMessaging: boolean
  stripeCheckout: boolean
  maintenanceBanner: boolean
}

export type AdminPlatformSettings = {
  pricing: {
    premiumMonthlyEur: number
    premiumYearlyEur: number
  }
  emailNotifications: AdminEmailNotificationSettings
  emailTemplates: {
    welcomeSubject: string
    paymentFailedSubject: string
  }
  maintenance: {
    enabled: boolean
    message: string
  }
  commissionRates: {
    professionalPercent: number
    agencyPercent: number
  }
  featureFlags: AdminFeatureFlags
  freeLimits: {
    maxRequestsPerMonth: number
    maxActiveApplications: number
  }
  updatedAt: string
}

export type AdminSettingsErrorCode = 'validation' | 'server'

export class AdminSettingsError extends Error {
  readonly code: AdminSettingsErrorCode

  constructor(code: AdminSettingsErrorCode, message: string) {
    super(message)
    this.name = 'AdminSettingsError'
    this.code = code
  }
}
