import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../auth/useAuth'
import { showBillingDemoCopy } from '../../../lib/billingFeatures'
import { BILLING_PRODUCTS, formatBillingAmount, productKeyForAudience } from '../../../lib/billingApi'
import { completeCheckoutSession } from '../../../services/billingService'
import type { BillingAudience } from '../../../lib/billingTypes'
import { BillingError } from '../../../lib/billingTypes'

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

  const productKey = productKeyForAudience(audience)
  const product = BILLING_PRODUCTS[productKey]

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
        <div className="billing-checkout-page__brand">Federico Andreoli</div>
        <h1 className="billing-checkout-page__title">Completa il pagamento</h1>
        <p className="billing-checkout-page__user">{user?.name ?? 'Utente'}</p>

        <div className="billing-checkout-page__line">
          <span>{product.label}</span>
          <strong>{formatBillingAmount(productKey)} / mese</strong>
        </div>

        {showBillingDemoCopy() && (
          <p className="billing-checkout-page__demo">
            Modalità demo: usa la carta di test <code>4242 4242 4242 4242</code>. Nessun addebito reale.
          </p>
        )}

        <div className="dash-form-grid" style={{ marginTop: 'var(--space-5)' }}>
          <div className="dash-form-field dash-form-field--full">
            <label className="dash-form-label">Numero carta</label>
            <input className="dash-form-input" placeholder="4242 4242 4242 4242" readOnly />
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label">Scadenza</label>
            <input className="dash-form-input" placeholder="12/34" readOnly />
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label">CVC</label>
            <input className="dash-form-input" placeholder="123" readOnly />
          </div>
        </div>

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
            {submitting ? 'Elaborazione…' : `Paga ${formatBillingAmount(productKey)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
