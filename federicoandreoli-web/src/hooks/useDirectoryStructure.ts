import { useCallback, useEffect, useState } from 'react'
import { getDirectoryStructure } from '../lib/directoryApi'
import type { StructureDetail } from '../lib/directoryTypes'
import { DirectoryError } from '../lib/directoryTypes'

function structureErrorMessage(err: unknown): string {
  if (err instanceof DirectoryError) return err.message
  return 'Impossibile caricare la scheda. Riprova.'
}

export function useDirectoryStructure(id: string | undefined) {
  const [structure, setStructure] = useState<StructureDetail | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) {
      setStructure(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await getDirectoryStructure(id)
      setStructure(data)
    } catch (err) {
      setStructure(null)
      setError(structureErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  return { structure, loading, error, reload }
}
