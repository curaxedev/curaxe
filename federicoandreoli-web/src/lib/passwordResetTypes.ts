export type PasswordResetTokenPayload = {
  email: string
  expiresAt: string
}

export type PasswordResetErrorCode =
  | 'email_not_found'
  | 'otp_only_account'
  | 'token_invalid'
  | 'token_expired'
  | 'password_weak'
  | 'password_mismatch'

export class PasswordResetError extends Error {
  readonly code: PasswordResetErrorCode

  constructor(code: PasswordResetErrorCode, message: string) {
    super(message)
    this.name = 'PasswordResetError'
    this.code = code
  }
}
