/**
 * Admin user management API — doppio binario mock / Laravel.
 */
import type { AdminUserDetail, AdminUserListItem, AdminUserRole } from './adminUserTypes'
import { AdminUserError } from './adminUserTypes'
import {
  fetchAdminUserDetail,
  fetchAdminUsers,
  reactivateAdminUser,
  suspendAdminUser,
  ADMIN_USER_ROLE_LABELS,
  ADMIN_USER_STATUS_LABELS,
  filterAdminUsers,
  formatAdminUserDate,
  formatAdminUserDateTime,
} from '../services/adminUserService'
import { HttpError, httpGet, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type {
  AdminUserActivityEntry,
  AdminUserDetail,
  AdminUserListFilters,
  AdminUserListItem,
  AdminUserRole,
  AdminUserStatus,
} from './adminUserTypes'
export { AdminUserError } from './adminUserTypes'
export {
  ADMIN_USER_ROLE_LABELS,
  ADMIN_USER_STATUS_LABELS,
  filterAdminUsers,
  formatAdminUserDate,
  formatAdminUserDateTime,
}

function toAdminError(err: unknown, fallback: string): AdminUserError {
  if (err instanceof HttpError) {
    if (err.kind === 'not_found') return new AdminUserError('not_found', err.message)
    return new AdminUserError('server', err.message || fallback)
  }
  return new AdminUserError('server', fallback)
}

function mapRole(role: string): AdminUserRole {
  switch (role) {
    case 'professional':
      return 'professional'
    case 'public_user':
      return 'family'
    case 'agency':
      return 'agency'
    case 'structure':
      return 'structure'
    case 'platform_admin':
      return 'admin'
    default:
      return 'family'
  }
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0] ?? 'U').slice(0, 2).toUpperCase()
}

function mapListItem(row: {
  id: string
  name: string
  email: string
  role: string
  status: string
  createdAt?: string
}): AdminUserListItem {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    initials: initialsFrom(row.name),
    role: mapRole(row.role),
    status: row.status === 'suspended' ? 'suspended' : 'active',
    registeredAt: row.createdAt ?? new Date().toISOString(),
  }
}

export async function getAdminUsers(actorEmail?: string): Promise<AdminUserListItem[]> {
  if (isMockApiEnabled()) return fetchAdminUsers(actorEmail)
  try {
    const rows = await httpGet<
      Array<{
        id: string
        name: string
        email: string
        role: string
        status: string
        createdAt?: string
      }>
    >('/api/v1/admin/users')
    return rows.map(mapListItem)
  } catch (err) {
    throw toAdminError(err, 'Impossibile caricare gli utenti.')
  }
}

export async function getAdminUserDetail(
  userId: string,
  actorEmail?: string,
): Promise<AdminUserDetail> {
  if (isMockApiEnabled()) return fetchAdminUserDetail(userId, actorEmail)
  try {
    const row = await httpGet<{
      id: string
      name: string
      email: string
      role: string
      status: string
      createdAt?: string
    }>(`/api/v1/admin/users/${userId}`)
    return {
      ...mapListItem(row),
      activity: [],
      kycDocuments: [],
    }
  } catch (err) {
    throw toAdminError(err, 'Impossibile caricare il dettaglio utente.')
  }
}

export async function postAdminUserSuspend(
  userId: string,
  actorEmail?: string,
): Promise<AdminUserListItem> {
  if (isMockApiEnabled()) return suspendAdminUser(userId, actorEmail)
  try {
    const row = await httpPost<{
      id: string
      name: string
      email: string
      role: string
      status: string
      createdAt?: string
    }>(`/api/v1/admin/users/${userId}/suspend`)
    return mapListItem(row)
  } catch (err) {
    throw toAdminError(err, 'Sospensione utente non riuscita.')
  }
}

export async function postAdminUserReactivate(
  userId: string,
  actorEmail?: string,
): Promise<AdminUserListItem> {
  if (isMockApiEnabled()) return reactivateAdminUser(userId, actorEmail)
  try {
    const row = await httpPost<{
      id: string
      name: string
      email: string
      role: string
      status: string
      createdAt?: string
    }>(`/api/v1/admin/users/${userId}/reactivate`)
    return mapListItem(row)
  } catch (err) {
    throw toAdminError(err, 'Riattivazione utente non riuscita.')
  }
}
