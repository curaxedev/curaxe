/**
 * Admin support tickets — mock / Laravel.
 */
import type { AdminTicket } from './adminTicketTypes'
import { AdminTicketError } from './adminTicketTypes'
import {
  closeAdminTicket,
  fetchAdminTicketDetail,
  fetchAdminTickets,
  takeAdminTicketCharge,
  ADMIN_TICKET_PRIORITY_LABELS,
  ADMIN_TICKET_STATUS_LABELS,
  formatAdminTicketDate,
  formatAdminTicketDateTime,
} from '../services/adminTicketService'
import { HttpError, httpGet, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type {
  AdminTicket,
  AdminTicketMessage,
  AdminTicketMessageAuthor,
  AdminTicketPriority,
  AdminTicketStatus,
} from './adminTicketTypes'
export { AdminTicketError } from './adminTicketTypes'
export {
  ADMIN_TICKET_PRIORITY_LABELS,
  ADMIN_TICKET_STATUS_LABELS,
  formatAdminTicketDate,
  formatAdminTicketDateTime,
}

function toError(err: unknown, fallback: string): AdminTicketError {
  if (err instanceof HttpError) {
    if (err.kind === 'not_found') return new AdminTicketError('not_found', err.message)
    return new AdminTicketError('server', err.message || fallback)
  }
  return new AdminTicketError('server', fallback)
}

export async function getAdminTickets(actorEmail?: string): Promise<AdminTicket[]> {
  if (isMockApiEnabled()) return fetchAdminTickets(actorEmail)
  try {
    return await httpGet<AdminTicket[]>('/api/v1/admin/tickets')
  } catch (err) {
    throw toError(err, 'Impossibile caricare i ticket.')
  }
}

export async function getAdminTicketDetail(
  ticketId: string,
  actorEmail?: string,
): Promise<AdminTicket> {
  if (isMockApiEnabled()) return fetchAdminTicketDetail(ticketId, actorEmail)
  try {
    return await httpGet<AdminTicket>(`/api/v1/admin/tickets/${ticketId}`)
  } catch (err) {
    throw toError(err, 'Impossibile caricare il ticket.')
  }
}

export async function postAdminTicketTake(
  ticketId: string,
  assigneeEmail: string,
  actorEmail?: string,
): Promise<AdminTicket> {
  if (isMockApiEnabled()) return takeAdminTicketCharge(ticketId, assigneeEmail, actorEmail)
  try {
    return await httpPost<AdminTicket>(`/api/v1/admin/tickets/${ticketId}/take`)
  } catch (err) {
    throw toError(err, 'Presa in carico non riuscita.')
  }
}

export async function postAdminTicketClose(
  ticketId: string,
  actorEmail?: string,
): Promise<AdminTicket> {
  if (isMockApiEnabled()) return closeAdminTicket(ticketId, actorEmail)
  try {
    return await httpPost<AdminTicket>(`/api/v1/admin/tickets/${ticketId}/close`)
  } catch (err) {
    throw toError(err, 'Chiusura ticket non riuscita.')
  }
}
