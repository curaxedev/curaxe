/**
 * Contact form API client — mock today; swap to fetch + Laravel when backend is ready.
 * POST /api/v1/contact
 */
import type { ContactFormInput, ContactSubmitResponse } from './contactTypes'
import { submitContactForm } from '../services/contactService'

export type { ContactFormInput, ContactFormFieldErrors, ContactSubmitResponse } from './contactTypes'
export { ContactError } from './contactTypes'

export async function postContactMessage(input: ContactFormInput): Promise<ContactSubmitResponse> {
  return submitContactForm(input)
}
