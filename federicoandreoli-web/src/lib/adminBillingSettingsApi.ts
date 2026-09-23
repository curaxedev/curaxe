/**
 * Admin Stripe billing settings + diagnostic (landlord wizard).
 */
import { HttpError, httpGet, httpPost, httpPut } from './http'
import { isMockApiEnabled } from './runtimeConfig'

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

export const STRIPE_WIZARD_STEPS = [
  { id: 'mode', label: 'Modalità' },
  { id: 'webhook', label: 'Webhook' },
  { id: 'keys', label: 'Chiavi' },
  { id: 'prices', label: 'Piani' },
  { id: 'verify', label: 'Verifica' },
  { id: 'done', label: 'Fine' },
] as const

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
  portalConfigurationId: null,
  webhookEndpointId: null,
  webhookUrl: 'https://api.curaxe.it/api/v1/webhooks/stripe',
  lastDiagnostic: null,
  setupCompletedAt: null,
  setupComplete: false,
}

export async function getAdminBillingSettings(): Promise<BillingSettingsPayload> {
  if (isMockApiEnabled()) return { ...MOCK_SETTINGS }
  return httpGet<BillingSettingsPayload>('/api/v1/admin/billing/settings')
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
}

export async function putAdminBillingSettings(
  input: UpdateBillingSettingsInput,
): Promise<BillingSettingsPayload> {
  if (isMockApiEnabled()) {
    return {
      ...MOCK_SETTINGS,
      ...input,
      mode: input.mode ?? MOCK_SETTINGS.mode,
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
  return httpPut<BillingSettingsPayload>('/api/v1/admin/billing/settings', { body: input })
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
  await httpPost(`/api/v1/admin/billing/subscriptions/${id}/refund`, {
    body: { amountCents, reason },
  })
}

export async function postAdminExtendTrial(id: string, days: number): Promise<void> {
  if (isMockApiEnabled()) return
  await httpPost(`/api/v1/admin/billing/subscriptions/${id}/extend-trial`, {
    body: { days },
  })
}

export async function postAdminCancelSubscription(id: string): Promise<void> {
  if (isMockApiEnabled()) return
  await httpPost(`/api/v1/admin/billing/subscriptions/${id}/cancel`)
}

export function billingSettingsError(err: unknown): string {
  if (err instanceof HttpError) return err.message
  return 'Operazione billing non riuscita.'
}
