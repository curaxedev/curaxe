import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ItaliaGeoSearchCombobox } from '../components/ItaliaGeoSearchCombobox'
import { IconCheckMark, IconChevronRight } from '../components/icons/DashboardIcons'
import { ProfileRatingCompact } from '../components/ProfileRatingCompact'
import { ProfilesDirectoryStickyGeoSearch } from '../components/ProfilesDirectoryStickyGeoSearch'
import { SiteShell } from '../components/SiteShell'
import { useDirectorySearch } from '../hooks/useDirectorySearch'
import { useProfilesDirectoryStickyHeroCity } from '../hooks/useProfilesDirectoryStickyHeroCity'
import { useProfiliStickySearchVisible } from '../hooks/useProfiliStickySearchVisible'
import { useItaliaGeo } from '../context/ItaliaGeoProvider'
import type { DirectoryProfileSummary, ListingIntent } from '../lib/directoryTypes'
import type { ItaliaGeoRow } from '../lib/italiaGeo/italiaComuniTypes'
import {
  PROFILI_INTENT_PARAM,
  PROFILI_ISTAT_PARAM,
  PROFILI_Q_PARAM,
  parseListingIntentParam,
} from '../lib/profilesDirectoryNav'
import { profileDetailPath, structureDetailPath } from '../lib/siteRoutes'

const DIRECTORY_CATEGORY_LABEL: Record<string, string> = {
  caregiver: 'Badanti',
  nurse: 'Infermieri',
  oss: 'OSS',
  assistant: 'Assistenti familiari',
  agency: 'Agenzie',
}

function directoryRowMetaLabel(card: DirectoryProfileSummary): string {
  if (card.type === 'facility') return 'Struttura'
  return DIRECTORY_CATEGORY_LABEL[card.category] ?? card.category
}

function isProfessionalCard(card: DirectoryProfileSummary): boolean {
  return card.type === 'professional' && card.category !== 'agency'
}

function isOrganizationCard(card: DirectoryProfileSummary): boolean {
  return card.type === 'facility' || card.category === 'agency'
}

const DIRECTORY_SKELETON_COUNT = 8

function DirectoryCardSkeleton() {
  return (
    <div className="prof-dir__skeleton-card polish-shimmer" aria-hidden>
      <div className="prof-dir__skeleton-media polish-shimmer" />
      <div className="prof-dir__skeleton-sheet">
        <div className="prof-dir__skeleton-line prof-dir__skeleton-line--sm polish-shimmer" />
        <div className="prof-dir__skeleton-line polish-shimmer" />
        <div className="prof-dir__skeleton-line prof-dir__skeleton-line--short polish-shimmer" />
      </div>
    </div>
  )
}

function DirectoryProfileCard({ card }: { card: DirectoryProfileSummary }) {
  const intentLabel = card.listingIntent === 'cerco' ? 'Cerco lavoro' : 'Offro lavoro'
  const experienceLine =
    card.viaAgencyName && card.viaAgencyName.trim().length > 0
      ? `Tramite ${card.viaAgencyName.trim()}`
      : card.shift ?? ''

  const isSvgBrand =
    card.imageUrl.includes('/profile-') &&
    (card.imageUrl.endsWith('.svg') || card.imageUrl.includes('.svg'))

  const useBrandFrame =
    card.type === 'facility' || card.category === 'agency' || isSvgBrand

  const detailHref = isProfessionalCard(card)
    ? profileDetailPath(card.id)
    : isOrganizationCard(card)
      ? structureDetailPath(card.id)
      : null

  const cardClassName =
    'home-profile-carousel__card home-profile-carousel__card--sitly pro-card pro-card--link prof-dir-profile-card'
  const ariaLabel = `${card.name}, ${card.role}, ${card.locationLabel}`

  const cardChildren = (
    <>
      <div className="home-profile-carousel__media">
        <div className="home-profile-carousel__photo-frame">
          <img
            className={`home-profile-carousel__photo${useBrandFrame ? ' home-profile-carousel__photo--brand' : ''}`}
            src={card.imageUrl}
            alt=""
            width={320}
            height={200}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="home-profile-carousel__scrim" aria-hidden />
        <div className="home-profile-carousel__overlay-top">
          <h3 className="home-profile-carousel__overlay-name">{card.name}</h3>
          <p className="home-profile-carousel__overlay-area">{card.locationLabel}</p>
        </div>
        {card.online ? (
          <span className="prof-dir__online-cap" title="Online">
            <span className="prof-dir__online-dot" aria-hidden />
            <span className="visually-hidden">Online</span>
          </span>
        ) : null}
        {card.verified ? (
          <span className="prof-dir__verified-cap" title="Profilo verificato">
            <span className="prof-dir__verified-icon" aria-hidden>
              <IconCheckMark size={12} />
            </span>
            <span className="visually-hidden">Verificato</span>
          </span>
        ) : null}
        <span className="home-profile-carousel__agency-pill">{intentLabel}</span>
      </div>

      <div className="home-profile-carousel__sheet">
        <div className="home-profile-carousel__row-meta">
          <span className="home-profile-carousel__rate prof-dir__row-meta-label">{directoryRowMetaLabel(card)}</span>
          <ProfileRatingCompact value={card.stars} />
        </div>
        {experienceLine ? <p className="home-profile-carousel__experience">{experienceLine}</p> : null}
        <div className="home-profile-carousel__role-block">
          <div className="home-profile-carousel__role-line">
            {card.type === 'facility' ? (
              <span className="home-profile-carousel__entity-pill">Struttura</span>
            ) : card.category === 'agency' ? (
              <span className="home-profile-carousel__entity-pill">Agenzia</span>
            ) : null}
            <p className="home-profile-carousel__role">{card.role}</p>
          </div>
        </div>
        <div className="home-profile-carousel__footer">
          <span className="home-profile-carousel__cta">
            {detailHref ? 'Apri scheda' : 'Anteprima in arrivo'}
            <IconChevronRight size={14} className="home-profile-carousel__cta-arrow" aria-hidden />
          </span>
        </div>
      </div>
    </>
  )

  if (detailHref) {
    return (
      <Link className={cardClassName} to={detailHref} aria-label={ariaLabel}>
        {cardChildren}
      </Link>
    )
  }

  return (
    <div className={cardClassName} role="group" aria-label={ariaLabel} aria-disabled="true">
      {cardChildren}
    </div>
  )
}

export function ProfilesDirectoryPage() {
  const tabBaseId = useId()
  const tabCercoId = `${tabBaseId}-tab-cerco`
  const tabOffroId = `${tabBaseId}-tab-offro`
  const intentPanelId = `${tabBaseId}-intent-panel`
  const tabCercoRef = useRef<HTMLButtonElement>(null)
  const tabOffroRef = useRef<HTMLButtonElement>(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const [stickyBarGeoFocused, setStickyBarGeoFocused] = useState(false)
  const profiliStickyVisible = useProfiliStickySearchVisible()
  const stickyOverlayVisible = profiliStickyVisible || stickyBarGeoFocused
  const stickyHero = useProfilesDirectoryStickyHeroCity(searchParams, setSearchParams)
  const { status, search, getByIstat } = useItaliaGeo()

  const istatParam = searchParams.get(PROFILI_ISTAT_PARAM) ?? ''
  const qParam = searchParams.get(PROFILI_Q_PARAM) ?? ''

  const intent: ListingIntent =
    parseListingIntentParam(searchParams.get(PROFILI_INTENT_PARAM)) ?? 'cerco'

  const selectedPlace = useMemo((): ItaliaGeoRow | null => {
    if (status !== 'ready') return null
    const ist = searchParams.get(PROFILI_ISTAT_PARAM)?.trim()
    if (ist) return getByIstat(ist) ?? null
    const q = searchParams.get(PROFILI_Q_PARAM)?.trim() ?? ''
    if (q) return search(q, 1)[0] ?? null
    return null
  }, [status, searchParams, getByIstat, search])

  const {
    items: visible,
    total,
    loading,
    loadingMore,
    error,
    hasMore,
    reload,
    loadMore,
  } = useDirectorySearch({ intent, place: selectedPlace })

  const comboboxKey = `geo-${istatParam}|${qParam}|${searchParams.get(PROFILI_INTENT_PARAM) ?? ''}`

  const initialDraft =
    !istatParam && qParam.trim() && !selectedPlace ? qParam.trim() : undefined

  const syncPlaceToUrl = useCallback(
    (place: ItaliaGeoRow | null) => {
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          if (place) {
            out.set(PROFILI_ISTAT_PARAM, place.id)
            out.delete(PROFILI_Q_PARAM)
          } else {
            out.delete(PROFILI_ISTAT_PARAM)
            out.delete(PROFILI_Q_PARAM)
          }
          return out
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setIntentTab = useCallback(
    (next: ListingIntent) => {
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          out.set(PROFILI_INTENT_PARAM, next)
          return out
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const handleIntentTabListKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIntentTab('offro')
        tabOffroRef.current?.focus()
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setIntentTab('cerco')
        tabCercoRef.current?.focus()
        return
      }
      if (e.key === 'Home') {
        e.preventDefault()
        setIntentTab('cerco')
        tabCercoRef.current?.focus()
        return
      }
      if (e.key === 'End') {
        e.preventDefault()
        setIntentTab('offro')
        tabOffroRef.current?.focus()
      }
    },
    [setIntentTab],
  )

  const intentPanelLabelledBy = intent === 'cerco' ? tabCercoId : tabOffroId

  return (
    <SiteShell>
      <ProfilesDirectoryStickyGeoSearch
        visible={stickyOverlayVisible}
        stickyHero={stickyHero}
        onStickyFocusChange={setStickyBarGeoFocused}
      />
      <main className="home-page prof-dir">
        <div className="prof-dir__intro">
          <nav className="how-page__crumb prof-dir__crumb polish-crumb" aria-label="Percorso">
            <Link to="/">Home</Link>
            <span aria-hidden> / </span>
            <span>Profili</span>
          </nav>

          <h1 className="prof-dir__page-title">Cerca profili e organizzazioni per zona</h1>
          <p className="prof-dir__page-lead">
            Cerca per comune, CAP, provincia o regione. I risultati arrivano dalla directory live di Curaxe.
          </p>

          <div className="prof-dir__intro-tabs">
            <div
              className="assistenza-mode-tabs assistenza-mode-tabs--prof-dir"
              role="tablist"
              aria-label="Come vuoi usare la piattaforma"
              onKeyDown={handleIntentTabListKeyDown}
            >
              <button
                ref={tabCercoRef}
                type="button"
                role="tab"
                id={tabCercoId}
                aria-selected={intent === 'cerco'}
                aria-controls={intentPanelId}
                tabIndex={intent === 'cerco' ? 0 : -1}
                className={`assistenza-mode-tabs__tab${intent === 'cerco' ? ' is-active' : ''}`}
                onClick={() => {
                  setIntentTab('cerco')
                  tabCercoRef.current?.focus()
                }}
              >
                Cerco assistenza
              </button>
              <button
                ref={tabOffroRef}
                type="button"
                role="tab"
                id={tabOffroId}
                aria-selected={intent === 'offro'}
                aria-controls={intentPanelId}
                tabIndex={intent === 'offro' ? 0 : -1}
                className={`assistenza-mode-tabs__tab${intent === 'offro' ? ' is-active' : ''}`}
                onClick={() => {
                  setIntentTab('offro')
                  tabOffroRef.current?.focus()
                }}
              >
                Offro assistenza
              </button>
            </div>
          </div>

          <div
            id={intentPanelId}
            role="tabpanel"
            aria-labelledby={intentPanelLabelledBy}
            className="prof-dir__intent-panel"
          >
            <div id="prof-dir-geo-search" className="prof-dir__intro-search">
              <ItaliaGeoSearchCombobox
                key={`intro-geo-${comboboxKey}`}
                layoutVariant="default"
                selectedPlace={selectedPlace}
                onSelectedPlaceChange={syncPlaceToUrl}
                initialDraft={initialDraft}
              />
            </div>

            <p className="prof-dir__hint prof-dir__hint--intro" aria-live="polite">
              {selectedPlace
                ? `Zona: ${selectedPlace.comune} (${selectedPlace.siglaProvincia}), ${selectedPlace.regione}. Risultati filtrati per regione, ordinati per rilevanza sul comune.`
                : 'Nessun luogo selezionato: elenco completo. Scegli un comune o una zona nel campo sopra.'}
            </p>
          </div>
        </div>

        <section className="prof-dir__results" aria-labelledby="prof-dir-results-title">
          <div className="prof-dir__results-inner">
            <h2 id="prof-dir-results-title" className="prof-dir__results-title">
              Risultati{' '}
              <span className="prof-dir__results-count">
                ({loading ? '…' : total} {total === 1 ? 'scheda' : 'schede'})
              </span>
            </h2>

            {loading ? (
              <div className="prof-dir__grid prof-dir__grid--skeleton" aria-busy="true" aria-label="Caricamento profili">
                {Array.from({ length: DIRECTORY_SKELETON_COUNT }, (_, i) => (
                  <DirectoryCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="prof-dir__empty prof-dir__empty--error polish-state-panel" role="alert">
                <span className="polish-state-panel__icon" aria-hidden />
                <p>{error}</p>
                <button type="button" className="prof-dir__retry" onClick={() => void reload()}>
                  Riprova
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="prof-dir__empty polish-state-panel">
                <span className="polish-state-panel__icon" aria-hidden />
                <p>
                  Nessun profilo in questa zona per questa modalità. Prova l’altro tab o un’altra zona.
                </p>
              </div>
            ) : (
              <>
                <div className="prof-dir__grid">
                  {visible.map((card) => (
                    <DirectoryProfileCard key={card.id} card={card} />
                  ))}
                </div>
                {hasMore ? (
                  <div className="prof-dir__more">
                    <button
                      type="button"
                      className="prof-dir__retry"
                      disabled={loadingMore}
                      onClick={() => void loadMore()}
                    >
                      {loadingMore ? 'Caricamento…' : 'Mostra altri risultati'}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </main>
    </SiteShell>
  )
}
