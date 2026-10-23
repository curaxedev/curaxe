/**
 * Admin Stripe billing settings + diagnostic (landlord wizard).
 */
import { HttpError, httpGet, httpPost, httpPut } from './http'
import { withAdminStepUp } from './adminSecurityApi'
import { isMockApiEnabled } from './runtimeConfig'
import { DEFAULT_PLAN_CATALOG, type PlanCatalogEntry } from './planCatalog'

export type { PlanCatalogEntry }

export type BillingSettingsPayload = {
  mode: 'test' | 'live'
  publishableKey: string | null
  secretKeyHint: string | null
  webhookSecretHint: string | null
  hasSecretKey: boolean
  hasWebhookSecret: boolean
  priceProfessional: string | null
  priceAgency: string | null
  priceStructure: string | null
  trialDaysProfessional: number
  trialDaysAgency: number
  trialDaysStructure: number
  plans: PlanCatalogEntry[]
  /** Blocco edit commerciale se ci sono iscritti active/trialing sul Price ID. */
  planLocks?: Record<string, PlanLockInfo>
  portalConfigurationId: string | null
  webhookEndpointId: string | null
  webhookUrl: string
  lastDiagnostic: DiagnosticResult | null
  setupCompletedAt: string | null
  setupComplete: boolean
}

export type DiagnosticCheck = {
  id: string
  label: string
  pass: boolean
  detail: string
}

export type DiagnosticResult = {
  ok: boolean
  checks: DiagnosticCheck[]
  requiredEvents?: string[]
  webhookUrl?: string
  ranAt?: string
}

export const STRIPE_BILLING_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'charge.refunded',
  'refund.created',
  'refund.updated',
  'refund.failed',
  'customer.subscription.trial_will_end',
] as const

/** Wizard Stripe: solo infrastruttura. I piani si gestiscono solo nel Catalogo piani. */
export const STRIPE_WIZARD_STEPS = [
  { id: 'mode', label: 'Modalità' },
  { id: 'webhook', label: 'Webhook' },
  { id: 'keys', label: 'Chiavi' },
  { id: 'verify', label: 'Verifica' },
  { id: 'done', label: 'Fine' },
] as const

export type PlanLockInfo = {
  activeSubscribers: number
  locked: boolean
}

const MOCK_SETTINGS: BillingSettingsPayload = {
  mode: 'test',
  publishableKey: null,
  secretKeyHint: null,
  webhookSecretHint: null,
  hasSecretKey: false,
  hasWebhookSecret: false,
  priceProfessional: null,
  priceAgency: null,
  priceStructure: null,
  trialDaysProfessional: 14,
  trialDaysAgency: 14,
  trialDaysStructure: 14,
  plans: DEFAULT_PLAN_CATALOG.map((p) => ({ ...p, features: [...p.features] })),
  planLocks: {},
  portalConfigurationId: null,
  webhookEndpointId: null,
  webhookUrl: 'https://api.curaxe.it/api/v1/webhooks/stripe',
  lastDiagnostic: null,
  setupCompletedAt: null,
  setupComplete: false,
}

export async function getAdminBillingSettings(): Promise<BillingSettingsPayload> {
  if (isMockApiEnabled()) {
    return {
      ...MOCK_SETTINGS,
      plans: DEFAULT_PLAN_CATALOG.map((p) => ({ ...p, features: [...p.features] })),
    }
  }
  const data = await httpGet<BillingSettingsPayload>('/api/v1/admin/billing/settings')
  return {
    ...data,
    plans:
      Array.isArray(data.plans) && data.plans.length > 0
        ? data.plans
        : DEFAULT_PLAN_CATALOG.map((p) => ({ ...p, features: [...p.features] })),
  }
}

export type UpdateBillingSettingsInput = {
  mode?: 'test' | 'live'
  publishableKey?: string
  secretKey?: string
  webhookSecret?: string
  priceProfessional?: string
  priceAgency?: string
  priceStructure?: string
  trialDaysProfessional?: number
  trialDaysAgency?: number
  trialDaysStructure?: number
  portalConfigurationId?: string
  markSetupComplete?: boolean
  plans?: PlanCatalogEntry[]
}

function billingSettingsStepUpAction(input: UpdateBillingSettingsInput): string | null {
  const touchesKeys =
    Boolean(input.secretKey) ||
    Boolean(input.webhookSecret) ||
    input.publishableKey !== undefined
  const touchesPlans =
    input.plans !== undefined ||
    input.priceProfessional !== undefined ||
    input.priceAgency !== undefined ||
    input.priceStructure !== undefined
  if (touchesKeys) return 'billing.stripe_keys'
  if (touchesPlans) return 'billing.plans'
  return null
}

export async function putAdminBillingSettings(
  input: UpdateBillingSettingsInput,
): Promise<BillingSettingsPayload> {
  if (isMockApiEnabled()) {
    return {
      ...MOCK_SETTINGS,
      ...input,
      mode: input.mode ?? MOCK_SETTINGS.mode,
      plans: input.plans
        ? input.plans.map((p) => ({ ...p, features: [...p.features] }))
        : MOCK_SETTINGS.plans.map((p) => ({ ...p, features: [...p.features] })),
      hasSecretKey: Boolean(input.secretKey) || MOCK_SETTINGS.hasSecretKey,
      hasWebhookSecret: Boolean(input.webhookSecret) || MOCK_SETTINGS.hasWebhookSecret,
      secretKeyHint: input.secretKey ? `${input.secretKey.slice(0, 7)}…` : MOCK_SETTINGS.secretKeyHint,
      webhookSecretHint: input.webhookSecret
        ? `${input.webhookSecret.slice(0, 7)}…`
        : MOCK_SETTINGS.webhookSecretHint,
      setupComplete: Boolean(input.markSetupComplete) || MOCK_SETTINGS.setupComplete,
      setupCompletedAt: input.markSetupComplete
        ? new Date().toISOString()
        : MOCK_SETTINGS.setupCompletedAt,
    }
  }
  const action = billingSettingsStepUpAction(input)
  const put = (token?: string) =>
    httpPut<BillingSettingsPayload>('/api/v1/admin/billing/settings', {
      body: input,
      headers: token ? { 'X-Step-Up-Token': token } : undefined,
    })
  if (!action) return put()
  return withAdminStepUp(action, put)
}

export async function postAdminBillingDiagnostic(): Promise<DiagnosticResult> {
  if (isMockApiEnabled()) {
    return {
      ok: false,
      checks: [
        { id: 'credentials', label: 'Credenziali', pass: false, detail: 'Modalità mock' },
        { id: 'api', label: 'API Stripe', pass: false, detail: 'Disabilitato in mock' },
      ],
      requiredEvents: [...STRIPE_BILLING_EVENTS],
      ranAt: new Date().toISOString(),
    }
  }
  return httpPost<DiagnosticResult>('/api/v1/admin/billing/diagnostic')
}

export async function postAdminSubscriptionRefund(
  id: string,
  amountCents?: number,
  reason?: string,
): Promise<void> {
  if (isMockApiEnabled()) return
  await withAdminStepUp('billing.refund', (token) =>
    httpPost(`/api/v1/admin/billing/subscriptions/${id}/refund`, {
      body: { amountCents, reason },
      headers: token ? { 'X-Step-Up-Token': token } : undefined,
    }),
  )
}

export async function postAdminExtendTrial(id: string, days: number): Promise<void> {
  if (isMockApiEnabled()) return
  await withAdminStepUp('billing.subscription', (token) =>
    httpPost(`/api/v1/admin/billing/subscriptions/${id}/extend-trial`, {
      body: { days },
      headers: token ? { 'X-Step-Up-Token': token } : undefined,
    }),
  )
}

export async function postAdminCancelSubscription(id: string): Promise<void> {
  if (isMockApiEnabled()) return
  await withAdminStepUp('billing.subscription', (token) =>
    httpPost(`/api/v1/admin/billing/subscriptions/${id}/cancel`, {
      headers: token ? { 'X-Step-Up-Token': token } : undefined,
    }),
  )
}

export function billingSettingsError(err: unknown): string {
  if (err instanceof HttpError) return err.message
  return 'Operazione billing non riuscita.'
}
