import type { UserRole } from './types'

const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  platform_admin: '/dashboard/admin',
  professional: '/dashboard/professionale',
  public_user: '/dashboard/famiglia',
  agency: '/dashboard/agenzia',
  structure: '/dashboard/struttura',
}

export function getDashboardPathForRole(role: UserRole): string {
  return ROLE_DASHBOARD_PATH[role]
}

/** Post-login navigation: role dashboard first; allow safe public deep links. */
export function resolvePostLoginPath(role: UserRole, redirect?: string | null): string {
  const defaultPath = getDashboardPathForRole(role)
  const raw = redirect?.trim()
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return defaultPath
  }
  if (raw.startsWith('/dashboard')) {
    return defaultPath
  }
  return raw
}
