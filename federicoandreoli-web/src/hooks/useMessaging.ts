import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  getMessages,
  getThreads,
  markThreadRead,
  MESSAGING_POLL_INTERVAL_MS,
  sendMessage as sendMessageApi,
} from '../lib/messagingApi'
import type { Message, MessageThread } from '../lib/messagingTypes'
import { MessagingError, messagingRoleFromUserRole } from '../lib/messagingTypes'

function messagingErrorMessage(err: unknown): string {
  if (err instanceof MessagingError) return err.message
  return 'Impossibile caricare i messaggi. Riprova.'
}

type UseMessagingOptions = {
  pollIntervalMs?: number
  enabled?: boolean
  initialThreadId?: string | null
}

export function useMessaging(options?: UseMessagingOptions) {
  const pollIntervalMs = options?.pollIntervalMs ?? MESSAGING_POLL_INTERVAL_MS
  const enabled = options?.enabled ?? true
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const userName = user?.name ?? ''
  const participantRole = messagingRoleFromUserRole(user?.role)

  const [threads, setThreads] = useState<MessageThread[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(options?.initialThreadId ?? null)
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const reloadThreads = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!enabled || !userId || !participantRole) {
        setThreads([])
        setLoading(false)
        setError(null)
        return
      }

      if (!opts?.silent) {
        setLoading(true)
        setError(null)
      }

      try {
        const rows = await getThreads(userId)
        setThreads(rows)
        if (!opts?.silent) setError(null)
      } catch (err) {
        setError(messagingErrorMessage(err))
        if (!opts?.silent) setThreads([])
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [enabled, participantRole, userId],
  )

  const loadMessages = useCallback(
    async (threadId: string, opts?: { silent?: boolean }) => {
      if (!userId) return

      if (!opts?.silent) {
        setMessagesLoading(true)
        setMessagesError(null)
      }

      try {
        const rows = await getMessages(userId, threadId)
        setMessages(rows)
        await markThreadRead(userId, threadId)
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, unreadByUserId: { ...t.unreadByUserId, [userId]: 0 } } : t,
          ),
        )
      } catch (err) {
        setMessagesError(messagingErrorMessage(err))
        if (!opts?.silent) setMessages([])
      } finally {
        if (!opts?.silent) setMessagesLoading(false)
      }
    },
    [userId],
  )

  useEffect(() => {
    void reloadThreads()
  }, [reloadThreads])

  useEffect(() => {
    if (!enabled || !userId || !participantRole) return undefined

    const id = window.setInterval(() => {
      void reloadThreads({ silent: true })
      if (selectedThreadId) {
        void loadMessages(selectedThreadId, { silent: true })
      }
    }, pollIntervalMs)

    return () => window.clearInterval(id)
  }, [enabled, loadMessages, participantRole, pollIntervalMs, reloadThreads, selectedThreadId, userId])

  useEffect(() => {
    if (options?.initialThreadId) {
      setSelectedThreadId(options.initialThreadId)
    }
  }, [options?.initialThreadId])

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([])
      setMessagesError(null)
      return
    }
    void loadMessages(selectedThreadId)
  }, [loadMessages, selectedThreadId])

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  )

  const unreadCount = useMemo(
    () => threads.reduce((sum, t) => sum + (t.unreadByUserId[userId] ?? 0), 0),
    [threads, userId],
  )

  const selectThread = useCallback((threadId: string | null) => {
    setSelectedThreadId(threadId)
  }, [])

  const sendMessage = useCallback(
    async (body: string): Promise<boolean> => {
      if (!userId || !selectedThreadId) return false

      const trimmed = body.trim()
      if (!trimmed) return false

      setSending(true)
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        threadId: selectedThreadId,
        senderId: userId,
        senderName: userName,
        body: trimmed,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimistic])

      try {
        const created = await sendMessageApi(userId, userName, selectedThreadId, { body: trimmed })
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? created : m)))
        await reloadThreads({ silent: true })
        return true
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        setMessagesError(messagingErrorMessage(err))
        return false
      } finally {
        setSending(false)
      }
    },
    [reloadThreads, selectedThreadId, userId, userName],
  )

  return {
    participantRole,
    threads,
    messages,
    selectedThread,
    selectedThreadId,
    unreadCount,
    loading,
    messagesLoading,
    error,
    messagesError,
    sending,
    reloadThreads,
    loadMessages,
    selectThread,
    sendMessage,
  }
}
