import { setAuthSession } from '../auth/authSessionStore'
import type { AuthUser } from '../auth/types'
import type { ConsentRecord, GdprExportPayload } from '../lib/gdprTypes'
import { CONSENT_POLICY_VERSION, GdprError } from '../lib/gdprTypes'
import { downloadFile } from '../lib/exportUtils'
import { getAccountSettings } from './accountSettingsService'
import { loadProfessionalProfile } from './professionalProfileService'
import { listSavedProfiles, clearSavedProfilesForUser } from './savedProfilesService'

const MOCK_DELAY_MS = 400
const CONSENT_STORAGE_PREFIX = 'fa:consents:'

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function consentKey(userId: string): string {
  return `${CONSENT_STORAGE_PREFIX}${userId}`
}

export function saveConsentRecord(
  userId: string,
  consents: Omit<ConsentRecord, 'recordedAt' | 'version'> & { version?: string },
): ConsentRecord {
  const record: ConsentRecord = {
    termini: consents.termini,
    privacy: consents.privacy,
    maggiorenne: consents.maggiorenne,
    comunicazioni: consents.comunicazioni,
    profilazione: consents.profilazione,
    version: consents.version ?? CONSENT_POLICY_VERSION,
    recordedAt: new Date().toISOString(),
    source: consents.source,
  }
  localStorage.setItem(consentKey(userId), JSON.stringify(record))
  return record
}

export function loadConsentRecord(userId: string): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(consentKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as ConsentRecord
  } catch {
    return null
  }
}

export async function getConsentRecord(userId: string): Promise<ConsentRecord | null> {
  await delay(120)
  const existing = loadConsentRecord(userId)
  if (existing) return existing
  // Seed demo: account creati via fixture hanno già accettato termini/privacy.
  if (userId === 'prof-1' || userId === 'fam-1' || userId === 'agency-1' || userId === 'struct-1') {
    return saveConsentRecord(userId, {
      termini: true,
      privacy: true,
      maggiorenne: true,
      comunicazioni: false,
      profilazione: false,
      source: 'registration',
    })
  }
  return null
}

export async function updateOptionalConsents(
  userId: string,
  patch: { comunicazioni?: boolean; profilazione?: boolean },
): Promise<ConsentRecord> {
  await delay()
  const current = loadConsentRecord(userId)
  if (!current) {
    throw new GdprError('not_found', 'Nessun registro consensi trovato per questo account.')
  }
  return saveConsentRecord(userId, {
    ...current,
    comunicazioni: patch.comunicazioni ?? current.comunicazioni,
    profilazione: patch.profilazione ?? current.profilazione,
    source: 'settings',
  })
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function exportUserData(user: AuthUser): Promise<GdprExportPayload> {
  await delay()
  const settings = await getAccountSettings(user)
  let professionalProfile: unknown = null
  if (user.role === 'professional') {
    professionalProfile = loadProfessionalProfile(user.id)
  }

  let familyRequests: unknown = null
  if (user.role === 'public_user') {
    familyRequests = readJson(`fa:family-requests:${user.id}`)
  }

  let savedProfiles: unknown = null
  if (user.role === 'public_user') {
    try {
      savedProfiles = await listSavedProfiles(user.id)
    } catch {
      savedProfiles = []
    }
  }

  const messaging = readJson('fa:messaging:global')
  const messagingThreads =
    messaging && typeof messaging === 'object' && 'threads' in messaging
      ? (messaging as { threads: { participantIds: string[] }[] }).threads.filter((t) =>
          t.participantIds.includes(user.id),
        )
      : []

  const payload: GdprExportPayload = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    consents: loadConsentRecord(user.id),
    accountSettings: settings,
    professionalProfile,
    familyRequests,
    savedProfiles,
    messagingThreads,
    cookieConsent: readJson('cookie_consent_v1'),
  }

  downloadFile(
    `curaxe-dati-${user.id}-${Date.now()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
  )

  return payload
}

/** Wipe mock local data for the current user and clear session. */
export async function deleteUserAccount(user: AuthUser, confirmEmail: string): Promise<void> {
  await delay()
  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    throw new GdprError('validation', 'L’email di conferma non corrisponde all’account.')
  }

  localStorage.removeItem(consentKey(user.id))
  localStorage.removeItem(`fa:account-settings:${user.id}`)
  localStorage.removeItem(`fa:professional-profile:${user.id}`)
  localStorage.removeItem(`fa:family-requests:${user.id}`)
  clearSavedProfilesForUser(user.id)

  // Remove user from messaging store
  try {
    const raw = localStorage.getItem('fa:messaging:global')
    if (raw) {
      const store = JSON.parse(raw) as {
        threads: { id: string; participantIds: string[] }[]
        messages: { threadId: string }[]
      }
      const keepThreadIds = new Set(
        store.threads.filter((t) => !t.participantIds.includes(user.id)).map((t) => t.id),
      )
      store.threads = store.threads.filter((t) => keepThreadIds.has(t.id))
      store.messages = store.messages.filter((m) => keepThreadIds.has(m.threadId))
      localStorage.setItem('fa:messaging:global', JSON.stringify(store))
    }
  } catch {
    /* ignore */
  }

  setAuthSession(null)
}
