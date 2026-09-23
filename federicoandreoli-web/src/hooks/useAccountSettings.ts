import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  getAccountSettings,
  updateAccountEmail,
  updateAccountPassword,
  updateNotificationPreferences,
} from '../lib/accountSettingsApi'
import type { AccountSettings, NotificationPreferences } from '../lib/accountSettingsTypes'
import { AccountSettingsError } from '../lib/accountSettingsTypes'

function settingsErrorMessage(err: unknown): string {
  if (err instanceof AccountSettingsError) return err.message
  return 'Impossibile salvare le impostazioni. Riprova.'
}

export function useAccountSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<AccountSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<AccountSettingsError['fieldErrors']>()

  const reload = useCallback(async () => {
    if (!user) {
      setSettings(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getAccountSettings(user)
      setSettings(data)
    } catch (err) {
      setError(settingsErrorMessage(err))
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  const clearFeedback = useCallback(() => {
    setSuccessMessage(null)
    setFieldErrors(undefined)
    setError(null)
  }, [])

  const saveEmail = useCallback(
    async (email: string): Promise<boolean> => {
      if (!user) return false
      setSaving(true)
      clearFeedback()
      try {
        const updated = await updateAccountEmail(user, email)
        setSettings(updated)
        setSuccessMessage('Email aggiornata.')
        return true
      } catch (err) {
        if (err instanceof AccountSettingsError) {
          setFieldErrors(err.fieldErrors)
          setError(err.message)
        } else {
          setError(settingsErrorMessage(err))
        }
        return false
      } finally {
        setSaving(false)
      }
    },
    [clearFeedback, user]
  )

  const savePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<boolean> => {
      if (!user) return false
      setSaving(true)
      clearFeedback()
      try {
        await updateAccountPassword(user, currentPassword, newPassword, confirmPassword)
        setSuccessMessage('Password aggiornata.')
        return true
      } catch (err) {
        if (err instanceof AccountSettingsError) {
          setFieldErrors(err.fieldErrors)
          setError(err.message)
        } else {
          setError(settingsErrorMessage(err))
        }
        return false
      } finally {
        setSaving(false)
      }
    },
    [clearFeedback, user]
  )

  const savePreferences = useCallback(
    async (preferences: NotificationPreferences): Promise<boolean> => {
      if (!user) return false
      setSaving(true)
      clearFeedback()
      try {
        const updated = await updateNotificationPreferences(user, preferences)
        setSettings(updated)
        setSuccessMessage('Preferenze notifiche salvate.')
        return true
      } catch (err) {
        setError(settingsErrorMessage(err))
        return false
      } finally {
        setSaving(false)
      }
    },
    [clearFeedback, user]
  )

  return {
    settings,
    loading,
    error,
    saving,
    successMessage,
    fieldErrors,
    reload,
    clearFeedback,
    saveEmail,
    savePassword,
    savePreferences,
  }
}
