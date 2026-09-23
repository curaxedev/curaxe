/** Single source of truth for product branding across public site and dashboard. */
export const BRAND_NAME = 'Federico Andreoli'

export const BRAND_TAGLINE = 'Assistenza socio-sanitaria verificata'

/** Page `<title>` — optional segment before brand suffix. */
export function pageTitle(segment?: string): string {
  if (!segment) return `${BRAND_NAME} — ${BRAND_TAGLINE}`
  return `${segment} | ${BRAND_NAME}`
}
