import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ItaliaGeoRow } from '../lib/italiaGeo/italiaComuniTypes'
import { searchDirectoryProfiles } from '../lib/directoryApi'
import type { DirectoryProfileSummary, ListingIntent } from '../lib/directoryTypes'
import { DirectoryError } from '../lib/directoryTypes'

const PAGE_SIZE = 12

function directoryErrorMessage(err: unknown): string {
  if (err instanceof DirectoryError) return err.message
  return 'Impossibile caricare i profili. Riprova.'
}

export type UseDirectorySearchOptions = {
  intent: ListingIntent
  place: ItaliaGeoRow | null
}

export function useDirectorySearch({ intent, place }: UseDirectorySearchOptions) {
  const [items, setItems] = useState<DirectoryProfileSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const placeKey = place ? `${place.id}|${place.comune}` : ''

  const loadPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
      }

      try {
        const result = await searchDirectoryProfiles({
          intent,
          place,
          page: targetPage,
          pageSize: PAGE_SIZE,
        })
        setTotal(result.meta.total)
        setPage(result.meta.page)
        setTotalPages(result.meta.totalPages)
        setItems((prev) => (append ? [...prev, ...result.data] : result.data))
        setError(null)
      } catch (err) {
        if (!append) {
          setItems([])
          setTotal(0)
        }
        setError(directoryErrorMessage(err))
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [intent, place],
  )

  const reload = useCallback(async () => {
    setPage(1)
    await loadPage(1, false)
  }, [loadPage])

  useEffect(() => {
    void loadPage(1, false)
  }, [intent, placeKey, loadPage])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || page >= totalPages) return
    await loadPage(page + 1, true)
  }, [loadPage, loading, loadingMore, page, totalPages])

  const hasMore = useMemo(() => page < totalPages, [page, totalPages])

  return {
    items,
    total,
    page,
    totalPages,
    loading,
    loadingMore,
    error,
    hasMore,
    reload,
    loadMore,
  }
}
