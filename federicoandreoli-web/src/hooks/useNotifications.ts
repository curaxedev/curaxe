import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_POLL_INTERVAL_MS,
} from '../lib/notificationApi'
import type { AppNotification } from '../lib/notificationTypes'
import { NotificationError, notificationAudienceFromRole } from '../lib/notificationTypes'

function notificationErrorMessage(err: unknown): string {
  if (err instanceof NotificationError) return err.message
  return 'Impossibile caricare le notifiche. Riprova.'
}

type UseNotificationsOptions = {
  pollIntervalMs?: number
  enabled?: boolean
}

export function useNotifications(options?: UseNotificationsOptions) {
  const pollIntervalMs = options?.pollIntervalMs ?? NOTIFICATION_POLL_INTERVAL_MS
  const enabled = options?.enabled ?? true
  const { user } = useAuth()
  const audience = notificationAudienceFromRole(user?.role)
  const userId = user?.id ?? ''

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const reload = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!enabled || !userId || !audience) {
        setNotifications([])
        setLoading(false)
        setError(null)
        return
      }

      if (!opts?.silent) {
        setLoading(true)
        setError(null)
      }

      try {
        const rows = await getNotifications(userId, audience)
        setNotifications(rows)
        if (!opts?.silent) setError(null)
      } catch (err) {
        setError(notificationErrorMessage(err))
        if (!opts?.silent) setNotifications([])
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [audience, enabled, userId],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!enabled || !userId || !audience) return undefined

    const id = window.setInterval(() => {
      void reload({ silent: true })
    }, pollIntervalMs)

    return () => window.clearInterval(id)
  }, [audience, enabled, pollIntervalMs, reload, userId])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const markRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!userId) return false

      const previous = notifications
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      )

      try {
        const updated = await markNotificationRead(userId, notificationId)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? updated : n)),
        )
        return true
      } catch (err) {
        setNotifications(previous)
        setError(notificationErrorMessage(err))
        return false
      }
    },
    [notifications, userId],
  )

  const markAllRead = useCallback(async (): Promise<boolean> => {
    if (!userId) return false

    setMarkingAll(true)
    const previous = notifications
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

    try {
      const updated = await markAllNotificationsRead(userId)
      setNotifications(updated)
      return true
    } catch (err) {
      setNotifications(previous)
      setError(notificationErrorMessage(err))
      return false
    } finally {
      setMarkingAll(false)
    }
  }, [notifications, userId])

  return {
    audience,
    notifications,
    unreadCount,
    loading,
    error,
    markingAll,
    reload,
    markRead,
    markAllRead,
  }
}
