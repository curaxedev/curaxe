/**
 * Admin platform settings — mock / Laravel.
 */
import type { AdminPlatformSettings } from './adminSettingsTypes'
import { AdminSettingsError } from './adminSettingsTypes'
import {
  fetchAdminSettings,
  saveAdminSettings,
  ADMIN_EMAIL_NOTIFICATION_LABELS,
} from '../services/adminSettingsService'
import { withAdminStepUp } from './adminSecurityApi'
import { HttpError, httpGet, httpPatch } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type {
  AdminEmailNotificationKey,
  AdminEmailNotificationSettings,
  AdminFeatureFlags,
  AdminPlatformSettings,
} from './adminSettingsTypes'
export { AdminSettingsError } from './adminSettingsTypes'
export { ADMIN_EMAIL_NOTIFICATION_LABELS }

function toError(err: unknown, fallback: string): AdminSettingsError {
  if (err instanceof HttpError && err.code === 'step_up_required') {
    throw err
  }
  if (err instanceof HttpError) {
    return new AdminSettingsError('server', err.message || fallback)
  }
  return new AdminSettingsError('server', fallback)
}

export async function getAdminSettings(actorEmail?: string): Promise<AdminPlatformSettings> {
  if (isMockApiEnabled()) return fetchAdminSettings(actorEmail)
  try {
    return await httpGet<AdminPlatformSettings>('/api/v1/admin/settings')
  } catch (err) {
    throw toError(err, 'Impossibile caricare le impostazioni.')
  }
}

export async function patchAdminSettings(
  patch: Partial<AdminPlatformSettings>,
  actorEmail?: string,
): Promise<AdminPlatformSettings> {
  if (isMockApiEnabled()) return saveAdminSettings(patch, actorEmail)
  try {
    return await withAdminStepUp('settings.platform', (token) =>
      httpPatch<AdminPlatformSettings>('/api/v1/admin/settings', {
        body: patch,
        headers: token ? { 'X-Step-Up-Token': token } : undefined,
      }),
    )
  } catch (err) {
    throw toError(err, 'Salvataggio impostazioni non riuscito.')
  }
}
