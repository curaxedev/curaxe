import {
  defaultPersonAvatarSrc,
  isAvatarPresetUrl,
  presetIdFromPhotoUrl,
} from '../lib/profileAvatars'

type Props = {
  src?: string | null
  alt?: string
  size?: number
  className?: string
  /** When no photo: colored classic person silhouette (not gray initials). */
  fallbackPresetId?: string
}

/**
 * Round avatar: real photo, library preset, or default colored 2D person.
 */
export function PersonAvatar({
  src,
  alt = '',
  size = 88,
  className = '',
  fallbackPresetId,
}: Props) {
  const resolved =
    src && src.trim() !== ''
      ? src
      : fallbackPresetId
        ? `/images/profiles/${fallbackPresetId}.svg`
        : defaultPersonAvatarSrc()

  const isPreset = !src || isAvatarPresetUrl(resolved)
  const presetHint = presetIdFromPhotoUrl(resolved)

  return (
    <img
      className={`person-avatar${isPreset ? ' person-avatar--preset' : ''}${className ? ` ${className}` : ''}`}
      src={resolved}
      alt={alt}
      width={size}
      height={size}
      decoding="async"
      data-avatar-preset={presetHint ?? undefined}
      style={{ width: size, height: size }}
    />
  )
}
