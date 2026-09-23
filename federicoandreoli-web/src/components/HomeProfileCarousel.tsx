import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { profileDetailPath } from '../lib/siteRoutes'
import { IconChevronRight } from './icons/DashboardIcons'
import { ProfileRatingCompact } from './ProfileRatingCompact'

/** Larghezza minima desiderata per card (px): più larghe, meno “magre”. */
const CAROUSEL_MIN_CARD_PX = 304
const CAROUSEL_GAP_PX = 16

/** Lun → Dom */
export type HomeProfileWeekAvailability = readonly [
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
]

export type HomeProfileCarouselCard = {
  id: string
  category: string
  type: 'professional' | 'facility'
  name: string
  role: string
  stars: number
  location: boolean
  online: boolean
  shift?: string
  imageUrl: string
  locationLabel: string
  /** Profilo professionale proposto tramite agenzia (badge “Tramite …”). */
  viaAgencyName?: string
  /** Età mostrata accanto al nome sullo scatto, es. "Giulia (34)" */
  age?: number
  /** Es. "€12 – 15 / ora" o "Negoziabile" */
  rateLabel?: string
  /** Es. "5 anni di esperienza nel domiciliare" */
  experienceLabel?: string
  /** Disponibilità settimanale Lun–Dom (true = disponibile) */
  weekAvailable?: HomeProfileWeekAvailability
}

const DAY_SHORT: readonly string[] = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function agencyPillText(viaAgencyName: string): string {
  const t = viaAgencyName.trim()
  return t.length > 0 ? `Tramite ${t}` : ''
}

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

const WEEK_PRESETS: HomeProfileWeekAvailability[] = [
  [true, true, true, true, true, false, false],
  [true, true, true, false, true, true, false],
  [true, false, true, true, true, true, false],
  [true, true, false, true, true, false, true],
  [false, true, true, true, true, true, false],
]

function isAgencyListing(card: HomeProfileCarouselCard): boolean {
  return card.category === 'agency'
}

function weekForCard(card: HomeProfileCarouselCard): HomeProfileWeekAvailability {
  if (card.weekAvailable) return card.weekAvailable
  if (isAgencyListing(card)) return [true, true, true, true, true, false, false]
  if (card.type === 'facility') return [true, true, true, true, true, true, false]
  return WEEK_PRESETS[hashId(card.id) % WEEK_PRESETS.length]
}

function rateForCard(card: HomeProfileCarouselCard): string {
  if (card.rateLabel) return card.rateLabel
  if (isAgencyListing(card)) return 'Su preventivo'
  if (card.type === 'facility') return 'Tariffe in struttura'
  const rates = ['€12 – 14 / ora', '€13 – 16 / ora', '€11 – 13 / ora', 'Negoziabile', '€14 – 18 / ora', '€10 – 12 / ora']
  return rates[hashId(card.id) % rates.length]
}

function experienceForCard(card: HomeProfileCarouselCard): string {
  if (card.experienceLabel) return card.experienceLabel
  if (isAgencyListing(card)) return 'Selezione e matching dedicati'
  if (card.type === 'facility') return 'Team multidisciplinare in sede'
  const y = 3 + (hashId(card.id) % 8)
  return `${y} anni di esperienza`
}

function IconDayCheck() {
  return (
    <svg className="home-profile-carousel__day-mark" width="10" height="10" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconDayX() {
  return (
    <svg className="home-profile-carousel__day-mark" width="10" height="10" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function IconChevron({ dir }: { dir: 'left' | 'right' }) {
  const d = dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type HomeProfileCarouselProps = {
  cards: HomeProfileCarouselCard[]
  /** Used in screen-reader copy for the carousel region */
  categoryLabel?: string
}

function isBrandGraphic(card: HomeProfileCarouselCard): boolean {
  return card.type === 'facility' || card.category === 'agency'
}

export function HomeProfileCarousel({ cards, categoryLabel }: HomeProfileCarouselProps) {
  const labelId = useId()
  const trackId = useId()
  const viewportRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const count = cards.length
  const slidesPerView = useMemo(() => {
    if (count === 0) return 1
    if (viewportWidth <= 0) return 1
    const raw = Math.floor((viewportWidth + CAROUSEL_GAP_PX) / (CAROUSEL_MIN_CARD_PX + CAROUSEL_GAP_PX))
    return Math.min(count, Math.max(1, raw))
  }, [count, viewportWidth])
  const maxIndex = Math.max(0, count - slidesPerView)
  const safeIndex = count === 0 ? 0 : Math.min(Math.max(0, index), maxIndex)

  const slideWidthPx =
    viewportWidth > 0
      ? (viewportWidth - CAROUSEL_GAP_PX * (slidesPerView - 1)) / slidesPerView
      : 0

  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const measure = () => {
      const w = el.clientWidth
      if (w <= 0) {
        setViewportWidth(0)
        return
      }
      const raw = Math.floor((w + CAROUSEL_GAP_PX) / (CAROUSEL_MIN_CARD_PX + CAROUSEL_GAP_PX))
      const spv = Math.min(count || 1, Math.max(1, raw))
      const mx = Math.max(0, count - spv)
      setViewportWidth(w)
      setIndex((prev) => Math.min(Math.max(0, prev), mx))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [count])

  const go = useCallback(
    (delta: number) => {
      if (count === 0) return
      setIndex((i) => Math.min(maxIndex, Math.max(0, i + delta)))
    },
    [count, maxIndex]
  )

  const stridePx = slideWidthPx > 0 ? slideWidthPx + CAROUSEL_GAP_PX : 0
  const trackTransform =
    slideWidthPx > 0 ? `translateX(-${safeIndex * stridePx}px)` : `translateX(-${safeIndex * 100}%)`

  if (count === 0) {
    return (
      <p className="home-profile-carousel__empty" role="status">
        Nessun profilo in questa categoria.
      </p>
    )
  }

  return (
    <div
      className="home-profile-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
    >
      <p id={labelId} className="visually-hidden">
        Carosello profili{categoryLabel ? ` — ${categoryLabel}` : ''}: mostra fino a {slidesPerView} profili alla volta.
        Usa frecce sulla tastiera con focus sul carosello, oppure i pulsanti Indietro e Avanti.
      </p>

      <div className="home-profile-carousel__stage">
        <button
          type="button"
          className="home-profile-carousel__nav home-profile-carousel__nav--prev"
          aria-controls={trackId}
          aria-label="Mostra i profili precedenti"
          disabled={safeIndex <= 0}
          onClick={() => go(-1)}
        >
          <IconChevron dir="left" />
        </button>

        <div
          id={trackId}
          ref={viewportRef}
          className="home-profile-carousel__viewport"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault()
              go(-1)
            } else if (e.key === 'ArrowRight') {
              e.preventDefault()
              go(1)
            } else if (e.key === 'Home') {
              e.preventDefault()
              setIndex(0)
            } else if (e.key === 'End') {
              e.preventDefault()
              setIndex(maxIndex)
            }
          }}
          onTouchStart={(e) => {
            const t = e.touches[0]
            touchStartX.current = t ? t.clientX : null
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current
            touchStartX.current = null
            if (start == null) return
            const touch = e.changedTouches[0]
            if (!touch) return
            const delta = touch.clientX - start
            if (delta > 56) go(-1)
            else if (delta < -56) go(1)
          }}
        >
          <div
            className="home-profile-carousel__track"
            style={{
              gap: `${CAROUSEL_GAP_PX}px`,
              transform: trackTransform,
            }}
          >
            {cards.map((card, i) => {
              const week = weekForCard(card)
              const rateLabel = rateForCard(card)
              const experienceLabel = experienceForCard(card)
              const showAgeOnCard =
                card.age != null && card.type === 'professional' && card.category !== 'agency'
              const nameLine = showAgeOnCard ? `${card.name} (${card.age})` : card.name
              const agencyBadge =
                card.type === 'professional' &&
                card.category !== 'agency' &&
                card.viaAgencyName &&
                card.viaAgencyName.trim().length > 0
                  ? agencyPillText(card.viaAgencyName)
                  : null
              const inView = i >= safeIndex && i < safeIndex + slidesPerView
              const slideStyle =
                slideWidthPx > 0
                  ? { flex: `0 0 ${slideWidthPx}px`, width: slideWidthPx, minWidth: 0 }
                  : { flex: '0 0 100%', minWidth: 0 }
              const isClickable = card.type === 'professional' && card.category !== 'agency'
              const cardClassName =
                'home-profile-carousel__card home-profile-carousel__card--sitly pro-card pro-card--link'
              const cardChildren = (
                <>
                  <div className="home-profile-carousel__media">
                      <div className="home-profile-carousel__photo-frame">
                        {card.imageUrl ? (
                          <img
                            className={`home-profile-carousel__photo${isBrandGraphic(card) ? ' home-profile-carousel__photo--brand' : ''}`}
                            src={card.imageUrl}
                            alt=""
                            width={320}
                            height={200}
                            loading={i === 0 ? 'eager' : 'lazy'}
                            decoding="async"
                          />
                        ) : card.type === 'facility' ? (
                          <div className="home-profile-carousel__photo-fallback home-profile-carousel__photo-fallback--facility" aria-hidden>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                          </div>
                        ) : (
                          <div className="home-profile-carousel__photo-fallback" aria-hidden>
                            {card.name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div className="home-profile-carousel__scrim" aria-hidden />
                      <div className="home-profile-carousel__overlay-top">
                        <h3 className="home-profile-carousel__overlay-name">{nameLine}</h3>
                        <p className="home-profile-carousel__overlay-area">{card.locationLabel}</p>
                      </div>
                      {agencyBadge ? (
                        <span className="home-profile-carousel__agency-pill" title={agencyBadge}>
                          {agencyBadge}
                        </span>
                      ) : null}
                    </div>

                    <div className="home-profile-carousel__sheet">
                      <div className="home-profile-carousel__row-meta">
                        <span className="home-profile-carousel__rate">{rateLabel}</span>
                        <ProfileRatingCompact value={card.stars} />
                      </div>
                      <p className="home-profile-carousel__experience">{experienceLabel}</p>
                      <p className="home-profile-carousel__avail-heading">Disponibile il:</p>
                      <div className="home-profile-carousel__days" role="list" aria-label="Giorni di disponibilità indicativi">
                        {DAY_SHORT.map((label, di) => (
                          <span
                            key={label}
                            className={`home-profile-carousel__day${week[di] ? ' is-available' : ''}`}
                            role="listitem"
                          >
                            <span className="home-profile-carousel__day-label">{label}</span>
                            <span className="home-profile-carousel__day-icon" aria-hidden>
                              {week[di] ? <IconDayCheck /> : <IconDayX />}
                            </span>
                          </span>
                        ))}
                      </div>
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
                          {card.type === 'facility'
                            ? 'Apri struttura'
                            : card.category === 'agency'
                              ? 'Anteprima in arrivo'
                              : 'Visualizza profilo'}
                          <IconChevronRight size={14} className="home-profile-carousel__cta-arrow" aria-hidden />
                        </span>
                      </div>
                    </div>
                </>
              )
              return (
                <article
                  key={card.id}
                  className="home-profile-carousel__slide"
                  style={slideStyle}
                  aria-hidden={!inView}
                  aria-label={
                    agencyBadge ? `${card.name}, ${card.role}, ${agencyBadge}` : `${card.name}, ${card.role}`
                  }
                >
                  {isClickable ? (
                    <Link className={cardClassName} to={profileDetailPath(card.id)}>
                      {cardChildren}
                    </Link>
                  ) : (
                    <div
                      className={cardClassName}
                      role="group"
                      aria-disabled="true"
                      title={card.type === 'facility' ? 'Anteprima struttura in arrivo' : 'Anteprima agenzia in arrivo'}
                    >
                      {cardChildren}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          className="home-profile-carousel__nav home-profile-carousel__nav--next"
          aria-controls={trackId}
          aria-label="Mostra i profili successivi"
          disabled={safeIndex >= maxIndex}
          onClick={() => go(1)}
        >
          <IconChevron dir="right" />
        </button>
      </div>

      <div className="home-profile-carousel__dots" role="tablist" aria-label="Posizione nel carosello">
        {Array.from({ length: maxIndex + 1 }, (_, i) => (
          <button
            key={`pos-${i}`}
            type="button"
            role="tab"
            aria-selected={i === safeIndex}
            aria-label={`Vai alla posizione ${i + 1} di ${maxIndex + 1}`}
            className={`home-profile-carousel__dot${i === safeIndex ? ' is-active' : ''}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  )
}
