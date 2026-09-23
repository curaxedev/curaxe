/**
 * RSA staff API — doppio binario mock / Laravel.
 * GET/POST/PATCH/DELETE /api/v1/organizations/:orgId/staff
 */
import type { StaffMember, StaffMemberInput, StaffMemberStatus } from './staffTypes'
import { StaffError } from './staffTypes'
import {
  createStaffMember,
  listStaff,
  removeStaffMember,
  updateStaffStatus,
} from '../services/staffService'
import { HttpError, httpDelete, httpGet, httpPatch, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type { StaffMember, StaffMemberInput, StaffMemberStatus } from './staffTypes'
export { StaffError, STAFF_STATUS_LABELS } from './staffTypes'

type ApiStaff = {
  id: string
  name: string
  role: string
  status: string
  shift: string
  notes: string
}

function fromApi(orgId: string, row: ApiStaff): StaffMember {
  const statusMap: Record<string, StaffMemberStatus> = {
    active: 'available',
    on_leave: 'leave',
    ended: 'leave',
    'on-shift': 'on-shift',
    available: 'available',
    leave: 'leave',
  }
  const parts = row.name.trim().split(/\s+/)
  const initials = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'ST'

  return {
    id: row.id,
    orgId,
    name: row.name,
    initials,
    category: row.role,
    department: row.shift || row.notes || '',
    status: statusMap[row.status] ?? 'available',
  }
}

function toApiStatus(status: StaffMemberStatus): string {
  switch (status) {
    case 'on-shift':
      return 'active'
    case 'available':
      return 'active'
    case 'leave':
      return 'on_leave'
    default: {
      const _x: never = status
      return _x
    }
  }
}

function toStaffError(err: unknown, fallback: string): StaffError {
  if (err instanceof HttpError) {
    if (err.kind === 'not_found') return new StaffError('not_found', err.message)
    if (err.kind === 'validation') return new StaffError('validation', err.message)
    return new StaffError('server', err.message || fallback)
  }
  return new StaffError('server', fallback)
}

export async function getStaff(orgId: string): Promise<StaffMember[]> {
  if (isMockApiEnabled()) return listStaff(orgId)
  try {
    const rows = await httpGet<ApiStaff[]>(`/api/v1/organizations/${orgId}/staff`)
    return rows.map((r) => fromApi(orgId, r))
  } catch (err) {
    throw toStaffError(err, 'Impossibile caricare lo staff.')
  }
}

export async function postStaffMember(orgId: string, input: StaffMemberInput): Promise<StaffMember> {
  if (isMockApiEnabled()) return createStaffMember(orgId, input)
  try {
    const row = await httpPost<ApiStaff>(`/api/v1/organizations/${orgId}/staff`, {
      body: {
        name: input.name,
        role: input.category,
        shift: input.department,
        status: toApiStatus(input.status ?? 'available'),
      },
    })
    return fromApi(orgId, row)
  } catch (err) {
    throw toStaffError(err, 'Creazione membro staff non riuscita.')
  }
}

export async function patchStaffStatus(
  orgId: string,
  memberId: string,
  status: StaffMemberStatus,
): Promise<StaffMember> {
  if (isMockApiEnabled()) return updateStaffStatus(orgId, memberId, status)
  try {
    const row = await httpPatch<ApiStaff>(`/api/v1/organizations/${orgId}/staff/${memberId}`, {
      body: { status: toApiStatus(status) },
    })
    return fromApi(orgId, row)
  } catch (err) {
    throw toStaffError(err, 'Aggiornamento stato non riuscito.')
  }
}

export async function deleteStaffMember(orgId: string, memberId: string): Promise<void> {
  if (isMockApiEnabled()) return removeStaffMember(orgId, memberId)
  try {
    await httpDelete(`/api/v1/organizations/${orgId}/staff/${memberId}`)
  } catch (err) {
    throw toStaffError(err, 'Eliminazione non riuscita.')
  }
}
