import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  deleteProfessionalDocument,
  getProfessionalProfile,
  listProfessionalDocuments,
  updateProfessionalProfile,
  uploadProfessionalDocument,
  uploadProfessionalPhoto,
  type ProfessionalDocument,
  type ProfessionalDocumentSlot,
} from '../lib/professionalProfileApi'
import type { ProfessionalProfile, ProfessionalProfilePatch } from '../lib/professionalProfileTypes'
import { ProfessionalProfileError } from '../lib/professionalProfileTypes'

function profileErrorMessage(err: unknown): string {
  if (err instanceof ProfessionalProfileError) return err.message
  return 'Impossibile caricare il profilo. Riprova.'
}

export function useProfessionalProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null)
  const [documents, setDocuments] = useState<ProfessionalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)

  const reload = useCallback(async () => {
    if (!user?.id) {
      setProfile(null)
      setDocuments([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [data, docs] = await Promise.all([
        getProfessionalProfile(user.id),
        listProfessionalDocuments(),
      ])
      setProfile(data)
      setDocuments(docs)
    } catch (err) {
      setError(profileErrorMessage(err))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(
    async (patch: ProfessionalProfilePatch): Promise<boolean> => {
      if (!user?.id) {
        setSaveError('Sessione non valida.')
        return false
      }

      setSaving(true)
      setSaveError(null)

      const previous = profile
      if (profile) {
        setProfile({
          ...profile,
          identity: { ...profile.identity, ...patch.identity },
          professional: { ...profile.professional, ...patch.professional },
          availability: { ...profile.availability, ...patch.availability },
          rates: { ...profile.rates, ...patch.rates },
          zones: patch.zones ?? profile.zones,
          primaryZone: patch.primaryZone ?? profile.primaryZone,
          radiusKm: patch.radiusKm !== undefined ? patch.radiusKm : profile.radiusKm,
          availableToMove: patch.availableToMove ?? profile.availableToMove,
          certifications: patch.certifications ?? profile.certifications,
        })
      }

      try {
        const updated = await updateProfessionalProfile(user.id, patch)
        setProfile(updated)
        return true
      } catch (err) {
        if (previous) {
          setProfile(previous)
        }
        setSaveError(profileErrorMessage(err))
        return false
      } finally {
        setSaving(false)
      }
    },
    [profile, user?.id],
  )

  const uploadPhoto = useCallback(
    async (file: File): Promise<boolean> => {
      if (!user?.id) {
        setSaveError('Sessione non valida.')
        return false
      }
      setUploadBusy(true)
      setSaveError(null)
      try {
        const updated = await uploadProfessionalPhoto(user.id, file)
        setProfile(updated)
        return true
      } catch (err) {
        setSaveError(profileErrorMessage(err))
        return false
      } finally {
        setUploadBusy(false)
      }
    },
    [user?.id],
  )

  const uploadDocument = useCallback(
    async (slot: ProfessionalDocumentSlot, file: File): Promise<boolean> => {
      setUploadBusy(true)
      setSaveError(null)
      try {
        const doc = await uploadProfessionalDocument(slot, file)
        setDocuments((prev) => [...prev.filter((d) => d.slot !== slot), doc])
        return true
      } catch (err) {
        setSaveError(profileErrorMessage(err))
        return false
      } finally {
        setUploadBusy(false)
      }
    },
    [],
  )

  const removeDocument = useCallback(async (id: string): Promise<boolean> => {
    setUploadBusy(true)
    setSaveError(null)
    try {
      await deleteProfessionalDocument(id)
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      return true
    } catch (err) {
      setSaveError(profileErrorMessage(err))
      return false
    } finally {
      setUploadBusy(false)
    }
  }, [])

  return {
    profile,
    documents,
    loading,
    error,
    saving,
    saveError,
    uploadBusy,
    reload,
    save,
    uploadPhoto,
    uploadDocument,
    removeDocument,
    completionPercent: profile?.completionPercent ?? 0,
    missingFields: profile?.missingFields ?? [],
  }
}
