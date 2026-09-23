export type ContactFormInput = {
  name: string
  email: string
  message: string
}

export type ContactFormFieldErrors = Partial<Record<keyof ContactFormInput, string>>

export type ContactSubmitResponse = {
  id: string
  receivedAt: string
}

export class ContactError extends Error {
  readonly fieldErrors: ContactFormFieldErrors

  constructor(message: string, fieldErrors: ContactFormFieldErrors = {}) {
    super(message)
    this.name = 'ContactError'
    this.fieldErrors = fieldErrors
  }
}
