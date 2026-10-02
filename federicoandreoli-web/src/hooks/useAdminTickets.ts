import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  getAdminTicketDetail,
  getAdminTickets,
  postAdminTicketClose,
  postAdminTicketTake,
} from '../lib/adminTicketApi'
import type { AdminTicket } from '../lib/adminTicketTypes'
import { AdminTicketError } from '../lib/adminTicketTypes'

function ticketErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AdminTicketError) return err.message
  return fallback
}

export function useAdminTickets() {
  const { user } = useAuth()
  const actorEmail = user?.email
  const assigneeEmail = user?.email ?? 'admin@curaxe.it'

  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [threadTargetId, setThreadTargetId] = useState<string | null>(null)
  const [threadTicket, setThreadTicket] = useState<AdminTicket | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [])

  const updateTicketInList = useCallback((updated: AdminTicket) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setThreadTicket((prev) => (prev?.id === updated.id ? updated : prev))
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await getAdminTickets(actorEmail)
      setTickets(items)
    } catch (err) {
      setError(ticketErrorMessage(err, 'Impossibile caricare i ticket. Riprova.'))
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [actorEmail])

  useEffect(() => {
    void reload()
  }, [reload])

  const openThread = useCallback(
    async (ticketId: string) => {
      setThreadTargetId(ticketId)
      setThreadLoading(true)
      setThreadError(null)
      setThreadTicket(null)
      try {
        const detail = await getAdminTicketDetail(ticketId, actorEmail)
        setThreadTicket(detail)
      } catch (err) {
        setThreadError(ticketErrorMessage(err, 'Impossibile caricare la conversazione.'))
      } finally {
        setThreadLoading(false)
      }
    },
    [actorEmail],
  )

  const closeThread = useCallback(() => {
    setThreadTargetId(null)
    setThreadTicket(null)
    setThreadError(null)
  }, [])

  const takeCharge = useCallback(
    async (ticketId: string): Promise<boolean> => {
      setActionLoadingId(ticketId)
      setActionError(null)
      const previous = tickets.find((t) => t.id === ticketId)
      if (previous && previous.status === 'open') {
        updateTicketInList({ ...previous, status: 'in-progress', assignedTo: assigneeEmail })
      }

      try {
        const updated = await postAdminTicketTake(ticketId, assigneeEmail, actorEmail)
        updateTicketInList(updated)
        showToast(`Ticket ${updated.id} preso in carico.`)
        return true
      } catch (err) {
        if (previous) updateTicketInList(previous)
        setActionError(ticketErrorMessage(err, 'Impossibile prendere in carico il ticket.'))
        return false
      } finally {
        setActionLoadingId(null)
      }
    },
    [actorEmail, assigneeEmail, showToast, tickets, updateTicketInList],
  )

  const closeTicket = useCallback(
    async (ticketId: string): Promise<boolean> => {
      setActionLoadingId(ticketId)
      setActionError(null)
      const previous = tickets.find((t) => t.id === ticketId)
      if (previous && previous.status !== 'closed') {
        updateTicketInList({ ...previous, status: 'closed' })
      }

      try {
        const updated = await postAdminTicketClose(ticketId, actorEmail)
        updateTicketInList(updated)
        showToast(`Ticket ${updated.id} chiuso.`)
        return true
      } catch (err) {
        if (previous) updateTicketInList(previous)
        setActionError(ticketErrorMessage(err, 'Impossibile chiudere il ticket.'))
        return false
      } finally {
        setActionLoadingId(null)
      }
    },
    [actorEmail, showToast, tickets, updateTicketInList],
  )

  const clearActionError = useCallback(() => {
    setActionError(null)
  }, [])

  return {
    tickets,
    loading,
    error,
    actionError,
    actionLoadingId,
    toast,
    threadTargetId,
    threadTicket,
    threadLoading,
    threadError,
    reload,
    openThread,
    closeThread,
    takeCharge,
    closeTicket,
    clearActionError,
  }
}
