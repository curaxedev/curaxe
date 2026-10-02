import { Link } from 'react-router-dom'
import { BRAND_NAME, BRAND_NAME_UPPER } from '../lib/brand'

export type BrandLogoProps = {
  /** Link to home (default true for header/footer). */
  link?: boolean
  className?: string
  /** Compact mark for tight headers / auth. */
  size?: 'sm' | 'md' | 'lg'
  /** Show only wordmark without the glyph. */
  wordmarkOnly?: boolean
}

/**
 * Curaxe wordmark — Syne display + mark geometrico.
 * Hero-level brand signal: uppercase CURAXE with distinctive tracking.
 */
export function BrandLogo({
  link = true,
  className = '',
  size = 'md',
  wordmarkOnly = false,
}: BrandLogoProps) {
  const classes = ['brand-logo', `brand-logo--${size}`, className].filter(Boolean).join(' ')

  const inner = (
    <>
      {!wordmarkOnly ? (
        <span className="brand-logo__mark" aria-hidden>
          <span className="brand-logo__mark-inner">C</span>
        </span>
      ) : null}
      <span className="brand-logo__word">{BRAND_NAME_UPPER}</span>
    </>
  )

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
