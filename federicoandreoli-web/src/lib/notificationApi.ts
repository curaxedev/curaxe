/**
 * Notifications API — doppio binario mock / Laravel.
 */
import type { NotificationAudience } from './notificationTypes'
import type { AppNotification } from './notificationTypes'
import { NotificationError } from './notificationTypes'
import {
  fetchNotifications,
  patchAllNotificationsRead,
  patchNotificationRead,
} from '../services/notificationService'
import { HttpError, httpGet, httpPatch, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type { AppNotification, NotificationAudience, NotificationType } from './notificationTypes'
export { NotificationError, NOTIFICATION_POLL_INTERVAL_MS } from './notificationTypes'

function toNotifError(err: unknown, fallback: string): NotificationError {
  if (err instanceof HttpError) {
    if (err.kind === 'not_found') return new NotificationError('not_found', err.message)
    return new NotificationError('server', err.message || fallback)
  }
  return new NotificationError('server', fallback)
}

export async function getNotifications(
  userId: string,
  audience: NotificationAudience,
): Promise<AppNotification[]> {
  if (isMockApiEnabled()) return fetchNotifications(userId, audience)
  try {
    const store = await httpGet<{ notifications: AppNotification[] }>('/api/v1/notifications')
    return store.notifications
  } catch (err) {
    throw toNotifError(err, 'Impossibile caricare le notifiche.')
  }
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<AppNotification> {
  if (isMockApiEnabled()) return patchNotificationRead(userId, notificationId)
  try {
    return await httpPatch<AppNotification>(`/api/v1/notifications/${notificationId}/read`)
  } catch (err) {
    throw toNotifError(err, 'Aggiornamento notifica non riuscito.')
  }
}

export async function markAllNotificationsRead(userId: string): Promise<AppNotification[]> {
  if (isMockApiEnabled()) return patchAllNotificationsRead(userId)
  try {
    await httpPost('/api/v1/notifications/read-all')
    return getNotifications(userId, 'family')
  } catch (err) {
    throw toNotifError(err, 'Aggiornamento notifiche non riuscito.')
  }
}
