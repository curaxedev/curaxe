import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons/DashboardIcons'
import {
  filterCompetenceOptions,
  type CompetenceOption,
} from '../lib/professionalCompetences'

type Props = {
  title: string
  description?: string
  options: CompetenceOption[]
  value: string[]
  onChange: (next: string[]) => void
  emptyLabel?: string
  triggerLabel?: string
}

export function MultiSelectSearchPicker({
  title,
  description,
  options,
  value,
  onChange,
  emptyLabel = 'Nessuna selezione',
  triggerLabel = 'Seleziona',
}: Props) {
  const titleId = useId()
  const searchId = useId()
  const searchRef = useRef<HTMLInputElement | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<string[]>(value)

  useEffect(() => {
    if (!open) return
    setDraft(value)
    setQuery('')
    const t = window.setTimeout(() => searchRef.current?.focus(), 40)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, value])

  const filtered = useMemo(() => filterCompetenceOptions(options, query), [options, query])

  function toggleItem(label: string) {
    setDraft((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]))
  }

  function removeChip(label: string) {
    onChange(value.filter((x) => x !== label))
  }

  function confirm() {
    onChange(draft)
    setOpen(false)
  }

  return (
    <div className="dash-pick">
      <div className="dash-pick__summary">
        {value.length === 0 ? (
          <p className="dash-pick__empty">{emptyLabel}</p>
        ) : (
          <div className="dash-chip-group">
            {value.map((label) => (
              <span key={label} className="dash-chip">
                {label}
                <button
                  type="button"
                  className="dash-chip__remove"
                  aria-label={`Rimuovi ${label}`}
                  onClick={() => removeChip(label)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <button type="button" className="dash-btn dash-btn--ghost dash-pick__trigger" onClick={() => setOpen(true)}>
          {value.length > 0 ? `Modifica (${value.length})` : triggerLabel}
        </button>
      </div>

      {open
        ? createPortal(
            <div className="dash-modal-overlay dash-pick-modal" role="presentation" onClick={() => setOpen(false)}>
              <div
                className="dash-modal dash-pick-modal__panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="dash-modal__header">
                  <h2 id={titleId} className="dash-modal__title">
                    {title}
                  </h2>
                  <button
                    type="button"
                    className="dash-modal__close"
                    aria-label="Chiudi"
                    onClick={() => setOpen(false)}
                  >
                    <IconClose size={20} />
                  </button>
                </div>

                <div className="dash-modal__body dash-pick-modal__body">
                  {description ? <p className="dash-pick-modal__lead">{description}</p> : null}

                  <label className="dash-form-label" htmlFor={searchId}>
                    Cerca
                  </label>
                  <input
                    ref={searchRef}
                    id={searchId}
                    type="search"
                    className="dash-form-input dash-pick-modal__search"
                    placeholder="Digita per filtrare…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                  />

                  <p className="dash-pick-modal__count">
                    {draft.length} selezionat{draft.length === 1 ? 'a' : 'e'}
                    {query.trim() ? ` · ${filtered.length} risultati` : ''}
                  </p>

                  <ul className="dash-pick-modal__list" role="listbox" aria-multiselectable="true">
                    {filtered.length === 0 ? (
                      <li className="dash-pick-modal__empty">Nessun risultato per «{query.trim()}»</li>
                    ) : (
                      filtered.map((opt) => {
                        const on = draft.includes(opt.label)
                        return (
                          <li key={opt.label}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={on}
                              className={`dash-pick-modal__item${on ? ' is-on' : ''}`}
                              onClick={() => toggleItem(opt.label)}
                            >
                              <span className={`dash-pick-modal__check${on ? ' is-on' : ''}`} aria-hidden>
                                {on ? '✓' : ''}
                              </span>
                              <span>{opt.label}</span>
                            </button>
                          </li>
                        )
                      })
                    )}
                  </ul>
                </div>

                <div className="dash-modal__footer">
                  <button type="button" className="dash-btn dash-btn--ghost" onClick={() => setOpen(false)}>
                    Annulla
                  </button>
                  <button type="button" className="dash-btn dash-btn--primary" onClick={confirm}>
                    Conferma
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
