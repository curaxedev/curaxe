import type { FormEvent } from 'react'
import type { AssistenzaHeroMode } from '../lib/assistenzaHeroMode'
import { HERO_CITY_PARAM } from '../lib/assistenzaHeroMode'

export type HeroCitySearchRowProps = {
  variant: 'hero' | 'sticky'
  mode: AssistenzaHeroMode
  cityInputId: string
  cityValue: string
  showTypewriter: boolean
  typewriterText: string
  onCityFocus: () => void
  onCityBlur: () => void
  onCityChange: (value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
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

export function HeroCitySearchRow({
  variant,
  mode,
  cityInputId,
  cityValue,
  showTypewriter,
  typewriterText,
  onCityFocus,
  onCityBlur,
  onCityChange,
  onSubmit,
}: HeroCitySearchRowProps) {
  const rootClass =
    variant === 'sticky'
      ? 'hero-search hero-search--location-only hero-search--sticky-bar'
      : 'hero-search hero-search--location-only'

  const submitAria =
    mode === 'offro' ? 'Cerca posizioni aperte in questa zona' : 'Cerca professionisti in questa zona'

  const placeholder = showTypewriter ? '' : 'Inserisci città o zona…'

  return (
    <form
      className={rootClass}
      onSubmit={onSubmit}
      aria-label={
        mode === 'offro'
          ? 'Cerca posizioni aperte per città o zona'
          : 'Cerca professionisti e organizzazioni per città o zona'
      }
    >
      <div className="hero-search__field hero-search__field--city hero-search__field--city-only">
        <label className="visually-hidden" htmlFor={cityInputId}>
          Città o zona
        </label>
        <div className={`hero-search__compose${showTypewriter ? ' hero-search__compose--tw' : ''}`}>
          <span className="hero-search__cerca-mark" aria-hidden="true">
            <span className="hero-search__cerca-mark-inner">Cerca</span>
          </span>
          <div className="hero-search__input-slot">
            <input
              id={cityInputId}
              name={HERO_CITY_PARAM}
              type="text"
              className={`hero-search__city${showTypewriter ? ' hero-search__city--tw-active' : ''}`}
              placeholder={placeholder}
              autoComplete="off"
              value={cityValue}
              onChange={(ev) => onCityChange(ev.target.value)}
              onFocus={onCityFocus}
              onBlur={onCityBlur}
            />
            {showTypewriter ? (
              <span className="hero-search__tw" aria-hidden="true">
                <span className="hero-search__tw-text">{typewriterText}</span>
                <span className="hero-search__tw-caret" />
              </span>
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
