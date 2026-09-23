import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useItaliaGeo } from '../context/ItaliaGeoProvider'
import type { ItaliaGeoRow } from '../lib/italiaGeo/italiaComuniTypes'

export type ItaliaGeoSearchLayoutVariant = 'default' | 'toolbar'

export type ItaliaGeoSearchComboboxProps = {
  selectedPlace: ItaliaGeoRow | null
  onSelectedPlaceChange: (place: ItaliaGeoRow | null) => void
  /** Solo stato iniziale al mount (es. `?q=` senza match); usare `key` sul parent per forzare reset. */
  initialDraft?: string
  /** In toolbar: etichetta solo per screen reader, layout compatto. */
  layoutVariant?: ItaliaGeoSearchLayoutVariant
}

function profGeoRootClass(layoutVariant: ItaliaGeoSearchLayoutVariant): string {
  switch (layoutVariant) {
    case 'default':
      return 'prof-geo-search'
    case 'toolbar':
      return 'prof-geo-search prof-geo-search--toolbar'
    default: {
      const _exhaustive: never = layoutVariant
      return _exhaustive
    }
  }
}

const DEBOUNCE_MS = 85

function formatPlacePrimary(row: ItaliaGeoRow): string {
  return `${row.comune} (${row.siglaProvincia})`
}

function formatPlaceSecondary(row: ItaliaGeoRow): string {
  return `${row.regione} · CAP ${row.cap}`
}

export function ItaliaGeoSearchCombobox({
  selectedPlace,
  onSelectedPlaceChange,
  initialDraft,
  layoutVariant = 'default',
}: ItaliaGeoSearchComboboxProps) {
  const { status, errorMessage, search, retry } = useItaliaGeo()
  const baseId = useId()
  const listId = `${baseId}-list`
  const inputId = `${baseId}-input`
  const liveId = `${baseId}-live`

  const [draftQuery, setDraftQuery] = useState(() => initialDraft ?? '')

  const [suggestions, setSuggestions] = useState<ItaliaGeoRow[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const inputValue = selectedPlace
    ? `${formatPlacePrimary(selectedPlace)} — ${selectedPlace.regione}`
    : draftQuery

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
      setSuggestions(search(t, 12))
    },
    [search, status],
  )

  useEffect(() => {
    if (selectedPlace) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runSearch(draftQuery)
      setActiveIndex(0)
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [draftQuery, runSearch, selectedPlace])

  const openMenu = useCallback(() => setMenuOpen(true), [])
  const scheduleCloseMenu = useCallback(() => {
    if (blurCloseRef.current) clearTimeout(blurCloseRef.current)
    blurCloseRef.current = setTimeout(() => setMenuOpen(false), 120)
  }, [])
  const cancelCloseMenu = useCallback(() => {
    if (blurCloseRef.current) clearTimeout(blurCloseRef.current)
  }, [])

  const commitSelection = useCallback(
    (row: ItaliaGeoRow) => {
      onSelectedPlaceChange(row)
      setDraftQuery('')
      setSuggestions([])
      setMenuOpen(false)
    },
    [onSelectedPlaceChange],
  )

  const clearSelection = useCallback(() => {
    onSelectedPlaceChange(null)
    setDraftQuery('')
    setSuggestions([])
    setMenuOpen(false)
  }, [onSelectedPlaceChange])

  function onInputChange(v: string) {
    if (selectedPlace) {
      onSelectedPlaceChange(null)
    }
    setDraftQuery(v)
    openMenu()
  }

  function onInputFocus() {
    cancelCloseMenu()
    openMenu()
    if (!selectedPlace && status === 'ready' && draftQuery.trim().length > 0) {
      runSearch(draftQuery)
    }
  }

  function onInputBlur() {
    scheduleCloseMenu()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
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
      if (row) commitSelection(row)
    }
  }

  const showList = menuOpen && status === 'ready' && suggestions.length > 0 && !selectedPlace
  const showLoadingRow = menuOpen && status === 'loading' && draftQuery.trim().length > 0 && !selectedPlace
  const announce =
    status === 'ready' && draftQuery.trim().length > 0 && !selectedPlace
      ? `${suggestions.length} suggerimenti`
      : ''

  return (
    <div className={profGeoRootClass(layoutVariant)}>
      {status === 'error' ? (
        <div className="prof-geo-search__error" role="alert">
          <span>{errorMessage ?? 'Impossibile caricare i dati geografici.'}</span>
          <button type="button" className="prof-geo-search__retry" onClick={retry}>
            Riprova
          </button>
        </div>
      ) : null}

      <label className="prof-geo-search__label" htmlFor={inputId}>
        Cerca per comune, CAP, provincia o regione
      </label>
      <div className="prof-geo-search__field-wrap">
        <input
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-opt-${activeIndex}` : undefined}
          className="prof-geo-search__input"
          autoComplete="off"
          spellCheck={false}
          placeholder={
            status === 'loading'
              ? 'Caricamento elenco comuni…'
              : 'Es. Milano, 20121, Lombardia, TO…'
          }
          disabled={status === 'loading' || status === 'error'}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          onKeyDown={onKeyDown}
        />
        {selectedPlace ? (
          <button type="button" className="prof-geo-search__clear" onClick={clearSelection} aria-label="Rimuovi luogo">
            ×
          </button>
        ) : null}
      </div>

      <span id={liveId} className="visually-hidden" aria-live="polite">
        {announce}
      </span>

      {showLoadingRow ? (
        <div className="prof-geo-search__dropdown prof-geo-search__dropdown--muted">Caricamento…</div>
      ) : null}

      {showList ? (
        <ul id={listId} className="prof-geo-search__dropdown" role="listbox" aria-label="Suggerimenti località">
          {suggestions.map((row, i) => (
            <li key={row.id} role="presentation">
              <button
                type="button"
                role="option"
                id={`${listId}-opt-${i}`}
                aria-selected={i === activeIndex}
                className={`prof-geo-search__option${i === activeIndex ? ' is-active' : ''}`}
                onMouseEnter={() => {
                  cancelCloseMenu()
                  setActiveIndex(i)
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commitSelection(row)}
              >
                <span className="prof-geo-search__option-title">{formatPlacePrimary(row)}</span>
                <span className="prof-geo-search__option-sub">{formatPlaceSecondary(row)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {menuOpen && status === 'ready' && !selectedPlace && draftQuery.trim().length > 0 && suggestions.length === 0 ? (
        <div className="prof-geo-search__dropdown prof-geo-search__dropdown--muted">Nessun comune corrispondente</div>
      ) : null}
    </div>
  )
}
