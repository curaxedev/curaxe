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

export type WizardPlaceSelection = {
  label: string
  istat?: string
  comune?: string
  regione?: string
  cap?: string
}

export type WizardPlaceSearchProps = {
  value: string
  onChange: (label: string) => void
  /** Chiamato solo quando l’utente sceglie un suggerimento (o destinazione nota). */
  onPlaceSelect?: (place: WizardPlaceSelection) => void
  placeholder?: string
  fieldLabel?: string
  /**
   * Se true: il valore valido arriva solo da un click/Enter su un suggerimento.
   * Digitare libero non conferma il luogo (serve per matching directory).
   */
  requireSelection?: boolean
}

/** Campo luogo wizard: suggerimenti destinazioni + autocomplete comuni (stile home). */
export function WizardPlaceSearch({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Es. Monza, Torino…',
  fieldLabel = 'Dove operi principalmente?',
  requireSelection = false,
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
    (selection: WizardPlaceSelection) => {
      const clean = selection.label.trim()
      if (!clean) return
      onChange(clean)
      onPlaceSelect?.(selection)
      setQuery(clean)
      setRecents(
        pushRecentPlace({
          id: selection.istat ?? clean,
          label: clean,
          sublabel: selection.regione
            ? `${selection.regione}${selection.cap ? ` · CAP ${selection.cap}` : ''}`
            : undefined,
          istat: selection.istat,
          q: selection.comune ?? clean,
        }),
      )
      setOpen(false)
    },
    [onChange, onPlaceSelect],
  )

  const commitRow = (row: ItaliaGeoRow) => {
    commit({
      label: formatPlacePrimary(row),
      istat: row.id,
      comune: row.comune,
      regione: row.regione,
      cap: row.cap,
    })
  }

  const showTyped = open && query.trim().length > 0 && suggestions.length > 0
  const showBrowse = open && query.trim().length === 0

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (!requireSelection) {
          const t = query.trim()
          if (t) commit({ label: t })
        }
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
      if (row) commitRow(row)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={`wz-place${open ? ' is-open' : ''}`}>
      <label className="wz-field">
        <span className="wz-field__label">{fieldLabel}</span>
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
            const next = e.target.value
            setQuery(next)
            setOpen(true)
            if (requireSelection) {
              // Digitare invalida la selezione precedente finché non si sceglie un suggerimento
              onChange('')
              onPlaceSelect?.({ label: '' })
            } else {
              onChange(next)
            }
          }}
          onKeyDown={onKeyDown}
        />
        {requireSelection ? (
          <span className="wz-field__hint">Scegli un comune dai suggerimenti per continuare.</span>
        ) : null}
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
                    onClick={() => commitRow(row)}
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
                          onClick={() =>
                            commit({
                              label: r.label,
                              istat: r.istat,
                              comune: r.q,
                            })
                          }
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
                        onClick={() => commit({ label: d.label, comune: d.q })}
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
            <p className="wz-place__empty">
              {requireSelection
                ? 'Nessun comune trovato — prova un’altra città o un CAP.'
                : 'Nessun comune trovato — puoi usare il testo inserito'}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
