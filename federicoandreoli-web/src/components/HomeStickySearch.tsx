import { useId } from 'react'
import { AssistenzaGeoSearchForm } from './AssistenzaGeoSearchForm'
import { useHeroSearchParams } from '../hooks/useHeroSearchParams'

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

  return (
    <div className={`sticky-hero-search${visible ? ' sticky-hero-search--visible' : ''}`}>
      <div className="sticky-hero-search__inner">
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
      </div>
    </div>
  )
}
