/**
 * Auth API — doppio binario: mock in-browser (`VITE_USE_MOCKS=true`, default)
 * oppure Laravel Sanctum con Bearer token.
 *
 * Endpoint reali:
 *   GET  /api/v1/auth/policies
 *   POST /api/v1/auth/email-otp/request
 *   POST /api/v1/auth/email-otp/verify   -> { token, user }
 *   POST /api/v1/auth/login              -> { token, user }
 *   POST /api/v1/auth/logout
 *   GET  /api/v1/user
 */
import { getAuthSessionSnapshot, setAuthSession } from '../auth/authSessionStore'
import type { AuthPoliciesResponse, AuthSession, AuthUser } from '../auth/types'
import { AuthError, type AuthErrorCode } from '../auth/types'
import * as mockAuth from '../services/authService'
import { HttpError, httpGet, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type { AuthPoliciesResponse, AuthUser }

const SESSION_TTL_MS = 24 * 60 * 60 * 1000

type LoginResponse = {
  token: string
  user: AuthUser
}

/** Mappa gli `error_code` del backend sui codici di `AuthError`. */
const ERROR_CODE_MAP: Record<string, AuthErrorCode> = {
  email_not_found: 'email_not_found',
  otp_invalid: 'otp_invalid',
  otp_expired: 'otp_expired',
  password_invalid: 'password_invalid',
  password_required: 'email_not_found',
  otp_only: 'password_invalid',
  totp_required: 'totp_required',
  totp_invalid: 'totp_invalid',
}

function toAuthError(err: unknown): AuthError {
  if (err instanceof HttpError) {
    const code = (err.code && ERROR_CODE_MAP[err.code]) || 'network'
    return new AuthError(code, err.message)
  }
  return new AuthError('network', 'Impossibile contattare il server. Riprova.')
}

function storeSession(response: LoginResponse): AuthUser {
  const session: AuthSession = {
    user: response.user,
    token: response.token,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
  setAuthSession(session)
  return response.user
}

export async function getPolicies(): Promise<AuthPoliciesResponse> {
  if (isMockApiEnabled()) return mockAuth.getPolicies()
  try {
    return await httpGet<AuthPoliciesResponse>('/api/v1/auth/policies', { anonymous: true })
  } catch (err) {
    throw toAuthError(err)
  }
}

export async function requestOtp(email: string, turnstileToken?: string | null): Promise<void> {
  if (isMockApiEnabled()) return mockAuth.requestOtp(email)
  try {
    await httpPost('/api/v1/auth/email-otp/request', {
      body: { email, turnstileToken: turnstileToken || undefined },
      anonymous: true,
    })
  } catch (err) {
    throw toAuthError(err)
  }
}

export async function verifyOtp(email: string, code: string): Promise<AuthUser> {
  if (isMockApiEnabled()) return mockAuth.verifyOtp(email, code)
  try {
    const response = await httpPost<LoginResponse>('/api/v1/auth/email-otp/verify', {
      body: { email, code },
      anonymous: true,
    })
    return storeSession(response)
  } catch (err) {
    throw toAuthError(err)
  }
}

export async function loginWithPassword(
  email: string,
  password: string,
  totpCode?: string,
  turnstileToken?: string | null,
): Promise<AuthUser> {
  if (isMockApiEnabled()) return mockAuth.loginWithPassword(email, password)
  try {
    const response = await httpPost<LoginResponse>('/api/v1/auth/login', {
      body: {
        email,
        password,
        totp_code: totpCode || undefined,
        turnstileToken: turnstileToken || undefined,
      },
      anonymous: true,
    })
    return storeSession(response)
  } catch (err) {
    throw toAuthError(err)
  }
}

export async function logout(): Promise<void> {
  if (isMockApiEnabled()) return mockAuth.logout()
  try {
    await httpPost('/api/v1/auth/logout')
  } catch {
    // Token già scaduto o server irraggiungibile: la sessione locale va comunque chiusa.
  }
  setAuthSession(null)
}

export async function getSession(): Promise<AuthSession | null> {
  if (isMockApiEnabled()) return mockAuth.getSession()
  const snapshot = getAuthSessionSnapshot()
  if (!snapshot) return null
  if (new Date(snapshot.expiresAt).getTime() <= Date.now()) {
    setAuthSession(null)
    return null
  }
  // Valida il Bearer token contro /user e aggiorna i campi utente.
  try {
    const user = await httpGet<AuthUser>('/api/v1/user')
    const next: AuthSession = { ...snapshot, user }
    setAuthSession(next)
    return next
  } catch {
    setAuthSession(null)
    return null
  }
}
