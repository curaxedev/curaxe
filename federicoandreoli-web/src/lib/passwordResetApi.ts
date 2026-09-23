/**
 * Password reset API — doppio binario mock / Laravel.
 *
 * Endpoint reali:
 *   POST /api/v1/auth/password-reset/request  -> 202 (email con link)
 *   GET  /api/v1/auth/password-reset/validate -> { email, expiresAt }
 *   POST /api/v1/auth/password-reset/confirm  -> 204
 *
 * In modalità reale il link email contiene `token` + `email`; in mock il token
 * viene mostrato inline (nessuna email inviata).
 */
import * as mockReset from '../services/passwordResetService'
import { HttpError, httpGet, httpPost } from './http'
import type { PasswordResetErrorCode, PasswordResetTokenPayload } from './passwordResetTypes'
import { PasswordResetError } from './passwordResetTypes'
import { isMockApiEnabled } from './runtimeConfig'

export type { PasswordResetTokenPayload }
export { PasswordResetError }
export { PASSWORD_RESET_DEV_TOKEN } from '../services/passwordResetService'

const ERROR_CODE_MAP: Record<string, PasswordResetErrorCode> = {
  email_not_found: 'email_not_found',
  otp_only_account: 'otp_only_account',
  token_invalid: 'token_invalid',
  token_expired: 'token_expired',
}

function toResetError(err: unknown, fallback: PasswordResetErrorCode): PasswordResetError {
  if (err instanceof HttpError) {
    const code = (err.code && ERROR_CODE_MAP[err.code]) || fallback
    return new PasswordResetError(code, err.message)
  }
  return new PasswordResetError(fallback, 'Impossibile contattare il server. Riprova.')
}

/**
 * In modalità reale ritorna `{}`: il token viaggia solo nella email.
 * In mock ritorna `{ token }` per mostrare il link inline.
 */
export async function requestPasswordReset(email: string): Promise<{ token?: string }> {
  if (isMockApiEnabled()) return mockReset.requestPasswordReset(email)
  try {
    await httpPost('/api/v1/auth/password-reset/request', { body: { email }, anonymous: true })
    return {}
  } catch (err) {
    throw toResetError(err, 'email_not_found')
  }
}

export async function validateResetToken(
  token: string,
  email?: string
): Promise<PasswordResetTokenPayload> {
  if (isMockApiEnabled()) return mockReset.validateResetToken(token)
  if (!email) {
    throw new PasswordResetError('token_invalid', 'Link di reimpostazione non valido.')
  }
  try {
    return await httpGet<PasswordResetTokenPayload>('/api/v1/auth/password-reset/validate', {
      query: { token, email },
      anonymous: true,
    })
  } catch (err) {
    throw toResetError(err, 'token_invalid')
  }
}

export async function resetPassword(
  token: string,
  password: string,
  confirm: string,
  email?: string
): Promise<void> {
  if (isMockApiEnabled()) return mockReset.resetPassword(token, password, confirm)
  if (password.length < 8) {
    throw new PasswordResetError('password_weak', 'La password deve avere almeno 8 caratteri.')
  }
  if (password !== confirm) {
    throw new PasswordResetError('password_mismatch', 'Le password non coincidono.')
  }
  if (!email) {
    throw new PasswordResetError('token_invalid', 'Link di reimpostazione non valido.')
  }
  try {
    await httpPost('/api/v1/auth/password-reset/confirm', {
      body: { token, email, password, password_confirmation: confirm },
      anonymous: true,
    })
  } catch (err) {
    throw toResetError(err, 'token_invalid')
  }
}
