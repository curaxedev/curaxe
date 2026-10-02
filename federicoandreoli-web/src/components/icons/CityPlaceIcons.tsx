/**
 * Landmark icons stile Airbnb per città chiave + pin generico per gli altri comuni.
 */
import type { ReactElement } from 'react'

export type CityIconTone = {
  /** Chiave città (lowercase) */
  key: string
  label: string
  /** Colore tratto landmark */
  stroke: string
  /** Sfondo soft del riquadro */
  bg: string
}

/** 7 destinazioni con icona dedicata */
export const FEATURED_CITY_ICONS: CityIconTone[] = [
  { key: 'milano', label: 'Milano', stroke: '#C17B4A', bg: '#F5E6D8' },
  { key: 'torino', label: 'Torino', stroke: '#B8956A', bg: '#F3E9DC' },
  { key: 'roma', label: 'Roma', stroke: '#C45C3E', bg: '#F8E8E2' },
  { key: 'firenze', label: 'Firenze', stroke: '#D4894A', bg: '#F7EBDD' },
  { key: 'napoli', label: 'Napoli', stroke: '#5B7C99', bg: '#E8EEF3' },
  { key: 'bologna', label: 'Bologna', stroke: '#8B4A5C', bg: '#F3E6EA' },
  { key: 'modena', label: 'Modena', stroke: '#5F8F7A', bg: '#E6F0EB' },
]

const FEATURED_BY_KEY = new Map(FEATURED_CITY_ICONS.map((c) => [c.key, c]))

/** Estrae nome comune da label tipo "Ivrea (TO)" o "Milano". */
export function normalizeCityKey(raw: string): string {
  const base = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[^a-z0-9'\s-]/g, '')
    .trim()
  return base
}

export function getFeaturedCityTone(raw: string): CityIconTone | null {
  const key = normalizeCityKey(raw)
  if (!key) return null
  return FEATURED_BY_KEY.get(key) ?? null
}

type IconSvgProps = { stroke?: string; size?: number }

function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
    fill: 'none',
    'aria-hidden': true as const,
  }
}

/** Milano — Duomo */
function IconMilano({ stroke = '#C17B4A', size = 28 }: IconSvgProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M10 38h28M14 38V24l4-3 4 3v14M26 38V18l4-4 4 4v20"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22 14l2-6 2 6" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 24h4M28 22h4M18 30h4M28 30h4" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** Torino — Mole Antonelliana */
function IconTorino({ stroke = '#B8956A', size = 28 }: IconSvgProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M24 6v6M24 12l-7 8h14L24 12Z"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 20v18h14V20" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M20 26h8M20 32h8" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 38h24" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/** Roma — Colosseo */
function IconRoma({ stroke = '#C45C3E', size = 28 }: IconSvgProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M10 36c0-8 6.2-14 14-14s14 6 14 14"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M10 36h28" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 28h20M16 22.5h16" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M18 36v-6.5c0-1.2.9-2 2-2h1.5c1.1 0 2 .8 2 2V36M26.5 36v-6.5c0-1.2.9-2 2-2H30c1.1 0 2 .8 2 2V36"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Firenze — Cupola del Brunelleschi */
function IconFirenze({ stroke = '#D4894A', size = 28 }: IconSvgProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M12 36h24M16 36V26h16v10"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 26c0-6 2.8-10 6-12 3.2 2 6 6 6 12"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 8v4M20 28h8" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** Napoli — Vesuvio stilizzato */
function IconNapoli({ stroke = '#5B7C99', size = 28 }: IconSvgProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M8 36h32L30 18l-4 5-4-8-4 7L8 36Z"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22 15c1.5-3 3-5 5-6" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 30h20" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

/** Bologna — Due Torri */
function IconBologna({ stroke = '#8B4A5C', size = 28 }: IconSvgProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M12 38V16l5-4 5 4v22M26 38V22l4-3 4 3v16"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 24h6M14 30h6M28 28h4" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10 38h28" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/** Modena — Ghirlandina */
function IconModena({ stroke = '#5F8F7A', size = 28 }: IconSvgProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M24 6l-2 4h4L24 6Z"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 10h8v6H20z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 16h12v22H18z" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M21 22h6M21 28h6M21 34h6" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 38h24" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/** Pin luogo generico — soft, non “casa grigia” */
export function IconPlaceGeneric({ stroke = '#6B7C75', size = 28 }: IconSvgProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M24 40s-12-9.2-12-18a12 12 0 1 1 24 0c0 8.8-12 18-12 18Z"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="20" r="4.2" stroke={stroke} strokeWidth="2.2" />
    </svg>
  )
}

export function IconNearMe({ stroke = 'currentColor', size = 28 }: IconSvgProps) {
  return (
    <svg {...svgProps(size)}>
      <path
        d="M14 24l-4-1.2 22-8.8-8.8 22L22 32"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22 32l4.5-4.5" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function IconRecentSearch({ stroke = '#6B7280', size = 28 }: IconSvgProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="24" cy="24" r="12" stroke={stroke} strokeWidth="2.2" />
      <path d="M24 16v9l6 3.5" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const LANDMARK_RENDERERS: Record<string, (p: IconSvgProps) => ReactElement> = {
  milano: IconMilano,
  torino: IconTorino,
  roma: IconRoma,
  firenze: IconFirenze,
  napoli: IconNapoli,
  bologna: IconBologna,
  modena: IconModena,
}

export type PlaceIconKind = 'near' | 'recent' | 'city'

export type PlaceRowIconProps = {
  /** Nome città / label riga (es. "Torino" o "Ivrea (TO)") */
  label: string
  kind?: PlaceIconKind
  size?: number
}

/** Icona completa (riquadro colorato + glyph) per una riga suggerimento. */
export function PlaceRowIcon({ label, kind = 'city', size = 28 }: PlaceRowIconProps) {
  if (kind === 'near') {
    return (
      <span className="cx-place-icon cx-place-icon--near" aria-hidden>
        <IconNearMe size={size} />
      </span>
    )
  }
  if (kind === 'recent') {
    return (
      <span className="cx-place-icon cx-place-icon--recent" aria-hidden>
        <IconRecentSearch size={size} />
      </span>
    )
  }

  const tone = getFeaturedCityTone(label)
  if (tone) {
    const Glyph = LANDMARK_RENDERERS[tone.key]
    return (
      <span
        className="cx-place-icon cx-place-icon--featured"
        style={{ background: tone.bg, color: tone.stroke }}
        aria-hidden
      >
        {Glyph ? <Glyph stroke={tone.stroke} size={size} /> : <IconPlaceGeneric size={size} />}
      </span>
    )
  }

  return (
    <span className="cx-place-icon cx-place-icon--generic" aria-hidden>
      <IconPlaceGeneric size={size} />
    </span>
  )
}
