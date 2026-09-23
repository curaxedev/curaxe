/**
 * Organization team API — doppio binario mock / Laravel.
 */
import type { TeamMember, TeamMemberInviteInput, TeamMemberRole } from './teamMemberTypes'
import { TeamMemberError } from './teamMemberTypes'
import {
  fetchTeamMembers,
  formatTeamMemberDate,
  inviteTeamMember,
  removeTeamMember,
  TEAM_MEMBER_ROLE_LABELS,
  TEAM_MEMBER_STATUS_LABELS,
} from '../services/teamMemberService'
import { HttpError, httpDelete, httpGet, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type { TeamMember, TeamMemberInviteInput, TeamMemberRole } from './teamMemberTypes'
export { TeamMemberError } from './teamMemberTypes'
export {
  formatTeamMemberDate,
  TEAM_MEMBER_ROLE_LABELS,
  TEAM_MEMBER_STATUS_LABELS,
}

function initialsFrom(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  if (parts.length === 1 && parts[0]) return parts[0].slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function mapRole(role: string): TeamMemberRole {
  if (role === 'admin' || role === 'recruiter' || role === 'viewer') return role
  return 'recruiter'
}

function toTeamError(err: unknown, fallback: string): TeamMemberError {
  if (err instanceof HttpError) {
    if (err.kind === 'not_found') return new TeamMemberError('not_found', err.message)
    if (err.kind === 'validation') return new TeamMemberError('validation', err.message)
    return new TeamMemberError('server', err.message || fallback)
  }
  return new TeamMemberError('server', fallback)
}

export async function getTeamMembers(orgId: string): Promise<TeamMember[]> {
  if (isMockApiEnabled()) return fetchTeamMembers(orgId)
  try {
    const rows = await httpGet<
      Array<{
        id: string
        email: string
        name: string
        role: string
        status: string
        invitedAt?: string
      }>
    >(`/api/v1/organizations/${orgId}/team-members`)
    return rows.map((r) => ({
      id: r.id,
      orgId,
      email: r.email,
      name: r.name || r.email,
      initials: initialsFrom(r.name, r.email),
      role: mapRole(r.role),
      status: (r.status === 'active' || r.status === 'invited' || r.status === 'removed'
        ? r.status
        : 'invited') as TeamMember['status'],
      invitedAt: r.invitedAt ?? new Date().toISOString(),
      joinedAt: r.status === 'active' ? (r.invitedAt ?? null) : null,
    }))
  } catch (err) {
    throw toTeamError(err, 'Impossibile caricare il team.')
  }
}

export async function postTeamMemberInvite(
  orgId: string,
  input: TeamMemberInviteInput,
): Promise<TeamMember> {
  if (isMockApiEnabled()) return inviteTeamMember(orgId, input)
  try {
    const r = await httpPost<{
      id: string
      email: string
      name: string
      role: string
      status: string
      invitedAt?: string
    }>(`/api/v1/organizations/${orgId}/team-members/invite`, {
      body: { email: input.email, role: input.role },
    })
    return {
      id: r.id,
      orgId,
      email: r.email,
      name: r.name || r.email,
      initials: initialsFrom(r.name, r.email),
      role: mapRole(r.role),
      status: 'invited',
      invitedAt: r.invitedAt ?? new Date().toISOString(),
      joinedAt: null,
    }
  } catch (err) {
    throw toTeamError(err, 'Invito non inviato.')
  }
}

export async function deleteTeamMember(orgId: string, memberId: string): Promise<void> {
  if (isMockApiEnabled()) return removeTeamMember(orgId, memberId)
  try {
    await httpDelete(`/api/v1/organizations/${orgId}/team-members/${memberId}`)
  } catch (err) {
    throw toTeamError(err, 'Rimozione membro non riuscita.')
  }
}
