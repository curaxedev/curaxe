import type { SeekerOrgKind } from '../registerDraft'

export const OFFER_STEP_IDS = ['chi-sei', 'account'] as const

export type OfferStepId = (typeof OFFER_STEP_IDS)[number]

/** Tutti gli step possibili del percorso Cerco (ordine canonico). */
export const SEEKER_STEP_IDS = ['tipo', 'figura', 'per-chi', 'dove', 'account'] as const

export type SeekerStepId = (typeof SEEKER_STEP_IDS)[number]

export function isOfferStepId(id: string | undefined): id is OfferStepId {
  return id !== undefined && (OFFER_STEP_IDS as readonly string[]).includes(id)
}

export function isSeekerStepId(id: string | undefined): id is SeekerStepId {
  return id !== undefined && (SEEKER_STEP_IDS as readonly string[]).includes(id)
}

export function offerStepHref(id: OfferStepId): string {
  return `/registrazione/offro/${id}`
}

export function seekerStepHref(id: SeekerStepId): string {
  return `/registrazione/cerco/${id}`
}

export function offerProgressIndex(stepId: OfferStepId): number {
  return OFFER_STEP_IDS.indexOf(stepId)
}

/** Step effettivi in base a famiglia vs agenzia. */
export function seekerStepsForOrg(orgKind: SeekerOrgKind | undefined): SeekerStepId[] {
  if (orgKind === 'agency') {
    return ['tipo', 'dove', 'account']
  }
  // famiglia (default) e non ancora scelto: lista completa dopo "tipo"
  return ['tipo', 'figura', 'per-chi', 'dove', 'account']
}

export function seekerProgressIndex(
  stepId: SeekerStepId,
  orgKind?: SeekerOrgKind,
): number {
  const steps = seekerStepsForOrg(orgKind)
  const i = steps.indexOf(stepId)
  return i >= 0 ? i : 0
}

export function nextSeekerStep(
  current: SeekerStepId,
  orgKind?: SeekerOrgKind,
): SeekerStepId | null {
  const steps = seekerStepsForOrg(orgKind)
  const i = steps.indexOf(current)
  if (i < 0 || i >= steps.length - 1) return null
  return steps[i + 1] ?? null
}

export function prevSeekerStep(
  current: SeekerStepId,
  orgKind?: SeekerOrgKind,
): SeekerStepId | null {
  const steps = seekerStepsForOrg(orgKind)
  const i = steps.indexOf(current)
  if (i <= 0) return null
  return steps[i - 1] ?? null
}
