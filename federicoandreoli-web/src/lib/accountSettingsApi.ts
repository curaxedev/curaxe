/**
 * Account settings API — mock today; swap to fetch when Laravel ships.
 */
export {
  getAccountSettings,
  updateAccountEmail,
  updateAccountPassword,
  updateNotificationPreferences,
} from '../services/accountSettingsService'

export type { AccountSettings, NotificationPreferences } from './accountSettingsTypes'
export { AccountSettingsError } from './accountSettingsTypes'
