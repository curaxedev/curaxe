/**
 * GDPR API — doppio binario mock / Laravel.
 *
 * Endpoint reali (autenticati):
 *   GET    /api/v1/gdpr/consents  -> ConsentRecord | null
 *   PATCH  /api/v1/gdpr/consents  -> ConsentRecord (nuovo record versionato)
 *   POST   /api/v1/gdpr/export    -> JSON dati utente (art. 20)
 *   DELETE /api/v1/account        -> 204 (art. 17)
 */
import { setAuthSession } from '../auth/authSessionStore'
import type { AuthUser } from '../auth/types'
import {
  deleteUserAccount,
  exportUserData,
  getConsentRecord,
  updateOptionalConsents,
} from '../services/gdprService'
import { downloadFile } from './exportUtils'
import type { ConsentRecord, GdprExportPayload } from './gdprTypes'
import { GdprError } from './gdprTypes'
import { HttpError, httpDelete, httpGet, httpPatch, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

function toGdprError(err: unknown, fallback: string): GdprError {
  if (err instanceof HttpError) {
    if (err.code === 'not_found') return new GdprError('not_found', err.message)
    if (err.kind === 'validation') return new GdprError('validation', err.message)
    return new GdprError('server', err.message || fallback)
  }
  return new GdprError('server', fallback)
}

export async function fetchConsentRecord(userId: string): Promise<ConsentRecord | null> {
  if (isMockApiEnabled()) return getConsentRecord(userId)
  try {
    return await httpGet<ConsentRecord | null>('/api/v1/gdpr/consents')
  } catch (err) {
    throw toGdprError(err, 'Impossibile caricare i consensi.')
  }
}

export async function patchOptionalConsents(
  userId: string,
  patch: { comunicazioni?: boolean; profilazione?: boolean }
): Promise<ConsentRecord> {
  if (isMockApiEnabled()) return updateOptionalConsents(userId, patch)
  try {
    return await httpPatch<ConsentRecord>('/api/v1/gdpr/consents', { body: patch })
  } catch (err) {
    throw toGdprError(err, 'Aggiornamento consensi non riuscito.')
  }
}

export async function downloadMyData(user: AuthUser): Promise<GdprExportPayload> {
  if (isMockApiEnabled()) return exportUserData(user)
  try {
    const payload = await httpPost<GdprExportPayload>('/api/v1/gdpr/export')
    downloadFile(
      `federicoandreoli-dati-${user.id}-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    )
    return payload
  } catch (err) {
    throw toGdprError(err, 'Esportazione non riuscita.')
  }
}

export async function eraseMyAccount(user: AuthUser, confirmEmail: string): Promise<void> {
  if (isMockApiEnabled()) return deleteUserAccount(user, confirmEmail)
  try {
    await httpDelete('/api/v1/account', { body: { confirm_email: confirmEmail } })
  } catch (err) {
    throw toGdprError(err, 'Eliminazione non riuscita.')
  }
  setAuthSession(null)
}
