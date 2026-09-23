import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import type { UserRole } from '../auth/types'
import type { FamilyCandidateStatus } from '../lib/familyRequestTypes'
import {
  getApplicationsByRole,
  postFamilyRequestApplication,
  postJobPostingApplication,
  updateApplicationStatus,
  updateFamilyApplicationStatus,
  withdrawJobApplication,
} from '../lib/applicationApi'
import type {
  Application,
  ApplicationActorRole,
  ApplicationApplyInput,
  ApplicationStatus,
} from '../lib/applicationTypes'
import {
  ApplicationError,
  B2B_RECEIVED_STATUS_LABELS,
  b2bStatusToApplicationStatus,
  familyStatusToApplicationStatus,
} from '../lib/applicationTypes'
import { toFamilyApplication as mapToFamilyApplication } from '../services/applicationService'

function roleToActor(role: UserRole | undefined): ApplicationActorRole | null {
  if (
    role === 'professional' ||
    role === 'agency' ||
    role === 'structure' ||
    role === 'public_user'
  ) {
    return role
  }
  return null
}

function applicationErrorMessage(err: unknown): string {
  if (err instanceof ApplicationError) return err.message
  return 'Impossibile completare l\'operazione. Riprova.'
}

export function useApplications() {
  const { user } = useAuth()
  const actorRole = roleToActor(user?.role)
  const userId = user?.id ?? ''

  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!userId || !actorRole) {
      setApplications([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const rows = await getApplicationsByRole(userId, actorRole)
      setApplications(rows)
    } catch (err) {
      setError(applicationErrorMessage(err))
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [actorRole, userId])

  useEffect(() => {
    void reload()
  }, [reload])

  const applyToPosting = useCallback(
    async (openPositionId: string, input?: ApplicationApplyInput): Promise<Application | null> => {
      if (!userId || actorRole !== 'professional') {
        setSubmitError('Accedi come professionista per candidarti.')
        return null
      }

      setSubmitting(true)
      setSubmitError(null)
      try {
        const created = await postJobPostingApplication(userId, openPositionId, input)
        setApplications((prev) => [created, ...prev])
        return created
      } catch (err) {
        setSubmitError(applicationErrorMessage(err))
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [actorRole, userId],
  )

  const applyToFamilyRequest = useCallback(
    async (requestId: string, input?: ApplicationApplyInput): Promise<Application | null> => {
      if (!userId || actorRole !== 'professional') {
        setSubmitError('Accedi come professionista per candidarti.')
        return null
      }

      setSubmitting(true)
      setSubmitError(null)
      try {
        const created = await postFamilyRequestApplication(userId, requestId, input)
        setApplications((prev) => [created, ...prev])
        return created
      } catch (err) {
        setSubmitError(applicationErrorMessage(err))
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [actorRole, userId],
  )

  const setStatus = useCallback(
    async (applicationId: string, status: ApplicationStatus): Promise<boolean> => {
      if (!userId || !actorRole) return false

      setStatusUpdatingId(applicationId)
      const previous = applications
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status } : a)),
      )

      try {
        const updated = await updateApplicationStatus(userId, actorRole, applicationId, status)
        setApplications((prev) =>
          prev.map((a) => (a.id === applicationId ? updated : a)),
        )
        return true
      } catch (err) {
        setApplications(previous)
        setSubmitError(applicationErrorMessage(err))
        return false
      } finally {
        setStatusUpdatingId(null)
      }
    },
    [actorRole, applications, userId],
  )

  const setB2BStatus = useCallback(
    async (
      applicationId: string,
      status: keyof typeof B2B_RECEIVED_STATUS_LABELS,
    ): Promise<boolean> => {
      return setStatus(applicationId, b2bStatusToApplicationStatus(status))
    },
    [setStatus],
  )

  const setFamilyStatus = useCallback(
    async (applicationId: string, status: FamilyCandidateStatus): Promise<boolean> => {
      if (!userId || actorRole !== 'public_user') return false

      setStatusUpdatingId(applicationId)
      const previous = applications
      const canonical = familyStatusToApplicationStatus(status)
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: canonical } : a)),
      )

      try {
        await updateFamilyApplicationStatus(userId, applicationId, status)
        const updated = await getApplicationsByRole(userId, 'public_user')
        setApplications(updated)
        return true
      } catch (err) {
        setApplications(previous)
        setSubmitError(applicationErrorMessage(err))
        return false
      } finally {
        setStatusUpdatingId(null)
      }
    },
    [actorRole, applications, userId],
  )

  const withdraw = useCallback(
    async (applicationId: string): Promise<boolean> => {
      if (!userId || actorRole !== 'professional') return false

      setStatusUpdatingId(applicationId)
      const previous = applications
      setApplications((prev) => prev.filter((a) => a.id !== applicationId))

      try {
        await withdrawJobApplication(userId, applicationId)
        return true
      } catch (err) {
        setApplications(previous)
        setSubmitError(applicationErrorMessage(err))
        return false
      } finally {
        setStatusUpdatingId(null)
      }
    },
    [actorRole, applications, userId],
  )

  const outgoingApplications = useMemo(() => {
    if (actorRole !== 'professional') return []
    return applications
  }, [actorRole, applications])

  const b2bReceivedApplications = useMemo(() => {
    if (actorRole !== 'agency' && actorRole !== 'structure') return []
    return applications.filter((a) => a.targetType === 'job_posting')
  }, [actorRole, applications])

  const familyApplications = useMemo(() => {
    if (actorRole !== 'public_user') return []
    return applications
      .filter((a) => a.targetType === 'family_request')
      .map(mapToFamilyApplication)
  }, [actorRole, applications])

  const stats = useMemo(() => {
    if (actorRole === 'professional') {
      const active = outgoingApplications.filter((a) => a.status === 'submitted' || a.status === 'viewed')
      return { sentCount: outgoingApplications.length, activeCount: active.length }
    }
    if (actorRole === 'agency' || actorRole === 'structure') {
      return {
        receivedCount: b2bReceivedApplications.length,
        newCount: b2bReceivedApplications.filter((a) => a.status === 'submitted').length,
      }
    }
    if (actorRole === 'public_user') {
      return { receivedCount: familyApplications.length }
    }
    return {}
  }, [actorRole, b2bReceivedApplications, familyApplications, outgoingApplications])

  const clearSubmitFeedback = useCallback(() => {
    setSubmitError(null)
  }, [])

  return {
    actorRole,
    applications,
    outgoingApplications,
    b2bReceivedApplications,
    familyApplications,
    stats,
    loading,
    error,
    submitting,
    submitError,
    statusUpdatingId,
    reload,
    applyToPosting,
    applyToFamilyRequest,
    setStatus,
    setB2BStatus,
    setFamilyStatus,
    withdraw,
    clearSubmitFeedback,
  }
}
