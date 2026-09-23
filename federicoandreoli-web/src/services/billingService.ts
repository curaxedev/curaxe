import { isStripeEnabled } from '../lib/billingFeatures'
import { getSiteOrigin } from '../lib/runtimeConfig'
import type {
  AdminBillingStats,
  AdminSubscriptionRow,
  BillingAudience,
  BillingProductKey,
  CheckoutSession,
  CheckoutSessionMode,
  CreateCheckoutInput,
  PlanType,
  SubscriptionHistoryEntry,
  UserSubscription,
} from '../lib/billingTypes'
import {
  BILLING_PRODUCTS,
  BillingError,
} from '../lib/billingTypes'

const MOCK_DELAY_MS = 400
const STORAGE_KEY = 'fa:billing-store'

type PendingCheckout = {
  sessionId: string
  userId: string
  audience: BillingAudience
  productKey: BillingProductKey
  successUrl: string
  cancelUrl: string
  createdAt: string
  expiresAt: string
}

type BillingStore = {
  subscriptions: Record<string, UserSubscription>
  pendingCheckouts: Record<string, PendingCheckout>
}

const SEED_ADMIN_ROWS: AdminSubscriptionRow[] = [
  {
    id: 'sub-1',
    userId: 'prof-1',
    userName: 'Maria Rossi',
    userEmail: 'maria.rossi@email.it',
    audience: 'professional',
    plan: 'Premium',
    amount: '€19,90',
    renewal: '12 giu 2026',
    status: 'active',
  },
  {
    id: 'sub-2',
    userId: 'prof-8',
    userName: 'Luciana Toma',
    userEmail: 'l.toma@email.it',
    audience: 'professional',
    plan: 'Premium',
    amount: '€19,90',
    renewal: '14 giu 2026',
    status: 'active',
  },
  {
    id: 'sub-3',
    userId: 'prof-6',
    userName: 'Florentina Pop',
    userEmail: 'fpop@email.it',
    audience: 'professional',
    plan: 'Premium',
    amount: '€19,90',
    renewal: '18 giu 2026',
    status: 'failed',
  },
  {
    id: 'sub-4',
    userId: 'prof-9',
    userName: 'Giuseppe Pieri',
    userEmail: 'g.pieri@email.it',
    audience: 'professional',
    plan: 'Premium',
    amount: '€19,90',
    renewal: '08 giu 2026',
    status: 'expiring',
  },
  {
    id: 'sub-5',
    userId: 'prof-10',
    userName: 'Antonella Toni',
    userEmail: 'c.ionescu@email.it',
    audience: 'professional',
    plan: 'Premium',
    amount: '€19,90',
    renewal: '20 giu 2026',
    status: 'active',
  },
  {
    id: 'sub-6',
    userId: 'agency-1',
    userName: 'AuraCare Srl',
    userEmail: 'info@auracare.it',
    audience: 'agency',
    plan: 'Business',
    amount: '€49,90',
    renewal: '22 giu 2026',
    status: 'active',
  },
]

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readStore(): BillingStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { subscriptions: {}, pendingCheckouts: {} }
    }
    return JSON.parse(raw) as BillingStore
  } catch {
    return { subscriptions: {}, pendingCheckouts: {} }
  }
}

function writeStore(store: BillingStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function subscriptionKey(userId: string, audience: BillingAudience): string {
  return `${audience}:${userId}`
}

function defaultSubscription(userId: string, audience: BillingAudience): UserSubscription {
  return {
    userId,
    audience,
    planType: 'free',
    productKey: null,
    status: 'canceled',
    currentPeriodEnd: null,
    trialEndsAt: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    history: [],
    updatedAt: new Date().toISOString(),
  }
}

function formatEuro(cents: number): string {
  const value = cents / 100
  return `€${value.toFixed(2).replace('.', ',')}`
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

function formatItalianDate(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatBillingDate(iso: string): string {
  return formatItalianDate(iso)
}

export function formatBillingAmount(productKey: BillingProductKey): string {
  return formatEuro(BILLING_PRODUCTS[productKey].amountCents)
}

function checkoutMode(audience: BillingAudience): CheckoutSessionMode {
  if (isStripeEnabled()) return 'redirect'
  return audience === 'professional' ? 'embedded' : 'redirect'
}

function defaultCheckoutPath(audience: BillingAudience): string {
  switch (audience) {
    case 'professional':
      return '/dashboard/professionale/piano/checkout'
    case 'agency':
      return '/dashboard/agenzia/piano/checkout'
    case 'structure':
      return '/dashboard/struttura/piano/checkout'
    default: {
      const _x: never = audience
      return _x
    }
  }
}

function siteOrigin(): string {
  const configured = getSiteOrigin()
  if (configured) return configured
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

function mockCheckoutPath(successUrl: string, sessionId: string): string {
  try {
    const origin = siteOrigin() || 'http://localhost'
    const parsed = new URL(successUrl, origin)
    const checkoutPath = parsed.pathname.replace(/\/esito$/, '/checkout')
    return `${checkoutPath}?session_id=${encodeURIComponent(sessionId)}`
  } catch {
    return `${defaultCheckoutPath('agency')}?session_id=${encodeURIComponent(sessionId)}`
  }
}

export async function fetchUserSubscription(
  userId: string,
  audience: BillingAudience,
): Promise<UserSubscription> {
  await delay()
  const store = readStore()
  const key = subscriptionKey(userId, audience)
  return store.subscriptions[key] ?? defaultSubscription(userId, audience)
}

export async function createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession> {
  await delay()
  const store = readStore()
  const key = subscriptionKey(input.userId, input.audience)
  const existing = store.subscriptions[key] ?? defaultSubscription(input.userId, input.audience)

  if (existing.planType === 'premium' && existing.status === 'active') {
    throw new BillingError('already_subscribed', 'Hai già un abbonamento attivo.')
  }

  const sessionId = `cs_mock_${crypto.randomUUID().slice(0, 8)}`
  const createdAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const resolvedSuccessUrl = input.successUrl.replace('{CHECKOUT_SESSION_ID}', sessionId)
  const resolvedCancelUrl = input.cancelUrl.replace('{CHECKOUT_SESSION_ID}', sessionId)

  store.pendingCheckouts[sessionId] = {
    sessionId,
    userId: input.userId,
    audience: input.audience,
    productKey: input.productKey,
    successUrl: resolvedSuccessUrl,
    cancelUrl: resolvedCancelUrl,
    createdAt,
    expiresAt,
  }
  writeStore(store)

  const mode = checkoutMode(input.audience)
  const url =
    mode === 'redirect'
      ? `${siteOrigin()}${mockCheckoutPath(resolvedSuccessUrl, sessionId)}`
      : null

  return {
    sessionId,
    mode,
    url,
    productKey: input.productKey,
    expiresAt,
  }
}

export async function completeCheckoutSession(sessionId: string): Promise<UserSubscription> {
  await delay(600)
  const store = readStore()
  const pending = store.pendingCheckouts[sessionId]
  if (!pending) {
    throw new BillingError('session_invalid', 'Sessione di pagamento non valida.')
  }
  if (new Date(pending.expiresAt).getTime() <= Date.now()) {
    delete store.pendingCheckouts[sessionId]
    writeStore(store)
    throw new BillingError('session_expired', 'La sessione di pagamento è scaduta. Riprova.')
  }

  const product = BILLING_PRODUCTS[pending.productKey]
  const key = subscriptionKey(pending.userId, pending.audience)
  const now = new Date().toISOString()
  const periodEnd = addMonths(now, 1)

  const historyEntry: SubscriptionHistoryEntry = {
    id: `hist_${sessionId}`,
    planLabel: product.label,
    amountLabel: formatEuro(product.amountCents),
    startedAt: now,
    endedAt: null,
    status: 'completed',
  }

  const previous = store.subscriptions[key]
  const history = previous?.history ?? []

  store.subscriptions[key] = {
    userId: pending.userId,
    audience: pending.audience,
    planType: product.planType,
    productKey: pending.productKey,
    status: 'active',
    currentPeriodEnd: periodEnd,
    trialEndsAt: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: isStripeEnabled() ? `cus_mock_${pending.userId}` : null,
    stripeSubscriptionId: `sub_mock_${sessionId}`,
    history: [historyEntry, ...history],
    updatedAt: now,
  }

  delete store.pendingCheckouts[sessionId]
  writeStore(store)

  return store.subscriptions[key]
}

export async function cancelUserSubscription(
  userId: string,
  audience: BillingAudience,
): Promise<UserSubscription> {
  await delay()
  const store = readStore()
  const key = subscriptionKey(userId, audience)
  const current = store.subscriptions[key]
  if (!current || current.planType !== 'premium') {
    throw new BillingError('not_found', 'Nessun abbonamento attivo da annullare.')
  }

  const now = new Date().toISOString()
  const updated: UserSubscription = {
    ...current,
    cancelAtPeriodEnd: true,
    status: 'expiring',
    updatedAt: now,
    history: current.history.map((h) =>
      h.endedAt === null ? { ...h, endedAt: current.currentPeriodEnd, status: 'canceled' as const } : h,
    ),
  }
  store.subscriptions[key] = updated
  writeStore(store)
  return updated
}

export async function fetchAdminBillingStats(): Promise<AdminBillingStats> {
  await delay()
  const rows = await fetchAdminSubscriptions()
  const activePremium = rows.filter((r) => r.status === 'active').length
  const renewalsWithin7Days = rows.filter((r) => r.status === 'expiring').length
  const failedPayments = rows.filter((r) => r.status === 'failed').length

  const mrrCents = rows.reduce((sum, row) => {
    if (row.status !== 'active' && row.status !== 'expiring') return sum
    const match = row.amount.match(/[\d,]+/)
    if (!match) return sum
    const euros = Number.parseFloat(match[0].replace(',', '.'))
    return sum + Math.round(euros * 100)
  }, 0)

  return {
    activePremium,
    renewalsWithin7Days,
    failedPayments,
    mrrCents,
  }
}

export async function fetchAdminSubscriptions(): Promise<AdminSubscriptionRow[]> {
  await delay()
  const store = readStore()
  const dynamicRows: AdminSubscriptionRow[] = Object.values(store.subscriptions)
    .filter((s) => s.planType === 'premium' && s.status === 'active')
    .map((s) => {
      const product = s.productKey ? BILLING_PRODUCTS[s.productKey] : null
      return {
        id: `live-${s.userId}`,
        userId: s.userId,
        userName: s.userId,
        userEmail: '',
        audience: s.audience,
        plan: product?.label ?? 'Premium',
        amount: product ? formatEuro(product.amountCents) : '—',
        renewal: s.currentPeriodEnd ? formatItalianDate(s.currentPeriodEnd) : '—',
        status: s.cancelAtPeriodEnd ? ('expiring' as const) : ('active' as const),
      }
    })

  const seedIds = new Set(SEED_ADMIN_ROWS.map((r) => r.userId))
  const merged = [
    ...dynamicRows.filter((r) => !seedIds.has(r.userId)),
    ...SEED_ADMIN_ROWS,
  ]

  return merged.sort((a, b) => a.userName.localeCompare(b.userName, 'it'))
}

export function productKeyForAudience(audience: BillingAudience): BillingProductKey {
  switch (audience) {
    case 'professional':
      return 'professional_premium_monthly'
    case 'agency':
      return 'agency_business_monthly'
    case 'structure':
      return 'structure_premium_monthly'
    default: {
      const _x: never = audience
      return _x
    }
  }
}

export function planTypeFromSubscription(sub: UserSubscription | null): PlanType {
  if (!sub) return 'free'
  if (
    sub.planType === 'premium' &&
    (sub.status === 'active' || sub.status === 'expiring' || sub.status === 'trialing')
  ) {
    return 'premium'
  }
  return 'free'
}
