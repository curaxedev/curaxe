import type { RegisterDraft } from '../pages/auth/registerDraft'
import { draftToProfessionalPayload, draftToSeekerPayload } from '../lib/registrationMappers'
import type {
  ProfessionalRegistrationPayload,
  RegistrationFieldErrors,
  RegistrationSuccessResponse,
  SeekerRegistrationPayload,
} from '../lib/registrationTypes'
import { RegistrationError } from '../lib/registrationTypes'
import { isRegistrationDocumentUploadEnabled } from '../lib/registrationFeatures'
import { CONSENT_POLICY_VERSION } from '../lib/gdprTypes'

const MOCK_DELAY_MS = 650

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pushError(errors: RegistrationFieldErrors, field: string, message: string): void {
  if (!errors[field]) {
    errors[field] = []
  }
  errors[field].push(message)
}

function hasErrors(errors: RegistrationFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

function ageFromBirthDate(birthDate: string): number | null {
  const born = new Date(birthDate)
  if (Number.isNaN(born.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) {
    age -= 1
  }
  return age
}

function validateConsents(
  consents: { termini: boolean; privacy: boolean; maggiorenne: boolean },
  errors: RegistrationFieldErrors,
): void {
  if (!consents.termini) {
    pushError(errors, 'consentTermini', 'Devi accettare i Termini di servizio.')
  }
  if (!consents.privacy) {
    pushError(errors, 'consentPrivacy', 'Devi accettare l’informativa privacy.')
  }
  if (!consents.maggiorenne) {
    pushError(errors, 'consentMaggiorenne', 'Conferma di essere maggiorenne.')
  }
}

function isValidEmail(email: string | undefined): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/** Registrazione minima (2 step): ruolo/zona + account/consensi. Il resto si completa in dashboard. */
function validateProfessionalPayload(
  payload: ProfessionalRegistrationPayload,
  email?: string,
): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {}

  if (!payload.role) {
    pushError(errors, 'primaryRole', 'Seleziona il ruolo principale.')
  }
  if (!payload.address.line || payload.address.line.length < 2) {
    pushError(errors, 'addressLine', 'Inserisci il comune o la zona di lavoro.')
  }
  if (!payload.firstName || payload.firstName.length < 2) {
    pushError(errors, 'fullName', 'Inserisci nome e cognome validi.')
  }
  if (!isValidEmail(email)) {
    pushError(errors, 'email', 'Inserisci un indirizzo email valido.')
  }
  if (payload.birthDate) {
    const age = ageFromBirthDate(payload.birthDate)
    if (age === null) {
      pushError(errors, 'birthDate', 'Data di nascita non valida.')
    } else if (age < 18) {
      pushError(errors, 'birthDate', 'Devi avere almeno 18 anni per registrarti.')
    }
  }
  validateConsents(payload.consents, errors)

  return errors
}

function validateSeekerPayload(
  payload: SeekerRegistrationPayload,
  email?: string,
): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {}

  if (!payload.careType) {
    pushError(errors, 'seekerCareType', 'Indica che tipo di assistenza cerchi.')
  }
  if (!payload.forWhom) {
    pushError(errors, 'seekerForWhom', 'Indica per chi è la ricerca.')
  }
  if (!payload.fullName || payload.fullName.length < 3) {
    pushError(errors, 'fullName', 'Inserisci nome e cognome validi.')
  }
  if (!payload.address.line || payload.address.line.length < 2) {
    pushError(errors, 'addressLine', 'Inserisci zona o comune.')
  }
  if (!isValidEmail(email)) {
    pushError(errors, 'email', 'Inserisci un indirizzo email valido.')
  }
  validateConsents(payload.consents, errors)

  return errors
}

function newRegistrationId(intent: 'seeker' | 'offer'): string {
  const prefix = intent === 'offer' ? 'reg-pro' : 'reg-seek'
  return `${prefix}-${Date.now().toString(36)}`
}

export async function submitProfessionalRegistration(
  draft: RegisterDraft,
): Promise<RegistrationSuccessResponse> {
  await delay()
  const payload = draftToProfessionalPayload(draft)

  if ((draft.fullName ?? '').toLowerCase().includes('server-error')) {
    throw new RegistrationError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const fieldErrors = validateProfessionalPayload(payload, draft.email)
  if (hasErrors(fieldErrors)) {
    throw new RegistrationError(
      'validation',
      'Controlla i campi evidenziati e correggi gli errori.',
      fieldErrors,
    )
  }

  const registrationId = newRegistrationId('offer')
  // Persist consents keyed by email until Laravel maps them to userId.
  if (draft.email) {
    try {
      localStorage.setItem(
        `fa:consents:email:${draft.email.trim().toLowerCase()}`,
        JSON.stringify({
          termini: draft.consentTermini,
          privacy: draft.consentPrivacy,
          maggiorenne: draft.consentMaggiorenne,
          comunicazioni: !!draft.consentComunicazioni,
          profilazione: !!draft.consentProfilazione,
          version: CONSENT_POLICY_VERSION,
          recordedAt: new Date().toISOString(),
          source: 'registration',
        }),
      )
    } catch {
      /* ignore */
    }
  }

  return {
    id: registrationId,
    intent: 'offer',
    emailVerificationRequired: true,
    documentsUploadPending: !isRegistrationDocumentUploadEnabled(),
    message: 'Registrazione professionista ricevuta. Completa il profilo dopo l’accesso.',
  }
}

export async function submitSeekerRegistration(
  draft: RegisterDraft,
): Promise<RegistrationSuccessResponse> {
  await delay()
  const payload = draftToSeekerPayload(draft)

  if ((draft.fullName ?? '').toLowerCase().includes('server-error')) {
    throw new RegistrationError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const fieldErrors = validateSeekerPayload(payload, draft.email)
  if (hasErrors(fieldErrors)) {
    throw new RegistrationError(
      'validation',
      'Controlla i campi evidenziati e correggi gli errori.',
      fieldErrors,
    )
  }

  const registrationId = newRegistrationId('seeker')
  if (draft.email) {
    try {
      localStorage.setItem(
        `fa:consents:email:${draft.email.trim().toLowerCase()}`,
        JSON.stringify({
          termini: draft.consentTermini,
          privacy: draft.consentPrivacy,
          maggiorenne: draft.consentMaggiorenne,
          comunicazioni: !!draft.consentComunicazioni,
          profilazione: !!draft.consentProfilazione,
          version: CONSENT_POLICY_VERSION,
          recordedAt: new Date().toISOString(),
          source: 'registration',
        }),
      )
    } catch {
      /* ignore */
    }
  }

  return {
    id: registrationId,
    intent: 'seeker',
    emailVerificationRequired: false,
    message: 'Account famiglia creato. Puoi pubblicare una richiesta dalla dashboard.',
  }
}

/** Exported for tests / Laravel contract documentation. */
export type { ProfessionalRegistrationPayload, SeekerRegistrationPayload }
