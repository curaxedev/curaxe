import type { AdminPlatformSettings } from '../lib/adminSettingsTypes'
import { AdminSettingsError } from '../lib/adminSettingsTypes'

const MOCK_DELAY_MS = 400
const SETTINGS_STORAGE_KEY = 'fa:admin-settings'

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readSettings(): AdminPlatformSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AdminPlatformSettings
  } catch {
    return null
  }
}

function writeSettings(settings: AdminPlatformSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function createDefaultAdminSettings(): AdminPlatformSettings {
  return {
    pricing: {
      premiumMonthlyEur: 19.9,
      premiumYearlyEur: 179,
    },
    emailNotifications: {
      newRegistration: true,
      newRequest: true,
      paymentReceived: true,
      paymentFailed: true,
      profileVerified: true,
    },
    emailTemplates: {
      welcomeSubject: 'Benvenuto su Curaxe',
      paymentFailedSubject: 'Pagamento non riuscito — azione richiesta',
    },
    maintenance: {
      enabled: false,
      message: 'Stiamo effettuando manutenzione. Torneremo presto.',
    },
    commissionRates: {
      professionalPercent: 8,
      agencyPercent: 12,
    },
    featureFlags: {
      b2bJobPostings: true,
      familyMessaging: true,
      stripeCheckout: false,
      maintenanceBanner: false,
    },
    freeLimits: {
      maxRequestsPerMonth: 3,
      maxActiveApplications: 5,
    },
    updatedAt: new Date().toISOString(),
  }
}

export function loadAdminSettings(): AdminPlatformSettings {
  const stored = readSettings()
  if (stored) return stored
  const seed = createDefaultAdminSettings()
  writeSettings(seed)
  return seed
}

function shouldSimulateServerError(actorEmail?: string): boolean {
  return Boolean(actorEmail?.toLowerCase().includes('server-error'))
}

export async function fetchAdminSettings(actorEmail?: string): Promise<AdminPlatformSettings> {
  await delay()
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminSettingsError('server', 'Impossibile caricare le impostazioni. Riprova.')
  }
  return loadAdminSettings()
}

export async function saveAdminSettings(
  patch: Partial<AdminPlatformSettings>,
  actorEmail?: string,
): Promise<AdminPlatformSettings> {
  await delay(300)
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminSettingsError('server', 'Impossibile salvare le impostazioni. Riprova.')
  }

  const current = loadAdminSettings()
  const next: AdminPlatformSettings = {
    ...current,
    ...patch,
    pricing: { ...current.pricing, ...patch.pricing },
    emailNotifications: { ...current.emailNotifications, ...patch.emailNotifications },
    emailTemplates: { ...current.emailTemplates, ...patch.emailTemplates },
    maintenance: { ...current.maintenance, ...patch.maintenance },
    commissionRates: { ...current.commissionRates, ...patch.commissionRates },
    featureFlags: { ...current.featureFlags, ...patch.featureFlags },
    freeLimits: { ...current.freeLimits, ...patch.freeLimits },
    updatedAt: new Date().toISOString(),
  }

  if (next.pricing.premiumMonthlyEur <= 0 || next.pricing.premiumYearlyEur <= 0) {
    throw new AdminSettingsError('validation', 'I prezzi devono essere maggiori di zero.')
  }
  if (next.freeLimits.maxRequestsPerMonth < 0 || next.freeLimits.maxActiveApplications < 0) {
    throw new AdminSettingsError('validation', 'I limiti FREE non possono essere negativi.')
  }
  if (
    next.commissionRates.professionalPercent < 0 ||
    next.commissionRates.professionalPercent > 100 ||
    next.commissionRates.agencyPercent < 0 ||
    next.commissionRates.agencyPercent > 100
  ) {
    throw new AdminSettingsError('validation', 'Le commissioni devono essere tra 0 e 100.')
  }

  writeSettings(next)
  return next
}

export const ADMIN_EMAIL_NOTIFICATION_LABELS: Record<
  keyof AdminPlatformSettings['emailNotifications'],
  string
> = {
  newRegistration: 'Nuova registrazione',
  newRequest: 'Nuova richiesta pubblicata',
  paymentReceived: 'Pagamento ricevuto',
  paymentFailed: 'Pagamento fallito',
  profileVerified: 'Profilo verificato',
}
