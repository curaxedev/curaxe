/**
 * Billing API — doppio binario mock / Laravel (+ Stripe quando configurato).
 */
import type {
  AdminBillingStats,
  AdminSubscriptionRow,
  BillingAudience,
  BillingInvoice,
  CheckoutSession,
  CreateCheckoutInput,
  UserSubscription,
} from './billingTypes'
import { BillingError } from './billingTypes'
import {
  cancelUserSubscription,
  completeCheckoutSession,
  createCheckoutSession,
  fetchAdminBillingStats,
  fetchAdminSubscriptions,
  fetchUserSubscription,
  formatBillingAmount,
  formatBillingDate,
  planTypeFromSubscription,
  productKeyForAudience,
} from '../services/billingService'
import { HttpError, httpGet, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type {
  AdminBillingStats,
  AdminSubscriptionRow,
  BillingAudience,
  BillingInvoice,
  BillingProductKey,
  CheckoutSession,
  CreateCheckoutInput,
  PlanType,
  SubscriptionHistoryEntry,
  UserSubscription,
} from './billingTypes'
export { BillingError, BILLING_PRODUCTS } from './billingTypes'
// BILLING_PRODUCTS re-exported for dashboard consumers
export {
  formatBillingAmount,
  formatBillingDate,
  planTypeFromSubscription,
  productKeyForAudience,
}

type ApiSubscription = {
  userId: string
  audience: BillingAudience
  planType: string
  status: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentPeriodEnd: string | null
  trialEndsAt?: string | null
  cancelAtPeriodEnd: boolean
  history: Array<{ at: string; event: string }>
}

function mapSubscription(raw: ApiSubscription): UserSubscription {
  const isPremium =
    (raw.status === 'active' || raw.status === 'trialing') && raw.planType !== 'free'
  const productKey = isPremium ? productKeyForAudience(raw.audience) : null
  return {
    userId: raw.userId,
    audience: raw.audience,
    planType: isPremium ? 'premium' : 'free',
    productKey,
    status: (raw.status as UserSubscription['status']) || 'inactive',
    currentPeriodEnd: raw.currentPeriodEnd,
    trialEndsAt: raw.trialEndsAt ?? null,
    cancelAtPeriodEnd: raw.cancelAtPeriodEnd,
    stripeCustomerId: raw.stripeCustomerId,
    stripeSubscriptionId: raw.stripeSubscriptionId,
    history: (raw.history ?? []).map((h, i) => ({
      id: `h-${i}`,
      planLabel: raw.planType,
      amountLabel: '—',
      startedAt: h.at,
      endedAt: null,
      status: h.event.includes('fail') ? 'failed' : 'completed',
    })),
    updatedAt: new Date().toISOString(),
  }
}

function toBillingError(err: unknown, fallback: string): BillingError {
  if (err instanceof HttpError) {
    if (err.kind === 'not_found') return new BillingError('not_found', err.message)
    return new BillingError('network', err.message || fallback)
  }
  return new BillingError('network', fallback)
}

export async function getBillingSubscription(
  userId: string,
  audience: BillingAudience,
): Promise<UserSubscription> {
  if (isMockApiEnabled()) return fetchUserSubscription(userId, audience)
  try {
    const raw = await httpGet<ApiSubscription>('/api/v1/billing/subscription')
    return mapSubscription(raw)
  } catch (err) {
    throw toBillingError(err, 'Impossibile caricare l’abbonamento.')
  }
}

export async function postBillingCheckoutSession(
  input: CreateCheckoutInput,
): Promise<CheckoutSession> {
  if (isMockApiEnabled()) return createCheckoutSession(input)
  try {
    const raw = await httpPost<{
      sessionId: string
      mode: 'redirect' | 'mock'
      url: string | null
      audience: BillingAudience
    }>('/api/v1/billing/checkout-sessions', {
      body: {
        audience: input.audience,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      },
    })
    return {
      sessionId: raw.sessionId,
      mode: raw.mode === 'redirect' ? 'redirect' : 'embedded',
      url: raw.url,
      productKey: input.productKey,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    }
  } catch (err) {
    throw toBillingError(err, 'Creazione sessione di pagamento non riuscita.')
  }
}

export async function postBillingCheckoutComplete(sessionId: string): Promise<UserSubscription> {
  if (isMockApiEnabled()) return completeCheckoutSession(sessionId)
  try {
    const raw = await httpPost<ApiSubscription>(
      `/api/v1/billing/checkout-sessions/${sessionId}/complete`,
    )
    return mapSubscription(raw)
  } catch (err) {
    throw toBillingError(err, 'Completamento pagamento non riuscito.')
  }
}

export async function postBillingCancel(
  userId: string,
  audience: BillingAudience,
): Promise<UserSubscription> {
  if (isMockApiEnabled()) return cancelUserSubscription(userId, audience)
  try {
    const raw = await httpPost<ApiSubscription>('/api/v1/billing/subscription/cancel')
    return mapSubscription(raw)
  } catch (err) {
    throw toBillingError(err, 'Cancellazione abbonamento non riuscita.')
  }
}

export async function postBillingPortalSession(returnUrl?: string): Promise<{ url: string }> {
  if (isMockApiEnabled()) {
    throw new BillingError('network', 'Customer Portal disponibile solo con Stripe configurato.')
  }
  try {
    return await httpPost<{ url: string }>('/api/v1/billing/portal-sessions', {
      body: { returnUrl },
    })
  } catch (err) {
    throw toBillingError(err, 'Apertura Customer Portal non riuscita.')
  }
}

export async function getBillingInvoices(): Promise<BillingInvoice[]> {
  if (isMockApiEnabled()) return []
  try {
    const raw = await httpGet<{ invoices: BillingInvoice[] }>('/api/v1/billing/invoices')
    return Array.isArray(raw.invoices) ? raw.invoices : []
  } catch (err) {
    throw toBillingError(err, 'Impossibile caricare le fatture.')
  }
}

export async function getAdminBillingSubscriptions(): Promise<AdminSubscriptionRow[]> {
  if (isMockApiEnabled()) return fetchAdminSubscriptions()
  try {
    const rows = await httpGet<
      Array<{
        id?: string
        userId: string
        userName: string
        userEmail: string
        audience: BillingAudience
        planType: string
        status: string
        currentPeriodEnd: string | null
        cancelAtPeriodEnd: boolean
      }>
    >('/api/v1/admin/billing/subscriptions')
    return rows.map((r, i) => ({
      id: r.id ?? (r.userId ? `sub-${r.userId}` : `sub-${i}`),
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      audience: r.audience,
      plan: r.planType,
      amount: '—',
      renewal: r.currentPeriodEnd ?? '—',
      status: r.cancelAtPeriodEnd
        ? 'expiring'
        : r.status === 'active' || r.status === 'trialing'
          ? 'active'
          : 'failed',
    }))
  } catch (err) {
    throw toBillingError(err, 'Impossibile caricare gli abbonamenti admin.')
  }
}

export async function getAdminBillingStats(): Promise<AdminBillingStats> {
  if (isMockApiEnabled()) return fetchAdminBillingStats()
  try {
    const raw = await httpGet<{
      activeSubscriptions: number
      cancelingAtPeriodEnd: number
      pastDue?: number
      trialing?: number
      mrrEstimate: number
    }>('/api/v1/admin/billing/stats')
    return {
      activePremium: raw.activeSubscriptions,
      renewalsWithin7Days: raw.cancelingAtPeriodEnd,
      failedPayments: raw.pastDue ?? 0,
      mrrCents: raw.mrrEstimate * 100,
    }
  } catch (err) {
    throw toBillingError(err, 'Impossibile caricare le stats billing.')
  }
}
