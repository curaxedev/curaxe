/** Aligned with `App\Domains\Auth\Enums\UserRole` (Laravel). */
export type UserRole =
  | 'platform_admin'
  | 'professional'
  | 'agency'
  | 'structure'
  | 'public_user'

export type AuthChannel = 'otp_email' | 'password_totp'

export type AuthUser = {
  id: string
  role: UserRole
  name: string
  email: string
}

export type AuthSession = {
  user: AuthUser
  /** ISO timestamp di scadenza della sessione locale. */
  expiresAt: string
  /** Bearer token Sanctum (assente in modalità mock). */
  token?: string
}

export type AuthPoliciesResponse = {
  roles_to_auth_channel: Record<UserRole, AuthChannel>
  channels: Record<AuthChannel, { label: string; description: string }>
}

export type AuthErrorCode =
  | 'email_not_found'
  | 'otp_invalid'
  | 'otp_expired'
  | 'password_invalid'
  | 'totp_required'
  | 'totp_invalid'
  | 'network'

export class AuthError extends Error {
  readonly code: AuthErrorCode

  constructor(code: AuthErrorCode, message: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}
