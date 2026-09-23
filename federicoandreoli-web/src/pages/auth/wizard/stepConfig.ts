export const OFFER_STEP_IDS = ['chi-sei', 'account'] as const

export type OfferStepId = (typeof OFFER_STEP_IDS)[number]

export const SEEKER_STEP_IDS = ['chi-sei', 'account'] as const

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

export function seekerProgressIndex(stepId: SeekerStepId): number {
  return SEEKER_STEP_IDS.indexOf(stepId)
}
