/** API-shaped messaging types — swap transport in `messagingApi.ts` when Laravel is ready. */

import type { UserRole } from '../auth/types'

export type MessagingParticipantRole = 'family' | 'professional' | 'agency' | 'structure'

export type MessageThreadLinkType = 'application' | 'direct_contact'

export type MessageThread = {
  id: string
  participantIds: string[]
  participantNames: Record<string, string>
  participantRoles: Record<string, MessagingParticipantRole>
  /** Telefoni Premium visibili in chat (userId → numero). */
  participantPhones?: Record<string, string>
  subject: string
  linkType: MessageThreadLinkType
  linkId: string | null
  linkLabel: string | null
  lastMessageAt: string
  lastMessagePreview: string
  unreadByUserId: Record<string, number>
  createdAt: string
}

export type Message = {
  id: string
  threadId: string
  senderId: string
  senderName: string
  body: string
  createdAt: string
}

export type MessagingStore = {
  threads: MessageThread[]
  messages: Message[]
}

export type SendMessageInput = {
  body: string
}

export type DirectContactInput = {
  professionalId: string
  professionalName: string
  initialMessage?: string
}

export type ApplicationContactInput = {
  applicationId: string
  initialMessage?: string
}

export type MessagingErrorCode = 'validation' | 'not_found' | 'server'

export class MessagingError extends Error {
  readonly code: MessagingErrorCode

  constructor(code: MessagingErrorCode, message: string) {
    super(message)
    this.name = 'MessagingError'
    this.code = code
  }
}

export function messagingRoleFromUserRole(role: UserRole | undefined): MessagingParticipantRole | null {
  switch (role) {
    case 'professional':
      return 'professional'
    case 'public_user':
      return 'family'
    case 'agency':
      return 'agency'
    case 'structure':
      return 'structure'
    default:
      return null
  }
}

export const MESSAGING_POLL_INTERVAL_MS = 30_000
