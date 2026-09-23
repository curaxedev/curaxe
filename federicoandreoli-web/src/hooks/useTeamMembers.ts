import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  deleteTeamMember,
  getTeamMembers,
  postTeamMemberInvite,
} from '../lib/teamMemberApi'
import type { TeamMember, TeamMemberInviteInput, TeamMemberRole } from '../lib/teamMemberTypes'
import { TeamMemberError } from '../lib/teamMemberTypes'

function teamErrorMessage(err: unknown): string {
  if (err instanceof TeamMemberError) return err.message
  return 'Impossibile aggiornare il team. Riprova.'
}

export function useTeamMembers() {
  const { user } = useAuth()
  const orgId = user?.id ?? ''

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [])

  const reload = useCallback(async () => {
    if (!orgId) {
      setMembers([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const rows = await getTeamMembers(orgId)
      setMembers(rows)
    } catch (err) {
      setError(teamErrorMessage(err))
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    void reload()
  }, [reload])

  const clearInviteFeedback = useCallback(() => {
    setInviteError(null)
    setFieldErrors({})
  }, [])

  const invite = useCallback(
    async (input: TeamMemberInviteInput): Promise<boolean> => {
      if (!orgId) return false

      setInviting(true)
      setInviteError(null)
      setFieldErrors({})

      try {
        const created = await postTeamMemberInvite(orgId, input)
        setMembers((prev) => [created, ...prev])
        showToast(`Invito inviato a ${created.email} (mock).`)
        return true
      } catch (err) {
        if (err instanceof TeamMemberError && err.fieldErrors) {
          setFieldErrors(err.fieldErrors)
          setInviteError(err.message)
        } else {
          setInviteError(teamErrorMessage(err))
        }
        return false
      } finally {
        setInviting(false)
      }
    },
    [orgId, showToast],
  )

  const remove = useCallback(
    async (memberId: string): Promise<boolean> => {
      if (!orgId) return false

      setRemovingId(memberId)
      const previous = members
      setMembers((rows) => rows.filter((m) => m.id !== memberId))

      try {
        await deleteTeamMember(orgId, memberId)
        showToast('Membro rimosso dal team.')
        return true
      } catch (err) {
        setMembers(previous)
        setInviteError(teamErrorMessage(err))
        return false
      } finally {
        setRemovingId(null)
      }
    },
    [members, orgId, showToast],
  )

  return {
    members,
    loading,
    error,
    inviting,
    inviteError,
    fieldErrors,
    removingId,
    toast,
    reload,
    invite,
    remove,
    clearInviteFeedback,
    defaultRole: 'recruiter' as TeamMemberRole,
  }
}
