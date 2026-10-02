/** Single source of truth for Curaxe product branding. */
export const BRAND_NAME = 'Curaxe'
export const BRAND_NAME_UPPER = 'CURAXE'
export const BRAND_TAGLINE = 'Assistenza socio-sanitaria, vicino a te'
export const BRAND_DOMAIN = 'curaxe.it'
export const BRAND_SITE_URL = 'https://curaxe.it'
export const BRAND_SUPPORT_EMAIL = 'assistenza@curaxe.it'
export const BRAND_INFO_EMAIL = 'info@curaxe.it'
export const BRAND_OPERATOR = 'BackSoftware'

/** Page `<title>` — optional segment before brand suffix. */
export function pageTitle(segment?: string): string {
  if (!segment) return `${BRAND_NAME} — ${BRAND_TAGLINE}`
  return `${segment} | ${BRAND_NAME}`
}
