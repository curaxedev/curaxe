import { useCallback, useMemo } from 'react'
import { useItaliaGeo } from '../context/ItaliaGeoProvider'
import type { AssistenzaHeroMode } from '../lib/assistenzaHeroMode'
import {
  PROFILI_INTENT_PARAM,
  PROFILI_ISTAT_PARAM,
  PROFILI_Q_PARAM,
  parseListingIntentParam,
} from '../lib/profilesDirectoryNav'
import type { ListingIntent } from '../lib/directoryTypes'

/**
 * Stato testuale e modalità per {@link AssistenzaGeoSearchForm} variant sticky sulla directory `/profili`,
 * mappato su `istat` / `q` / `intent` (stesso flusso di navigazione della hero home).
 */
export function useProfilesDirectoryStickyHeroCity(
  searchParams: URLSearchParams,
  setSearchParams: (
    next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
    navigateOpts?: { replace?: boolean },
  ) => void,
) {
  const { status, getByIstat } = useItaliaGeo()

  const intent: ListingIntent =
    parseListingIntentParam(searchParams.get(PROFILI_INTENT_PARAM)) ?? 'cerco'

  const mode: AssistenzaHeroMode = intent === 'offro' ? 'offro' : 'cerco'

  const cityInUrl = useMemo(() => {
    const ist = searchParams.get(PROFILI_ISTAT_PARAM)?.trim()
    const q = searchParams.get(PROFILI_Q_PARAM) ?? ''
    if (ist && status === 'ready') {
      const row = getByIstat(ist)
      if (row) return `${row.comune} (${row.siglaProvincia})`
    }
    return q
  }, [getByIstat, searchParams, status])

  const onCityChange = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          if (!value.trim()) {
            out.delete(PROFILI_ISTAT_PARAM)
            out.delete(PROFILI_Q_PARAM)
          } else {
            out.delete(PROFILI_ISTAT_PARAM)
            out.set(PROFILI_Q_PARAM, value)
          }
          return out
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setCityInUrl = useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          if (!trimmed) {
            out.delete(PROFILI_ISTAT_PARAM)
            out.delete(PROFILI_Q_PARAM)
          } else {
            out.delete(PROFILI_ISTAT_PARAM)
            out.set(PROFILI_Q_PARAM, trimmed)
          }
          return out
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return { mode, cityInUrl, onCityChange, setCityInUrl }
}

export type ProfilesDirectoryStickyHeroCity = ReturnType<typeof useProfilesDirectoryStickyHeroCity>
