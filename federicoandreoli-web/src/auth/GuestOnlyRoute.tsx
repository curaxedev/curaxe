import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getDashboardPathForRole } from './roleDashboard'
import { useAuth } from './useAuth'

type GuestOnlyRouteProps = {
  children: ReactNode
}

/** Redirects authenticated users to their role dashboard (login/register). */
export function GuestOnlyRoute({ children }: GuestOnlyRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="dash-shell" style={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}>
        <p style={{ color: 'var(--color-text-muted, #666)' }}>Caricamento…</p>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />
  }

  return children
}
