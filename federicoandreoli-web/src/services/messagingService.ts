import type {
  ApplicationContactInput,
  DirectContactInput,
  Message,
  MessageThread,
  MessagingParticipantRole,
  MessagingStore,
  SendMessageInput,
} from '../lib/messagingTypes'
import { MessagingError } from '../lib/messagingTypes'
import { isAllowedMessageTemplate } from '../lib/messageTemplates'
import {
  getApplicationById,
  markApplicationContacted,
} from './applicationService'

const MOCK_DELAY_MS = 400
const STORAGE_KEY = 'fa:messaging:global'

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readStore(): MessagingStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { threads: [], messages: [] }
    return JSON.parse(raw) as MessagingStore
  } catch {
    return { threads: [], messages: [] }
  }
}

function writeStore(store: MessagingStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function seedStore(): MessagingStore {
  const threads: MessageThread[] = [
    {
      id: 'thread-app-1',
      participantIds: ['fam-1', 'prof-1'],
      participantNames: {
        'fam-1': 'Famiglia Bianchi',
        'prof-1': 'Maria Rossi',
      },
      participantRoles: {
        'fam-1': 'family',
        'prof-1': 'professional',
      },
      subject: 'Candidatura — Badante per nonna anziana a Milano',
      linkType: 'application',
      linkId: 'app-fam-1',
      linkLabel: 'Candidatura ricevuta',
      lastMessageAt: '2026-05-10T09:30:00.000Z',
      lastMessagePreview: 'Buongiorno, sono interessata alla posizione. Posso fare un colloquio questa settimana?',
      unreadByUserId: { 'fam-1': 0, 'prof-1': 1 },
      createdAt: '2026-05-09T14:00:00.000Z',
    },
    {
      id: 'thread-direct-1',
      participantIds: ['fam-1', 'prof-1'],
      participantNames: {
        'fam-1': 'Famiglia Bianchi',
        'prof-1': 'Maria Rossi',
      },
      participantRoles: {
        'fam-1': 'family',
        'prof-1': 'professional',
      },
      subject: 'Contatto diretto — Maria Rossi',
      linkType: 'direct_contact',
      linkId: 'prof-1',
      linkLabel: 'Profilo professionista',
      lastMessageAt: '2026-05-08T16:45:00.000Z',
      lastMessagePreview: 'Grazie per averci contattato. Quando preferite un primo colloquio telefonico?',
      unreadByUserId: { 'fam-1': 1, 'prof-1': 0 },
      createdAt: '2026-05-08T10:00:00.000Z',
    },
    {
      id: 'thread-b2b-1',
      participantIds: ['prof-4', 'struct-1'],
      participantNames: {
        'prof-4': 'Giulia Bianchi',
        'struct-1': 'RSA Villa Serena',
      },
      participantRoles: {
        'prof-4': 'professional',
        'struct-1': 'structure',
      },
      subject: 'OSS turno mattina — Reparto Alzheimer',
      linkType: 'application',
      linkId: 'app-jp-4',
      linkLabel: 'Candidatura annuncio B2B',
      lastMessageAt: '2026-05-07T11:20:00.000Z',
      lastMessagePreview: 'Buongiorno, abbiamo ricevuto la sua candidatura. Può presentarsi martedì alle 10:00?',
      unreadByUserId: { 'prof-4': 1, 'struct-1': 0 },
      createdAt: '2026-05-06T08:00:00.000Z',
    },
    {
      id: 'thread-b2b-agency-1',
      participantIds: ['agency-1', 'prof-1'],
      participantNames: {
        'agency-1': 'AuraCare Srl',
        'prof-1': 'Maria Rossi',
      },
      participantRoles: {
        'agency-1': 'agency',
        'prof-1': 'professional',
      },
      subject: 'Badante convivente — Milano zona sud',
      linkType: 'application',
      linkId: 'app-jp-1',
      linkLabel: 'Candidatura annuncio B2B',
      lastMessageAt: '2026-05-08T14:30:00.000Z',
      lastMessagePreview: 'Grazie per la candidatura. Possiamo fissare un colloquio telefonico giovedì?',
      unreadByUserId: { 'agency-1': 0, 'prof-1': 1 },
      createdAt: '2026-05-07T09:00:00.000Z',
    },
  ]

  const messages: Message[] = [
    {
      id: 'msg-1',
      threadId: 'thread-app-1',
      senderId: 'prof-1',
      senderName: 'Maria Rossi',
      body: 'Buongiorno, ho visto la vostra richiesta per badante a Milano. Ho 6 anni di esperienza con anziani non autosufficienti.',
      createdAt: '2026-05-09T14:00:00.000Z',
    },
    {
      id: 'msg-2',
      threadId: 'thread-app-1',
      senderId: 'fam-1',
      senderName: 'Famiglia Bianchi',
      body: 'Grazie Maria! Potreste inviarci un riepilogo della vostra disponibilità?',
      createdAt: '2026-05-10T08:15:00.000Z',
    },
    {
      id: 'msg-3',
      threadId: 'thread-app-1',
      senderId: 'prof-1',
      senderName: 'Maria Rossi',
      body: 'Buongiorno, sono interessata alla posizione. Posso fare un colloquio questa settimana?',
      createdAt: '2026-05-10T09:30:00.000Z',
    },
    {
      id: 'msg-4',
      threadId: 'thread-direct-1',
      senderId: 'fam-1',
      senderName: 'Famiglia Bianchi',
      body: 'Buongiorno, cerchiamo assistenza per mia madre. Sarebbe disponibile da giugno?',
      createdAt: '2026-05-08T10:00:00.000Z',
    },
    {
      id: 'msg-5',
      threadId: 'thread-direct-1',
      senderId: 'prof-1',
      senderName: 'Maria Rossi',
      body: 'Grazie per averci contattato. Quando preferite un primo colloquio telefonico?',
      createdAt: '2026-05-08T16:45:00.000Z',
    },
    {
      id: 'msg-6',
      threadId: 'thread-b2b-1',
      senderId: 'prof-4',
      senderName: 'Giulia Bianchi',
      body: 'Buongiorno, invio candidatura per il turno mattina. Ho certificazione OSS e esperienza in geriatria.',
      createdAt: '2026-05-06T08:00:00.000Z',
    },
    {
      id: 'msg-7',
      threadId: 'thread-b2b-1',
      senderId: 'struct-1',
      senderName: 'RSA Villa Serena',
      body: 'Buongiorno, abbiamo ricevuto la sua candidatura. Può presentarsi martedì alle 10:00?',
      createdAt: '2026-05-07T11:20:00.000Z',
    },
    {
      id: 'msg-8',
      threadId: 'thread-b2b-agency-1',
      senderId: 'prof-1',
      senderName: 'Maria Rossi',
      body: 'Buongiorno, sono interessata alla posizione di badante convivente. Ho referenze verificabili.',
      createdAt: '2026-05-07T09:00:00.000Z',
    },
    {
      id: 'msg-9',
      threadId: 'thread-b2b-agency-1',
      senderId: 'agency-1',
      senderName: 'AuraCare Srl',
      body: 'Grazie per la candidatura. Possiamo fissare un colloquio telefonico giovedì?',
      createdAt: '2026-05-08T14:30:00.000Z',
    },
  ]

  const store = { threads, messages }
  writeStore(store)
  return store
}

function ensureStore(): MessagingStore {
  const store = readStore()
  if (store.threads.length === 0) {
    return seedStore()
  }
  return store
}

function threadsForUser(userId: string): MessageThread[] {
  const store = ensureStore()
  return store.threads
    .filter((t) => t.participantIds.includes(userId))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
}

function otherParticipant(thread: MessageThread, userId: string): { id: string; name: string; role: MessagingParticipantRole } | null {
  const otherId = thread.participantIds.find((id) => id !== userId)
  if (!otherId) return null
  return {
    id: otherId,
    name: thread.participantNames[otherId] ?? 'Utente',
    role: thread.participantRoles[otherId] ?? 'professional',
  }
}

export function loadThreads(userId: string): MessageThread[] {
  if (!userId) return []
  return threadsForUser(userId)
}

export async function fetchThreads(userId: string): Promise<MessageThread[]> {
  await delay()
  if (!userId) throw new MessagingError('not_found', 'Sessione non valida.')
  if (userId.toLowerCase().includes('server-error')) {
    throw new MessagingError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }
  return loadThreads(userId)
}

export async function fetchMessages(userId: string, threadId: string): Promise<Message[]> {
  await delay(200)
  if (!userId) throw new MessagingError('not_found', 'Sessione non valida.')

  const store = ensureStore()
  const thread = store.threads.find((t) => t.id === threadId)
  if (!thread || !thread.participantIds.includes(userId)) {
    throw new MessagingError('not_found', 'Conversazione non trovata.')
  }

  return store.messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function postMessage(
  userId: string,
  senderName: string,
  threadId: string,
  input: SendMessageInput,
): Promise<Message> {
  await delay(200)
  const body = input.body.trim()
  if (!body) throw new MessagingError('validation', 'Il messaggio non può essere vuoto.')
  if (!isAllowedMessageTemplate(body)) {
    throw new MessagingError('validation', 'Puoi inviare solo messaggi preimpostati dalla lista disponibile.')
  }
  if (!userId) throw new MessagingError('not_found', 'Sessione non valida.')

  const store = ensureStore()
  const threadIndex = store.threads.findIndex((t) => t.id === threadId)
  if (threadIndex === -1 || !store.threads[threadIndex].participantIds.includes(userId)) {
    throw new MessagingError('not_found', 'Conversazione non trovata.')
  }

  const message: Message = {
    id: newId('msg'),
    threadId,
    senderId: userId,
    senderName,
    body,
    createdAt: new Date().toISOString(),
  }

  const thread = { ...store.threads[threadIndex] }
  thread.lastMessageAt = message.createdAt
  thread.lastMessagePreview = body.length > 120 ? `${body.slice(0, 117)}…` : body

  const unread = { ...thread.unreadByUserId }
  for (const pid of thread.participantIds) {
    if (pid !== userId) {
      unread[pid] = (unread[pid] ?? 0) + 1
    } else {
      unread[pid] = 0
    }
  }
  thread.unreadByUserId = unread

  const nextThreads = [...store.threads]
  nextThreads[threadIndex] = thread

  writeStore({
    threads: nextThreads,
    messages: [...store.messages, message],
  })

  return message
}

export async function patchThreadRead(userId: string, threadId: string): Promise<MessageThread> {
  await delay(150)
  if (!userId) throw new MessagingError('not_found', 'Sessione non valida.')

  const store = ensureStore()
  const index = store.threads.findIndex((t) => t.id === threadId)
  if (index === -1 || !store.threads[index].participantIds.includes(userId)) {
    throw new MessagingError('not_found', 'Conversazione non trovata.')
  }

  const thread = { ...store.threads[index] }
  thread.unreadByUserId = { ...thread.unreadByUserId, [userId]: 0 }

  const nextThreads = [...store.threads]
  nextThreads[index] = thread
  writeStore({ ...store, threads: nextThreads })

  return thread
}

export async function getOrCreateDirectContactThread(
  familyUserId: string,
  familyName: string,
  input: DirectContactInput,
): Promise<MessageThread> {
  await delay(300)
  if (!familyUserId) throw new MessagingError('not_found', 'Sessione non valida.')
  if (!input.professionalId.trim()) {
    throw new MessagingError('validation', 'Profilo professionista non valido.')
  }

  const store = ensureStore()
  const existing = store.threads.find(
    (t) =>
      t.linkType === 'direct_contact' &&
      t.linkId === input.professionalId &&
      t.participantIds.includes(familyUserId) &&
      t.participantIds.includes(input.professionalId),
  )
  if (existing) {
    // Una sola richiesta di contatto: riapri la conversazione esistente senza duplicare il messaggio.
    return existing
  }

  const threadId = newId('thread-direct')
  const now = new Date().toISOString()
  const thread: MessageThread = {
    id: threadId,
    participantIds: [familyUserId, input.professionalId],
    participantNames: {
      [familyUserId]: familyName,
      [input.professionalId]: input.professionalName,
    },
    participantRoles: {
      [familyUserId]: 'family',
      [input.professionalId]: 'professional',
    },
    subject: `Contatto diretto — ${input.professionalName}`,
    linkType: 'direct_contact',
    linkId: input.professionalId,
    linkLabel: 'Profilo professionista',
    lastMessageAt: now,
    lastMessagePreview: input.initialMessage?.trim() ?? 'Nuova conversazione avviata',
    unreadByUserId: {
      [familyUserId]: 0,
      [input.professionalId]: input.initialMessage?.trim() ? 1 : 0,
    },
    createdAt: now,
  }

  const messages = [...store.messages]
  if (input.initialMessage?.trim()) {
    messages.push({
      id: newId('msg'),
      threadId,
      senderId: familyUserId,
      senderName: familyName,
      body: input.initialMessage.trim(),
      createdAt: now,
    })
    thread.lastMessagePreview =
      input.initialMessage.trim().length > 120
        ? `${input.initialMessage.trim().slice(0, 117)}…`
        : input.initialMessage.trim()
  }

  writeStore({
    threads: [...store.threads, thread],
    messages,
  })

  return thread
}

export async function getOrCreateApplicationThread(
  ownerUserId: string,
  ownerName: string,
  ownerRole: 'agency' | 'structure',
  input: ApplicationContactInput,
): Promise<MessageThread> {
  await delay(300)
  if (!ownerUserId) throw new MessagingError('not_found', 'Sessione non valida.')
  if (!input.applicationId.trim()) {
    throw new MessagingError('validation', 'Candidatura non valida.')
  }

  const application = getApplicationById(input.applicationId)
  if (
    !application ||
    application.ownerId !== ownerUserId ||
    application.targetType !== 'job_posting'
  ) {
    throw new MessagingError('not_found', 'Candidatura non trovata.')
  }

  await markApplicationContacted(ownerUserId, ownerRole, input.applicationId)

  const professionalId = application.applicantId
  const professionalName = application.applicantName
  const store = ensureStore()
  const existing = store.threads.find(
    (t) =>
      t.linkType === 'application' &&
      t.linkId === input.applicationId &&
      t.participantIds.includes(ownerUserId) &&
      t.participantIds.includes(professionalId),
  )
  if (existing) {
    return existing
  }

  const threadId = newId('thread-app')
  const now = new Date().toISOString()
  const thread: MessageThread = {
    id: threadId,
    participantIds: [ownerUserId, professionalId],
    participantNames: {
      [ownerUserId]: ownerName,
      [professionalId]: professionalName,
    },
    participantRoles: {
      [ownerUserId]: ownerRole,
      [professionalId]: 'professional',
    },
    subject: application.targetTitle,
    linkType: 'application',
    linkId: input.applicationId,
    linkLabel: 'Candidatura annuncio B2B',
    lastMessageAt: now,
    lastMessagePreview: input.initialMessage?.trim() ?? 'Conversazione avviata con il candidato',
    unreadByUserId: {
      [ownerUserId]: 0,
      [professionalId]: input.initialMessage?.trim() ? 1 : 0,
    },
    createdAt: now,
  }

  const messages = [...store.messages]
  if (input.initialMessage?.trim()) {
    messages.push({
      id: newId('msg'),
      threadId,
      senderId: ownerUserId,
      senderName: ownerName,
      body: input.initialMessage.trim(),
      createdAt: now,
    })
    thread.lastMessagePreview =
      input.initialMessage.trim().length > 120
        ? `${input.initialMessage.trim().slice(0, 117)}…`
        : input.initialMessage.trim()
  }

  writeStore({
    threads: [...store.threads, thread],
    messages,
  })

  return thread
}

export function formatMessageTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (sameDay) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function threadCounterparty(
  thread: MessageThread,
  userId: string,
): { id: string; name: string; role: MessagingParticipantRole } | null {
  return otherParticipant(thread, userId)
}

export type { Message, MessageThread, MessagingParticipantRole }
