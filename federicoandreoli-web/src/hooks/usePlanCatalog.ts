import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BillingAudience } from '../lib/billingTypes'
import {
  DEFAULT_PLAN_CATALOG,
  fetchPublicPlanCatalog,
  formatPlanEuro,
  formatPlanPriceLabel,
  planByKey,
  planForAudience,
  type PlanCatalogEntry,
} from '../lib/planCatalog'

export function usePlanCatalog() {
  const [plans, setPlans] = useState<PlanCatalogEntry[]>(DEFAULT_PLAN_CATALOG)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchPublicPlanCatalog()
      setPlans(next)
    } catch {
      setError('Impossibile caricare i piani.')
      setPlans(DEFAULT_PLAN_CATALOG)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const byAudience = useMemo(
    () => ({
      professional: planForAudience(plans, 'professional'),
      agency: planForAudience(plans, 'agency'),
      structure: planForAudience(plans, 'structure'),
    }),
    [plans],
  )

  return {
    plans,
    loading,
    error,
    reload,
    byAudience,
    getPlan: (key: string) => planByKey(plans, key),
    getForAudience: (audience: BillingAudience) => planForAudience(plans, audience),
    formatAmount: (amountCents: number) => formatPlanEuro(amountCents),
    formatPrice: (plan: Pick<PlanCatalogEntry, 'amountCents' | 'interval'>) =>
      formatPlanPriceLabel(plan),
  }
}
