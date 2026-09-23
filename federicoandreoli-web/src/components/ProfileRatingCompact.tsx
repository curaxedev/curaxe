import { IconStar } from './icons/DashboardIcons'

/**
 * Valutazione compatta: una sola stella + testo tipo «4,5/5» (formato italiano).
 */
export function formatRatingOutOfFiveIt(value: number): string {
  const clamped = Math.min(5, Math.max(0, value))
  const half = Math.round(clamped * 2) / 2
  const body = Number.isInteger(half) ? String(half) : half.toFixed(1).replace('.', ',')
  return `${body}/5`
}

type ProfileRatingCompactProps = {
  value: number
  /** Classi sul wrapper (default: stile carosello home). */
  className?: string
}

export function ProfileRatingCompact({ value, className }: ProfileRatingCompactProps) {
  const label = formatRatingOutOfFiveIt(value)
  const aria = `Valutazione ${label.replace('/', ' su ')}`
  const rootClass =
    className ??
    'home-profile-carousel__rating profile-rating-compact'

  return (
    <span className={rootClass} aria-label={aria}>
      <IconStar size={15} className="profile-rating-compact__icon" aria-hidden />
      <span className="profile-rating-compact__label">{label}</span>
    </span>
  )
}
