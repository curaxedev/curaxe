export type NotificationPreferences = {
  emailApplications: boolean
  emailMessages: boolean
  emailMarketing: boolean
  pushAlerts: boolean
}

export type AccountSettings = {
  userId: string
  email: string
  notificationPreferences: NotificationPreferences
  usesOtpLogin: boolean
  updatedAt: string
}

export type AccountSettingsErrorCode =
  | 'email_invalid'
  | 'email_taken'
  | 'password_invalid'
  | 'password_weak'
  | 'password_mismatch'
  | 'not_found'

export class AccountSettingsError extends Error {
  readonly code: AccountSettingsErrorCode
  readonly fieldErrors?: Partial<Record<'email' | 'currentPassword' | 'newPassword' | 'confirmPassword', string>>

  constructor(
    code: AccountSettingsErrorCode,
    message: string,
    fieldErrors?: AccountSettingsError['fieldErrors']
  ) {
    super(message)
    this.name = 'AccountSettingsError'
    this.code = code
    this.fieldErrors = fieldErrors
  }
}
