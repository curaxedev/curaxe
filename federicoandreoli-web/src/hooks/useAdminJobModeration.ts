import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  getAdminJobModerationPending,
  postAdminJobModerationApprove,
  postAdminJobModerationReject,
} from '../lib/adminJobModerationApi'
import type {
  AdminJobModerationQueueItem,
  AdminJobModerationRejectInput,
} from '../lib/adminJobModerationTypes'
import { AdminJobModerationError } from '../lib/adminJobModerationTypes'

function moderationErrorMessage(err: unknown): string {
  if (err instanceof AdminJobModerationError) return err.message
  return 'Impossibile caricare la coda di moderazione. Riprova.'
}

export function useAdminJobModeration() {
  const { user } = useAuth()
  const actorEmail = user?.email

  const [pending, setPending] = useState<AdminJobModerationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AdminJobModerationQueueItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await getAdminJobModerationPending(actorEmail)
      setPending(items)
    } catch (err) {
      setError(moderationErrorMessage(err))
      setPending([])
    } finally {
      setLoading(false)
    }
  }, [actorEmail])

  useEffect(() => {
    void reload()
  }, [reload])

  const approve = useCallback(
    async (item: AdminJobModerationQueueItem): Promise<boolean> => {
      setActionLoadingId(item.id)
      setActionError(null)
      const previous = pending
      setPending((items) => items.filter((p) => p.id !== item.id))

      try {
        await postAdminJobModerationApprove(item, actorEmail)
        showToast(`Annuncio «${item.title}» approvato e pubblicato.`)
        return true
      } catch (err) {
        setPending(previous)
        setActionError(moderationErrorMessage(err))
        return false
      } finally {
        setActionLoadingId(null)
      }
    },
    [actorEmail, pending, showToast],
  )

  const openReject = useCallback((item: AdminJobModerationQueueItem) => {
    setRejectTarget(item)
    setRejectReason('')
    setActionError(null)
  }, [])

  const closeReject = useCallback(() => {
    setRejectTarget(null)
    setRejectReason('')
    setActionError(null)
  }, [])

  const confirmReject = useCallback(async (): Promise<boolean> => {
    if (!rejectTarget) return false

    setActionLoadingId(rejectTarget.id)
    setActionError(null)
    const input: AdminJobModerationRejectInput = { reason: rejectReason }
    const previous = pending

    try {
      await postAdminJobModerationReject(rejectTarget, input, actorEmail)
      setPending((items) => items.filter((p) => p.id !== rejectTarget.id))
      closeReject()
      showToast(`Annuncio «${rejectTarget.title}» rifiutato.`)
      return true
    } catch (err) {
      if (err instanceof AdminJobModerationError && err.code === 'validation') {
        setActionError(err.message)
      } else {
        setPending(previous)
        setActionError(moderationErrorMessage(err))
      }
      return false
    } finally {
      setActionLoadingId(null)
    }
  }, [actorEmail, closeReject, pending, rejectReason, rejectTarget, showToast])

  const clearActionError = useCallback(() => {
    setActionError(null)
  }, [])

  return {
    pending,
    loading,
    error,
    actionError,
    actionLoadingId,
    rejectTarget,
    rejectReason,
    setRejectReason,
    toast,
    reload,
    approve,
    openReject,
    closeReject,
    confirmReject,
    clearActionError,
  }
}
