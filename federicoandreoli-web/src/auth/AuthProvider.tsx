import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { getSession, logout } from '../lib/authApi'
import { isMockApiEnabled } from '../lib/runtimeConfig'
import { AuthContext } from './authContext'
import {
  getAuthSessionServerSnapshot,
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from './authSessionStore'
import type { AuthUser } from './types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    getAuthSessionServerSnapshot
  )
  const [bootstrapped, setBootstrapped] = useState(isMockApiEnabled())

  useEffect(() => {
    if (isMockApiEnabled()) {
      setBootstrapped(true)
      return
    }
    let cancelled = false
    void getSession().finally(() => {
      if (!cancelled) setBootstrapped(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const user: AuthUser | null = session?.user ?? null
  const isAuthenticated = user !== null

  const signOut = useCallback(async () => {
    await logout()
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading: !bootstrapped,
      signOut,
    }),
    [user, isAuthenticated, bootstrapped, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
