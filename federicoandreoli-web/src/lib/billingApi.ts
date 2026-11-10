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
  requiresAction?: boolean
  hostedInvoiceUrl?: string | null
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
    requiresAction: Boolean(raw.requiresAction),
    hostedInvoiceUrl: raw.hostedInvoiceUrl ?? null,
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
    // Solo hosted Checkout (Stripe o mock redirect). Mai «embedded» con carta su Curaxe.
    return {
      sessionId: raw.sessionId,
      mode: 'redirect',
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

export async function getAdminBillingSubscriptions(
  options: { trash?: boolean } = {},
): Promise<AdminSubscriptionRow[]> {
  if (isMockApiEnabled()) return fetchAdminSubscriptions()
  try {
    const q = options.trash ? '?trash=1' : ''
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
        trialEndsAt?: string | null
        cancelAtPeriodEnd: boolean
        trashedAt?: string | null
        canTrash?: boolean
      }>
    >(`/api/v1/admin/billing/subscriptions${q}`)
    return rows.map((r, i) => {
      const periodEnd = r.currentPeriodEnd ?? null
      return {
        id: r.id ?? (r.userId ? `sub-${r.userId}` : `sub-${i}`),
        userId: r.userId,
        userName: r.userName,
        userEmail: r.userEmail,
        audience: r.audience,
        plan: r.planType,
        amount: '—',
        renewal: periodEnd ?? '—',
        status: r.cancelAtPeriodEnd
          ? 'expiring'
          : r.status === 'active' || r.status === 'trialing'
            ? 'active'
            : 'failed',
        rawStatus: r.status,
        billingKind: r.status === 'trialing' ? 'trial' : 'paid',
        currentPeriodEnd: periodEnd,
        trialEndsAt: r.trialEndsAt ?? null,
        cancelAtPeriodEnd: Boolean(r.cancelAtPeriodEnd),
        trashedAt: r.trashedAt ?? null,
        canTrash: Boolean(r.canTrash),
      }
    })
  } catch (err) {
    throw toBillingError(err, 'Impossibile caricare gli abbonamenti admin.')
  }
}

export async function getAdminSubscriptionInvoices(
  subscriptionId: string,
): Promise<{ billingKind: 'trial' | 'paid'; invoices: BillingInvoice[] }> {
  if (isMockApiEnabled()) {
    return {
      billingKind: 'paid',
      invoices: [
        {
          id: 'inv_mock_1',
          number: 'CURAXE-1001',
          status: 'paid',
          amountDue: 1990,
          amountPaid: 1990,
          currency: 'eur',
          createdAt: new Date().toISOString(),
          hostedInvoiceUrl: null,
          invoicePdf: null,
        },
      ],
    }
  }
  try {
    const raw = await httpGet<{
      billingKind?: 'trial' | 'paid'
      invoices?: BillingInvoice[]
    }>(`/api/v1/admin/billing/subscriptions/${subscriptionId}/invoices`)
    return {
      billingKind: raw.billingKind === 'trial' ? 'trial' : 'paid',
      invoices: Array.isArray(raw.invoices) ? raw.invoices : [],
    }
  } catch (err) {
    throw toBillingError(err, 'Impossibile caricare le fatture admin.')
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
      trashed?: number
      renewalsWithin7Days?: number
      renewalsWithin30Days?: number
      mrrEstimate: number
      mrrCents?: number
    }>('/api/v1/admin/billing/stats')
    return {
      activePremium: raw.activeSubscriptions,
      paused: raw.cancelingAtPeriodEnd,
      renewalsWithin7Days: raw.renewalsWithin7Days ?? raw.cancelingAtPeriodEnd,
      renewalsWithin30Days: raw.renewalsWithin30Days ?? raw.renewalsWithin7Days ?? 0,
      failedPayments: raw.pastDue ?? 0,
      mrrCents: typeof raw.mrrCents === 'number' ? raw.mrrCents : raw.mrrEstimate * 100,
      trashed: raw.trashed ?? 0,
      trialing: raw.trialing ?? 0,
    }
  } catch (err) {
    throw toBillingError(err, 'Impossibile caricare le stats billing.')
  }
}
