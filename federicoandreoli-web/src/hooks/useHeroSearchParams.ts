import { useCallback, useLayoutEffect, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  ASSISTENZA_HERO_PARAM,
  HERO_CITY_PARAM,
  parseAssistenzaHeroMode,
  type AssistenzaHeroMode,
} from '../lib/assistenzaHeroMode'

/**
 * Stato URL condiviso tra hero e barra sticky: modalità cerco/offro e città.
 */
export function useHeroSearchParams() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  useLayoutEffect(() => {
    const params = new URLSearchParams(location.search)
    const raw = params.get(ASSISTENZA_HERO_PARAM)
    if (raw === null) return
    if (parseAssistenzaHeroMode(params) === 'offro' && raw !== 'offro') {
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          out.set(ASSISTENZA_HERO_PARAM, 'offro')
          return out
        },
        { replace: true, preventScrollReset: true }
      )
    }
  }, [location.search, setSearchParams])

  const mode = useMemo(() => parseAssistenzaHeroMode(searchParams), [searchParams])
  const cityInUrl = searchParams.get(HERO_CITY_PARAM) ?? ''

  const setMode = useCallback(
    (next: AssistenzaHeroMode) => {
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          if (next === 'offro') {
            out.set(ASSISTENZA_HERO_PARAM, 'offro')
          } else {
            out.delete(ASSISTENZA_HERO_PARAM)
          }
          return out
        },
        { replace: true, preventScrollReset: true }
      )
    },
    [setSearchParams]
  )

  const setCityInUrl = useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          if (trimmed) {
            out.set(HERO_CITY_PARAM, trimmed)
          } else {
            out.delete(HERO_CITY_PARAM)
          }
          return out
        },
        { replace: true, preventScrollReset: true }
      )
    },
    [setSearchParams]
  )

  const onCityChange = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          if (!value.trim()) {
            out.delete(HERO_CITY_PARAM)
          } else {
            out.set(HERO_CITY_PARAM, value)
          }
          return out
        },
        { replace: true, preventScrollReset: true }
      )
    },
    [setSearchParams]
  )

  return { mode, setMode, cityInUrl, setCityInUrl, onCityChange }
}
