import type { FormEvent, KeyboardEvent } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useItaliaGeo } from '../context/ItaliaGeoProvider'
import type { AssistenzaHeroMode } from '../lib/assistenzaHeroMode'
import { HERO_CITY_PARAM } from '../lib/assistenzaHeroMode'
import {
  buildProfilesDirectoryHref,
  listingIntentFromAssistenzaMode,
} from '../lib/profilesDirectoryNav'
import type { ItaliaGeoRow } from '../lib/italiaGeo/italiaComuniTypes'

const DEBOUNCE_MS = 65

function formatPlacePrimary(row: ItaliaGeoRow): string {
  return `${row.comune} (${row.siglaProvincia})`
}

function formatPlaceSecondary(row: ItaliaGeoRow): string {
  return `${row.regione} · CAP ${row.cap}`
}

function IconSearch({ compact }: { compact?: boolean }) {
  const s = compact ? 18 : 20
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export type AssistenzaGeoSearchFormProps = {
  variant: 'hero' | 'sticky'
  mode: AssistenzaHeroMode
  cityInputId: string
  cityValue: string
  showTypewriter: boolean
  typewriterText: string
  onCityFocus: () => void
  onCityBlur: () => void
  onCityChange: (value: string) => void
  setCityInUrl: (raw: string) => void
}

export function AssistenzaGeoSearchForm({
  variant,
  mode,
  cityInputId,
  cityValue,
  showTypewriter,
  typewriterText,
  onCityFocus,
  onCityBlur,
  onCityChange,
  setCityInUrl,
}: AssistenzaGeoSearchFormProps) {
  const navigate = useNavigate()
  const { status, search } = useItaliaGeo()
  const baseId = useId()
  const listId = `${baseId}-hero-geo-list`
  const liveId = `${baseId}-hero-geo-live`

  const [suggestions, setSuggestions] = useState<ItaliaGeoRow[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rootClass =
    variant === 'sticky'
      ? 'hero-search hero-search--location-only hero-search--sticky-bar'
      : 'hero-search hero-search--location-only'

  const submitAria =
    mode === 'offro' ? 'Cerca posizioni e profili in questa zona' : 'Cerca professionisti in questa zona'

  const placeholder = showTypewriter ? '' : 'Comune, CAP, provincia o regione…'

  const runSearch = useCallback(
    (q: string) => {
      if (status !== 'ready') {
        setSuggestions([])
        return
      }
      const t = q.trim()
      if (t.length === 0) {
        setSuggestions([])
        return
      }
      setSuggestions(search(t, 10))
    },
    [search, status],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runSearch(cityValue)
      setActiveIndex(0)
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [cityValue, runSearch])

  const openMenu = useCallback(() => setMenuOpen(true), [])
  const scheduleCloseMenu = useCallback(() => {
    if (blurCloseRef.current) clearTimeout(blurCloseRef.current)
    blurCloseRef.current = setTimeout(() => setMenuOpen(false), 140)
  }, [])
  const cancelCloseMenu = useCallback(() => {
    if (blurCloseRef.current) clearTimeout(blurCloseRef.current)
  }, [])

  const intent = listingIntentFromAssistenzaMode(mode)

  const goToProfiles = useCallback(
    (opts: { istat?: string; q?: string }) => {
      navigate(buildProfilesDirectoryHref({ ...opts, intent }))
    },
    [navigate, intent],
  )

  const pickRow = useCallback(
    (row: ItaliaGeoRow) => {
      setMenuOpen(false)
      setSuggestions([])
      setCityInUrl(`${row.comune} (${row.siglaProvincia})`)
      goToProfiles({ istat: row.id })
    },
    [goToProfiles, setCityInUrl],
  )

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = cityValue.trim()
    setCityInUrl(cityValue)
    if (q.length === 0) return
    if (menuOpen && suggestions.length > 0) {
      const row = suggestions[activeIndex]
      if (row) {
        pickRow(row)
        return
      }
    }
    const first = search(q, 1)[0]
    if (first) {
      setCityInUrl(`${first.comune} (${first.siglaProvincia})`)
      goToProfiles({ istat: first.id })
    } else {
      goToProfiles({ q })
    }
  }

  function onInputFocus() {
    cancelCloseMenu()
    openMenu()
    if (status === 'ready' && cityValue.trim().length > 0) {
      runSearch(cityValue)
    }
    onCityFocus()
  }

  function onInputBlur() {
    scheduleCloseMenu()
    onCityBlur()
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!menuOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && suggestions.length > 0) {
      setMenuOpen(true)
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setMenuOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, suggestions.length - 1)))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && menuOpen && suggestions.length > 0) {
      e.preventDefault()
      const row = suggestions[activeIndex]
      if (row) pickRow(row)
    }
  }

  const showList = menuOpen && status === 'ready' && suggestions.length > 0
  const showLoadingHint = menuOpen && status === 'loading' && cityValue.trim().length > 0
  const showEmpty =
    menuOpen && status === 'ready' && cityValue.trim().length > 0 && suggestions.length === 0
  const announce = status === 'ready' && cityValue.trim().length > 0 ? `${suggestions.length} suggerimenti` : ''

  return (
    <form
      className={rootClass}
      onSubmit={onSubmit}
      aria-label={
        mode === 'offro'
          ? 'Cerca posizioni e profili per comune, CAP o zona'
          : 'Cerca professionisti e organizzazioni per comune, CAP o zona'
      }
    >
      <div className="hero-search__field hero-search__field--city hero-search__field--city-only hero-search__field--geo">
        <label className="visually-hidden" htmlFor={cityInputId}>
          Comune, CAP o zona
        </label>
        <div className={`hero-search__compose${showTypewriter ? ' hero-search__compose--tw' : ''}`}>
          <div className="hero-search__input-slot hero-search__input-slot--geo">
            <input
              id={cityInputId}
              name={HERO_CITY_PARAM}
              type="text"
              role="combobox"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={showList ? `${listId}-opt-${activeIndex}` : undefined}
              className={`hero-search__city${showTypewriter ? ' hero-search__city--tw-active' : ''}`}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              value={cityValue}
              onChange={(ev) => onCityChange(ev.target.value)}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              onKeyDown={onInputKeyDown}
            />
            {showTypewriter ? (
              <span className="hero-search__tw" aria-hidden="true">
                <span className="hero-search__tw-text">{typewriterText}</span>
                <span className="hero-search__tw-caret" />
              </span>
            ) : null}

            <span id={liveId} className="visually-hidden" aria-live="polite">
              {announce}
            </span>

            {showLoadingHint ? (
              <div className="hero-geo-dd hero-geo-dd--muted" role="status">
                Caricamento suggerimenti…
              </div>
            ) : null}

            {showList ? (
              <ul id={listId} className="hero-geo-dd" role="listbox" aria-label="Suggerimenti località">
                {suggestions.map((row, i) => (
                  <li key={row.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      id={`${listId}-opt-${i}`}
                      aria-selected={i === activeIndex}
                      className={`hero-geo-dd__opt${i === activeIndex ? ' is-active' : ''}`}
                      onMouseEnter={() => {
                        cancelCloseMenu()
                        setActiveIndex(i)
                      }}
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => pickRow(row)}
                    >
                      <span className="hero-geo-dd__opt-title">{formatPlacePrimary(row)}</span>
                      <span className="hero-geo-dd__opt-sub">{formatPlaceSecondary(row)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {showEmpty ? (
              <div className="hero-geo-dd hero-geo-dd--muted" role="status">
                Nessun risultato: invio apre la directory con il testo inserito
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <button
        type="submit"
        className={`hero-search__btn${variant === 'sticky' ? ' hero-search__btn--sticky-icon' : ''}`}
        aria-label={submitAria}
      >
        <IconSearch compact={variant === 'sticky'} />
        {variant === 'sticky' ? null : <span>Cerca</span>}
      </button>
    </form>
  )
}
