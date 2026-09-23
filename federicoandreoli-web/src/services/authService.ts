import {
  getAuthSessionSnapshot,
  parseAuthSession,
  setAuthSession,
} from '../auth/authSessionStore'
import type {
  AuthPoliciesResponse,
  AuthSession,
  AuthUser,
  UserRole,
} from '../auth/types'
import { AuthError } from '../auth/types'
import { getPasswordForEmail } from '../lib/mockCredentialStore'
import {
  findMockAccountByEmail,
  MOCK_OTP_CODE,
  roleUsesOtp,
} from '../mocks/authFixtures'

const MOCK_DELAY_MS = 400
const SESSION_TTL_MS = 24 * 60 * 60 * 1000
const OTP_TTL_MS = 10 * 60 * 1000

type PendingOtp = {
  email: string
  expiresAt: number
}

const pendingOtps = new Map<string, PendingOtp>()

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createSession(user: AuthUser): AuthSession {
  return {
    user,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
}

function toPublicUser(account: { id: string; role: UserRole; name: string; email: string }): AuthUser {
  return {
    id: account.id,
    role: account.role,
    name: account.name,
    email: account.email,
  }
}

export async function getPolicies(): Promise<AuthPoliciesResponse> {
  await delay(150)
  return {
    roles_to_auth_channel: {
      platform_admin: 'password_totp',
      professional: 'otp_email',
      agency: 'password_totp',
      structure: 'password_totp',
      public_user: 'otp_email',
    },
    channels: {
      otp_email: {
        label: 'Codice via email',
        description: 'Accesso senza password con codice monouso.',
      },
      password_totp: {
        label: 'Password e verifica',
        description: 'Password e secondo fattore per account struttura, agenzia e admin.',
      },
    },
  }
}

export async function requestOtp(email: string): Promise<void> {
  await delay()
  const account = findMockAccountByEmail(email)
  if (!account) {
    throw new AuthError('email_not_found', 'Nessun account registrato con questa email.')
  }
  if (!roleUsesOtp(account.role)) {
    throw new AuthError(
      'email_not_found',
      'Questo account richiede accesso con password. Scegli «Inserisci password».'
    )
  }
  const key = account.email.toLowerCase()
  pendingOtps.set(key, {
    email: account.email,
    expiresAt: Date.now() + OTP_TTL_MS,
  })
}

export async function verifyOtp(email: string, code: string): Promise<AuthUser> {
  await delay()
  const account = findMockAccountByEmail(email)
  if (!account) {
    throw new AuthError('email_not_found', 'Nessun account registrato con questa email.')
  }
  const key = account.email.toLowerCase()
  const pending = pendingOtps.get(key)
  if (!pending) {
    throw new AuthError('otp_invalid', 'Richiedi prima un nuovo codice.')
  }
  if (pending.expiresAt <= Date.now()) {
    pendingOtps.delete(key)
    throw new AuthError('otp_expired', 'Il codice è scaduto. Inviane uno nuovo.')
  }
  const trimmed = code.trim()
  if (trimmed === '000000') {
    pendingOtps.delete(key)
    throw new AuthError('otp_expired', 'Il codice è scaduto. Inviane uno nuovo.')
  }
  if (trimmed !== MOCK_OTP_CODE) {
    throw new AuthError('otp_invalid', 'Codice non valido. Controlla e riprova.')
  }
  pendingOtps.delete(key)
  const user = toPublicUser(account)
  setAuthSession(createSession(user))
  return user
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  await delay()
  const account = findMockAccountByEmail(email)
  if (!account) {
    throw new AuthError('email_not_found', 'Nessun account registrato con questa email.')
  }
  if (roleUsesOtp(account.role)) {
    throw new AuthError(
      'password_invalid',
      'Questo account usa il codice via email. Torna indietro e scegli OTP.'
    )
  }
  if (password !== getPasswordForEmail(account.email)) {
    throw new AuthError('password_invalid', 'Password non corretta.')
  }
  const user = toPublicUser(account)
  setAuthSession(createSession(user))
  return user
}

export async function logout(): Promise<void> {
  await delay(100)
  setAuthSession(null)
}

export async function getSession(): Promise<AuthSession | null> {
  await delay(50)
  const snapshot = getAuthSessionSnapshot()
  if (!snapshot) return null
  if (new Date(snapshot.expiresAt).getTime() <= Date.now()) {
    setAuthSession(null)
    return null
  }
  return snapshot
}

/** Synchronous read for React external store (hydration on refresh). */
export function getSessionSync(): AuthSession | null {
  const raw =
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('fa-auth-session') : null
  return parseAuthSession(raw)
}
