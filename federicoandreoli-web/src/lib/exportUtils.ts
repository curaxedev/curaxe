import type { Application } from './applicationTypes'
import { B2B_RECEIVED_STATUS_LABELS, toB2BDisplayStatus } from './applicationTypes'
import type { AdminUserRecord, AdminUserRole, AdminUserStatus } from './adminUserTypes'
import type { AdminBillingStats } from './billingTypes'
import type { JobPosting } from './jobPostingTypes'
import {
  ADMIN_USER_ROLE_LABELS,
  ADMIN_USER_STATUS_LABELS,
  loadAdminUserStore,
} from '../services/adminUserService'
import { formatApplicationDate } from '../services/applicationService'
import {
  JOB_POSTING_CONTRACT_LABELS,
  JOB_POSTING_STATUS_LABELS,
  formatJobPostingDate,
} from '../services/jobPostingService'

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function buildCsv(
  headers: readonly string[],
  rows: readonly (string | number | null | undefined)[][],
): string {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ]
  return `\uFEFF${lines.join('\r\n')}`
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename: string, csv: string): void {
  downloadFile(filename, csv, 'text/csv;charset=utf-8')
}

export function downloadJson(filename: string, data: unknown): void {
  downloadFile(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8')
}

export function dateStampForFilename(): string {
  return new Date().toISOString().slice(0, 10)
}

export function exportJobPostingsCsv(postings: JobPosting[], filePrefix: string): void {
  const headers = [
    'id',
    'titolo',
    'contratto',
    'reparto',
    'comune',
    'provincia',
    'stato',
    'candidature',
    'aggiornato',
  ] as const

  const rows = postings.map((p) => [
    p.id,
    p.title,
    JOB_POSTING_CONTRACT_LABELS[p.contractType],
    p.department,
    p.location.comune,
    p.location.provincia,
    JOB_POSTING_STATUS_LABELS[p.status],
    p.applicationCount,
    formatJobPostingDate(p.updatedAt),
  ])

  const csv = buildCsv(headers, rows)
  downloadCsv(`${filePrefix}-annunci-${dateStampForFilename()}.csv`, csv)
}

export function exportB2bCandidatesCsv(applications: Application[], filePrefix: string): void {
  const headers = [
    'id',
    'candidato',
    'categoria',
    'zona',
    'annuncio',
    'stato',
    'data_candidatura',
    'anteprima',
  ] as const

  const rows = applications.map((a) => {
    const displayStatus = toB2BDisplayStatus(a.status)
    return [
      a.id,
      a.applicantName,
      a.applicantCategory,
      a.applicantZone,
      a.targetTitle,
      B2B_RECEIVED_STATUS_LABELS[displayStatus],
      formatApplicationDate(a.createdAt),
      a.applicantPreview,
    ]
  })

  const csv = buildCsv(headers, rows)
  downloadCsv(`${filePrefix}-candidature-${dateStampForFilename()}.csv`, csv)
}

export type AdminRequestExportRow = {
  id: string
  requester: string
  type: string
  zone: string
  date: string
  status: string
  applications: number
}

export type AdminRevenueMonth = {
  month: string
  amountEur: number
}

export type AdminAnalyticsSnapshot = {
  exportedAt: string
  users: {
    total: number
    byRole: Record<AdminUserRole, number>
    byStatus: Record<AdminUserStatus, number>
  }
  billing: AdminBillingStats | null
  requests: {
    total: number
    active: number
    rows: AdminRequestExportRow[]
  }
  revenueMonthly: AdminRevenueMonth[]
}

function countByRole(users: AdminUserRecord[]): Record<AdminUserRole, number> {
  const base: Record<AdminUserRole, number> = {
    professional: 0,
    family: 0,
    agency: 0,
    structure: 0,
    admin: 0,
  }
  for (const u of users) {
    base[u.role] += 1
  }
  return base
}

function countByStatus(users: AdminUserRecord[]): Record<AdminUserStatus, number> {
  const base: Record<AdminUserStatus, number> = {
    active: 0,
    suspended: 0,
    verify: 0,
  }
  for (const u of users) {
    base[u.status] += 1
  }
  return base
}

export function buildAdminAnalyticsSnapshot(input: {
  billing: AdminBillingStats | null
  requests: AdminRequestExportRow[]
  revenueMonthly: AdminRevenueMonth[]
}): AdminAnalyticsSnapshot {
  const users = loadAdminUserStore().users
  return {
    exportedAt: new Date().toISOString(),
    users: {
      total: users.length,
      byRole: countByRole(users),
      byStatus: countByStatus(users),
    },
    billing: input.billing,
    requests: {
      total: input.requests.length,
      active: input.requests.filter((r) => r.status === 'active').length,
      rows: input.requests,
    },
    revenueMonthly: input.revenueMonthly,
  }
}

function formatMrrEur(cents: number): string {
  return (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export function exportAdminAnalyticsCsv(snapshot: AdminAnalyticsSnapshot): void {
  const rows: (string | number)[][] = [
    ['exported_at', snapshot.exportedAt],
    ['users_total', snapshot.users.total],
    ...Object.entries(snapshot.users.byRole).map(([role, count]) => [
      `users_${role}`,
      count,
      ADMIN_USER_ROLE_LABELS[role as AdminUserRole],
    ]),
    ...Object.entries(snapshot.users.byStatus).map(([status, count]) => [
      `users_status_${status}`,
      count,
      ADMIN_USER_STATUS_LABELS[status as AdminUserStatus],
    ]),
    ['requests_total', snapshot.requests.total],
    ['requests_active', snapshot.requests.active],
  ]

  if (snapshot.billing) {
    rows.push(
      ['billing_active_premium', snapshot.billing.activePremium],
      ['billing_renewals_7d', snapshot.billing.renewalsWithin7Days],
      ['billing_failed_payments', snapshot.billing.failedPayments],
      ['billing_mrr_eur', formatMrrEur(snapshot.billing.mrrCents)],
    )
  }

  for (const { month, amountEur } of snapshot.revenueMonthly) {
    rows.push(['revenue_month', month, amountEur])
  }

  for (const req of snapshot.requests.rows) {
    rows.push([
      'request',
      req.id,
      req.requester,
      req.type,
      req.zone,
      req.date,
      req.status,
      req.applications,
    ])
  }

  const csv = buildCsv(['section', 'key', 'value', 'label'], rows)
  downloadCsv(`admin-analytics-${dateStampForFilename()}.csv`, csv)
}

export function exportAdminAnalyticsJson(snapshot: AdminAnalyticsSnapshot): void {
  downloadJson(`admin-analytics-${dateStampForFilename()}.json`, snapshot)
}
