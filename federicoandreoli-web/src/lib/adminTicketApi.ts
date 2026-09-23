/**
 * Admin support tickets API client — mock implementation today; swap to fetch + Laravel when backend is ready.
 * GET   /api/v1/admin/tickets
 * GET   /api/v1/admin/tickets/:id
 * POST  /api/v1/admin/tickets/:id/take
 * POST  /api/v1/admin/tickets/:id/close
 */
import type { AdminTicket } from './adminTicketTypes'
import {
  closeAdminTicket,
  fetchAdminTicketDetail,
  fetchAdminTickets,
  takeAdminTicketCharge,
} from '../services/adminTicketService'

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
} from '../services/adminTicketService'

export async function getAdminTickets(actorEmail?: string): Promise<AdminTicket[]> {
  return fetchAdminTickets(actorEmail)
}

export async function getAdminTicketDetail(
  ticketId: string,
  actorEmail?: string,
): Promise<AdminTicket> {
  return fetchAdminTicketDetail(ticketId, actorEmail)
}

export async function postAdminTicketTake(
  ticketId: string,
  assigneeEmail: string,
  actorEmail?: string,
): Promise<AdminTicket> {
  return takeAdminTicketCharge(ticketId, assigneeEmail, actorEmail)
}

export async function postAdminTicketClose(
  ticketId: string,
  actorEmail?: string,
): Promise<AdminTicket> {
  return closeAdminTicket(ticketId, actorEmail)
}
