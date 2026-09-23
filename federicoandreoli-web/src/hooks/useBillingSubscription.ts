import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  getBillingSubscription,
  planTypeFromSubscription,
  postBillingCancel,
  postBillingCheckoutComplete,
  postBillingCheckoutSession,
  postBillingPortalSession,
  productKeyForAudience,
} from '../lib/billingApi'
import type { BillingAudience, CheckoutSession, PlanType, UserSubscription } from '../lib/billingTypes'
import { BillingError } from '../lib/billingTypes'
import { getSiteOrigin } from '../lib/runtimeConfig'

function billingErrorMessage(err: unknown): string {
  if (err instanceof BillingError) return err.message
  return 'Impossibile aggiornare l\'abbonamento. Riprova.'
}

function defaultDashboardPath(audience: BillingAudience): string {
  switch (audience) {
    case 'professional':
      return '/dashboard/professionale'
    case 'agency':
      return '/dashboard/agenzia'
    case 'structure':
      return '/dashboard/struttura'
    default: {
      const _x: never = audience
      return _x
    }
  }
}

function checkoutUrls(dashboardPath: string): { successUrl: string; cancelUrl: string } {
  const origin = getSiteOrigin() || (typeof window !== 'undefined' ? window.location.origin : '')
  const base = `${dashboardPath}/piano/esito`
  const successUrl = `${origin}${base}?result=success&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${origin}${base}?result=cancel&session_id={CHECKOUT_SESSION_ID}`
  return { successUrl, cancelUrl }
}

type UseBillingSubscriptionOptions = {
  /** B2B dashboard base path (e.g. `/dashboard/struttura` for RSA). */
  dashboardPath?: string
}

export function useBillingSubscription(
  audience: BillingAudience,
  options?: UseBillingSubscriptionOptions,
) {
  const dashboardPath = options?.dashboardPath ?? defaultDashboardPath(audience)
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [pendingSession, setPendingSession] = useState<CheckoutSession | null>(null)

  const reload = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await getBillingSubscription(user.id, audience)
      setSubscription(data)
    } catch (err) {
      setError(billingErrorMessage(err))
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }, [audience, user?.id])

  useEffect(() => {
    void reload()
  }, [reload])

  const startCheckout = useCallback(async (): Promise<CheckoutSession | null> => {
    if (!user?.id) {
      setError('Sessione non valida.')
      return null
    }

    setCheckoutLoading(true)
    setError(null)

    const productKey = productKeyForAudience(audience)
    const { successUrl, cancelUrl } = checkoutUrls(dashboardPath)

    try {
      const session = await postBillingCheckoutSession({
        userId: user.id,
        audience,
        productKey,
        successUrl,
        cancelUrl,
      })

      setPendingSession(session)

      if (session.mode === 'redirect' && session.url) {
        window.location.assign(session.url)
        return session
      }

      return session
    } catch (err) {
      setError(billingErrorMessage(err))
      return null
    } finally {
      setCheckoutLoading(false)
    }
  }, [audience, dashboardPath, user?.id])

  const completeCheckout = useCallback(
    async (sessionId: string): Promise<boolean> => {
      setCheckoutLoading(true)
      setError(null)
      try {
        const updated = await postBillingCheckoutComplete(sessionId)
        setSubscription(updated)
        setPendingSession(null)
        return true
      } catch (err) {
        setError(billingErrorMessage(err))
        return false
      } finally {
        setCheckoutLoading(false)
      }
    },
    [],
  )

  const cancel = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError('Sessione non valida.')
      return false
    }

    setCancelLoading(true)
    setError(null)
    try {
      const updated = await postBillingCancel(user.id, audience)
      setSubscription(updated)
      return true
    } catch (err) {
      setError(billingErrorMessage(err))
      return false
    } finally {
      setCancelLoading(false)
    }
  }, [audience, user?.id])

  const openPortal = useCallback(async (): Promise<boolean> => {
    setError(null)
    try {
      const origin = getSiteOrigin() || (typeof window !== 'undefined' ? window.location.origin : '')
      const { url } = await postBillingPortalSession(`${origin}${dashboardPath}`)
      window.location.assign(url)
      return true
    } catch (err) {
      setError(billingErrorMessage(err))
      return false
    }
  }, [dashboardPath])

  const clearPendingSession = useCallback(() => setPendingSession(null), [])

  const planType: PlanType = planTypeFromSubscription(subscription)

  return {
    subscription,
    planType,
    isPremium: planType === 'premium',
    isTrialing: subscription?.status === 'trialing',
    loading,
    error,
    checkoutLoading,
    cancelLoading,
    pendingSession,
    reload,
    startCheckout,
    completeCheckout,
    cancel,
    openPortal,
    clearPendingSession,
  }
}
