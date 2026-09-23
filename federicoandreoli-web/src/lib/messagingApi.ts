/**
 * Messaging API — doppio binario mock / Laravel.
 */
import type { ApplicationContactInput, DirectContactInput, SendMessageInput } from './messagingTypes'
import type { Message, MessageThread } from './messagingTypes'
import { MessagingError } from './messagingTypes'
import {
  fetchMessages,
  fetchThreads,
  getOrCreateApplicationThread,
  getOrCreateDirectContactThread,
  patchThreadRead,
  postMessage,
  formatMessageTime,
  threadCounterparty,
} from '../services/messagingService'
import { HttpError, httpGet, httpPatch, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type { Message, MessageThread, MessagingParticipantRole } from './messagingTypes'
export { MessagingError, MESSAGING_POLL_INTERVAL_MS } from './messagingTypes'
export { formatMessageTime, threadCounterparty }

function toMsgError(err: unknown, fallback: string): MessagingError {
  if (err instanceof HttpError) {
    if (err.kind === 'not_found') return new MessagingError('not_found', err.message)
    if (err.kind === 'validation') return new MessagingError('validation', err.message)
    return new MessagingError('server', err.message || fallback)
  }
  return new MessagingError('server', fallback)
}

export async function getThreads(userId: string): Promise<MessageThread[]> {
  if (isMockApiEnabled()) return fetchThreads(userId)
  try {
    return await httpGet<MessageThread[]>('/api/v1/messaging/threads')
  } catch (err) {
    throw toMsgError(err, 'Impossibile caricare i messaggi.')
  }
}

export async function getMessages(userId: string, threadId: string): Promise<Message[]> {
  if (isMockApiEnabled()) return fetchMessages(userId, threadId)
  try {
    return await httpGet<Message[]>(`/api/v1/messaging/threads/${threadId}/messages`)
  } catch (err) {
    throw toMsgError(err, 'Impossibile caricare la conversazione.')
  }
}

export async function sendMessage(
  userId: string,
  senderName: string,
  threadId: string,
  input: SendMessageInput,
): Promise<Message> {
  if (isMockApiEnabled()) return postMessage(userId, senderName, threadId, input)
  try {
    return await httpPost<Message>(`/api/v1/messaging/threads/${threadId}/messages`, { body: input })
  } catch (err) {
    throw toMsgError(err, 'Invio messaggio non riuscito.')
  }
}

export async function markThreadRead(userId: string, threadId: string): Promise<MessageThread> {
  if (isMockApiEnabled()) return patchThreadRead(userId, threadId)
  try {
    return await httpPatch<MessageThread>(`/api/v1/messaging/threads/${threadId}/read`)
  } catch (err) {
    throw toMsgError(err, 'Aggiornamento lettura non riuscito.')
  }
}

export async function openDirectContactThread(
  familyUserId: string,
  familyName: string,
  input: DirectContactInput,
): Promise<MessageThread> {
  if (isMockApiEnabled()) return getOrCreateDirectContactThread(familyUserId, familyName, input)
  try {
    return await httpPost<MessageThread>('/api/v1/messaging/threads/direct-contact', { body: input })
  } catch (err) {
    throw toMsgError(err, 'Apertura conversazione non riuscita.')
  }
}

export async function openApplicationContactThread(
  ownerUserId: string,
  ownerName: string,
  ownerRole: 'agency' | 'structure',
  input: ApplicationContactInput,
): Promise<MessageThread> {
  if (isMockApiEnabled()) {
    return getOrCreateApplicationThread(ownerUserId, ownerName, ownerRole, input)
  }
  try {
    return await httpPost<MessageThread>('/api/v1/messaging/threads/application-contact', {
      body: input,
    })
  } catch (err) {
    throw toMsgError(err, 'Apertura conversazione candidatura non riuscita.')
  }
}
