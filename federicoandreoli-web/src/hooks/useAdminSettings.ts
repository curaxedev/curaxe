import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getAdminSettings, patchAdminSettings } from '../lib/adminSettingsApi'
import type { AdminPlatformSettings } from '../lib/adminSettingsTypes'
import { AdminSettingsError } from '../lib/adminSettingsTypes'

function settingsErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AdminSettingsError) return err.message
  return fallback
}

export function useAdminSettings() {
  const { user } = useAuth()
  const actorEmail = user?.email

  const [settings, setSettings] = useState<AdminPlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminSettings(actorEmail)
      setSettings(data)
    } catch (err) {
      setError(settingsErrorMessage(err, 'Impossibile caricare le impostazioni.'))
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }, [actorEmail])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(
    async (patch: Partial<AdminPlatformSettings>, successMessage: string): Promise<boolean> => {
      if (!settings) return false
      setSaving(true)
      setSaveError(null)
      try {
        const updated = await patchAdminSettings(patch, actorEmail)
        setSettings(updated)
        showToast(successMessage)
        return true
      } catch (err) {
        setSaveError(settingsErrorMessage(err, 'Impossibile salvare.'))
        return false
      } finally {
        setSaving(false)
      }
    },
    [actorEmail, settings, showToast],
  )

  const updateLocal = useCallback((patch: Partial<AdminPlatformSettings>) => {
    setSettings((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        ...patch,
        pricing: { ...prev.pricing, ...patch.pricing },
        emailNotifications: { ...prev.emailNotifications, ...patch.emailNotifications },
        emailTemplates: { ...prev.emailTemplates, ...patch.emailTemplates },
        maintenance: { ...prev.maintenance, ...patch.maintenance },
        commissionRates: { ...prev.commissionRates, ...patch.commissionRates },
        featureFlags: { ...prev.featureFlags, ...patch.featureFlags },
        freeLimits: { ...prev.freeLimits, ...patch.freeLimits },
      }
    })
  }, [])

  return {
    settings,
    loading,
    error,
    saving,
    saveError,
    toast,
    reload,
    save,
    updateLocal,
  }
}
