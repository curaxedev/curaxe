/** API-shaped admin user management types — swap transport in `adminUserApi.ts` when Laravel is ready. */

import type { AdminKycDocument } from './adminKycTypes'

export type AdminUserRole = 'professional' | 'family' | 'agency' | 'structure' | 'admin'

export type AdminUserStatus = 'active' | 'suspended' | 'verify'

export type AdminUserActivityType =
  | 'registration'
  | 'login'
  | 'profile_update'
  | 'application'
  | 'subscription'
  | 'kyc_submit'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'suspended'
  | 'reactivated'

export type AdminUserActivityEntry = {
  id: string
  type: AdminUserActivityType
  label: string
  occurredAt: string
}

export type AdminUserRecord = {
  id: string
  name: string
  email: string
  initials: string
  role: AdminUserRole
  status: AdminUserStatus
  registeredAt: string
  professionalId?: string
  phone?: string
  city?: string
  /** Directory / public profile visibility; null when the account has no publishable profile. */
  profileVisible: boolean | null
  subscriptionActive: boolean
  subscriptionStatus?: string | null
  subscriptionPlan?: string | null
  trialEndsAt?: string | null
  subscriptionPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
}

export type AdminUserListItem = Pick<
  AdminUserRecord,
  | 'id'
  | 'name'
  | 'email'
  | 'initials'
  | 'role'
  | 'status'
  | 'registeredAt'
  | 'professionalId'
  | 'profileVisible'
  | 'subscriptionActive'
  | 'subscriptionStatus'
  | 'subscriptionPlan'
  | 'trialEndsAt'
  | 'subscriptionPeriodEnd'
  | 'cancelAtPeriodEnd'
>

export type AdminUserDetail = AdminUserRecord & {
  activity: AdminUserActivityEntry[]
  kycDocuments: AdminKycDocument[]
}

export type AdminUserStore = {
  users: AdminUserRecord[]
}

export type AdminUserListFilters = {
  role?: AdminUserRole | 'all'
  status?: AdminUserStatus | 'all'
  search?: string
}

export type AdminUserErrorCode = 'validation' | 'not_found' | 'server'

export class AdminUserError extends Error {
  readonly code: AdminUserErrorCode

  constructor(code: AdminUserErrorCode, message: string) {
    super(message)
    this.name = 'AdminUserError'
    this.code = code
  }
}
