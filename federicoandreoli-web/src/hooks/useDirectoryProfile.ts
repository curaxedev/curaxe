import { useCallback, useEffect, useState } from 'react'
import { getDirectoryProfessional } from '../lib/directoryApi'
import type { DirectoryProfessionalDetail } from '../lib/directoryTypes'
import { DirectoryError } from '../lib/directoryTypes'

function profileErrorMessage(err: unknown): string {
  if (err instanceof DirectoryError) return err.message
  return 'Impossibile caricare il profilo. Riprova.'
}

export function useDirectoryProfile(id: string | undefined) {
  const [profile, setProfile] = useState<DirectoryProfessionalDetail | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) {
      setProfile(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await getDirectoryProfessional(id)
      setProfile(data)
    } catch (err) {
      setProfile(null)
      setError(profileErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  return { profile, loading, error, reload }
}
