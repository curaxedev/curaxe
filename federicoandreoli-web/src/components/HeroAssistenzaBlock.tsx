import { useId, useRef, type KeyboardEvent } from 'react'
import { AssistenzaGeoSearchForm } from './AssistenzaGeoSearchForm'
import { useHeroSearchParams } from '../hooks/useHeroSearchParams'
import type { AssistenzaHeroMode } from '../lib/assistenzaHeroMode'

function IconPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 21s-8-4.5-8-11a8 8 0 0 1 16 0c0 6.5-8 11-8 11z" />
      <circle cx="12" cy="10" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export type HeroAssistenzaBlockProps = {
  assistenzaMode: AssistenzaHeroMode
  heroSearch: ReturnType<typeof useHeroSearchParams>
  typewriterActive: boolean
  typewriterText: string
  onHeroCityFocusChange: (focused: boolean) => void
}

export function HeroAssistenzaBlock({
  assistenzaMode: mode,
  heroSearch,
  typewriterActive,
  typewriterText,
  onHeroCityFocusChange,
}: HeroAssistenzaBlockProps) {
  const baseId = useId()
  const tabCercoId = `${baseId}-tab-cerco`
  const tabOffroId = `${baseId}-tab-offro`
  const panelId = `${baseId}-panel`
  const cityInputId = `${baseId}-city`

  const { setMode, cityInUrl, setCityInUrl, onCityChange } = heroSearch

  const tabCercoRef = useRef<HTMLButtonElement>(null)
  const tabOffroRef = useRef<HTMLButtonElement>(null)

  function focusTab(m: AssistenzaHeroMode) {
    ;(m === 'cerco' ? tabCercoRef : tabOffroRef).current?.focus()
  }

  function handleTabListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      setMode('offro')
      tabOffroRef.current?.focus()
      return
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      setMode('cerco')
      tabCercoRef.current?.focus()
      return
    }
    if (e.key === 'Home') {
      e.preventDefault()
      setMode('cerco')
      tabCercoRef.current?.focus()
      return
    }
    if (e.key === 'End') {
      e.preventDefault()
      setMode('offro')
      tabOffroRef.current?.focus()
    }
  }

  const panelLabelledBy = mode === 'cerco' ? tabCercoId : tabOffroId

  const eyebrow =
    mode === 'offro' ? (
      <p className="hero-sitly__eyebrow">OSS, infermieri e assistenti familiari</p>
    ) : (
      <p className="hero-sitly__eyebrow">Famiglie, strutture e professionisti</p>
    )

  const title =
    mode === 'offro' ? (
      <h1 className="hero-sitly__title">
        Trova posizioni aperte<br />
        <span className="hero-sitly__title-accent">vicino a te.</span>
      </h1>
    ) : (
      <h1 className="hero-sitly__title">
        Trova assistenza affidabile<br />
        <span className="hero-sitly__title-accent">vicino a te.</span>
      </h1>
    )

  const trustRow =
    mode === 'offro' ? (
      <div className="hero-sitly__trust-row" role="list" aria-label="Garanzie della piattaforma">
        <span className="hero-trust-badge" role="listitem">
          <span className="hero-trust-badge__icon hero-trust-badge__icon--sage">
            <IconCheck />
          </span>
          12.000+ professionisti verificati
        </span>
        <span className="hero-trust-badge" role="listitem">
          <span className="hero-trust-badge__icon hero-trust-badge__icon--primary">
            <IconShield />
          </span>
          Privacy garantita
        </span>
        <span className="hero-trust-badge" role="listitem">
          <span className="hero-trust-badge__icon hero-trust-badge__icon--accent">
            <IconPin />
          </span>
          Copertura nazionale
        </span>
      </div>
    ) : (
      <div className="hero-sitly__trust-row" role="list" aria-label="Garanzie della piattaforma">
        <span className="hero-trust-badge" role="listitem">
          <span className="hero-trust-badge__icon hero-trust-badge__icon--sage">
            <IconCheck />
          </span>
          12.000+ Profili Verificati
        </span>
        <span className="hero-trust-badge" role="listitem">
          <span className="hero-trust-badge__icon hero-trust-badge__icon--primary">
            <IconShield />
          </span>
          Privacy Garantita
        </span>
        <span className="hero-trust-badge" role="listitem">
          <span className="hero-trust-badge__icon hero-trust-badge__icon--accent">
            <IconPin />
          </span>
          Copertura Nazionale
        </span>
      </div>
    )

  return (
    <>
      {eyebrow}
      {title}
      <div className="hero-assistenza" id="search">
        <div
          className="assistenza-mode-tabs"
          role="tablist"
          aria-label="Come vuoi usare la piattaforma"
          onKeyDown={handleTabListKeyDown}
        >
          <button
            ref={tabCercoRef}
            type="button"
            role="tab"
            id={tabCercoId}
            aria-selected={mode === 'cerco'}
            aria-controls={panelId}
            tabIndex={mode === 'cerco' ? 0 : -1}
            className={`assistenza-mode-tabs__tab${mode === 'cerco' ? ' is-active' : ''}`}
            onClick={() => {
              setMode('cerco')
              focusTab('cerco')
            }}
          >
            Cerco assistenza
          </button>
          <button
            ref={tabOffroRef}
            type="button"
            role="tab"
            id={tabOffroId}
            aria-selected={mode === 'offro'}
            aria-controls={panelId}
            tabIndex={mode === 'offro' ? 0 : -1}
            className={`assistenza-mode-tabs__tab${mode === 'offro' ? ' is-active' : ''}`}
            onClick={() => {
              setMode('offro')
              focusTab('offro')
            }}
          >
            Offro assistenza
          </button>
        </div>

        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={panelLabelledBy}
          className="hero-assistenza__panel"
        >
          <AssistenzaGeoSearchForm
            variant="hero"
            mode={mode}
            cityInputId={cityInputId}
            cityValue={cityInUrl}
            showTypewriter={typewriterActive}
            typewriterText={typewriterText}
            onCityFocus={() => onHeroCityFocusChange(true)}
            onCityBlur={() => onHeroCityFocusChange(false)}
            onCityChange={onCityChange}
            setCityInUrl={setCityInUrl}
          />
        </div>
      </div>
      {trustRow}
    </>
  )
}
