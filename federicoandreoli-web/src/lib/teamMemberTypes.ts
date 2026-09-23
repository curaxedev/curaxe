export type TeamMemberRole = 'admin' | 'recruiter' | 'viewer'

export type TeamMemberStatus = 'active' | 'invited' | 'removed'

export type TeamMember = {
  id: string
  orgId: string
  email: string
  name: string
  initials: string
  role: TeamMemberRole
  status: TeamMemberStatus
  invitedAt: string
  joinedAt: string | null
}

export type TeamMemberInviteInput = {
  email: string
  role: TeamMemberRole
}

export type TeamMemberFieldErrors = Partial<Record<'email' | 'role', string>>

export type TeamMemberErrorCode = 'validation' | 'not_found' | 'conflict' | 'server'

export class TeamMemberError extends Error {
  readonly code: TeamMemberErrorCode
  readonly fieldErrors?: TeamMemberFieldErrors

  constructor(
    code: TeamMemberErrorCode,
    message: string,
    fieldErrors?: TeamMemberFieldErrors,
  ) {
    super(message)
    this.name = 'TeamMemberError'
    this.code = code
    this.fieldErrors = fieldErrors
  }
}
