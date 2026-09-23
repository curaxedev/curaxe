import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import type { UserRole } from '../auth/types'
import {
  getJobPostings,
  patchJobPosting,
  postJobPosting,
  removeJobPosting,
  updateJobPostingStatus,
} from '../lib/jobPostingApi'
import type {
  JobPosting,
  JobPostingCreateInput,
  JobPostingFieldErrors,
  JobPostingOwnerType,
  JobPostingStatus,
  JobPostingUpdateInput,
} from '../lib/jobPostingTypes'
import { JobPostingError } from '../lib/jobPostingTypes'

function roleToOwnerType(role: UserRole | undefined): JobPostingOwnerType | null {
  if (role === 'agency') return 'agency'
  if (role === 'structure') return 'structure'
  return null
}

function postingErrorMessage(err: unknown): string {
  if (err instanceof JobPostingError) return err.message
  return 'Impossibile completare l\'operazione. Riprova.'
}

export function useJobPostings() {
  const { user } = useAuth()
  const ownerType = roleToOwnerType(user?.role)
  const ownerId = user?.id ?? ''

  const [postings, setPostings] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<JobPostingFieldErrors>({})
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!ownerId || !ownerType) {
      setPostings([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const rows = await getJobPostings(ownerId, ownerType)
      setPostings(rows)
    } catch (err) {
      setError(postingErrorMessage(err))
      setPostings([])
    } finally {
      setLoading(false)
    }
  }, [ownerId, ownerType])

  useEffect(() => {
    void reload()
  }, [reload])

  const createPosting = useCallback(
    async (input: JobPostingCreateInput): Promise<JobPosting | null> => {
      if (!ownerId || !ownerType) {
        setSubmitError('Sessione non valida.')
        return null
      }

      setSubmitting(true)
      setSubmitError(null)
      setFieldErrors({})

      try {
        const created = await postJobPosting(ownerId, ownerType, input)
        setPostings((prev) => [created, ...prev])
        return created
      } catch (err) {
        if (err instanceof JobPostingError) {
          setSubmitError(err.message)
          if (err.fieldErrors) setFieldErrors(err.fieldErrors)
        } else {
          setSubmitError(postingErrorMessage(err))
        }
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [ownerId, ownerType],
  )

  const updatePosting = useCallback(
    async (postingId: string, input: JobPostingUpdateInput): Promise<JobPosting | null> => {
      if (!ownerId || !ownerType) {
        setSubmitError('Sessione non valida.')
        return null
      }

      setSubmitting(true)
      setSubmitError(null)
      setFieldErrors({})

      try {
        const updated = await patchJobPosting(ownerId, ownerType, postingId, input)
        setPostings((prev) => prev.map((p) => (p.id === postingId ? updated : p)))
        return updated
      } catch (err) {
        if (err instanceof JobPostingError) {
          setSubmitError(err.message)
          if (err.fieldErrors) setFieldErrors(err.fieldErrors)
        } else {
          setSubmitError(postingErrorMessage(err))
        }
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [ownerId, ownerType],
  )

  const deletePosting = useCallback(
    async (postingId: string): Promise<boolean> => {
      if (!ownerId || !ownerType) return false

      setSubmitting(true)
      setSubmitError(null)
      const previous = postings
      setPostings((prev) => prev.filter((p) => p.id !== postingId))

      try {
        await removeJobPosting(ownerId, ownerType, postingId)
        return true
      } catch (err) {
        setPostings(previous)
        setSubmitError(postingErrorMessage(err))
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [ownerId, ownerType, postings],
  )

  const setPostingStatus = useCallback(
    async (postingId: string, status: JobPostingStatus): Promise<boolean> => {
      if (!ownerId || !ownerType) return false

      setStatusUpdatingId(postingId)
      const previous = postings
      setPostings((prev) =>
        prev.map((p) => (p.id === postingId ? { ...p, status } : p)),
      )

      try {
        const updated = await updateJobPostingStatus(ownerId, ownerType, postingId, status)
        setPostings((prev) => prev.map((p) => (p.id === postingId ? updated : p)))
        return true
      } catch (err) {
        setPostings(previous)
        setSubmitError(postingErrorMessage(err))
        return false
      } finally {
        setStatusUpdatingId(null)
      }
    },
    [ownerId, ownerType, postings],
  )

  const stats = useMemo(
    () => ({
      activeCount: postings.filter((p) => p.status === 'active').length,
      totalApplications: postings.reduce((sum, p) => sum + p.applicationCount, 0),
      publishedCount: postings.filter((p) => p.status !== 'draft').length,
    }),
    [postings],
  )

  const clearSubmitFeedback = useCallback(() => {
    setSubmitError(null)
    setFieldErrors({})
  }, [])

  return {
    ownerType,
    postings,
    stats,
    loading,
    error,
    submitting,
    submitError,
    fieldErrors,
    statusUpdatingId,
    reload,
    createPosting,
    updatePosting,
    deletePosting,
    setPostingStatus,
    clearSubmitFeedback,
  }
}
