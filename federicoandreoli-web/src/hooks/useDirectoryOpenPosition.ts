import { useCallback, useEffect, useState } from 'react'
import {
  getDirectoryNearbyOpenPositions,
  getDirectoryOpenPosition,
} from '../lib/directoryApi'
import type { MockOpenPosition } from '../lib/directoryTypes'
import { DirectoryError } from '../lib/directoryTypes'

function positionErrorMessage(err: unknown): string {
  if (err instanceof DirectoryError) return err.message
  return 'Impossibile caricare l’annuncio. Riprova.'
}

export function useDirectoryOpenPosition(id: string | undefined, cityQuery: string) {
  const [position, setPosition] = useState<MockOpenPosition | null>(null)
  const [nearby, setNearby] = useState<MockOpenPosition[]>([])
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) {
      setPosition(null)
      setNearby([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const job = await getDirectoryOpenPosition(id)
      setPosition(job)
      const related = await getDirectoryNearbyOpenPositions(job, cityQuery, 4)
      setNearby(related)
    } catch (err) {
      setPosition(null)
      setNearby([])
      setError(positionErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [cityQuery, id])

  useEffect(() => {
    void reload()
  }, [reload])

  return { position, nearby, loading, error, reload }
}
