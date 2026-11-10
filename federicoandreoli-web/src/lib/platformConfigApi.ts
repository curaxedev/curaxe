import { httpGet } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type PlatformFeatureFlags = {
  b2bJobPostings: boolean
  familyMessaging: boolean
  stripeCheckout: boolean
  maintenanceBanner: boolean
}

export type PlatformPublicConfig = {
  featureFlags: PlatformFeatureFlags
  maintenance: {
    enabled: boolean
    message: string
    showBanner: boolean
  }
  freeLimits: {
    maxRequestsPerMonth: number
    maxActiveApplications: number
  }
}

const DEFAULT_CONFIG: PlatformPublicConfig = {
  featureFlags: {
    b2bJobPostings: true,
    familyMessaging: true,
    stripeCheckout: true,
    maintenanceBanner: false,
  },
  maintenance: {
    enabled: false,
    message: 'Stiamo effettuando manutenzione. Torneremo presto.',
    showBanner: false,
  },
  freeLimits: {
    maxRequestsPerMonth: 3,
    maxActiveApplications: 5,
  },
}

let cached: PlatformPublicConfig | null = null
let inflight: Promise<PlatformPublicConfig> | null = null

export function getCachedPlatformConfig(): PlatformPublicConfig {
  return cached ?? DEFAULT_CONFIG
}

export async function fetchPlatformConfig(force = false): Promise<PlatformPublicConfig> {
  if (!force && cached) return cached
  if (!force && inflight) return inflight

  inflight = (async () => {
    if (isMockApiEnabled()) {
      cached = DEFAULT_CONFIG
      return cached
    }
    try {
      const data = await httpGet<PlatformPublicConfig>('/api/v1/platform/config', {
        anonymous: true,
      })
      cached = {
        featureFlags: {
          b2bJobPostings: Boolean(data.featureFlags?.b2bJobPostings),
          familyMessaging: Boolean(data.featureFlags?.familyMessaging),
          stripeCheckout: Boolean(data.featureFlags?.stripeCheckout),
          maintenanceBanner: Boolean(data.featureFlags?.maintenanceBanner),
        },
        maintenance: {
          enabled: Boolean(data.maintenance?.enabled),
          message:
            typeof data.maintenance?.message === 'string' && data.maintenance.message.trim() !== ''
              ? data.maintenance.message
              : DEFAULT_CONFIG.maintenance.message,
          showBanner: Boolean(data.maintenance?.showBanner),
        },
        freeLimits: {
          maxRequestsPerMonth: Math.max(0, Number(data.freeLimits?.maxRequestsPerMonth ?? 3)),
          maxActiveApplications: Math.max(0, Number(data.freeLimits?.maxActiveApplications ?? 5)),
        },
      }
      return cached
    } catch {
      cached = DEFAULT_CONFIG
      return cached
    } finally {
      inflight = null
    }
  })()

  return inflight
}
