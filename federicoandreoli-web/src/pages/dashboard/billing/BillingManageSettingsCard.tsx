import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../auth/useAuth'
import type { UserRole } from '../../../auth/types'
import {
  formatBillingDate,
  getBillingInvoices,
  getBillingSubscription,
  postBillingPortalSession,
  type BillingAudience,
  type BillingInvoice,
  type UserSubscription,
} from '../../../lib/billingApi'
import { BillingError } from '../../../lib/billingTypes'
import { getSiteOrigin } from '../../../lib/runtimeConfig'
import { getDashboardPathForRole } from '../../../auth/roleDashboard'

function audienceFromRole(role: UserRole): BillingAudience | null {
  switch (role) {
    case 'professional':
      return 'professional'
    case 'agency':
      return 'agency'
    case 'structure':
      return 'structure'
    default:
      return null
  }
}

function planSectionId(audience: BillingAudience): string {
  return audience === 'professional' ? 'piano' : 'abbonamento'
}

function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'active':
      return 'Attivo'
    case 'trialing':
      return 'In prova'
    case 'past_due':
      return 'Pagamento in ritardo'
    case 'canceled':
      return 'Disdetto'
    case 'incomplete':
      return 'Incompleto'
    default:
      return status ? status : '—'
  }
}

function invoiceStatusLabel(status: string | null): string {
  switch (status) {
    case 'paid':
      return 'Pagata'
    case 'open':
      return 'Aperta'
    case 'draft':
      return 'Bozza'
    case 'void':
      return 'Annullata'
    case 'uncollectible':
      return 'Non riscuotibile'
    default:
      return status ?? '—'
  }
}

function formatInvoiceAmount(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency.toUpperCase() || 'EUR',
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

function billingErrorMessage(err: unknown): string {
  if (err instanceof BillingError) return err.message
  return 'Operazione non riuscita. Riprova.'
}

/**
 * Box Impostazioni: gestione abbonamento via Stripe Customer Portal + elenco fatture.
 * Pattern Cursor/Stripe: sessione portal creata solo server-side; fatture filtrate sul customer DB.
 */
export function BillingManageSettingsCard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const audience = user ? audienceFromRole(user.role) : null

  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [portalBusy, setPortalBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInvoices, setShowInvoices] = useState(false)

  const reload = useCallback(async () => {
    if (!user?.id || !audience) {
      setSubscription(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const sub = await getBillingSubscription(user.id, audience)
      setSubscription(sub)
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

  if (!audience) return null

  const hasStripeCustomer = Boolean(subscription?.stripeCustomerId)
  const isPremium = subscription?.planType === 'premium'
  const periodEnd = subscription?.currentPeriodEnd
    ? formatBillingDate(subscription.currentPeriodEnd)
    : null

  async function openPortal() {
    if (!user) return
    setPortalBusy(true)
    setError(null)
    try {
      const origin = getSiteOrigin() || window.location.origin
      const dash = getDashboardPathForRole(user.role)
      const returnUrl = `${origin}${dash}?section=impostazioni`
      const { url } = await postBillingPortalSession(returnUrl)
      window.location.assign(url)
    } catch (err) {
      setError(billingErrorMessage(err))
      setPortalBusy(false)
    }
  }

  async function loadInvoices() {
    setShowInvoices(true)
    setInvoicesLoading(true)
    setError(null)
    try {
      const rows = await getBillingInvoices()
      setInvoices(rows)
    } catch (err) {
      setError(billingErrorMessage(err))
      setInvoices([])
    } finally {
      setInvoicesLoading(false)
    }
  }

  function goToPlan() {
    if (!user || !audience) return
    const dash = getDashboardPathForRole(user.role)
    navigate(`${dash}?section=${planSectionId(audience)}`)
  }

  return (
    <div className="dash-settings-card dash-billing-manage">
      <div className="dash-settings-card__title">Gestisci abbonamento</div>

      {loading ? (
        <p className="dash-billing-manage__muted">Caricamento piano…</p>
      ) : (
        <>
          <div className="dash-billing-manage__status">
            <span className={`dash-billing-manage__badge${isPremium ? ' is-premium' : ''}`}>
              {isPremium ? 'Premium' : 'FREE'}
            </span>
            <span className="dash-billing-manage__muted">
              {statusLabel(subscription?.status)}
              {periodEnd ? ` · rinnovo ${periodEnd}` : ''}
              {subscription?.cancelAtPeriodEnd ? ' · disdetta programmata' : ''}
            </span>
          </div>

          <p className="dash-billing-manage__copy">
            {hasStripeCustomer
              ? 'Metodo di pagamento, rinnovi e disdetta si gestiscono sul Customer Portal di Stripe (come Cursor): sicuro e aggiornato in tempo reale.'
              : 'Non hai ancora un abbonamento Stripe. Attiva un piano per gestire pagamenti e fatture da qui.'}
          </p>

          <div className="dash-billing-manage__actions">
            {hasStripeCustomer ? (
              <button
                type="button"
                className="dash-btn dash-btn--primary"
                disabled={portalBusy}
                onClick={() => void openPortal()}
              >
                {portalBusy ? 'Reindirizzamento…' : 'Apri gestione Stripe'}
              </button>
            ) : (
              <button type="button" className="dash-btn dash-btn--primary" onClick={goToPlan}>
                Vai ai piani
              </button>
            )}
            <button
              type="button"
              className="dash-btn dash-btn--ghost"
              disabled={!hasStripeCustomer || invoicesLoading}
              onClick={() => void loadInvoices()}
            >
              {invoicesLoading ? 'Caricamento…' : 'Visualizza fatture'}
            </button>
          </div>

          {showInvoices ? (
            <div className="dash-billing-manage__invoices">
              <div className="dash-billing-manage__invoices-title">Fatture Stripe</div>
              {invoicesLoading ? (
                <p className="dash-billing-manage__muted">Recupero fatture…</p>
              ) : invoices.length === 0 ? (
                <p className="dash-billing-manage__muted">Nessuna fattura disponibile.</p>
              ) : (
                <ul className="dash-billing-manage__invoice-list">
                  {invoices.map((inv) => (
                    <li key={inv.id} className="dash-billing-manage__invoice">
                      <div className="dash-billing-manage__invoice-main">
                        <strong>{inv.number ?? inv.id}</strong>
                        <span>
                          {inv.createdAt ? formatBillingDate(inv.createdAt) : '—'} ·{' '}
                          {invoiceStatusLabel(inv.status)}
                        </span>
                      </div>
                      <div className="dash-billing-manage__invoice-side">
                        <span className="dash-billing-manage__invoice-amount">
                          {formatInvoiceAmount(
                            inv.status === 'paid' ? inv.amountPaid : inv.amountDue,
                            inv.currency,
                          )}
                        </span>
                        <div className="dash-billing-manage__invoice-links">
                          {inv.hostedInvoiceUrl ? (
                            <a
                              href={inv.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Apri
                            </a>
                          ) : null}
                          {inv.invoicePdf ? (
                            <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer">
                              PDF
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="dash-billing-manage__hint">
                Link ospitati da Stripe (HTTPS). Non passiamo i PDF dal nostro server.
              </p>
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <p className="dash-billing-manage__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
