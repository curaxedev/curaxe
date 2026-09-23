import { getAuthSessionSnapshot, setAuthSession } from '../auth/authSessionStore'
import type { AuthUser } from '../auth/types'
import { findMockAccountByEmail, roleUsesOtp } from '../mocks/authFixtures'
import type { AccountSettings, NotificationPreferences } from '../lib/accountSettingsTypes'
import { AccountSettingsError } from '../lib/accountSettingsTypes'
import { getPasswordForEmail, setPasswordForEmail } from '../lib/mockCredentialStore'

const MOCK_DELAY_MS = 400
const STORAGE_PREFIX = 'fa:account-settings:'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailApplications: true,
  emailMessages: true,
  emailMarketing: false,
  pushAlerts: true,
}

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

type StoredSettings = {
  email?: string
  notificationPreferences?: NotificationPreferences
  updatedAt?: string
}

function readStored(userId: string): StoredSettings | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as StoredSettings
  } catch {
    return null
  }
}

function writeStored(userId: string, data: StoredSettings): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(data))
}

function syncSessionEmail(user: AuthUser, email: string): void {
  const session = getAuthSessionSnapshot()
  if (!session || session.user.id !== user.id) return
  setAuthSession({
    ...session,
    user: { ...session.user, email },
  })
}

function buildSettings(user: AuthUser): AccountSettings {
  const stored = readStored(user.id)
  const account = findMockAccountByEmail(user.email)
  const email = stored?.email ?? user.email
  return {
    userId: user.id,
    email,
    notificationPreferences: stored?.notificationPreferences ?? DEFAULT_PREFERENCES,
    usesOtpLogin: account ? roleUsesOtp(account.role) : false,
    updatedAt: stored?.updatedAt ?? new Date().toISOString(),
  }
}

export async function getAccountSettings(user: AuthUser): Promise<AccountSettings> {
  await delay(150)
  return buildSettings(user)
}

export async function updateAccountEmail(user: AuthUser, newEmail: string): Promise<AccountSettings> {
  await delay()
  const trimmed = newEmail.trim()
  if (!trimmed || !EMAIL_RE.test(trimmed)) {
    throw new AccountSettingsError('email_invalid', 'Inserisci un indirizzo email valido.', {
      email: 'Email non valida',
    })
  }
  if (trimmed.toLowerCase() === user.email.toLowerCase()) {
    return buildSettings(user)
  }
  const taken = findMockAccountByEmail(trimmed)
  if (taken && taken.id !== user.id) {
    throw new AccountSettingsError('email_taken', 'Questa email è già associata a un altro account.', {
      email: 'Email già in uso',
    })
  }

  const stored = readStored(user.id) ?? {}
  writeStored(user.id, {
    ...stored,
    email: trimmed,
    updatedAt: new Date().toISOString(),
  })
  syncSessionEmail(user, trimmed)
  return buildSettings({ ...user, email: trimmed })
}

export async function updateAccountPassword(
  user: AuthUser,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  await delay()
  const account = findMockAccountByEmail(user.email)
  if (account && roleUsesOtp(account.role)) {
    throw new AccountSettingsError(
      'password_invalid',
      'Il tuo account usa il codice via email. La password non è modificabile da qui.'
    )
  }

  const fieldErrors: AccountSettingsError['fieldErrors'] = {}
  if (newPassword.length < 8) {
    fieldErrors.newPassword = 'Almeno 8 caratteri'
  }
  if (newPassword !== confirmPassword) {
    fieldErrors.confirmPassword = 'Le password non coincidono'
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new AccountSettingsError('password_weak', 'Controlla i campi password.', fieldErrors)
  }

  const expected = getPasswordForEmail(user.email)
  if (currentPassword !== expected) {
    throw new AccountSettingsError('password_invalid', 'Password attuale non corretta.', {
      currentPassword: 'Password non corretta',
    })
  }

  setPasswordForEmail(user.email, newPassword)
}

export async function updateNotificationPreferences(
  user: AuthUser,
  preferences: NotificationPreferences
): Promise<AccountSettings> {
  await delay(200)
  const stored = readStored(user.id) ?? {}
  writeStored(user.id, {
    ...stored,
    notificationPreferences: preferences,
    updatedAt: new Date().toISOString(),
  })
  return buildSettings(user)
}
