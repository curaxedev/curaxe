import { findMockAccountByEmail, roleUsesOtp } from '../mocks/authFixtures'
import { setPasswordForEmail } from '../lib/mockCredentialStore'
import type { PasswordResetTokenPayload } from '../lib/passwordResetTypes'
import { PasswordResetError } from '../lib/passwordResetTypes'

const MOCK_DELAY_MS = 400
const TOKEN_TTL_MS = 60 * 60 * 1000
const STORAGE_KEY = 'fa:password-reset-tokens'
const DEV_TOKEN = 'dev-reset'

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readTokens(): Record<string, PasswordResetTokenPayload> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, PasswordResetTokenPayload>
  } catch {
    return {}
  }
}

function writeTokens(map: Record<string, PasswordResetTokenPayload>): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function purgeExpired(map: Record<string, PasswordResetTokenPayload>): Record<string, PasswordResetTokenPayload> {
  const now = Date.now()
  const next: Record<string, PasswordResetTokenPayload> = {}
  for (const [token, payload] of Object.entries(map)) {
    if (new Date(payload.expiresAt).getTime() > now) next[token] = payload
  }
  return next
}

export async function requestPasswordReset(email: string): Promise<{ token: string }> {
  await delay()
  const account = findMockAccountByEmail(email)
  if (!account) {
    throw new PasswordResetError('email_not_found', 'Nessun account registrato con questa email.')
  }
  if (roleUsesOtp(account.role)) {
    throw new PasswordResetError(
      'otp_only_account',
      'Questo account usa il codice via email. Accedi dalla pagina di login con OTP.'
    )
  }

  const token = createToken()
  const map = purgeExpired(readTokens())
  map[token] = {
    email: account.email,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  }
  writeTokens(map)
  return { token }
}

export async function validateResetToken(token: string): Promise<PasswordResetTokenPayload> {
  await delay(150)
  const trimmed = token.trim()
  if (!trimmed) {
    throw new PasswordResetError('token_invalid', 'Link di reimpostazione non valido.')
  }

  if (import.meta.env.DEV && trimmed === DEV_TOKEN) {
    const account = findMockAccountByEmail('info@auracare.it')
    if (!account) {
      throw new PasswordResetError('token_invalid', 'Token demo non disponibile.')
    }
    return {
      email: account.email,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    }
  }

  const map = purgeExpired(readTokens())
  writeTokens(map)
  const payload = map[trimmed]
  if (!payload) {
    throw new PasswordResetError('token_invalid', 'Link di reimpostazione non valido o già usato.')
  }
  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    delete map[trimmed]
    writeTokens(map)
    throw new PasswordResetError('token_expired', 'Il link è scaduto. Richiedi una nuova email.')
  }
  return payload
}

export async function resetPassword(token: string, password: string, confirm: string): Promise<void> {
  await delay()
  if (password.length < 8) {
    throw new PasswordResetError('password_weak', 'La password deve avere almeno 8 caratteri.')
  }
  if (password !== confirm) {
    throw new PasswordResetError('password_mismatch', 'Le password non coincidono.')
  }

  const payload = await validateResetToken(token)
  setPasswordForEmail(payload.email, password)

  const map = purgeExpired(readTokens())
  delete map[token.trim()]
  writeTokens(map)
}

export const PASSWORD_RESET_DEV_TOKEN = DEV_TOKEN
