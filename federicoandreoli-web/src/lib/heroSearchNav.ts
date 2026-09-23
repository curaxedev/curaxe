/** Sezione risultati home (cerco / offro) per scroll da hero e barra sticky. */
export const HERO_RESULTS_SECTION_ID = 'professionisti'

export function scrollToHeroResults(): void {
  requestAnimationFrame(() => {
    document.getElementById(HERO_RESULTS_SECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
