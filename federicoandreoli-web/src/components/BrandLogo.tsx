import { Link } from 'react-router-dom'
import { BRAND_NAME } from '../lib/brand'

export type BrandLogoProps = {
  /** Link to home (default true for header/footer). */
  link?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  /** Kept for API compat — mark is never shown. */
  wordmarkOnly?: boolean
}

/**
 * Curaxe wordmark — solo testo, tipografia morbida (Nunito Sans).
 * Nessun glyph / icona: brand empatico e pulito.
 */
export function BrandLogo({
  link = true,
  className = '',
  size = 'md',
}: BrandLogoProps) {
  const classes = ['brand-logo', `brand-logo--${size}`, className].filter(Boolean).join(' ')

  const inner = <span className="brand-logo__word">{BRAND_NAME}</span>

  if (link) {
    return (
      <Link className={classes} to="/" aria-label={`${BRAND_NAME} — home`}>
        {inner}
      </Link>
    )
  }

  return (
    <span className={classes} aria-label={BRAND_NAME}>
      {inner}
    </span>
  )
}
