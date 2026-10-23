import { HttpError, httpGet } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type AdminOverviewKpis = {
  totalUsers: number
  professionals: number
  families: number
  agenciesStructures: number
  activeRequests: number
  premiumSubscriptions: number
  mrrEstimateEur: number
  pendingJobs: number
  pendingKyc: number
  openTickets: number
}

export type AdminOverviewPayload = {
  generatedAt: string
  kpis: AdminOverviewKpis
  revenueMonthly: Array<{ month: string; amountEur: number }>
}

export class AdminOverviewError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminOverviewError'
  }
}

export async function getAdminOverview(): Promise<AdminOverviewPayload> {
  if (isMockApiEnabled()) {
    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        totalUsers: 0,
        professionals: 0,
        families: 0,
        agenciesStructures: 0,
        activeRequests: 0,
        premiumSubscriptions: 0,
        mrrEstimateEur: 0,
        pendingJobs: 0,
        pendingKyc: 0,
        openTickets: 0,
      },
      revenueMonthly: [],
    }
  }
  try {
    return await httpGet<AdminOverviewPayload>('/api/v1/admin/overview')
  } catch (err) {
    if (err instanceof HttpError) {
      throw new AdminOverviewError(err.message || 'Impossibile caricare overview.')
    }
    throw new AdminOverviewError('Impossibile caricare overview.')
  }
}

export type AdminFamilyRequestRow = {
  id: string
  requester: string
  type: string
  zone: string
  date: string
  status: string
  applications: number
}

export async function getAdminFamilyRequests(): Promise<AdminFamilyRequestRow[]> {
  if (isMockApiEnabled()) return []
  try {
    return await httpGet<AdminFamilyRequestRow[]>('/api/v1/admin/family-requests')
  } catch (err) {
    if (err instanceof HttpError) {
      throw new AdminOverviewError(err.message || 'Impossibile caricare le richieste.')
    }
    throw new AdminOverviewError('Impossibile caricare le richieste.')
  }
}
