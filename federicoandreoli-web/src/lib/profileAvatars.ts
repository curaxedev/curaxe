/** Preset avatar library — classic 2D person silhouettes (public/images/profiles). */

export type ProfileAvatarPreset = {
  id: string
  label: string
  /** Soft brand-friendly palette (teal / coral / blue / green / sand). */
  tone: string
  src: string
}

export const DEFAULT_AVATAR_PRESET_ID = 'profile-01'

export const PROFILE_AVATAR_PRESETS: ProfileAvatarPreset[] = [
  { id: 'profile-01', label: 'Azzurro', tone: '#2A5C82', src: '/images/profiles/profile-01.svg' },
  { id: 'profile-02', label: 'Corallo', tone: '#E07A5F', src: '/images/profiles/profile-02.svg' },
  { id: 'profile-03', label: 'Verde', tone: '#81B29A', src: '/images/profiles/profile-03.svg' },
  { id: 'profile-04', label: 'Blu soft', tone: '#5B8FB9', src: '/images/profiles/profile-04.svg' },
  { id: 'profile-05', label: 'Pesca', tone: '#D9896F', src: '/images/profiles/profile-05.svg' },
  { id: 'profile-06', label: 'Salvia', tone: '#6FA88F', src: '/images/profiles/profile-06.svg' },
  { id: 'profile-07', label: 'Menta', tone: '#5C9E88', src: '/images/profiles/profile-07.svg' },
  { id: 'profile-08', label: 'Terracotta', tone: '#C97B63', src: '/images/profiles/profile-08.svg' },
  { id: 'profile-09', label: 'Teal', tone: '#3D7A8C', src: '/images/profiles/profile-09.svg' },
  { id: 'profile-10', label: 'Sabbia', tone: '#A8926A', src: '/images/profiles/profile-10.svg' },
]

export function avatarSrcForPreset(id: string): string {
  const found = PROFILE_AVATAR_PRESETS.find((p) => p.id === id)
  return found?.src ?? `/images/profiles/${DEFAULT_AVATAR_PRESET_ID}.svg`
}

export function defaultPersonAvatarSrc(): string {
  return avatarSrcForPreset(DEFAULT_AVATAR_PRESET_ID)
}

/** True when URL points at a library SVG (not a real uploaded photo). */
export function isAvatarPresetUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /\/images\/profiles\/profile-\d{2}\.svg(?:\?|$)/i.test(url)
}

export function presetIdFromPhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/\/images\/profiles\/(profile-\d{2})\.svg(?:\?|$)/i)
  return match?.[1] ?? null
}
