import type { FormEvent, KeyboardEvent } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useItaliaGeo } from '../context/ItaliaGeoProvider'
import { buildProfilesDirectoryHref } from '../lib/profilesDirectoryNav'
import type { ItaliaGeoRow } from '../lib/italiaGeo/italiaComuniTypes'
import type { ListingIntent } from '../lib/directoryTypes'

const DEBOUNCE_MS = 65

function formatPlacePrimary(row: ItaliaGeoRow): string {
  return `${row.comune} (${row.siglaProvincia})`
}

function formatPlaceSecondary(row: ItaliaGeoRow): string {
  return `${row.regione} · CAP ${row.cap}`
}

function IconSearch() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export type HomeCitiesGeoSearchBarProps = {
  intent: ListingIntent
}

export function HomeCitiesGeoSearchBar({ intent }: HomeCitiesGeoSearchBarProps) {
  const navigate = useNavigate()
  const { status, search } = useItaliaGeo()
  const baseId = useId()
  const listId = `${baseId}-cities-geo-list`
  const liveId = `${baseId}-cities-geo-live`
  const inputId = `${baseId}-cities-search`

  const [cityValue, setCityValue] = useState('')
  const [suggestions, setSuggestions] = useState<ItaliaGeoRow[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      setCityValue(`${row.comune} (${row.siglaProvincia})`)
      goToProfiles({ istat: row.id })
    },
    [goToProfiles],
  )

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = cityValue.trim()
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
      setCityValue(`${first.comune} (${first.siglaProvincia})`)
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
  }

  function onInputBlur() {
    scheduleCloseMenu()
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
    <form className="home-cities__search" onSubmit={onSubmit} aria-label="Cerca professionisti per comune o CAP">
      <label className="visually-hidden" htmlFor={inputId}>
        Cerca professionisti nella tua città
      </label>
      <div className="home-cities__search-shell">
        <IconSearch />
        <div className="home-cities__search-input-wrap">
          <input
            id={inputId}
            name="citySearch"
            type="search"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList ? `${listId}-opt-${activeIndex}` : undefined}
            className="home-cities__search-input"
            placeholder="Comune, CAP, provincia o regione…"
            autoComplete="off"
            spellCheck={false}
            disabled={status === 'error'}
            value={cityValue}
            onChange={(ev) => setCityValue(ev.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            onKeyDown={onInputKeyDown}
          />
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
        <button type="submit" className="home-cities__search-btn">
          Cerca
        </button>
      </div>
    </form>
  )
}
