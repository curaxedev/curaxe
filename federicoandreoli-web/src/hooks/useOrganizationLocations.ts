import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import type { UserRole } from '../auth/types'
import {
  getOrganizationLocations,
  markPrimaryOrganizationLocation,
  patchOrganizationLocation,
  postOrganizationLocation,
  removeOrganizationLocation,
} from '../lib/locationApi'
import type {
  OrganizationLocation,
  OrganizationLocationInput,
  OrganizationLocationOwnerType,
  OrganizationLocationPatch,
} from '../lib/locationTypes'
import { LocationError } from '../lib/locationTypes'

function roleToOwnerType(role: UserRole | undefined): OrganizationLocationOwnerType | null {
  if (role === 'agency') return 'agency'
  if (role === 'structure') return 'structure'
  return null
}

function locationErrorMessage(err: unknown): string {
  if (err instanceof LocationError) return err.message
  return 'Impossibile completare l\'operazione sulle sedi. Riprova.'
}

export function useOrganizationLocations() {
  const { user } = useAuth()
  const ownerType = roleToOwnerType(user?.role)
  const orgId = user?.id ?? ''

  const [locations, setLocations] = useState<OrganizationLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!orgId || !ownerType) {
      setLocations([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const rows = await getOrganizationLocations(orgId, ownerType)
      setLocations(rows)
    } catch (err) {
      setError(locationErrorMessage(err))
      setLocations([])
    } finally {
      setLoading(false)
    }
  }, [orgId, ownerType])

  useEffect(() => {
    void reload()
  }, [reload])

  const clearSaveFeedback = useCallback(() => {
    setSaveError(null)
  }, [])

  const createLocation = useCallback(
    async (input: OrganizationLocationInput): Promise<OrganizationLocation | null> => {
      if (!orgId || !ownerType) return null
      setSaving(true)
      setSaveError(null)
      try {
        const created = await postOrganizationLocation(orgId, ownerType, input)
        await reload()
        return created
      } catch (err) {
        setSaveError(locationErrorMessage(err))
        return null
      } finally {
        setSaving(false)
      }
    },
    [orgId, ownerType, reload],
  )

  const updateLocation = useCallback(
    async (
      locationId: string,
      patch: OrganizationLocationPatch,
    ): Promise<OrganizationLocation | null> => {
      if (!orgId || !ownerType) return null
      setSaving(true)
      setSaveError(null)
      try {
        const updated = await patchOrganizationLocation(orgId, ownerType, locationId, patch)
        await reload()
        return updated
      } catch (err) {
        setSaveError(locationErrorMessage(err))
        return null
      } finally {
        setSaving(false)
      }
    },
    [orgId, ownerType, reload],
  )

  const deleteLocation = useCallback(
    async (locationId: string): Promise<boolean> => {
      if (!orgId || !ownerType) return false
      setDeletingId(locationId)
      setSaveError(null)
      try {
        await removeOrganizationLocation(orgId, ownerType, locationId)
        await reload()
        return true
      } catch (err) {
        setSaveError(locationErrorMessage(err))
        return false
      } finally {
        setDeletingId(null)
      }
    },
    [orgId, ownerType, reload],
  )

  const setPrimary = useCallback(
    async (locationId: string): Promise<boolean> => {
      if (!orgId || !ownerType) return false
      setSaving(true)
      setSaveError(null)
      try {
        const rows = await markPrimaryOrganizationLocation(orgId, ownerType, locationId)
        setLocations(rows)
        return true
      } catch (err) {
        setSaveError(locationErrorMessage(err))
        return false
      } finally {
        setSaving(false)
      }
    },
    [orgId, ownerType],
  )

  return {
    orgId,
    ownerType,
    locations,
    loading,
    error,
    saving,
    saveError,
    deletingId,
    reload,
    clearSaveFeedback,
    createLocation,
    updateLocation,
    deleteLocation,
    setPrimary,
  }
}
