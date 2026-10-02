import type {
  AdminTicket,
  AdminTicketMessage,
  AdminTicketPriority,
  AdminTicketStatus,
  AdminTicketStore,
} from '../lib/adminTicketTypes'
import { AdminTicketError } from '../lib/adminTicketTypes'

const MOCK_DELAY_MS = 300
const TICKETS_STORAGE_KEY = 'fa:admin-tickets'

export const ADMIN_TICKET_STATUS_LABELS: Record<AdminTicketStatus, string> = {
  open: 'Aperto',
  'in-progress': 'In gestione',
  closed: 'Chiuso',
}

export const ADMIN_TICKET_PRIORITY_LABELS: Record<AdminTicketPriority, string> = {
  urgent: 'Urgente',
  normal: 'Normale',
  low: 'Bassa',
}

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readStore(): AdminTicketStore | null {
  try {
    const raw = localStorage.getItem(TICKETS_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AdminTicketStore
  } catch {
    return null
  }
}

function writeStore(store: AdminTicketStore): void {
  localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(store))
}

function seedMessage(
  id: string,
  author: AdminTicketMessage['author'],
  authorName: string,
  body: string,
  sentAt: string,
): AdminTicketMessage {
  return { id, author, authorName, body, sentAt }
}

function createSeedStore(): AdminTicketStore {
  const tickets: AdminTicket[] = [
    {
      id: 'T-001',
      userName: 'Famiglia Bianchi',
      category: 'Profilo non trovato',
      openedAt: '2026-05-10T09:15:00.000Z',
      priority: 'urgent',
      status: 'open',
      messages: [
        seedMessage(
          'm-001-1',
          'user',
          'Famiglia Bianchi',
          'Non riesco a visualizzare il profilo della badante che abbiamo contattato ieri.',
          '2026-05-10T09:15:00.000Z',
        ),
      ],
    },
    {
      id: 'T-002',
      userName: 'Maria Rossi',
      category: 'Problema pagamento',
      openedAt: '2026-05-09T14:20:00.000Z',
      priority: 'urgent',
      status: 'in-progress',
      assignedTo: 'admin@curaxe.it',
      messages: [
        seedMessage(
          'm-002-1',
          'user',
          'Maria Rossi',
          'Il rinnovo Premium è stato addebitato due volte questo mese.',
          '2026-05-09T14:20:00.000Z',
        ),
        seedMessage(
          'm-002-2',
          'admin',
          'Supporto Curaxe',
          'Buongiorno Maria, stiamo verificando con il provider di pagamento. Ti aggiorniamo entro 24 ore.',
          '2026-05-09T16:45:00.000Z',
        ),
      ],
    },
    {
      id: 'T-003',
      userName: 'Florentina Pop',
      category: 'Segnalazione utente',
      openedAt: '2026-05-07T11:00:00.000Z',
      priority: 'normal',
      status: 'open',
      messages: [
        seedMessage(
          'm-003-1',
          'user',
          'Florentina Pop',
          'Ho ricevuto messaggi inappropriati da un account famiglia. Allego screenshot (mock).',
          '2026-05-07T11:00:00.000Z',
        ),
      ],
    },
    {
      id: 'T-004',
      userName: 'AuraCare Srl',
      category: 'Richiesta fattura',
      openedAt: '2026-05-05T08:30:00.000Z',
      priority: 'low',
      status: 'open',
      messages: [
        seedMessage(
          'm-004-1',
          'user',
          'AuraCare Srl',
          'Potete inviare la fattura dell\'abbonamento B2B Premium di aprile?',
          '2026-05-05T08:30:00.000Z',
        ),
      ],
    },
    {
      id: 'T-005',
      userName: 'Luciana Toma',
      category: 'Account bloccato',
      openedAt: '2026-05-03T17:00:00.000Z',
      priority: 'urgent',
      status: 'closed',
      assignedTo: 'admin@curaxe.it',
      messages: [
        seedMessage(
          'm-005-1',
          'user',
          'Luciana Toma',
          'Il mio account risulta bloccato dopo l\'upload dei documenti KYC.',
          '2026-05-03T17:00:00.000Z',
        ),
        seedMessage(
          'm-005-2',
          'admin',
          'Supporto Curaxe',
          'Account riattivato. La verifica documenti è in corso.',
          '2026-05-04T10:00:00.000Z',
        ),
        seedMessage(
          'm-005-3',
          'system',
          'Sistema',
          'Ticket chiuso dall\'amministratore.',
          '2026-05-04T10:05:00.000Z',
        ),
      ],
    },
  ]

  return { tickets }
}

export function loadAdminTicketStore(): AdminTicketStore {
  const stored = readStore()
  if (stored) return stored
  const seed = createSeedStore()
  writeStore(seed)
  return seed
}

function shouldSimulateServerError(actorEmail?: string): boolean {
  return Boolean(actorEmail?.toLowerCase().includes('server-error'))
}

export function formatAdminTicketDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatAdminTicketDateTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function fetchAdminTickets(actorEmail?: string): Promise<AdminTicket[]> {
  await delay()
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminTicketError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }
  return loadAdminTicketStore().tickets
}

export async function fetchAdminTicketDetail(
  ticketId: string,
  actorEmail?: string,
): Promise<AdminTicket> {
  await delay(200)
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminTicketError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const ticket = loadAdminTicketStore().tickets.find((t) => t.id === ticketId)
  if (!ticket) {
    throw new AdminTicketError('not_found', 'Ticket non trovato.')
  }
  return ticket
}

export async function takeAdminTicketCharge(
  ticketId: string,
  assigneeEmail: string,
  actorEmail?: string,
): Promise<AdminTicket> {
  await delay(200)
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminTicketError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const store = loadAdminTicketStore()
  const ticket = store.tickets.find((t) => t.id === ticketId)
  if (!ticket) {
    throw new AdminTicketError('not_found', 'Ticket non trovato.')
  }
  if (ticket.status === 'closed') {
    throw new AdminTicketError('validation', 'Non è possibile prendere in carico un ticket chiuso.')
  }
  if (ticket.status === 'in-progress') {
    throw new AdminTicketError('validation', 'Il ticket è già in gestione.')
  }

  ticket.status = 'in-progress'
  ticket.assignedTo = assigneeEmail
  ticket.messages.push(
    seedMessage(
      `m-${ticketId}-take-${Date.now()}`,
      'system',
      'Sistema',
      `Ticket preso in carico da ${assigneeEmail}.`,
      new Date().toISOString(),
    ),
  )
  writeStore(store)
  return ticket
}

export async function closeAdminTicket(
  ticketId: string,
  actorEmail?: string,
): Promise<AdminTicket> {
  await delay(200)
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminTicketError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const store = loadAdminTicketStore()
  const ticket = store.tickets.find((t) => t.id === ticketId)
  if (!ticket) {
    throw new AdminTicketError('not_found', 'Ticket non trovato.')
  }
  if (ticket.status === 'closed') {
    throw new AdminTicketError('validation', 'Il ticket è già chiuso.')
  }

  ticket.status = 'closed'
  ticket.messages.push(
    seedMessage(
      `m-${ticketId}-close-${Date.now()}`,
      'system',
      'Sistema',
      'Ticket chiuso dall\'amministratore.',
      new Date().toISOString(),
    ),
  )
  writeStore(store)
  return ticket
}
