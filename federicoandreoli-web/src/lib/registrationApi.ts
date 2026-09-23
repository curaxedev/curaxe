/**
 * Registration API — doppio binario mock / Laravel.
 *
 * Endpoint reali:
 *   POST /api/v1/registrations/professional -> 201 RegistrationSuccessResponse
 *   POST /api/v1/registrations/seeker       -> 201 RegistrationSuccessResponse
 */
import type { RegisterDraft } from '../pages/auth/registerDraft'
import {
  submitProfessionalRegistration,
  submitSeekerRegistration,
} from '../services/registrationService'
import { HttpError, httpPost } from './http'
import { draftToProfessionalPayload, draftToSeekerPayload } from './registrationMappers'
import type { RegistrationFieldErrors, RegistrationSuccessResponse } from './registrationTypes'
import { RegistrationError } from './registrationTypes'
import { isMockApiEnabled } from './runtimeConfig'

export type { RegistrationSuccessResponse, RegistrationFieldErrors } from './registrationTypes'
export { RegistrationError } from './registrationTypes'

/** Mappa i campi di validazione Laravel sulle chiavi usate dal wizard. */
const FIELD_KEY_MAP: Record<string, string> = {
  email: 'email',
  firstName: 'fullName',
  fullName: 'fullName',
  role: 'primaryRole',
  'address.line': 'addressLine',
  birthDate: 'birthDate',
  careType: 'seekerCareType',
  forWhom: 'seekerForWhom',
  'consents.termini': 'consentTermini',
  'consents.privacy': 'consentPrivacy',
  'consents.maggiorenne': 'consentMaggiorenne',
}

function toRegistrationError(err: unknown): RegistrationError {
  if (err instanceof HttpError) {
    if (err.kind === 'validation') {
      const fieldErrors: RegistrationFieldErrors = {}
      for (const [key, messages] of Object.entries(err.errors)) {
        fieldErrors[FIELD_KEY_MAP[key] ?? key] = messages
      }
      return new RegistrationError(
        'validation',
        'Controlla i campi evidenziati e correggi gli errori.',
        fieldErrors
      )
    }
    if (err.kind === 'network' || err.kind === 'timeout') {
      return new RegistrationError('network', 'Impossibile contattare il server. Riprova.')
    }
    return new RegistrationError(
      'server',
      'Servizio temporaneamente non disponibile. Riprova tra poco.'
    )
  }
  return new RegistrationError('network', 'Impossibile contattare il server. Riprova.')
}

export async function registerSeeker(draft: RegisterDraft): Promise<RegistrationSuccessResponse> {
  if (isMockApiEnabled()) return submitSeekerRegistration(draft)

  const payload = draftToSeekerPayload(draft)
  try {
    return await httpPost<RegistrationSuccessResponse>('/api/v1/registrations/seeker', {
      anonymous: true,
      body: {
        email: draft.email,
        fullName: payload.fullName,
        careType: payload.careType,
        forWhom: payload.forWhom,
        address: payload.address,
        consents: payload.consents,
        payload,
      },
    })
  } catch (err) {
    throw toRegistrationError(err)
  }
}

export async function registerProfessional(
  draft: RegisterDraft
): Promise<RegistrationSuccessResponse> {
  if (isMockApiEnabled()) return submitProfessionalRegistration(draft)

  const payload = draftToProfessionalPayload(draft)
  try {
    return await httpPost<RegistrationSuccessResponse>('/api/v1/registrations/professional', {
      anonymous: true,
      body: {
        email: draft.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
        address: payload.address,
        birthDate: payload.birthDate,
        consents: payload.consents,
        payload,
      },
    })
  } catch (err) {
    throw toRegistrationError(err)
  }
}
