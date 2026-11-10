/**
 * Catalogo piani unico (admin + clienti).
 * Fonte: GET /api/v1/billing/plans · scrittura admin via billing settings.
 */
import { httpGet } from './http'
import { isMockApiEnabled } from './runtimeConfig'
import type { BillingAudience, BillingProductKey } from './billingTypes'

export type PlanCatalogEntry = {
  key: string
  audience: BillingAudience
  label: string
  tagline: string
  amountCents: number
  currency: 'eur'
  interval: 'month' | 'year'
  trialDays: number
  stripePriceId?: string | null
  stripeProductId?: string | null
  /** Ultimo Price Stripe archiviato dopo un cambio importo/intervallo. */
  stripePreviousPriceId?: string | null
  features: string[]
  active: boolean
  sortOrder: number
}

export const DEFAULT_PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    key: 'professional_premium_monthly',
    audience: 'professional',
    label: 'Premium',
    tagline: 'Per assistenti familiari e caregiver',
    amountCents: 1990,
    currency: 'eur',
    interval: 'month',
    trialDays: 14,
    stripePriceId: null,
    features: [
      'Contatto WhatsApp e telefono in chat',
      'Candidature illimitate',
      'Visibilità prioritaria nelle ricerche',
      'Badge verificato in evidenza',
    ],
    active: true,
    sortOrder: 1,
  },
  {
    key: 'agency_business_monthly',
    audience: 'agency',
    label: 'Business',
    tagline: 'Per agenzie di assistenza',
    amountCents: 4990,
    currency: 'eur',
    interval: 'month',
    trialDays: 14,
    stripePriceId: null,
    features: ['Annunci illimitati', 'Gestione team e candidature', 'Supporto prioritario'],
    active: true,
    sortOrder: 2,
  },
  {
    key: 'structure_premium_monthly',
    audience: 'structure',
    label: 'Premium RSA',
    tagline: 'Per strutture e RSA',
    amountCents: 7990,
    currency: 'eur',
    interval: 'month',
    trialDays: 14,
    stripePriceId: null,
    features: ['Turni e annunci illimitati', 'Candidature e messaging', 'Supporto dedicato'],
    active: true,
    sortOrder: 3,
  },
]

export const AUDIENCE_LABELS: Record<BillingAudience, string> = {
  professional: 'Professionista',
  agency: 'Agenzia',
  structure: 'Struttura / RSA',
}

export function formatPlanEuro(amountCents: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100)
}

export function formatPlanPriceLabel(plan: Pick<PlanCatalogEntry, 'amountCents' | 'interval'>): string {
  const amount = formatPlanEuro(plan.amountCents)
  const period = plan.interval === 'year' ? 'anno' : 'mese'
  return `${amount} / ${period}`
}

export function planForAudience(
  plans: PlanCatalogEntry[],
  audience: BillingAudience,
): PlanCatalogEntry | null {
  const active = plans
    .filter((p) => p.audience === audience && p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  return active[0] ?? plans.find((p) => p.audience === audience) ?? null
}

export function planByKey(plans: PlanCatalogEntry[], key: string): PlanCatalogEntry | null {
  return plans.find((p) => p.key === key) ?? null
}

/** Compatibilità chiavi prodotto legacy. */
export function productKeyForAudience(audience: BillingAudience): BillingProductKey {
  switch (audience) {
    case 'agency':
      return 'agency_business_monthly'
    case 'structure':
      return 'structure_premium_monthly'
    default:
      return 'professional_premium_monthly'
  }
}

export function emptyPlanDraft(audience: BillingAudience = 'professional'): PlanCatalogEntry {
  const keyBase =
    audience === 'agency'
      ? 'agency_custom'
      : audience === 'structure'
        ? 'structure_custom'
        : 'professional_custom'
  return {
    key: `${keyBase}_${Date.now()}`,
    audience,
    label: 'Nuovo piano',
    tagline: '',
    amountCents: 1990,
    currency: 'eur',
    interval: 'month',
    trialDays: 14,
    stripePriceId: null,
    stripeProductId: null,
    features: [''],
    active: true,
    sortOrder: 99,
  }
}

export async function fetchPublicPlanCatalog(): Promise<PlanCatalogEntry[]> {
  if (isMockApiEnabled()) {
    return DEFAULT_PLAN_CATALOG.map((p) => ({ ...p, features: [...p.features] }))
  }
  const data = await httpGet<{ plans: PlanCatalogEntry[] }>('/api/v1/billing/plans')
  const plans = Array.isArray(data.plans) ? data.plans : []
  if (plans.length === 0) {
    return DEFAULT_PLAN_CATALOG.map((p) => ({ ...p, features: [...p.features] }))
  }
  return plans.map((p) => ({
    key: String(p.key),
    audience: (p.audience as BillingAudience) || 'professional',
    label: String(p.label ?? p.key),
    tagline: String(p.tagline ?? ''),
    amountCents: Number(p.amountCents) || 0,
    currency: 'eur',
    interval: p.interval === 'year' ? 'year' : 'month',
    trialDays: Number(p.trialDays) || 0,
    features: Array.isArray(p.features) ? p.features.map(String) : [],
    active: p.active !== false,
    sortOrder: Number(p.sortOrder) || 0,
  }))
}
