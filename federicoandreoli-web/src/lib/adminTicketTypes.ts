/** API-shaped admin support ticket types — swap transport in `adminTicketApi.ts` when Laravel is ready. */

export type AdminTicketStatus = 'open' | 'in-progress' | 'closed'

export type AdminTicketPriority = 'urgent' | 'normal' | 'low'

export type AdminTicketMessageAuthor = 'user' | 'admin' | 'system'

export type AdminTicketMessage = {
  id: string
  author: AdminTicketMessageAuthor
  authorName: string
  body: string
  sentAt: string
}

export type AdminTicket = {
  id: string
  userName: string
  category: string
  openedAt: string
  priority: AdminTicketPriority
  status: AdminTicketStatus
  assignedTo?: string
  messages: AdminTicketMessage[]
}

export type AdminTicketStore = {
  tickets: AdminTicket[]
}

export type AdminTicketErrorCode = 'not_found' | 'validation' | 'server'

export class AdminTicketError extends Error {
  readonly code: AdminTicketErrorCode

  constructor(code: AdminTicketErrorCode, message: string) {
    super(message)
    this.name = 'AdminTicketError'
    this.code = code
  }
}
