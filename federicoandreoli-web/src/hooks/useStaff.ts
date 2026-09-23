import { useCallback, useEffect, useState } from 'react'
import type { StaffMember, StaffMemberInput, StaffMemberStatus } from '../lib/staffTypes'
import { StaffError } from '../lib/staffTypes'
import { deleteStaffMember, getStaff, patchStaffStatus, postStaffMember } from '../lib/staffApi'

export function useStaff(orgId: string) {
  const [members, setMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!orgId) {
      setMembers([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setMembers(await getStaff(orgId))
    } catch (err) {
      setError(err instanceof StaffError ? err.message : 'Impossibile caricare lo staff.')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    void reload()
  }, [reload])

  const add = useCallback(
    async (input: StaffMemberInput) => {
      if (!orgId) return null
      setBusyId('new')
      try {
        const member = await postStaffMember(orgId, input)
        setMembers((prev) => [member, ...prev])
        return member
      } catch (err) {
        setError(err instanceof StaffError ? err.message : 'Creazione non riuscita.')
        return null
      } finally {
        setBusyId(null)
      }
    },
    [orgId],
  )

  const setStatus = useCallback(
    async (memberId: string, status: StaffMemberStatus) => {
      if (!orgId) return false
      setBusyId(memberId)
      try {
        const updated = await patchStaffStatus(orgId, memberId, status)
        setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)))
        return true
      } catch (err) {
        setError(err instanceof StaffError ? err.message : 'Aggiornamento non riuscito.')
        return false
      } finally {
        setBusyId(null)
      }
    },
    [orgId],
  )

  const remove = useCallback(
    async (memberId: string) => {
      if (!orgId) return false
      setBusyId(memberId)
      try {
        await deleteStaffMember(orgId, memberId)
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
        return true
      } catch (err) {
        setError(err instanceof StaffError ? err.message : 'Rimozione non riuscita.')
        return false
      } finally {
        setBusyId(null)
      }
    },
    [orgId],
  )

  return { members, loading, error, busyId, reload, add, setStatus, remove }
}
