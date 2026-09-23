/**
 * Admin platform settings API client — mock implementation today; swap to fetch + Laravel when backend is ready.
 * GET   /api/v1/admin/settings
 * PATCH /api/v1/admin/settings
 */
import type { AdminPlatformSettings } from './adminSettingsTypes'
import { fetchAdminSettings, saveAdminSettings } from '../services/adminSettingsService'

export type {
  AdminEmailNotificationKey,
  AdminEmailNotificationSettings,
  AdminFeatureFlags,
  AdminPlatformSettings,
} from './adminSettingsTypes'
export { AdminSettingsError } from './adminSettingsTypes'
export { ADMIN_EMAIL_NOTIFICATION_LABELS } from '../services/adminSettingsService'

export async function getAdminSettings(actorEmail?: string): Promise<AdminPlatformSettings> {
  return fetchAdminSettings(actorEmail)
}

export async function patchAdminSettings(
  patch: Partial<AdminPlatformSettings>,
  actorEmail?: string,
): Promise<AdminPlatformSettings> {
  return saveAdminSettings(patch, actorEmail)
}
