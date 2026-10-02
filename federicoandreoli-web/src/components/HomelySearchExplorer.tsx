import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useItaliaGeo } from '../context/ItaliaGeoProvider'
import type { AssistenzaHeroMode } from '../lib/assistenzaHeroMode'
import {
  buildProfilesDirectoryHref,
  listingIntentFromAssistenzaMode,
} from '../lib/profilesDirectoryNav'
import type { ItaliaGeoRow } from '../lib/italiaGeo/italiaComuniTypes'
import {
  pushRecentPlace,
  readRecentPlaces,
  SUGGESTED_DESTINATIONS,
  type RecentPlace,
} from '../lib/recentPlaces'

type Panel = 'dove' | 'mode' | null

type PlaceValue = {
  label: string
  sublabel?: string
  istat?: string
  q?: string
}

function formatPlacePrimary(row: ItaliaGeoRow): string {
  return `${row.comune} (${row.siglaProvincia})`
}

function formatPlaceSecondary(row: ItaliaGeoRow): string {
  return `${row.regione} · CAP ${row.cap}`
}

function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="2.2" />
      <path d="M16.2 16.2 21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconNear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  )
}

function IconCity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 20V9l8-5 8 5v11" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" />
    </svg>
  )
}

function IconClear() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export type HomelySearchExplorerProps = {
  mode: AssistenzaHeroMode
  cityValue: string
  onModeChange: (mode: AssistenzaHeroMode) => void
  onCityChange: (value: string) => void
  setCityInUrl: (raw: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function HomelySearchExplorer({
  mode,
  cityValue,
  onModeChange,
  onCityChange,
  setCityInUrl,
  onFocusChange,
}: HomelySearchExplorerProps) {
  const navigate = useNavigate()
  const { status, search } = useItaliaGeo()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()
  const listId = `${baseId}-list`

  const [open, setOpen] = useState<Panel>(null)
  const [query, setQuery] = useState(cityValue)
  const [place, setPlace] = useState<PlaceValue | null>(
    cityValue.trim() ? { label: cityValue.trim(), q: cityValue.trim() } : null,
  )
  const [recents, setRecents] = useState<RecentPlace[]>([])
  const [suggestions, setSuggestions] = useState<ItaliaGeoRow[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [nearBusy, setNearBusy] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setRecents(readRecentPlaces())
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: Event) => {
      const target = e.target as Node | null
      if (!rootRef.current?.contains(target)) {
        setOpen(null)
        onFocusChange?.(false)
      }
    }
    const onKey = (e: Event) => {
      if ((e as globalThis.KeyboardEvent).key === 'Escape') {
        setOpen(null)
        onFocusChange?.(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onFocusChange])

  useEffect(() => {
    if (open === 'dove') {
      onFocusChange?.(true)
      queueMicrotask(() => inputRef.current?.focus())
    }
  }, [open, onFocusChange])

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

  const openDove = () => {
    setOpen('dove')
    setQuery(place?.label ?? cityValue)
  }

  const openMode = () => setOpen('mode')

  const remember = useCallback((p: PlaceValue) => {
    setRecents(
      pushRecentPlace({
        id: p.istat ?? p.label,
        label: p.label,
        sublabel: p.sublabel,
        istat: p.istat,
        q: p.q ?? p.label,
      }),
    )
  }, [])

  const selectPlace = useCallback(
    (p: PlaceValue) => {
      setPlace(p)
      setQuery(p.label)
      onCityChange(p.label)
      setCityInUrl(p.label)
      remember(p)
      setOpen('mode')
    },
    [onCityChange, setCityInUrl, remember],
  )

  const clearPlace = (e?: MouseEvent) => {
    e?.stopPropagation()
    setPlace(null)
    setQuery('')
    onCityChange('')
    setCityInUrl('')
    setOpen('dove')
    queueMicrotask(() => inputRef.current?.focus())
  }

  const pickMode = (m: AssistenzaHeroMode) => {
    onModeChange(m)
    setOpen(null)
    onFocusChange?.(false)
  }

  const runSearch = () => {
    const label = (place?.label ?? query).trim()
    if (label && !place) {
      remember({ label, q: label })
    }
    const qText = (place?.q ?? label).trim()
    const href = buildProfilesDirectoryHref({
      istat: place?.istat,
      q: place?.istat ? undefined : qText || undefined,
      intent: listingIntentFromAssistenzaMode(mode),
    })
    setOpen(null)
    onFocusChange?.(false)
    navigate(href)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (open === 'dove' && suggestions[activeIndex]) {
      const row = suggestions[activeIndex]
      selectPlace({
        label: formatPlacePrimary(row),
        sublabel: formatPlaceSecondary(row),
        istat: row.id,
        q: row.comune,
      })
      return
    }
    runSearch()
  }

  const requestNearMe = () => {
    if (!navigator.geolocation) {
      selectPlace({ label: 'Vicino a me', q: 'Vicino a me' })
      return
    }
    setNearBusy(true)
    navigator.geolocation.getCurrentPosition(
      () => {
        setNearBusy(false)
        selectPlace({
          label: 'Vicino a me',
          sublabel: 'Intorno a te',
          q: 'Vicino a me',
        })
      },
      () => {
        setNearBusy(false)
        selectPlace({
          label: 'Vicino a me',
          sublabel: 'Attiva la posizione dal browser',
          q: 'Vicino a me',
        })
      },
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) {
      if (e.key === 'Enter') {
        e.preventDefault()
        const t = query.trim()
        if (t) selectPlace({ label: t, q: t })
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
      if (row) {
        selectPlace({
          label: formatPlacePrimary(row),
          sublabel: formatPlaceSecondary(row),
          istat: row.id,
          q: row.comune,
        })
      }
    }
  }

  const doveDisplay = place?.label || 'Scopri destinazioni'
  const doveIsPlaceholder = !place?.label
  const modeLabel = mode === 'offro' ? 'Offro assistenza' : 'Cerco assistenza'
  const isOpen = open !== null

  const showTypedSuggestions = open === 'dove' && query.trim().length > 0 && suggestions.length > 0
  const showBrowse = open === 'dove' && query.trim().length === 0

  return (
    <div
      ref={rootRef}
      className={`cx-explorer${isOpen ? ' is-open' : ''}`}
      id="search"
    >
      <form className="cx-explorer__pill" onSubmit={onSubmit} role="search">
        {/* Dove */}
        <div
          className={`cx-explorer__seg cx-explorer__seg--dove${open === 'dove' ? ' is-active' : ''}${open && open !== 'dove' ? ' is-idle' : ''}`}
          onClick={() => openDove()}
        >
          <button type="button" className="cx-explorer__seg-btn" aria-expanded={open === 'dove'}>
            <span className="cx-explorer__kicker">Dove</span>
            {open === 'dove' ? (
              <input
                ref={inputRef}
                className="cx-explorer__input"
                value={query}
                placeholder="Scopri destinazioni"
                autoComplete="off"
                spellCheck={false}
                aria-autocomplete="list"
                aria-controls={listId}
                aria-label="Comune, CAP o zona"
                onChange={(ev) => {
                  setQuery(ev.target.value)
                  onCityChange(ev.target.value)
                }}
                onClick={(ev) => ev.stopPropagation()}
                onKeyDown={onInputKeyDown}
              />
            ) : (
              <span className={`cx-explorer__value${doveIsPlaceholder ? ' is-placeholder' : ''}`}>
                {doveDisplay}
              </span>
            )}
          </button>
          {place && open !== 'dove' ? (
            <button type="button" className="cx-explorer__clear" aria-label="Togli luogo" onClick={clearPlace}>
              <IconClear />
            </button>
          ) : null}

          {open === 'dove' ? (
            <div className="cx-explorer__pop cx-explorer__pop--dove" id={listId} onClick={(e) => e.stopPropagation()}>
              {showTypedSuggestions ? (
                <ul className="cx-explorer__list" role="listbox" aria-label="Suggerimenti">
                  {suggestions.map((row, i) => (
                    <li key={row.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === activeIndex}
                        className={`cx-explorer__row${i === activeIndex ? ' is-active' : ''}`}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() =>
                          selectPlace({
                            label: formatPlacePrimary(row),
                            sublabel: formatPlaceSecondary(row),
                            istat: row.id,
                            q: row.comune,
                          })
                        }
                      >
                        <span className="cx-explorer__row-icon">
                          <IconCity />
                        </span>
                        <span className="cx-explorer__row-copy">
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
                    <div className="cx-explorer__section">
                      <p className="cx-explorer__section-title">Ricerche recenti</p>
                      <ul className="cx-explorer__list">
                        {recents.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              className="cx-explorer__row"
                              onClick={() =>
                                selectPlace({
                                  label: r.label,
                                  sublabel: r.sublabel,
                                  istat: r.istat,
                                  q: r.q ?? r.label,
                                })
                              }
                            >
                              <span className="cx-explorer__row-icon">
                                <IconClock />
                              </span>
                              <span className="cx-explorer__row-copy">
                                <strong>{r.label}</strong>
                                <small>{r.sublabel ?? 'Intorno a te'}</small>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="cx-explorer__section">
                    <p className="cx-explorer__section-title">Destinazioni suggerite</p>
                    <ul className="cx-explorer__list">
                      <li>
                        <button type="button" className="cx-explorer__row" onClick={requestNearMe} disabled={nearBusy}>
                          <span className="cx-explorer__row-icon cx-explorer__row-icon--near">
                            <IconNear />
                          </span>
                          <span className="cx-explorer__row-copy">
                            <strong>Vicino a me</strong>
                            <small>
                              {nearBusy ? 'Rilevamento…' : 'Attiva la posizione per vedere intorno a te'}
                            </small>
                          </span>
                        </button>
                      </li>
                      {SUGGESTED_DESTINATIONS.map((d) => (
                        <li key={d.q}>
                          <button
                            type="button"
                            className="cx-explorer__row"
                            onClick={() =>
                              selectPlace({ label: d.label, sublabel: d.sublabel, q: d.q })
                            }
                          >
                            <span className="cx-explorer__row-icon">
                              <IconCity />
                            </span>
                            <span className="cx-explorer__row-copy">
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

              {open === 'dove' && query.trim() && !suggestions.length && status === 'ready' ? (
                <p className="cx-explorer__empty">Nessun comune trovato — premi Cerca per usare il testo inserito</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Modalità (al posto di Quando) */}
        <div
          className={`cx-explorer__seg cx-explorer__seg--mode${open === 'mode' ? ' is-active' : ''}${open && open !== 'mode' ? ' is-idle' : ''}`}
          onClick={() => openMode()}
        >
          <button type="button" className="cx-explorer__seg-btn" aria-expanded={open === 'mode'}>
            <span className="cx-explorer__kicker">Modalità</span>
            <span className="cx-explorer__value">{modeLabel}</span>
          </button>

          {open === 'mode' ? (
            <div className="cx-explorer__pop cx-explorer__pop--mode" onClick={(e) => e.stopPropagation()}>
              <p className="cx-explorer__pop-title">Come vuoi usare la piattaforma?</p>
              <div className="cx-explorer__mode-grid" role="listbox" aria-label="Modalità ricerca">
                <button
                  type="button"
                  role="option"
                  aria-selected={mode === 'cerco'}
                  className={`cx-explorer__mode-card${mode === 'cerco' ? ' is-selected' : ''}`}
                  onClick={() => pickMode('cerco')}
                >
                  <strong>Cerco assistenza</strong>
                  <small>Famiglie e strutture che cercano professionisti</small>
                </button>
                <button
                  type="button"
                  role="option"
                  aria-selected={mode === 'offro'}
                  className={`cx-explorer__mode-card${mode === 'offro' ? ' is-selected' : ''}`}
                  onClick={() => pickMode('offro')}
                >
                  <strong>Offro assistenza</strong>
                  <small>Professionisti che cercano posizioni e contatti</small>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          className={`cx-explorer__submit${isOpen ? ' is-wide' : ''}`}
          aria-label="Cerca"
        >
          <IconSearch />
          <span className="cx-explorer__submit-label">Cerca</span>
        </button>
      </form>
    </div>
  )
}
