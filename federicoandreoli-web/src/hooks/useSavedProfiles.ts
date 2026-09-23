import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import type { SavedProfile, SavedProfileCreateInput } from '../lib/savedProfileTypes'
import { SavedProfileError } from '../lib/savedProfileTypes'
import {
  createSavedProfile,
  deleteSavedProfile,
  fetchSavedProfiles,
} from '../lib/savedProfilesApi'

export function useSavedProfiles() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [items, setItems] = useState<SavedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await fetchSavedProfiles(userId)
      setItems(list)
    } catch (err) {
      setError(err instanceof SavedProfileError ? err.message : 'Impossibile caricare i salvati.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(
    async (input: SavedProfileCreateInput) => {
      if (!userId) return null
      setMutatingId(input.professionalId)
      setError(null)
      try {
        const item = await createSavedProfile(userId, input)
        setItems((prev) => {
          if (prev.some((p) => p.professionalId === item.professionalId)) return prev
          return [item, ...prev]
        })
        return item
      } catch (err) {
        setError(err instanceof SavedProfileError ? err.message : 'Salvataggio non riuscito.')
        return null
      } finally {
        setMutatingId(null)
      }
    },
    [userId],
  )

  const remove = useCallback(
    async (professionalId: string) => {
      if (!userId) return false
      setMutatingId(professionalId)
      setError(null)
      try {
        await deleteSavedProfile(userId, professionalId)
        setItems((prev) => prev.filter((p) => p.professionalId !== professionalId))
        return true
      } catch (err) {
        setError(err instanceof SavedProfileError ? err.message : 'Rimozione non riuscita.')
        return false
      } finally {
        setMutatingId(null)
      }
    },
    [userId],
  )

  const isSaved = useCallback(
    (professionalId: string) => items.some((p) => p.professionalId === professionalId),
    [items],
  )

  return {
    items,
    loading,
    error,
    mutatingId,
    reload,
    save,
    remove,
    isSaved,
  }
}
