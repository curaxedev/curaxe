import { getDashboardPathForRole } from '../auth/roleDashboard'
import type { AuthUser, UserRole } from '../auth/types'

export const MOCK_OTP_CODE = '123456'

/** Demo password for roles on password_totp channel (dev only). */
export const MOCK_PASSWORD = 'DemoPass123!'

type MockAccount = AuthUser & { password?: string }

export const MOCK_AUTH_ACCOUNTS: MockAccount[] = [
  {
    id: 'prof-1',
    role: 'professional',
    name: 'Maria Rossi',
    email: 'maria.rossi@email.it',
  },
  {
    id: 'fam-1',
    role: 'public_user',
    name: 'Famiglia Bianchi',
    email: 'bianchi@email.it',
  },
  {
    id: 'agency-1',
    role: 'agency',
    name: 'AuraCare Srl',
    email: 'info@auracare.it',
    password: MOCK_PASSWORD,
  },
  {
    id: 'struct-1',
    role: 'structure',
    name: 'RSA Villa Serena',
    email: 'info@villaserena.it',
    password: MOCK_PASSWORD,
  },
  {
    id: 'admin-1',
    role: 'platform_admin',
    name: 'Admin Piattaforma',
    email: 'admin@assistenzafacile.it',
    password: MOCK_PASSWORD,
  },
]

export function findMockAccountByEmail(email: string): MockAccount | undefined {
  const normalized = email.trim().toLowerCase()
  return MOCK_AUTH_ACCOUNTS.find((a) => a.email.toLowerCase() === normalized)
}

export function roleUsesOtp(role: UserRole): boolean {
  return role === 'professional' || role === 'public_user'
}

export type DemoLoginAccount = {
  label: string
  email: string
  method: 'otp' | 'password'
  secret: string
  role: UserRole
  dashboardPath: string
}

/** Demo accounts shown on /accedi (include structure RSA). */
export const DEMO_LOGIN_ACCOUNTS: DemoLoginAccount[] = [
  {
    label: 'Badante',
    email: 'maria.rossi@email.it',
    method: 'otp',
    secret: MOCK_OTP_CODE,
    role: 'professional',
    dashboardPath: getDashboardPathForRole('professional'),
  },
  {
    label: 'Famiglia',
    email: 'bianchi@email.it',
    method: 'otp',
    secret: MOCK_OTP_CODE,
    role: 'public_user',
    dashboardPath: getDashboardPathForRole('public_user'),
  },
  {
    label: 'Agenzia B2B',
    email: 'info@auracare.it',
    method: 'password',
    secret: MOCK_PASSWORD,
    role: 'agency',
    dashboardPath: getDashboardPathForRole('agency'),
  },
  {
    label: 'RSA Villa Serena',
    email: 'info@villaserena.it',
    method: 'password',
    secret: MOCK_PASSWORD,
    role: 'structure',
    dashboardPath: getDashboardPathForRole('structure'),
  },
  {
    label: 'Super Admin',
    email: 'admin@assistenzafacile.it',
    method: 'password',
    secret: MOCK_PASSWORD,
    role: 'platform_admin',
    dashboardPath: getDashboardPathForRole('platform_admin'),
  },
]
