import type { ContactFormInput, ContactSubmitResponse } from '../lib/contactTypes'
import { ContactError } from '../lib/contactTypes'

const MOCK_DELAY_MS = 600
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function validateInput(input: ContactFormInput): ContactError | null {
  const fieldErrors: ContactError['fieldErrors'] = {}
  const name = input.name.trim()
  const email = input.email.trim()
  const message = input.message.trim()

  if (!name) fieldErrors.name = 'Inserisci il tuo nome'
  if (!email) fieldErrors.email = 'Inserisci la tua email'
  else if (!EMAIL_RE.test(email)) fieldErrors.email = 'Email non valida'
  if (!message) fieldErrors.message = 'Scrivi un messaggio'
  else if (message.length < 10) fieldErrors.message = 'Il messaggio deve contenere almeno 10 caratteri'

  if (Object.keys(fieldErrors).length > 0) {
    return new ContactError('Controlla i campi evidenziati', fieldErrors)
  }
  return null
}

/** Mock POST /api/v1/contact — swap to fetch when Laravel endpoint ships. */
export async function submitContactForm(input: ContactFormInput): Promise<ContactSubmitResponse> {
  const validationError = validateInput(input)
  if (validationError) throw validationError

  await delay()

  if (import.meta.env.DEV && input.email.toLowerCase() === 'error@test.it') {
    throw new ContactError('Servizio temporaneamente non disponibile. Riprova tra qualche minuto.')
  }

  return {
    id: `msg-${Date.now()}`,
    receivedAt: new Date().toISOString(),
  }
}
