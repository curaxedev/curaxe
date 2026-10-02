export type PlanType = 'free' | 'premium'

export type BillingAudience = 'professional' | 'agency' | 'structure'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'expiring'

export type BillingProductKey =
  | 'professional_premium_monthly'
  | 'agency_business_monthly'
  | 'structure_premium_monthly'

export type BillingProduct = {
  key: BillingProductKey
  label: string
  amountCents: number
  currency: 'eur'
  interval: 'month'
  planType: PlanType
}

export const BILLING_PRODUCTS: Record<BillingProductKey, BillingProduct> = {
  professional_premium_monthly: {
    key: 'professional_premium_monthly',
    label: 'Premium',
    amountCents: 1990,
    currency: 'eur',
    interval: 'month',
    planType: 'premium',
  },
  agency_business_monthly: {
    key: 'agency_business_monthly',
    label: 'Business',
    amountCents: 4990,
    currency: 'eur',
    interval: 'month',
    planType: 'premium',
  },
  structure_premium_monthly: {
    key: 'structure_premium_monthly',
    label: 'Premium RSA',
    amountCents: 7990,
    currency: 'eur',
    interval: 'month',
    planType: 'premium',
  },
}

export type SubscriptionHistoryEntry = {
  id: string
  planLabel: string
  amountLabel: string
  startedAt: string
  endedAt: string | null
  status: 'completed' | 'canceled' | 'failed'
}

export type UserSubscription = {
  userId: string
  audience: BillingAudience
  planType: PlanType
  productKey: BillingProductKey | null
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  history: SubscriptionHistoryEntry[]
  updatedAt: string
}

export type CheckoutSessionMode = 'embedded' | 'redirect'

export type CreateCheckoutInput = {
  userId: string
  audience: BillingAudience
  productKey: BillingProductKey
  successUrl: string
  cancelUrl: string
}

export type CheckoutSession = {
  sessionId: string
  mode: CheckoutSessionMode
  /** Stripe Checkout URL when `mode === 'redirect'` and Stripe is enabled. */
  url: string | null
  productKey: BillingProductKey
  expiresAt: string
}

export type AdminSubscriptionStatus = 'active' | 'failed' | 'expiring'

export type AdminSubscriptionRow = {
  id: string
  userId: string
  userName: string
  userEmail: string
  audience: BillingAudience
  plan: string
  amount: string
  renewal: string
  status: AdminSubscriptionStatus
}

export type AdminBillingStats = {
  activePremium: number
  renewalsWithin7Days: number
  failedPayments: number
  mrrCents: number
}

export type BillingInvoice = {
  id: string
  number: string | null
  status: string | null
  amountDue: number
  amountPaid: number
  currency: string
  createdAt: string | null
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
}

export type BillingErrorCode =
  | 'not_found'
  | 'session_expired'
  | 'session_invalid'
  | 'already_subscribed'
  | 'network'

export class BillingError extends Error {
  readonly code: BillingErrorCode

  constructor(code: BillingErrorCode, message: string) {
    super(message)
    this.name = 'BillingError'
    this.code = code
  }
}
