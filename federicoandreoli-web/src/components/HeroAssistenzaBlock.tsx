import { HomelySearchExplorer } from './HomelySearchExplorer'
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
  onHeroCityFocusChange,
}: HeroAssistenzaBlockProps) {
  const { setMode, cityInUrl, setCityInUrl, onCityChange } = heroSearch

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
      <div className="hero-assistenza">
        <HomelySearchExplorer
          mode={mode}
          cityValue={cityInUrl}
          onModeChange={setMode}
          onCityChange={onCityChange}
          setCityInUrl={setCityInUrl}
          onFocusChange={onHeroCityFocusChange}
        />
      </div>
    </>
  )
}
