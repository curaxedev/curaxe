import { useId, useRef, type KeyboardEvent } from 'react'
import { AssistenzaGeoSearchForm } from './AssistenzaGeoSearchForm'
import { useHeroSearchParams } from '../hooks/useHeroSearchParams'
import type { AssistenzaHeroMode } from '../lib/assistenzaHeroMode'

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
    </>
  )
}
