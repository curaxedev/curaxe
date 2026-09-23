import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  getFamilyRequests,
  postFamilyRequest,
  updateFamilyApplicationStatus,
  updateFamilyRequestStatus,
} from '../lib/familyRequestApi'
import type {
  FamilyApplication,
  FamilyCandidateStatus,
  FamilyRequest,
  FamilyRequestCreateInput,
  FamilyRequestFieldErrors,
  FamilyRequestStatus,
} from '../lib/familyRequestTypes'
import { FamilyRequestError } from '../lib/familyRequestTypes'

function requestErrorMessage(err: unknown): string {
  if (err instanceof FamilyRequestError) return err.message
  return 'Impossibile caricare le richieste. Riprova.'
}

export function useFamilyRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<FamilyRequest[]>([])
  const [applications, setApplications] = useState<FamilyApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FamilyRequestFieldErrors>({})
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user?.id) {
      setRequests([])
      setApplications([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const store = await getFamilyRequests(user.id)
      setRequests(store.requests)
      setApplications(store.applications)
    } catch (err) {
      setError(requestErrorMessage(err))
      setRequests([])
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void reload()
  }, [reload])

  const createRequest = useCallback(
    async (
      input: FamilyRequestCreateInput,
      options?: { asDraft?: boolean },
    ): Promise<FamilyRequest | null> => {
      if (!user?.id) {
        setSubmitError('Sessione non valida.')
        return null
      }

      setSubmitting(true)
      setSubmitError(null)
      setFieldErrors({})

      try {
        const created = await postFamilyRequest(user.id, input, options)
        setRequests((prev) => [created, ...prev])
        return created
      } catch (err) {
        if (err instanceof FamilyRequestError) {
          setSubmitError(err.message)
          if (err.fieldErrors) {
            setFieldErrors(err.fieldErrors)
          }
        } else {
          setSubmitError(requestErrorMessage(err))
        }
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [user?.id],
  )

  const updateRequestStatus = useCallback(
    async (requestId: string, status: FamilyRequestStatus): Promise<boolean> => {
      if (!user?.id) return false

      setStatusUpdatingId(requestId)
      const previous = requests
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status } : r)),
      )

      try {
        const updated = await updateFamilyRequestStatus(user.id, requestId, status)
        setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)))
        return true
      } catch (err) {
        setRequests(previous)
        setSubmitError(requestErrorMessage(err))
        return false
      } finally {
        setStatusUpdatingId(null)
      }
    },
    [requests, user?.id],
  )

  const updateApplicationStatus = useCallback(
    async (applicationId: string, status: FamilyCandidateStatus): Promise<boolean> => {
      if (!user?.id) return false

      const previous = applications
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status } : a)),
      )

      try {
        const updated = await updateFamilyApplicationStatus(user.id, applicationId, status)
        setApplications((prev) =>
          prev.map((a) => (a.id === applicationId ? updated : a)),
        )
        return true
      } catch (err) {
        setApplications(previous)
        setSubmitError(requestErrorMessage(err))
        return false
      }
    },
    [applications, user?.id],
  )

  const activeRequests = useMemo(
    () => requests.filter((r) => r.status === 'active'),
    [requests],
  )

  const activeRequest = activeRequests[0] ?? null

  const applicationsForActiveRequests = useMemo(() => {
    const activeIds = new Set(activeRequests.map((r) => r.id))
    return applications.filter((a) => activeIds.has(a.requestId))
  }, [activeRequests, applications])

  const stats = useMemo(
    () => ({
      publishedCount: requests.filter((r) => r.status !== 'draft').length,
      applicationCount: applications.length,
      activeCount: activeRequests.length,
    }),
    [activeRequests.length, applications.length, requests],
  )

  const clearSubmitFeedback = useCallback(() => {
    setSubmitError(null)
    setFieldErrors({})
  }, [])

  return {
    requests,
    applications,
    applicationsForActiveRequests,
    activeRequest,
    activeRequests,
    stats,
    loading,
    error,
    submitting,
    submitError,
    fieldErrors,
    statusUpdatingId,
    reload,
    createRequest,
    updateRequestStatus,
    updateApplicationStatus,
    clearSubmitFeedback,
  }
}
