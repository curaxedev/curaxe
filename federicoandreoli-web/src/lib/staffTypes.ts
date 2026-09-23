export type StaffMemberStatus = 'on-shift' | 'available' | 'leave'

export type StaffMember = {
  id: string
  orgId: string
  name: string
  initials: string
  category: string
  department: string
  status: StaffMemberStatus
}

export type StaffMemberInput = {
  name: string
  category: string
  department: string
  status?: StaffMemberStatus
}

export class StaffError extends Error {
  readonly code: 'validation' | 'not_found' | 'server'

  constructor(code: StaffError['code'], message: string) {
    super(message)
    this.name = 'StaffError'
    this.code = code
  }
}

export const STAFF_STATUS_LABELS: Record<StaffMemberStatus, string> = {
  'on-shift': 'In turno',
  available: 'Disponibile',
  leave: 'In permesso',
}
