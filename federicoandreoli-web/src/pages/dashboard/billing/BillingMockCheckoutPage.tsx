import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../auth/useAuth'
import { showBillingDemoCopy } from '../../../lib/billingFeatures'
import { completeCheckoutSession } from '../../../services/billingService'
import type { BillingAudience } from '../../../lib/billingTypes'
import { BillingError } from '../../../lib/billingTypes'
import { usePlanCatalog } from '../../../hooks/usePlanCatalog'
import { formatPlanEuro } from '../../../lib/planCatalog'

type BillingMockCheckoutPageProps = {
  audience: BillingAudience
  dashboardPath: string
  successSection?: string
}

export function BillingMockCheckoutPage({
  audience,
  dashboardPath,
  successSection = 'piano',
}: BillingMockCheckoutPageProps) {
  const { user, isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = searchParams.get('session_id') ?? ''
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const planCatalog = usePlanCatalog()
  const plan = planCatalog.getForAudience(audience)
  const amountLabel = plan ? formatPlanEuro(plan.amountCents) : '—'
  const planLabel = plan?.label ?? 'Premium'

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/accedi', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handlePay = async () => {
    if (!sessionId) {
      setError('Sessione di pagamento mancante.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await completeCheckoutSession(sessionId)
      navigate(`${dashboardPath}?billing=success&section=${successSection}`, { replace: true })
    } catch (err) {
      setError(err instanceof BillingError ? err.message : 'Pagamento non riuscito. Riprova.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!sessionId) {
    return (
      <div className="billing-checkout-page">
        <div className="billing-checkout-page__card">
          <h1>Sessione non valida</h1>
          <p>Il link di pagamento non è valido o è scaduto.</p>
          <Link to={dashboardPath} className="dash-btn dash-btn--primary">
            Torna alla dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="billing-checkout-page">
      <div className="billing-checkout-page__card">
        <div className="billing-checkout-page__brand">Curaxe</div>
        <h1 className="billing-checkout-page__title">Completa il pagamento</h1>
        <p className="billing-checkout-page__user">{user?.name ?? 'Utente'}</p>

        <div className="billing-checkout-page__line">
          <span>{planLabel}</span>
          <strong>
            {amountLabel} / {plan?.interval === 'year' ? 'anno' : 'mese'}
          </strong>
        </div>

        <p className="billing-checkout-page__demo">
          {showBillingDemoCopy()
            ? 'Ambiente di sviluppo: simula il redirect a Stripe Checkout. In produzione paghi solo su checkout.stripe.com — nessuna carta su Curaxe.'
            : 'Pagamento e carta solo su Stripe. Questa pagina non è usata in produzione.'}
        </p>

        {error && <p className="billing-checkout-page__error">{error}</p>}

        <div className="billing-checkout-page__actions">
          <Link to={`${dashboardPath}?billing=cancel`} className="dash-btn dash-btn--ghost">
            Annulla
          </Link>
          <button
            type="button"
            className="dash-btn dash-btn--primary dash-btn--lg"
            disabled={submitting}
            onClick={() => void handlePay()}
          >
            {submitting ? 'Elaborazione…' : `Simula pagamento ${amountLabel}`}
          </button>
        </div>
      </div>
    </div>
  )
}
