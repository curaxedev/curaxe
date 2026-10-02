import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useItaliaGeo } from '../../../context/ItaliaGeoProvider'
import type { ItaliaGeoRow } from '../../../lib/italiaGeo/italiaComuniTypes'
import {
  pushRecentPlace,
  readRecentPlaces,
  SUGGESTED_DESTINATIONS,
  type RecentPlace,
} from '../../../lib/recentPlaces'
import { PlaceRowIcon } from '../../../components/icons/CityPlaceIcons'

function formatPlacePrimary(row: ItaliaGeoRow): string {
  return `${row.comune} (${row.siglaProvincia})`
}

function formatPlaceSecondary(row: ItaliaGeoRow): string {
  return `${row.regione} · CAP ${row.cap}`
}

export type WizardPlaceSearchProps = {
  value: string
  onChange: (label: string) => void
  placeholder?: string
}

/** Campo luogo wizard: suggerimenti destinazioni + autocomplete comuni (stile home). */
export function WizardPlaceSearch({
  value,
  onChange,
  placeholder = 'Es. Monza, centro',
}: WizardPlaceSearchProps) {
  const { status, search } = useItaliaGeo()
  const baseId = useId()
  const listId = `${baseId}-list`
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<ItaliaGeoRow[]>([])
  const [recents, setRecents] = useState<RecentPlace[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    setRecents(readRecentPlaces())
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const t = query.trim()
      if (status !== 'ready' || t.length === 0) {
        setSuggestions([])
        return
      }
      setSuggestions(search(t, 8))
      setActiveIndex(0)
    }, 70)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search, status])

  const commit = useCallback(
    (label: string, sublabel?: string, istat?: string) => {
      const clean = label.trim()
      if (!clean) return
      onChange(clean)
      setQuery(clean)
      setRecents(
        pushRecentPlace({
          id: istat ?? clean,
          label: clean,
          sublabel,
          istat,
          q: clean,
        }),
      )
      setOpen(false)
    },
    [onChange],
  )

  const showTyped = open && query.trim().length > 0 && suggestions.length > 0
  const showBrowse = open && query.trim().length === 0

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) {
      if (e.key === 'Enter') {
        e.preventDefault()
        const t = query.trim()
        if (t) commit(t)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const row = suggestions[activeIndex]
      if (row) commit(formatPlacePrimary(row), formatPlaceSecondary(row), row.id)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={`wz-place${open ? ' is-open' : ''}`}>
      <label className="wz-field">
        <span className="wz-field__label">Dove serve l&apos;assistenza?</span>
        <input
          ref={inputRef}
          id={`${baseId}-input`}
          type="text"
          className="wz-input"
          placeholder={placeholder}
          value={query}
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
      </label>

      {open ? (
        <div className="wz-place__pop" id={listId} role="listbox" aria-label="Suggerimenti luogo">
          {showTyped ? (
            <ul className="wz-place__list">
              {suggestions.map((row, i) => (
                <li key={row.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === activeIndex}
                    className={`wz-place__row${i === activeIndex ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() =>
                      commit(formatPlacePrimary(row), formatPlaceSecondary(row), row.id)
                    }
                  >
                    <PlaceRowIcon label={row.comune} />
                    <span className="wz-place__copy">
                      <strong>{formatPlacePrimary(row)}</strong>
                      <small>{formatPlaceSecondary(row)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {showBrowse ? (
            <>
              {recents.length > 0 ? (
                <div className="wz-place__section">
                  <p className="wz-place__section-title">Ricerche recenti</p>
                  <ul className="wz-place__list">
                    {recents.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="wz-place__row"
                          onClick={() => commit(r.label, r.sublabel, r.istat)}
                        >
                          <PlaceRowIcon label={r.label} kind="recent" />
                          <span className="wz-place__copy">
                            <strong>{r.label}</strong>
                            <small>{r.sublabel ?? 'Luogo recente'}</small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="wz-place__section">
                <p className="wz-place__section-title">Destinazioni suggerite</p>
                <ul className="wz-place__list">
                  {SUGGESTED_DESTINATIONS.map((d) => (
                    <li key={d.q}>
                      <button
                        type="button"
                        className="wz-place__row"
                        onClick={() => commit(d.label, d.sublabel)}
                      >
                        <PlaceRowIcon label={d.label} />
                        <span className="wz-place__copy">
                          <strong>{d.label}</strong>
                          <small>{d.sublabel}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          {open && query.trim() && !suggestions.length && status === 'ready' ? (
            <p className="wz-place__empty">Nessun comune trovato — puoi usare il testo inserito</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
