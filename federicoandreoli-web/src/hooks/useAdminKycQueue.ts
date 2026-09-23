import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  getAdminKycPending,
  postAdminKycApprove,
  postAdminKycReject,
} from '../lib/adminKycApi'
import type { AdminKycQueueItem, AdminKycRejectInput } from '../lib/adminKycTypes'
import { AdminKycError } from '../lib/adminKycTypes'

function kycErrorMessage(err: unknown): string {
  if (err instanceof AdminKycError) return err.message
  return 'Impossibile caricare la coda di verifica. Riprova.'
}

export function useAdminKycQueue() {
  const { user } = useAuth()
  const actorEmail = user?.email

  const [pending, setPending] = useState<AdminKycQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [documentsTarget, setDocumentsTarget] = useState<AdminKycQueueItem | null>(null)
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
      const items = await getAdminKycPending(actorEmail)
      setPending(items)
    } catch (err) {
      setError(kycErrorMessage(err))
      setPending([])
    } finally {
      setLoading(false)
    }
  }, [actorEmail])

  useEffect(() => {
    void reload()
  }, [reload])

  const approve = useCallback(
    async (verificationId: string): Promise<boolean> => {
      setActionLoadingId(verificationId)
      setActionError(null)
      const previous = pending
      setPending((items) => items.filter((p) => p.id !== verificationId))

      try {
        const item = await postAdminKycApprove(verificationId, actorEmail)
        showToast(`Profilo di ${item.name} approvato.`)
        return true
      } catch (err) {
        setPending(previous)
        setActionError(kycErrorMessage(err))
        return false
      } finally {
        setActionLoadingId(null)
      }
    },
    [actorEmail, pending, showToast],
  )

  const openReject = useCallback((verificationId: string) => {
    setRejectTargetId(verificationId)
    setRejectReason('')
    setActionError(null)
  }, [])

  const closeReject = useCallback(() => {
    setRejectTargetId(null)
    setRejectReason('')
    setActionError(null)
  }, [])

  const confirmReject = useCallback(async (): Promise<boolean> => {
    if (!rejectTargetId) return false

    setActionLoadingId(rejectTargetId)
    setActionError(null)
    const input: AdminKycRejectInput = { reason: rejectReason }
    const previous = pending

    try {
      const item = await postAdminKycReject(rejectTargetId, input, actorEmail)
      setPending((items) => items.filter((p) => p.id !== rejectTargetId))
      closeReject()
      showToast(`Verifica di ${item.name} rifiutata.`)
      return true
    } catch (err) {
      if (err instanceof AdminKycError && err.code === 'validation') {
        setActionError(err.message)
      } else {
        setPending(previous)
        setActionError(kycErrorMessage(err))
      }
      return false
    } finally {
      setActionLoadingId(null)
    }
  }, [actorEmail, closeReject, pending, rejectReason, rejectTargetId, showToast])

  const openDocuments = useCallback((item: AdminKycQueueItem) => {
    setDocumentsTarget(item)
  }, [])

  const closeDocuments = useCallback(() => {
    setDocumentsTarget(null)
  }, [])

  const clearActionError = useCallback(() => {
    setActionError(null)
  }, [])

  return {
    pending,
    loading,
    error,
    actionError,
    actionLoadingId,
    rejectTargetId,
    rejectReason,
    setRejectReason,
    documentsTarget,
    toast,
    reload,
    approve,
    openReject,
    closeReject,
    confirmReject,
    openDocuments,
    closeDocuments,
    clearActionError,
  }
}
