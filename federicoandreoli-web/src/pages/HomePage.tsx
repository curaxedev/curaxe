import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HeroAssistenzaBlock } from '../components/HeroAssistenzaBlock'
import { HomeStickySearch } from '../components/HomeStickySearch'
import { HomeOpenPositionsSection } from '../components/HomeOpenPositionsSection'
import {
  HomeProfileCarousel,
  type HomeProfileCarouselCard,
} from '../components/HomeProfileCarousel'
import { HomeFaqIntroStats, type HomeFaqIntroStat } from '../components/HomeFaqIntroStats'
import { HomeCitiesGeoSearchBar } from '../components/HomeCitiesGeoSearchBar'
import { HomeWaveDivider } from '../components/HomeWaveDivider'
import {
  IconCheckMark,
  IconChevronRight,
  IconMessages,
  IconSearch,
  IconUsers,
} from '../components/icons/DashboardIcons'
import { SiteShell } from '../components/SiteShell'
import { useCityTypewriter } from '../hooks/useCityTypewriter'
import { useHeroSearchParams } from '../hooks/useHeroSearchParams'
import { useHeroStickySearchVisible } from '../hooks/useHeroStickySearchVisible'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { MOCK_PROFILES, toCarouselCard } from '../lib/mockProfiles'
import { listingIntentFromAssistenzaMode, buildProfilesDirectoryHref } from '../lib/profilesDirectoryNav'
import { comeFunzionaPath, profilesDirectoryPath } from '../lib/siteRoutes'

/** Filtri home in modalità «Cerco assistenza»: solo figure professionali (niente filtri da cercatore di lavoro). */
const homeCercoPeopleCategories = [
  { id: 'caregiver', label: 'Badanti' },
  { id: 'nurse', label: 'Infermieri' },
  { id: 'oss', label: 'OSS' },
  { id: 'assistant', label: 'Assistenti familiari' },
] as const

type PreviewCard = HomeProfileCarouselCard

/**
 * Card per il carosello home, derivate dalla sorgente unica MOCK_PROFILES.
 * Le agenzie e le strutture restano nel dataset (visualizzate nelle schede a tendina con badge dedicato),
 * ma sulla home corrente filtriamo per categoria attiva (badanti / OSS / infermieri / assistenti).
 */
const previewCards: PreviewCard[] = MOCK_PROFILES
  .filter((p) => p.listingIntent === 'cerco' && p.type === 'professional' && p.category !== 'agency')
  .map(toCarouselCard)

/** Foto città in `public/images/citta/`. */
const citySpotlights = [
  {
    label: 'Assistenza a Milano',
    count: '18.200+ profili',
    geoSearchQuery: 'Milano',
    image: '/images/citta/Milano.webp',
  },
  {
    label: 'Assistenza a Roma',
    count: '22.400+ profili',
    geoSearchQuery: 'Roma',
    image: '/images/citta/Roma.webp',
  },
  {
    label: 'Assistenza a Torino',
    count: '9.100+ profili',
    geoSearchQuery: 'Torino',
    image: '/images/citta/Torino.webp',
  },
  {
    label: 'Assistenza a Bologna',
    count: '6.800+ profili',
    geoSearchQuery: 'Bologna',
    image: '/images/citta/Bologna.webp',
  },
  {
    label: 'Assistenza a Napoli',
    count: '7.300+ profili',
    geoSearchQuery: 'Napoli',
    image: '/images/citta/Napoli.webp',
  },
  {
    label: 'Assistenza a Firenze',
    count: '5.200+ profili',
    geoSearchQuery: 'Firenze',
    image: '/images/citta/Firenze.webp',
  },
] as const

const homeFaqIntroStats: HomeFaqIntroStat[] = [
  { figure: '12.000+', caption: 'profili in piattaforma' },
  { figure: '4', caption: 'risposte rapide qui' },
  { figure: '0€', caption: 'per aprire un account' },
]

const faqs = [
  {
    q: 'La registrazione è gratuita?',
    a: 'Sì. Puoi aprire un account e consultare i profili senza costi iniziali. Eventuali piani a pagamento servono solo per funzioni extra di visibilità o contatto, se e quando li attiverai.',
  },
  {
    q: 'La piattaforma sostituisce contratti o pagamenti?',
    a: 'No. Curaxe mette in contatto domanda e offerta e gestisce richieste di contatto (lead). Stipendi, contratti e adempimenti restano fuori piattaforma, tra le parti.',
  },
  {
    q: 'Come funzionano i dati sanitari?',
    a: 'I moduli pubblici non richiedono dati clinici. Le informazioni sensibili restano fuori dalla vetrina e vanno gestite direttamente tra professionista e richiedente, nel rispetto della normativa.',
  },
  {
    q: 'Chi può iscriversi come professionista?',
    a: 'OSS, infermieri, badanti, agenzie e strutture possono creare un profilo con informazioni coerenti con la propria offerta. I controlli sul profilo supportano la fiducia, senza sostituire gli obblighi legali del committente.',
  },
]

function IconFeatureMap() {
  return <IconSearch size={32} className="step-card__icon-svg" aria-hidden />
}

function IconFeatureChat() {
  return <IconMessages size={32} className="step-card__icon-svg" aria-hidden />
}

function IconFeatureClipboard() {
  return <IconCheckMark size={32} className="step-card__icon-svg" aria-hidden />
}

export function HomePage() {
  const heroSearch = useHeroSearchParams()
  const assistenzaMode = heroSearch.mode
  const cityQuery = heroSearch.cityInUrl

  const [activeCategory, setActiveCategory] = useState<string>('caregiver')
  const [heroCityFocused, setHeroCityFocused] = useState(false)
  const [stickyCityFocused, setStickyCityFocused] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()
  const typewriterActive =
    heroSearch.cityInUrl.length === 0 &&
    !heroCityFocused &&
    !stickyCityFocused &&
    !prefersReducedMotion
  const typewriterText = useCityTypewriter(typewriterActive)
  const stickySearchVisible = useHeroStickySearchVisible()

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.home-reveal')
    if (els.length === 0) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      els.forEach((el) => el.classList.add('is-visible'))
      return
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            obs.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.07 }
    )
    for (const el of els) {
      if (!el.classList.contains('is-visible')) {
        obs.observe(el)
      }
    }
    return () => obs.disconnect()
  }, [assistenzaMode])

  const cardsToShow = useMemo(
    () => previewCards.filter((card) => card.category === activeCategory),
    [activeCategory]
  )

  const directoryIntent = listingIntentFromAssistenzaMode(assistenzaMode)

  const activeCategoryLabel =
    homeCercoPeopleCategories.find((c) => c.id === activeCategory)?.label ?? activeCategory

  return (
    <SiteShell>
      <HomeStickySearch
        visible={stickySearchVisible || stickyCityFocused}
        heroSearch={heroSearch}
        typewriterActive={typewriterActive}
        typewriterText={typewriterText}
        onStickyCityFocusChange={setStickyCityFocused}
      />
      <main className="home-page">

        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="hero-sitly home-hero-animate" aria-label="Presentazione del servizio">
          <div className="hero-sitly__shell">
            <div className="hero-sitly__grid">
              <div className="hero-sitly__copy">
                <HeroAssistenzaBlock
                  assistenzaMode={assistenzaMode}
                  heroSearch={heroSearch}
                  typewriterActive={typewriterActive}
                  typewriterText={typewriterText}
                  onHeroCityFocusChange={setHeroCityFocused}
                />
              </div>

              <div className="hero-sitly__visual">
                <figure className="hero-sitly__figure">
                  <img
                    className="hero-sitly__photo"
                    src="/images/home/hero.webp"
                    alt=""
                    width={720}
                    height={900}
                    decoding="async"
                    fetchPriority="high"
                  />
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* ── Profili disponibili (famiglie) / Posizioni (professionisti) ── */}
        {assistenzaMode === 'offro' ? (
          <HomeOpenPositionsSection cityQuery={cityQuery} />
        ) : (
          <section className="home-results home-reveal" id="professionisti" aria-labelledby="home-results-title">
            <div className="home-results__inner">
              <h2 id="home-results-title" className="home-results__title type-title">
                Questi profili sono disponibili ora
              </h2>
              <div className="home-results__toolbar">
                <div className="home-cerco-filters" role="search" aria-label="Filtra profili disponibili">
                  <p className="home-cerco-filters__hero-hint">
                    Zona e città si impostano nel{' '}
                    <a href="#search" className="home-cerco-filters__hero-hint-link">
                      blocco di ricerca sopra
                    </a>
                    .
                  </p>
                  <div className="home-cerco-filters__row">
                    <span className="home-cerco-filters__label" id="home-cerco-people-label">
                      Figure professionali
                    </span>
                    <div className="home-results__filters" aria-labelledby="home-cerco-people-label">
                      {homeCercoPeopleCategories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`home-filter-chip ${activeCategory === c.id ? 'is-active' : ''}`}
                          onClick={() => setActiveCategory(c.id)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="home-results__count">
                  <IconUsers size={16} aria-hidden />
                  12.000+ profili in piattaforma
                </span>
              </div>

              <HomeProfileCarousel key={activeCategory} cards={cardsToShow} categoryLabel={activeCategoryLabel} />

              <div className="home-results__foot">
                <Link to={profilesDirectoryPath} className="home-results__link">
                  Vedi tutti i profili
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Come funziona (3 passi) ───────────────────────── */}
        <section className="home-steps home-reveal" id="ecosistema" aria-labelledby="home-steps-title">
          <div className="home-steps__inner">
            <p className="home-steps__eyebrow type-overline">Come funziona</p>
            <h2 id="home-steps-title" className="home-steps__title type-title">
              Tre passi semplici per trovare la figura giusta
            </h2>
            <p className="home-steps__sub">
              Dalla mappa dei profili al contatto, un'esperienza pensata per il socio-sanitario.
            </p>

            <div className="home-steps__grid home-steps__grid--connected">
              <article className="step-card">
                <div className="step-card__num" aria-hidden>01</div>
                <div className="step-card__icon">
                  <IconFeatureMap />
                </div>
                <h3 className="step-card__title">Controlla la zona</h3>
                <p className="step-card__text">
                  Filtra per città, figura e disponibilità. Vedi profili e strutture con informazioni essenziali e coerenti.
                </p>
              </article>

              <article className="step-card">
                <div className="step-card__num" aria-hidden>02</div>
                <div className="step-card__icon step-card__icon--accent">
                  <IconFeatureChat />
                </div>
                <h3 className="step-card__title">Scambia messaggi</h3>
                <p className="step-card__text">
                  Richieste di contatto chiare: meno telefonate a vuoto, più conversazioni con interlocutori pertinenti.
                </p>
              </article>

              <article className="step-card">
                <div className="step-card__num" aria-hidden>03</div>
                <div className="step-card__icon step-card__icon--sage">
                  <IconFeatureClipboard />
                </div>
                <h3 className="step-card__title">Scegli con calma</h3>
                <p className="step-card__text">
                  Confronta profili verificati e organizza colloqui fuori piattaforma, come da prassi del settore.
                </p>
              </article>
            </div>

            <div className="home-steps__cta-row">
              <a href="#search" className="home-steps__btn home-steps__btn--primary">
                Inizia dalla ricerca
              </a>
              <Link to="/registrazione/intent" className="home-steps__btn home-steps__btn--ghost">
                Inizia gratis
              </Link>
            </div>
          </div>
        </section>

        {/* ── Città (capitolo) ─────────────────────────────── */}
        <div className="home-chapter home-chapter--local">
          <HomeWaveDivider fill="surface" />
          <section className="home-cities home-reveal" aria-labelledby="home-cities-title">
            <div className="home-cities__inner">
              <p className="home-cities__eyebrow type-overline">Nella tua zona</p>
              <h2 id="home-cities-title" className="home-cities__title type-title">
                Curaxe nella tua città
              </h2>
              <p className="home-cities__sub">
                Esplora le aree con più professionisti attivi, poi affina con quartiere o CAP.
              </p>
              <div className="home-cities__grid">
                {citySpotlights.map((c) => (
                  <Link
                    key={c.label}
                    to={buildProfilesDirectoryHref({ q: c.geoSearchQuery, intent: directoryIntent })}
                    className="home-city-card"
                  >
                    <div className="home-city-card__visual">
                      <img
                        className="home-city-card__photo"
                        src={c.image}
                        alt=""
                        width={240}
                        height={180}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="home-city-card__main">
                      <div className="home-city-card__text">
                        <span className="home-city-card__label">{c.label}</span>
                        <span className="home-city-card__count">{c.count}</span>
                      </div>
                      <span className="home-city-card__go" aria-hidden>
                        <IconChevronRight />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <HomeCitiesGeoSearchBar intent={directoryIntent} />
            </div>
          </section>

          <HomeWaveDivider fill="page" />
        </div>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section className="home-faq home-reveal" id="faq" aria-labelledby="home-faq-title">
          <div className="home-faq__inner">
            <div className="home-faq__intro">
              <h2 id="home-faq-title" className="home-faq__title type-title">
                Le Vostre domande, le nostre risposte
              </h2>
              <p className="home-faq__lead">Le domande più frequenti su registrazione, lead e responsabilità.</p>
              <HomeFaqIntroStats items={homeFaqIntroStats} />
            </div>
            <div className="home-faq__list">
              {faqs.map((item) => (
                <details key={item.q} className="home-faq__item">
                  <summary className="home-faq__summary">{item.q}</summary>
                  <p className="home-faq__answer">{item.a}</p>
                </details>
              ))}
              <p className="home-faq__more">
                Hai altre domande?{' '}
                <Link to={comeFunzionaPath} className="home-faq__more-link">
                  Guida: come funziona la piattaforma
                </Link>
              </p>
            </div>
          </div>
          <HomeWaveDivider fill="surface" />
        </section>

        {/* ── Partner ──────────────────────────────────────── */}
        <section className="home-partners home-reveal" aria-labelledby="home-partners-title">
          <div className="home-partners__inner">
            <p className="home-partners__eyebrow type-overline">Agenzie e strutture</p>
            <h2 id="home-partners-title" className="home-partners__title type-title">
              Iscriviti come azienda
            </h2>
            <p className="home-partners__lead">
              Profilo organizzazione, lead filtrati e meno dispersione rispetto agli annunci sparsi.
            </p>

            <div className="home-partners__actions home-partners__actions--lead">
              <Link to="/registrazione/intent" className="home-partners__btn home-partners__btn--primary">
                Registrazione aziendale
              </Link>
              <Link to={comeFunzionaPath} className="home-partners__btn home-partners__btn--ghost">
                Come funziona
              </Link>
            </div>

            <div className="home-partners__grid">
              <article className="home-partners__card">
                <h3 className="home-partners__card-title">Agenzie autorizzate</h3>
                <p className="home-partners__card-text">Candidature e richieste in un percorso chiaro.</p>
              </article>
              <article className="home-partners__card">
                <h3 className="home-partners__card-title">Strutture sanitarie</h3>
                <p className="home-partners__card-text">Figure in linea con turni, competenze e zona.</p>
              </article>
            </div>
          </div>
        </section>

        {/* ── CTA finale ───────────────────────────────────── */}
        <section className="home-ready home-reveal" aria-labelledby="home-ready-title">
          <div className="home-ready__inner">
            <h2 id="home-ready-title" className="home-ready__title type-title">
              Un'unica piattaforma per domanda e offerta socio-sanitaria
            </h2>
            <Link to="/registrazione/intent" className="home-ready__btn">
              Inizia gratis
            </Link>
          </div>
        </section>
      </main>
    </SiteShell>
  )
}
