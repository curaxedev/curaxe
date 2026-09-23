import { useCallback, useEffect, useState } from 'react'
import { getDirectoryOpenPositionsForHome } from '../lib/directoryApi'
import type { MockOpenPosition, OpenPositionFilters } from '../lib/directoryTypes'
import { DirectoryError } from '../lib/directoryTypes'

function listErrorMessage(err: unknown): string {
  if (err instanceof DirectoryError) return err.message
  return 'Impossibile caricare le posizioni aperte. Riprova.'
}

export function useDirectoryOpenPositionsList(filters: OpenPositionFilters) {
  const [items, setItems] = useState<MockOpenPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filterKey = `${filters.cityQuery}|${filters.roleId ?? 'all'}|${filters.poster ?? 'all'}|${filters.contract ?? 'all'}`

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await getDirectoryOpenPositionsForHome(filters)
      setItems(rows)
    } catch (err) {
      setItems([])
      setError(listErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [filterKey])

  useEffect(() => {
    void reload()
  }, [reload])

  return { items, loading, error, reload }
}
