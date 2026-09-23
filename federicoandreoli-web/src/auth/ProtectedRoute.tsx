import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { UserRole } from './types'
import { getDashboardPathForRole } from './roleDashboard'
import { useAuth } from './useAuth'

type ProtectedRouteProps = {
  children: ReactNode
  /** RBAC guard (SPRINT-02); when set, wrong role redirects to own dashboard. */
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="dash-shell" style={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}>
        <p style={{ color: 'var(--color-text-muted, #666)' }}>Caricamento…</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/accedi?redirect=${redirect}`} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />
  }

  return children
}
