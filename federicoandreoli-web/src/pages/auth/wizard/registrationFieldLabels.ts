import { offerStepHref, seekerStepHref, type OfferStepId, type SeekerStepId } from './stepConfig'

/** Draft field keys returned by mock validation → human label + wizard step link. */
const OFFER_FIELD_META: Record<string, { label: string; stepId: OfferStepId }> = {
  primaryRole: { label: 'Ruolo principale', stepId: 'chi-sei' },
  addressLine: { label: 'Comune / zona di lavoro', stepId: 'chi-sei' },
  fullName: { label: 'Nome e cognome', stepId: 'account' },
  email: { label: 'Email', stepId: 'account' },
  consentTermini: { label: 'Termini di servizio', stepId: 'account' },
  consentPrivacy: { label: 'Privacy', stepId: 'account' },
  consentMaggiorenne: { label: 'Maggiorenne', stepId: 'account' },
}

const SEEKER_FIELD_META: Record<string, { label: string; stepId: SeekerStepId }> = {
  seekerOrgKind: { label: 'Tipo profilo', stepId: 'tipo' },
  seekerCareType: { label: 'Tipo assistenza', stepId: 'figura' },
  seekerForWhom: { label: 'Per chi', stepId: 'per-chi' },
  addressLine: { label: 'Zona o comune', stepId: 'dove' },
  fullName: { label: 'Nome e cognome', stepId: 'account' },
  email: { label: 'Email', stepId: 'account' },
  consentTermini: { label: 'Termini di servizio', stepId: 'account' },
  consentPrivacy: { label: 'Privacy', stepId: 'account' },
  consentMaggiorenne: { label: 'Maggiorenne', stepId: 'account' },
}

export type FieldErrorRow = {
  field: string
  label: string
  messages: string[]
  fixHref: string
}

export function offerFieldErrors(
  fieldErrors: Record<string, string[]>,
): FieldErrorRow[] {
  return Object.entries(fieldErrors).map(([field, messages]) => {
    const meta = OFFER_FIELD_META[field]
    return {
      field,
      label: meta?.label ?? field,
      messages,
      fixHref: meta ? offerStepHref(meta.stepId) : offerStepHref('account'),
    }
  })
}

export function seekerFieldErrors(
  fieldErrors: Record<string, string[]>,
): FieldErrorRow[] {
  return Object.entries(fieldErrors).map(([field, messages]) => {
    const meta = SEEKER_FIELD_META[field]
    return {
      field,
      label: meta?.label ?? field,
      messages,
      fixHref: meta ? seekerStepHref(meta.stepId) : seekerStepHref('account'),
    }
  })
}
