/**
 * Admin user management API — doppio binario mock / Laravel.
 */
import type { AdminUserDetail, AdminUserListItem, AdminUserRole } from './adminUserTypes'
import { AdminUserError } from './adminUserTypes'
import {
  fetchAdminUserDetail,
  fetchAdminUsers,
  deleteAdminUser as deleteAdminUserMock,
  reactivateAdminUser,
  suspendAdminUser,
  ADMIN_USER_ROLE_LABELS,
  ADMIN_USER_STATUS_LABELS,
  filterAdminUsers,
  formatAdminUserDate,
  formatAdminUserDateTime,
} from '../services/adminUserService'
import { withAdminStepUp } from './adminSecurityApi'
import { HttpError, httpDelete, httpGet, httpGetBlob, httpPost } from './http'
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

type AdminUserConsentApi = {
  privacy?: boolean
  termini?: boolean
  maggiorenne?: boolean
  comunicazioni?: boolean
  profilazione?: boolean
  version?: string | null
  recordedAt?: string | null
  source?: string | null
}

type AdminUserApiRow = {
  id: string
  name: string
  email: string
  role: string
  status: string
  createdAt?: string
  professionalId?: string | null
  profileVisible?: boolean | null
  subscriptionActive?: boolean
  subscriptionStatus?: string | null
  subscriptionPlan?: string | null
  trialEndsAt?: string | null
  subscriptionPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
  privacyAccepted?: boolean
  privacyAcceptedAt?: string | null
  newsletterConsent?: boolean
  consentVersion?: string | null
  consents?: AdminUserConsentApi | null
  consentHistory?: AdminUserConsentApi[]
  activity?: Array<{ id: string; action: string; at?: string }>
  kycDocuments?: Array<{ id: string; type: string; label: string; status: string }>
}

function toAdminError(err: unknown, fallback: string): AdminUserError {
  if (err instanceof HttpError && err.code === 'step_up_required') {
    throw err
  }
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

function mapConsent(c?: AdminUserConsentApi | null) {
  if (!c) return null
  return {
    privacy: Boolean(c.privacy),
    termini: Boolean(c.termini),
    maggiorenne: Boolean(c.maggiorenne),
    comunicazioni: Boolean(c.comunicazioni),
    profilazione: Boolean(c.profilazione),
    version: c.version ?? null,
    recordedAt: c.recordedAt ?? null,
    source: c.source ?? null,
  }
}

function mapListItem(row: AdminUserApiRow): AdminUserListItem {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    initials: initialsFrom(row.name),
    role: mapRole(row.role),
    status:
      row.status === 'suspended'
        ? 'suspended'
        : row.status === 'verify'
          ? 'verify'
          : 'active',
    registeredAt: row.createdAt ?? new Date().toISOString(),
    professionalId: row.professionalId ?? undefined,
    profileVisible: row.profileVisible ?? null,
    subscriptionActive: Boolean(row.subscriptionActive),
    subscriptionStatus: row.subscriptionStatus ?? null,
    subscriptionPlan: row.subscriptionPlan ?? null,
    trialEndsAt: row.trialEndsAt ?? null,
    subscriptionPeriodEnd: row.subscriptionPeriodEnd ?? null,
    cancelAtPeriodEnd: Boolean(row.cancelAtPeriodEnd),
    privacyAccepted: Boolean(row.privacyAccepted ?? row.consents?.privacy),
    privacyAcceptedAt: row.privacyAcceptedAt ?? row.consents?.recordedAt ?? null,
    newsletterConsent: Boolean(row.newsletterConsent ?? row.consents?.comunicazioni),
    consentVersion: row.consentVersion ?? row.consents?.version ?? null,
  }
}

export async function getAdminUsers(actorEmail?: string): Promise<AdminUserListItem[]> {
  if (isMockApiEnabled()) return fetchAdminUsers(actorEmail)
  try {
    const rows = await httpGet<AdminUserApiRow[]>('/api/v1/admin/users')
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
    const row = await httpGet<AdminUserApiRow>(`/api/v1/admin/users/${userId}`)
    return {
      ...mapListItem(row),
      consents: mapConsent(row.consents),
      consentHistory: (row.consentHistory ?? []).map((c) => mapConsent(c)!).filter(Boolean),
      activity: (row.activity ?? []).map((a) => ({
        id: a.id,
        type: 'profile_update' as const,
        label: a.action,
        occurredAt: a.at ?? new Date().toISOString(),
      })),
      kycDocuments: (row.kycDocuments ?? []).map((d) => ({
        id: d.id,
        type: d.type === 'identita' ? 'id_card' : d.type === 'attestati' ? 'diploma' : 'other',
        label: d.label,
        url: `/api/v1/admin/kyc/documents/${d.id}/file`,
        mimeType: 'pdf' as const,
        status: (d.status === 'approved' || d.status === 'rejected' ? d.status : 'pending') as
          | 'pending'
          | 'approved'
          | 'rejected',
      })),
    }
  } catch (err) {
    throw toAdminError(err, 'Impossibile caricare il dettaglio utente.')
  }
}

export async function exportAdminNewsletterCsv(): Promise<void> {
  if (isMockApiEnabled()) {
    const users = await fetchAdminUsers()
    const headers = [
      'user_id',
      'name',
      'email',
      'role',
      'privacy_accepted_at',
      'newsletter',
      'consent_version',
      'registered_at',
    ]
    const lines = users
      .filter((u) => u.newsletterConsent)
      .map((u) =>
        [
          u.id,
          u.name,
          u.email,
          u.role,
          u.privacyAcceptedAt ?? '',
          'yes',
          u.consentVersion ?? '',
          u.registeredAt,
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(','),
      )
    const blob = new Blob([[headers.join(','), ...lines].join('\n') + '\n'], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    return
  }
  try {
    const blob = await httpGetBlob('/api/v1/admin/users/newsletter-export')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    throw toAdminError(err, 'Esportazione newsletter non riuscita.')
  }
}

export async function postAdminUserResendConsents(
  userId: string,
): Promise<{ ok: boolean; sentTo: string }> {
  if (isMockApiEnabled()) {
    return { ok: true, sentTo: 'mock@example.it' }
  }
  try {
    return await withAdminStepUp('users.mutate', (token) =>
      httpPost<{ ok: boolean; sentTo: string }>(`/api/v1/admin/users/${userId}/resend-consents`, {
        headers: token ? { 'X-Step-Up-Token': token } : undefined,
      }),
    )
  } catch (err) {
    throw toAdminError(err, 'Invio consensi non riuscito.')
  }
}

export async function postAdminUserSuspend(
  userId: string,
  actorEmail?: string,
): Promise<AdminUserListItem> {
  if (isMockApiEnabled()) return suspendAdminUser(userId, actorEmail)
  try {
    const row = await withAdminStepUp('users.mutate', (token) =>
      httpPost<AdminUserApiRow>(`/api/v1/admin/users/${userId}/suspend`, {
        headers: token ? { 'X-Step-Up-Token': token } : undefined,
      }),
    )
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
    const row = await withAdminStepUp('users.mutate', (token) =>
      httpPost<AdminUserApiRow>(`/api/v1/admin/users/${userId}/reactivate`, {
        headers: token ? { 'X-Step-Up-Token': token } : undefined,
      }),
    )
    return mapListItem(row)
  } catch (err) {
    throw toAdminError(err, 'Riattivazione utente non riuscita.')
  }
}

export async function deleteAdminUser(
  userId: string,
  confirmEmail: string,
  actorEmail?: string,
): Promise<void> {
  if (isMockApiEnabled()) return deleteAdminUserMock(userId, actorEmail)
  try {
    await withAdminStepUp('users.mutate', (token) =>
      httpDelete(`/api/v1/admin/users/${userId}`, {
        body: { confirm_email: confirmEmail },
        headers: token ? { 'X-Step-Up-Token': token } : undefined,
      }),
    )
  } catch (err) {
    throw toAdminError(err, 'Eliminazione utente non riuscita.')
  }
}

/** Giorni di prova rimanenti; null se non in trial o scaduta. */
export function trialDaysRemaining(trialEndsAt?: string | null): number | null {
  if (!trialEndsAt) return null
  const end = new Date(trialEndsAt).getTime()
  if (Number.isNaN(end)) return null
  const diff = end - Date.now()
  if (diff <= 0) return null
  return Math.max(1, Math.ceil(diff / 86_400_000))
}

export function formatSubscriptionPlanLabel(plan?: string | null): string {
  if (!plan) return '—'
  const key = plan.toLowerCase()
  if (key === 'free') return 'Free'
  if (key === 'premium') return 'Premium'
  return plan
}
