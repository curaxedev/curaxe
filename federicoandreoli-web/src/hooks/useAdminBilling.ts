import { useCallback, useEffect, useState } from 'react'
import { getAdminBillingStats, getAdminBillingSubscriptions } from '../lib/billingApi'
import type { AdminBillingStats, AdminSubscriptionRow } from '../lib/billingTypes'

function adminBillingErrorMessage(): string {
  return 'Impossibile caricare i dati di fatturazione. Riprova.'
}

export function useAdminBilling() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([])
  const [stats, setStats] = useState<AdminBillingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rows, billingStats] = await Promise.all([
        getAdminBillingSubscriptions(),
        getAdminBillingStats(),
      ])
      setSubscriptions(rows)
      setStats(billingStats)
    } catch {
      setError(adminBillingErrorMessage())
      setSubscriptions([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { subscriptions, stats, loading, error, reload }
}
