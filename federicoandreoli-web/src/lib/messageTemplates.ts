import type { MessagingParticipantRole } from './messagingTypes'

export type MessageTemplateRole = 'family' | 'professional'

/** Template famiglia → professionista (moderati). */
export const FAMILY_MESSAGE_TEMPLATES = [
  'Buongiorno, sono interessato/a al suo profilo. Vorrei sapere se è disponibile nelle prossime settimane.',
  'Buongiorno, cerchiamo assistenza per un familiare. Può indicarmi disponibilità e tariffe?',
  'Grazie per la disponibilità. Possiamo fissare un primo colloquio telefonico?',
  'Buongiorno, ho letto la sua candidatura. Quando sarebbe disponibile per un incontro?',
  'Grazie del messaggio. Le farò sapere a breve dopo aver confrontato le candidature.',
  'Buongiorno, la zona e gli orari ci sembrano adatti. È ancora disponibile?',
  'Grazie, per ora non abbiamo bisogno. La ricontatteremo se la situazione cambia.',
] as const

/** Template professionista / operatore → famiglia (moderati). */
export const PROFESSIONAL_MESSAGE_TEMPLATES = [
  'Buongiorno, grazie per avermi contattato. Sono disponibile e posso condividere referenze.',
  'Buongiorno, ho visto la richiesta. Ho esperienza in questo tipo di assistenza: posso aiutarvi?',
  'Grazie del messaggio. Sono disponibile per un breve colloquio per capire meglio le esigenze.',
  'Buongiorno, propongo un breve colloquio telefonico per capire meglio le esigenze.',
  'Grazie, ho ricevuto la vostra richiesta. Posso iniziare dalla data indicata.',
  'Buongiorno, al momento non sono disponibile in quella zona o orario. Resto a disposizione per il futuro.',
  'Grazie per l’interesse. Posso condividere un riepilogo di esperienza e disponibilità.',
] as const

export const DEFAULT_FAMILY_CONTACT_MESSAGE = FAMILY_MESSAGE_TEMPLATES[0]

export function templatesForRole(role: MessagingParticipantRole | MessageTemplateRole): readonly string[] {
  return role === 'family' ? FAMILY_MESSAGE_TEMPLATES : PROFESSIONAL_MESSAGE_TEMPLATES
}

export function isAllowedMessageTemplate(
  body: string,
  role?: MessagingParticipantRole | MessageTemplateRole,
): boolean {
  const normalized = body.trim()
  if (!normalized) return false
  const pool = role ? templatesForRole(role) : [...FAMILY_MESSAGE_TEMPLATES, ...PROFESSIONAL_MESSAGE_TEMPLATES]
  return pool.includes(normalized)
}

/** Normalizza un numero IT per wa.me / tel:. */
export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function toTelHref(phone: string): string | null {
  const digits = normalizePhoneDigits(phone)
  if (digits.length < 8) return null
  return `tel:+${digits.startsWith('39') ? digits : `39${digits.replace(/^0/, '')}`}`
}

export function toWhatsAppUrl(phone: string): string | null {
  const digits = normalizePhoneDigits(phone)
  if (digits.length < 8) return null
  const withCountry = digits.startsWith('39') ? digits : `39${digits.replace(/^0/, '')}`
  return `https://wa.me/${withCountry}`
}

export function formatPhoneDisplay(phone: string): string {
  const trimmed = phone.trim()
  return trimmed || ''
}
