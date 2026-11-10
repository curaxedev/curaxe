import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  filterAdminUsers,
  getAdminUserDetail,
  getAdminUsers,
  deleteAdminUser,
  exportAdminNewsletterCsv,
  postAdminUserReactivate,
  postAdminUserResendConsents,
  postAdminUserSuspend,
  postAdminUserVisibility,
} from '../lib/adminUserApi'
import type {
  AdminUserDetail,
  AdminUserListItem,
  AdminUserRole,
  AdminUserStatus,
} from '../lib/adminUserTypes'
import { AdminUserError } from '../lib/adminUserTypes'

function userErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AdminUserError) return err.message
  return fallback
}

export function useAdminUsers() {
  const { user } = useAuth()
  const actorEmail = user?.email

  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [filterRole, setFilterRole] = useState<AdminUserRole | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<AdminUserStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [detailTargetId, setDetailTargetId] = useState<string | null>(null)
  const [detailInitialTab, setDetailInitialTab] = useState<
    'profilo' | 'sicurezza' | 'abbonamento' | 'privacy' | 'visibilita' | 'kyc' | 'attivita'
  >('profilo')
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [])

  const filteredUsers = useMemo(
    () =>
      filterAdminUsers(users, {
        role: filterRole,
        status: filterStatus,
        search: searchQuery,
      }),
    [users, filterRole, filterStatus, searchQuery],
  )

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await getAdminUsers(actorEmail)
      setUsers(items)
    } catch (err) {
      setError(userErrorMessage(err, 'Impossibile caricare gli utenti. Riprova.'))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [actorEmail])

  useEffect(() => {
    void reload()
  }, [reload])

  const loadDetail = useCallback(
    async (userId: string) => {
      setDetailLoading(true)
      setDetailError(null)
      setDetail(null)
      try {
        const data = await getAdminUserDetail(userId, actorEmail)
        setDetail(data)
      } catch (err) {
        setDetailError(userErrorMessage(err, 'Impossibile caricare il profilo utente.'))
      } finally {
        setDetailLoading(false)
      }
    },
    [actorEmail],
  )

  const openDetail = useCallback(
    (
      userId: string,
      opts?: {
        tab?: 'profilo' | 'sicurezza' | 'abbonamento' | 'privacy' | 'visibilita' | 'kyc' | 'attivita'
      },
    ) => {
      setDetailInitialTab(opts?.tab ?? 'profilo')
      setDetailTargetId(userId)
      void loadDetail(userId)
    },
    [loadDetail],
  )

  const closeDetail = useCallback(() => {
    setDetailTargetId(null)
    setDetail(null)
    setDetailError(null)
    setDetailInitialTab('profilo')
  }, [])

  const updateUserInList = useCallback((updated: AdminUserListItem) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    setDetail((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev))
  }, [])

  const suspend = useCallback(
    async (userId: string): Promise<boolean> => {
      setActionLoadingId(userId)
      setActionError(null)
      const previous = users.find((u) => u.id === userId)
      if (previous) {
        updateUserInList({
          ...previous,
          status: 'suspended',
          profileVisible: previous.profileVisible === null ? null : false,
        })
      }

      try {
        const updated = await postAdminUserSuspend(userId, actorEmail)
        updateUserInList(updated)
        showToast(`Account di ${updated.name} sospeso.`)
        return true
      } catch (err) {
        if (previous) updateUserInList(previous)
        setActionError(userErrorMessage(err, 'Impossibile sospendere l\'account.'))
        return false
      } finally {
        setActionLoadingId(null)
      }
    },
    [actorEmail, showToast, updateUserInList, users],
  )

  const reactivate = useCallback(
    async (userId: string): Promise<boolean> => {
      setActionLoadingId(userId)
      setActionError(null)
      const previous = users.find((u) => u.id === userId)
      if (previous) {
        updateUserInList({ ...previous, status: 'active' })
      }

      try {
        const updated = await postAdminUserReactivate(userId, actorEmail)
        updateUserInList(updated)
        showToast(`Account di ${updated.name} riattivato.`)
        return true
      } catch (err) {
        if (previous) updateUserInList(previous)
        setActionError(userErrorMessage(err, 'Impossibile riattivare l\'account.'))
        return false
      } finally {
        setActionLoadingId(null)
      }
    },
    [actorEmail, showToast, updateUserInList, users],
  )

  const toggleStatus = useCallback(
    async (userId: string, currentStatus: AdminUserStatus): Promise<boolean> => {
      if (currentStatus === 'suspended') {
        return reactivate(userId)
      }
      return suspend(userId)
    },
    [reactivate, suspend],
  )

  const remove = useCallback(
    async (userId: string): Promise<boolean> => {
      setActionLoadingId(userId)
      setActionError(null)
      const previous = users.find((u) => u.id === userId)

      try {
        if (!previous?.email) {
          setActionError('Email utente non disponibile per la conferma.')
          return false
        }
        await deleteAdminUser(userId, previous.email, actorEmail)
        setUsers((prev) => prev.filter((u) => u.id !== userId))
        if (detailTargetId === userId) {
          setDetailTargetId(null)
          setDetail(null)
          setDetailError(null)
        }
        showToast(`Account di ${previous.name} eliminato.`)
        return true
      } catch (err) {
        setActionError(userErrorMessage(err, "Impossibile eliminare l'account."))
        return false
      } finally {
        setActionLoadingId(null)
      }
    },
    [actorEmail, detailTargetId, showToast, users],
  )

  const clearActionError = useCallback(() => {
    setActionError(null)
  }, [])

  const exportNewsletter = useCallback(async (): Promise<boolean> => {
    setActionError(null)
    try {
      await exportAdminNewsletterCsv()
      showToast('CSV newsletter scaricato.')
      return true
    } catch (err) {
      setActionError(userErrorMessage(err, 'Esportazione newsletter non riuscita.'))
      return false
    }
  }, [showToast])

  const resendConsents = useCallback(
    async (userId: string): Promise<boolean> => {
      setActionLoadingId(userId)
      setActionError(null)
      try {
        const result = await postAdminUserResendConsents(userId)
        showToast(`Consensi reinviati a ${result.sentTo}.`)
        return true
      } catch (err) {
        setActionError(userErrorMessage(err, 'Invio consensi non riuscito.'))
        return false
      } finally {
        setActionLoadingId(null)
      }
    },
    [showToast],
  )

  const setVisibility = useCallback(
    async (userId: string, published: boolean): Promise<boolean> => {
      setActionLoadingId(userId)
      setActionError(null)
      try {
        const updated = await postAdminUserVisibility(userId, published)
        updateUserInList(updated)
        setDetail(updated)
        showToast(
          published
            ? `Profilo di ${updated.name} reso visibile.`
            : `Profilo di ${updated.name} nascosto dalla directory.`,
        )
        return true
      } catch (err) {
        setActionError(userErrorMessage(err, 'Aggiornamento visibilità non riuscito.'))
        return false
      } finally {
        setActionLoadingId(null)
      }
    },
    [showToast, updateUserInList],
  )

  return {
    users,
    filteredUsers,
    loading,
    error,
    actionError,
    actionLoadingId,
    toast,
    filterRole,
    setFilterRole,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    detailTargetId,
    detailInitialTab,
    detail,
    detailLoading,
    detailError,
    reload,
    openDetail,
    closeDetail,
    suspend,
    reactivate,
    toggleStatus,
    remove,
    exportNewsletter,
    resendConsents,
    setVisibility,
    clearActionError,
  }
}
