import { useEffect, useId, useState } from 'react'
import { AssistenzaGeoSearchForm } from './AssistenzaGeoSearchForm'
import { useHeroSearchParams } from '../hooks/useHeroSearchParams'
import { openHomelySearch } from '../lib/homelySearchEvents'

export type HomeStickySearchHeroSearch = ReturnType<typeof useHeroSearchParams>

export type HomeStickySearchProps = {
  visible: boolean
  heroSearch: HomeStickySearchHeroSearch
  typewriterActive: boolean
  typewriterText: string
  onStickyCityFocusChange: (focused: boolean) => void
}

export function HomeStickySearch({
  visible,
  heroSearch,
  typewriterActive,
  typewriterText,
  onStickyCityFocusChange,
}: HomeStickySearchProps) {
  const baseId = useId()
  const cityId = `${baseId}-sticky-city`
  const { mode, cityInUrl, setCityInUrl, onCityChange } = heroSearch
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const label = cityInUrl.trim() || (typewriterActive ? typewriterText : '')
  const showPlaceholder = !cityInUrl.trim()

  return (
    <div
      className={`sticky-hero-search sticky-hero-search--chrome${visible ? ' sticky-hero-search--visible' : ''}`}
    >
      <div className="sticky-hero-search__inner">
        {isMobile ? (
          <button
            type="button"
            className="sticky-hero-search__launch"
            aria-label="Apri ricerca destinazione"
            onClick={() => {
              onStickyCityFocusChange(true)
              openHomelySearch('dove')
            }}
          >
            <span className={`sticky-hero-search__launch-text${showPlaceholder ? ' is-placeholder' : ''}`}>
              {label || 'Dove cerchi? es. Milano, Torino…'}
            </span>
            <span className="sticky-hero-search__launch-icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="2.2" />
                <path d="M16.2 16.2 21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        ) : (
          <AssistenzaGeoSearchForm
            variant="sticky"
            mode={mode}
            cityInputId={cityId}
            cityValue={cityInUrl}
            showTypewriter={typewriterActive}
            typewriterText={typewriterText}
            onCityFocus={() => onStickyCityFocusChange(true)}
            onCityBlur={() => onStickyCityFocusChange(false)}
            onCityChange={onCityChange}
            setCityInUrl={setCityInUrl}
          />
        )}
      </div>
    </div>
  )
}
