import { useId } from 'react'
import { AssistenzaGeoSearchForm } from './AssistenzaGeoSearchForm'
import type { ProfilesDirectoryStickyHeroCity } from '../hooks/useProfilesDirectoryStickyHeroCity'

export type ProfilesDirectoryStickyGeoSearchProps = {
  visible: boolean
  stickyHero: ProfilesDirectoryStickyHeroCity
  onStickyFocusChange: (focused: boolean) => void
}

export function ProfilesDirectoryStickyGeoSearch({
  visible,
  stickyHero,
  onStickyFocusChange,
}: ProfilesDirectoryStickyGeoSearchProps) {
  const baseId = useId()
  const cityId = `${baseId}-profili-sticky-city`

  return (
    <div
      className={`sticky-hero-search sticky-hero-search--profiles${visible ? ' sticky-hero-search--visible' : ''}`}
    >
      <div className="sticky-hero-search__inner">
        <AssistenzaGeoSearchForm
          variant="sticky"
          mode={stickyHero.mode}
          cityInputId={cityId}
          cityValue={stickyHero.cityInUrl}
          showTypewriter={false}
          typewriterText=""
          onCityFocus={() => onStickyFocusChange(true)}
          onCityBlur={() => onStickyFocusChange(false)}
          onCityChange={stickyHero.onCityChange}
          setCityInUrl={stickyHero.setCityInUrl}
        />
      </div>
    </div>
  )
}
