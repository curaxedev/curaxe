import type { MessagingParticipantRole } from './messagingTypes'

export type MessageTemplateRole = 'family' | 'professional'

export type ModeratedMessageTemplate = {
  category: string
  body: string
}

/** Template famiglia → professionista (moderati). */
export const FAMILY_MESSAGE_TEMPLATES: readonly ModeratedMessageTemplate[] = [
  {
    category: 'Primo contatto',
    body: 'Buongiorno, sono interessato/a al suo profilo. Vorrei sapere se è disponibile nelle prossime settimane.',
  },
  {
    category: 'Primo contatto',
    body: 'Buongiorno, cerchiamo assistenza per un familiare. Può indicarmi disponibilità e tariffe?',
  },
  {
    category: 'Primo contatto',
    body: 'Buongiorno, abbiamo visto il suo profilo e vorremmo capire meglio esperienza e zona di lavoro.',
  },
  {
    category: 'Disponibilità',
    body: 'Buongiorno, la zona e gli orari ci sembrano adatti. È ancora disponibile?',
  },
  {
    category: 'Disponibilità',
    body: 'Buongiorno, cerchiamo una figura per assistenza diurna. Ha disponibilità nei giorni feriali?',
  },
  {
    category: 'Disponibilità',
    body: 'Buongiorno, potremmo avere bisogno anche di copertura nei weekend. È disponibile?',
  },
  {
    category: 'Colloquio',
    body: 'Grazie per la disponibilità. Possiamo fissare un primo colloquio telefonico?',
  },
  {
    category: 'Colloquio',
    body: 'Buongiorno, sarebbe disponibile per un breve incontro conoscitivo nei prossimi giorni?',
  },
  {
    category: 'Candidatura',
    body: 'Buongiorno, ho letto la sua candidatura. Quando sarebbe disponibile per un incontro?',
  },
  {
    category: 'Candidatura',
    body: 'Grazie del messaggio. Le farò sapere a breve dopo aver confrontato le candidature.',
  },
  {
    category: 'Follow-up',
    body: 'Buongiorno, ricontatto per sapere se ha ancora disponibilità per la nostra richiesta.',
  },
  {
    category: 'Follow-up',
    body: 'Grazie della risposta. Possiamo procedere con i dettagli su orari e mansioni?',
  },
  {
    category: 'Chiusura',
    body: 'Grazie, per ora non abbiamo bisogno. La ricontatteremo se la situazione cambia.',
  },
  {
    category: 'Chiusura',
    body: 'Grazie per la disponibilità. Abbiamo scelto un’altra candidatura, le auguriamo buon lavoro.',
  },
] as const

/** Template professionista / operatore → famiglia (moderati). */
export const PROFESSIONAL_MESSAGE_TEMPLATES: readonly ModeratedMessageTemplate[] = [
  {
    category: 'Disponibilità',
    body: 'Buongiorno, grazie per avermi contattato. Sono disponibile e posso condividere referenze.',
  },
  {
    category: 'Disponibilità',
    body: 'Buongiorno, ho visto la richiesta. Ho esperienza in questo tipo di assistenza: posso aiutarvi?',
  },
  {
    category: 'Disponibilità',
    body: 'Grazie del messaggio. Sono disponibile per un breve colloquio per capire meglio le esigenze.',
  },
  {
    category: 'Disponibilità',
    body: 'Buongiorno, sono disponibile nelle prossime settimane. Dimmi pure orari e zona preferiti.',
  },
  {
    category: 'Esperienza',
    body: 'Grazie per l’interesse. Posso condividere un riepilogo di esperienza e disponibilità.',
  },
  {
    category: 'Esperienza',
    body: 'Buongiorno, ho esperienza con assistenza a domicilio e supporto quotidiano. Posso rispondere alle vostre domande.',
  },
  {
    category: 'Esperienza',
    body: 'Buongiorno, lavoro da anni in questo ambito e posso fornire referenze recenti su richiesta.',
  },
  {
    category: 'Colloquio',
    body: 'Buongiorno, propongo un breve colloquio telefonico per capire meglio le esigenze.',
  },
  {
    category: 'Colloquio',
    body: 'Grazie, sono disponibile per un incontro conoscitivo. Indicatemi giorno e fascia oraria.',
  },
  {
    category: 'Conferma',
    body: 'Grazie, ho ricevuto la vostra richiesta. Posso iniziare dalla data indicata.',
  },
  {
    category: 'Conferma',
    body: 'Perfetto, confermo la disponibilità per gli orari discussi. Resto in attesa di indicazioni.',
  },
  {
    category: 'Non disponibile',
    body: 'Buongiorno, al momento non sono disponibile in quella zona o orario. Resto a disposizione per il futuro.',
  },
  {
    category: 'Non disponibile',
    body: 'Grazie del contatto. In questo periodo non posso accettare nuove richieste, ma vi ringrazio.',
  },
  {
    category: 'Follow-up',
    body: 'Buongiorno, ricontatto per sapere se avete ancora bisogno di assistenza e se posso esservi utile.',
  },
] as const

export const DEFAULT_FAMILY_CONTACT_MESSAGE = FAMILY_MESSAGE_TEMPLATES[0].body

function templatesForRoleRaw(
  role: MessagingParticipantRole | MessageTemplateRole,
): readonly ModeratedMessageTemplate[] {
  return role === 'family' ? FAMILY_MESSAGE_TEMPLATES : PROFESSIONAL_MESSAGE_TEMPLATES
}

export function templatesForRole(
  role: MessagingParticipantRole | MessageTemplateRole,
): readonly ModeratedMessageTemplate[] {
  return templatesForRoleRaw(role)
}

export function templateBodiesForRole(
  role: MessagingParticipantRole | MessageTemplateRole,
): readonly string[] {
  return templatesForRoleRaw(role).map((t) => t.body)
}

export function templateCategoriesForRole(
  role: MessagingParticipantRole | MessageTemplateRole,
): string[] {
  const seen = new Set<string>()
  for (const t of templatesForRoleRaw(role)) seen.add(t.category)
  return [...seen]
}

export function isAllowedMessageTemplate(
  body: string,
  role?: MessagingParticipantRole | MessageTemplateRole,
): boolean {
  const normalized = body.trim()
  if (!normalized) return false
  const pool = role
    ? templateBodiesForRole(role)
    : [...templateBodiesForRole('family'), ...templateBodiesForRole('professional')]
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
