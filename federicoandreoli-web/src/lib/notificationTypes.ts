/** API-shaped notification types — swap transport in `notificationApi.ts` when Laravel is ready. */

import type { UserRole } from '../auth/types'

export type NotificationAudience = 'professional' | 'agency' | 'structure' | 'family'

export type NotificationType = 'info' | 'warning' | 'success' | 'primary'

export type AppNotification = {
  id: string
  userId: string
  audience: NotificationAudience
  text: string
  createdAt: string
  read: boolean
  type: NotificationType
}

export type NotificationStore = {
  notifications: AppNotification[]
}

export type NotificationErrorCode = 'validation' | 'not_found' | 'server'

export class NotificationError extends Error {
  readonly code: NotificationErrorCode

  constructor(code: NotificationErrorCode, message: string) {
    super(message)
    this.name = 'NotificationError'
    this.code = code
  }
}

export function notificationAudienceFromRole(role: UserRole | undefined): NotificationAudience | null {
  switch (role) {
    case 'professional':
      return 'professional'
    case 'agency':
      return 'agency'
    case 'structure':
      return 'structure'
    case 'public_user':
      return 'family'
    default:
      return null
  }
}

export const NOTIFICATION_POLL_INTERVAL_MS = 30_000
