/**
 * Metriche dashboard professionista.
 * GET /api/v1/professionals/me/stats
 */
import { httpGet } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type ProfessionalHomeStats = {
  profileViewsTotal: number
  profileViewsLast7Days: number
  profileViewsPrevious7Days: number
  weekChangePercent: number | null
}

const EMPTY: ProfessionalHomeStats = {
  profileViewsTotal: 0,
  profileViewsLast7Days: 0,
  profileViewsPrevious7Days: 0,
  weekChangePercent: null,
}

export async function fetchProfessionalHomeStats(): Promise<ProfessionalHomeStats> {
  if (isMockApiEnabled()) return EMPTY
  try {
    return await httpGet<ProfessionalHomeStats>('/api/v1/professionals/me/stats')
  } catch {
    return EMPTY
  }
}
