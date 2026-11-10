import { useEffect, useMemo, useState } from 'react'
import { useAdminBilling } from '../../../hooks/useAdminBilling'
import { getAdminSubscriptionInvoices } from '../../../lib/billingApi'
import type {
  AdminSubscriptionRow,
  AdminSubscriptionStatus,
  BillingInvoice,
} from '../../../lib/billingTypes'
import {
  deleteAdminSubscriptionPermanent,
  getAdminBillingSettings,
  postAdminCancelSubscription,
  postAdminCheckoutLink,
  postAdminExtendTrial,
  postAdminPortalLink,
  postAdminRestoreSubscription,
  postAdminSubscriptionRefund,
  postAdminTrashSubscription,
} from '../../../lib/adminBillingSettingsApi'
import { AdminPlansCatalogSection } from './AdminPlansCatalogSection'
import { AdminStripeSetupSection } from './AdminStripeSetupSection'
import {
  IconAlert,
  IconCheck,
  IconCreditCard,
  IconGrid,
  IconInfo,
  IconList,
  IconPause,
  IconPlay,
  IconRefresh,
  IconSearch,
  IconTrash,
} from '../../../components/icons/DashboardIcons'

type BillingView = 'hub' | 'elenco' | 'piani'
type StatusFilter = 'all' | AdminSubscriptionStatus

function formatPeriodDate(value?: string | null): string {
  if (!value || value === '—') return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0] ?? 'U').slice(0, 2).toUpperCase()
}

function planLabel(plan: string): string {
  const key = plan.toLowerCase()
  if (key === 'free') return 'Free'
  if (key === 'premium') return 'Premium'
  return plan
}

function audienceLabel(audience: AdminSubscriptionRow['audience']): string {
  if (audience === 'agency') return 'Agenzia'
  if (audience === 'structure') return 'RSA'
  return 'Professionista'
}

function statusMeta(status: AdminSubscriptionStatus): { label: string; className: string } {
  if (status === 'active') {
    return { label: 'Attivo', className: 'admin-billing__status admin-billing__status--active' }
  }
  if (status === 'expiring') {
    return { label: 'In pausa', className: 'admin-billing__status admin-billing__status--pause' }
  }
  return { label: 'Fallito', className: 'admin-billing__status admin-billing__status--failed' }
}

function BillingToast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={`dash-toast polish-toast${visible ? ' dash-toast--visible' : ''}`}>
      <span className="dash-toast__icon">
        <IconCheck size={18} />
      </span>
      {message}
    </div>
  )
}

export function AdminSubscriptionsSection() {
  const [view, setView] = useState<BillingView>('hub')
  const [showTrash, setShowTrash] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [planStats, setPlanStats] = useState<{ total: number; published: number; synced: number }>({
    total: 0,
    published: 0,
    synced: 0,
  })
  const [showStripeSetup, setShowStripeSetup] = useState(false)
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [invoicesError, setInvoicesError] = useState<string | null>(null)

  const { subscriptions, stats, loading, error, reload } = useAdminBilling(showTrash)

  useEffect(() => {
    void getAdminBillingSettings()
      .then((data) => {
        const plans = data.plans ?? []
        setPlanStats({
          total: plans.length,
          published: plans.filter((p) => p.active !== false).length,
          synced: plans.filter((p) => Boolean(p.stripePriceId)).length,
        })
      })
      .catch(() => {
        setPlanStats({ total: 0, published: 0, synced: 0 })
      })
  }, [view])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!selectedId || showTrash) {
      setInvoices([])
      setInvoicesError(null)
      return
    }
    let cancelled = false
    setInvoicesLoading(true)
    setInvoicesError(null)
    void getAdminSubscriptionInvoices(selectedId)
      .then((data) => {
        if (cancelled) return
        setInvoices(data.invoices)
      })
      .catch((err) => {
        if (cancelled) return
        setInvoices([])
        setInvoicesError(err instanceof Error ? err.message : 'Fatture non disponibili.')
      })
      .finally(() => {
        if (!cancelled) setInvoicesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, showTrash])

  const counts = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active').length
    const pause = subscriptions.filter((s) => s.status === 'expiring').length
    const failed = subscriptions.filter((s) => s.status === 'failed').length
    return { active, pause, failed, total: subscriptions.length }
  }, [subscriptions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return subscriptions.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (!q) return true
      return `${s.userName} ${s.userEmail} ${s.plan}`.toLowerCase().includes(q)
    })
  }, [subscriptions, statusFilter, search])

  const selected = selectedId ? subscriptions.find((s) => s.id === selectedId) ?? null : null

  async function runAction(
    id: string,
    kind: 'refund' | 'trial' | 'cancel' | 'checkout' | 'portal' | 'trash' | 'restore' | 'purge',
  ) {
    setActionBusy(`${kind}-${id}`)
    try {
      if (kind === 'refund') await postAdminSubscriptionRefund(id, undefined, 'requested_by_customer')
      if (kind === 'trial') await postAdminExtendTrial(id, 7)
      if (kind === 'cancel') await postAdminCancelSubscription(id)
      if (kind === 'trash') await postAdminTrashSubscription(id)
      if (kind === 'restore') await postAdminRestoreSubscription(id)
      if (kind === 'purge') {
        if (!confirm('Eliminare definitivamente questo abbonamento dal database?')) return
        await deleteAdminSubscriptionPermanent(id)
      }
      if (kind === 'checkout') {
        const { url } = await postAdminCheckoutLink(id)
        await navigator.clipboard.writeText(url)
        window.open(url, '_blank', 'noopener,noreferrer')
        setToast('Link Checkout copiato e aperto.')
      }
      if (kind === 'portal') {
        const { url } = await postAdminPortalLink(id)
        await navigator.clipboard.writeText(url)
        window.open(url, '_blank', 'noopener,noreferrer')
        setToast('Link Portal copiato e aperto.')
      }
      if (kind !== 'checkout' && kind !== 'portal') {
        await reload()
        if (kind === 'cancel') setToast('Abbonamento messo in pausa a fine periodo.')
        if (kind === 'trash' || kind === 'purge') setToast('Abbonamento rimosso.')
        if (kind === 'restore') setToast('Abbonamento ripristinato.')
        if (kind === 'trial') setToast('Prova estesa di 7 giorni.')
        if (kind === 'refund') setToast('Rimborso avviato.')
      }
    } catch {
      await reload()
      setToast('Operazione non riuscita. Riprova.')
    } finally {
      setActionBusy(null)
    }
  }

  if (view === 'piani') {
    return (
      <div className="admin-billing">
        <BillingToast message={toast ?? ''} visible={Boolean(toast)} />
        <button type="button" className="admin-billing__back" onClick={() => setView('hub')}>
          ← Torna ad Abbonamenti
        </button>
        <AdminPlansCatalogSection wineos />
        <div className="admin-billing__stripe-toggle">
          <button
            type="button"
            className="admin-billing__ghost-link"
            onClick={() => setShowStripeSetup((v) => !v)}
          >
            {showStripeSetup ? 'Nascondi setup Stripe' : 'Configura Stripe →'}
          </button>
        </div>
        {showStripeSetup ? <AdminStripeSetupSection /> : null}
      </div>
    )
  }

  if (view === 'elenco') {
    return (
      <div className="admin-billing admin-billing--compact">
        <BillingToast message={toast ?? ''} visible={Boolean(toast)} />

        <button type="button" className="admin-billing__back" onClick={() => setView('hub')}>
          ← Hub Abbonamenti
        </button>

        <div className="admin-billing__head">
          <div className="admin-billing__title-row">
            <h1 className="admin-billing__title">Abbonamenti</h1>
            <span className="admin-billing__count">{filtered.length} in elenco</span>
          </div>
          <div className="admin-billing__head-actions">
            <button
              type="button"
              className={`admin-billing__ghost-cta${showTrash ? '' : ' is-active'}`}
              onClick={() => {
                setShowTrash(false)
                setSelectedId(null)
              }}
            >
              Elenco
            </button>
            <button
              type="button"
              className={`admin-billing__ghost-cta${showTrash ? ' is-active' : ''}`}
              onClick={() => {
                setShowTrash(true)
                setSelectedId(null)
              }}
            >
              Cestino{typeof stats?.trashed === 'number' ? ` (${stats.trashed})` : ''}
            </button>
            <button
              type="button"
              className="admin-billing__icon-btn"
              onClick={() => void reload()}
              aria-label="Aggiorna"
              title="Aggiorna"
            >
              <IconRefresh size={15} />
            </button>
            <div className="admin-billing__view-toggle" role="group" aria-label="Vista">
              <button type="button" className="is-active" aria-pressed="true">
                <IconList size={14} />
                Lista
              </button>
              <button type="button" onClick={() => setView('piani')} aria-pressed="false">
                <IconGrid size={14} />
                Piani
              </button>
            </div>
          </div>
        </div>

        <div className="admin-billing__pills" role="toolbar" aria-label="Contatori">
          <button
            type="button"
            className={`admin-billing__pill${statusFilter === 'all' ? ' is-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <strong>{counts.total}</strong> Totale
          </button>
          <button
            type="button"
            className={`admin-billing__pill${statusFilter === 'active' ? ' is-active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            <strong>{counts.active}</strong> Attivi
          </button>
          <button
            type="button"
            className={`admin-billing__pill${statusFilter === 'expiring' ? ' is-active' : ''}`}
            onClick={() => setStatusFilter('expiring')}
          >
            <strong>{counts.pause}</strong> Pausa
          </button>
          <button
            type="button"
            className={`admin-billing__pill${statusFilter === 'failed' ? ' is-active' : ''}`}
            onClick={() => setStatusFilter('failed')}
          >
            <strong>{counts.failed}</strong> Falliti
          </button>
        </div>

        <div className="admin-billing__toolbar">
          <select
            className="admin-billing__select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Filtro stato"
          >
            <option value="all">Stato: tutti</option>
            <option value="active">Attivi</option>
            <option value="expiring">In pausa</option>
            <option value="failed">Falliti</option>
          </select>
          <div className="admin-billing__search">
            <span className="admin-billing__search-icon" aria-hidden>
              <IconSearch size={14} />
            </span>
            <input
              type="search"
              className="admin-billing__search-input"
              placeholder="Cerca utente o piano"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cerca abbonamenti"
            />
          </div>
        </div>

        {error ? (
          <div className="admin-billing__alert" role="alert">
            <span>{error}</span>
            <button type="button" className="dash-btn dash-btn--ghost" onClick={() => void reload()}>
              Riprova
            </button>
          </div>
        ) : null}

        <div className="admin-billing__table-wrap">
          <table className="admin-billing__table">
            <thead>
              <tr>
                <th>Utente</th>
                <th>Piano</th>
                <th>Rinnovo</th>
                <th>Stato</th>
                <th>Periodo</th>
                <th aria-label="Azioni" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="admin-billing__empty">
                    Caricamento…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-billing__empty">
                    {showTrash ? 'Cestino vuoto.' : 'Nessun abbonamento trovato.'}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const st = statusMeta(s.status)
                  const busy = actionBusy !== null
                  return (
                    <tr
                      key={s.id}
                      className={selectedId === s.id ? 'is-selected' : undefined}
                      onClick={() => setSelectedId(s.id)}
                    >
                      <td>
                        <div className="admin-billing__guest">
                          <div className="admin-billing__avatar" aria-hidden>
                            {initialsFrom(s.userName || s.userEmail)}
                          </div>
                          <div className="admin-billing__guest-meta">
                            <span className="admin-billing__guest-name">{s.userName || '—'}</span>
                            <span className="admin-billing__guest-id">
                              #{s.userId} · {audienceLabel(s.audience)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong className="admin-billing__plan">{planLabel(s.plan)}</strong>
                      </td>
                      <td className="admin-billing__muted">
                        {s.cancelAtPeriodEnd ? 'Fine periodo' : 'Automatico'}
                      </td>
                      <td>
                        <div className="admin-billing__status-stack">
                          <span className={st.className}>{st.label}</span>
                          <span className="admin-billing__kind">
                            {(s.billingKind ?? (s.rawStatus === 'trialing' ? 'trial' : 'paid')) ===
                            'trial'
                              ? 'Prova'
                              : 'Pagato'}
                          </span>
                        </div>
                      </td>
                      <td className="admin-billing__date">
                        {formatPeriodDate(s.currentPeriodEnd ?? s.renewal)}
                      </td>
                      <td>
                        <div
                          className="admin-billing__row-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="admin-billing__icon-btn"
                            title="Dettaglio"
                            aria-label={`Dettaglio ${s.userName}`}
                            onClick={() => setSelectedId(s.id)}
                          >
                            <IconInfo size={14} />
                          </button>
                          {showTrash ? (
                            <button
                              type="button"
                              className="admin-billing__icon-btn"
                              title="Ripristina"
                              disabled={busy}
                              onClick={() => void runAction(s.id, 'restore')}
                            >
                              <IconPlay size={14} />
                            </button>
                          ) : s.status === 'active' ? (
                            <button
                              type="button"
                              className="admin-billing__icon-btn"
                              title="Metti in pausa (cancella a fine periodo)"
                              disabled={busy}
                              onClick={() => void runAction(s.id, 'cancel')}
                            >
                              <IconPause size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-billing__icon-btn"
                              title="Estendi prova +7gg"
                              disabled={busy}
                              onClick={() => void runAction(s.id, 'trial')}
                            >
                              <IconPlay size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="admin-billing__icon-btn admin-billing__icon-btn--danger"
                            title={showTrash ? 'Elimina definitivamente' : 'Sposta nel cestino'}
                            disabled={busy || (!showTrash && !s.canTrash && s.status === 'active')}
                            onClick={() =>
                              void runAction(s.id, showTrash ? 'purge' : 'trash')
                            }
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {selected ? (
          <section className="admin-billing__detail" aria-label="Dettaglio abbonamento">
            <div className="admin-billing__detail-head">
              <div>
                <h2 className="admin-billing__detail-title">{selected.userName}</h2>
                <p className="admin-billing__detail-sub">
                  {selected.userEmail} · {planLabel(selected.plan)} · {audienceLabel(selected.audience)}
                </p>
              </div>
              <button
                type="button"
                className="admin-billing__ghost-cta"
                onClick={() => setSelectedId(null)}
              >
                Chiudi
              </button>
            </div>
            <div className="admin-billing__detail-grid">
              <div>
                <span className="admin-billing__metric-label">Stato</span>
                <strong>{statusMeta(selected.status).label}</strong>
              </div>
              <div>
                <span className="admin-billing__metric-label">Tipo billing</span>
                <strong>
                  {(selected.billingKind ??
                    (selected.rawStatus === 'trialing' ? 'trial' : 'paid')) === 'trial'
                    ? 'In prova'
                    : 'A pagamento'}
                </strong>
              </div>
              <div>
                <span className="admin-billing__metric-label">Periodo</span>
                <strong>{formatPeriodDate(selected.currentPeriodEnd ?? selected.renewal)}</strong>
              </div>
              <div>
                <span className="admin-billing__metric-label">Prova fino al</span>
                <strong>
                  {selected.trialEndsAt ? formatPeriodDate(selected.trialEndsAt) : '—'}
                </strong>
              </div>
              <div>
                <span className="admin-billing__metric-label">Raw Stripe</span>
                <strong>{selected.rawStatus ?? selected.status}</strong>
              </div>
            </div>
            {!showTrash ? (
              <div className="admin-billing__detail-actions">
                <button
                  type="button"
                  className="admin-billing__ghost-cta"
                  disabled={actionBusy !== null}
                  onClick={() => void runAction(selected.id, 'checkout')}
                >
                  Link Checkout
                </button>
                <button
                  type="button"
                  className="admin-billing__ghost-cta"
                  disabled={actionBusy !== null}
                  onClick={() => void runAction(selected.id, 'portal')}
                >
                  Link Portal
                </button>
                <button
                  type="button"
                  className="admin-billing__ghost-cta"
                  disabled={actionBusy !== null}
                  onClick={() => void runAction(selected.id, 'trial')}
                >
                  +7gg prova
                </button>
                <button
                  type="button"
                  className="admin-billing__ghost-cta"
                  disabled={actionBusy !== null}
                  onClick={() => void runAction(selected.id, 'refund')}
                >
                  Rimborso
                </button>
                <button
                  type="button"
                  className="admin-billing__ghost-cta"
                  disabled={actionBusy !== null}
                  onClick={() => void runAction(selected.id, 'cancel')}
                >
                  Pausa fine periodo
                </button>
              </div>
            ) : null}

            <div className="admin-billing__invoices">
              <div className="admin-billing__invoices-head">
                <h3>Fatture Stripe</h3>
                {invoicesLoading ? <span>Caricamento…</span> : null}
              </div>
              {invoicesError ? (
                <p className="admin-billing__invoices-empty">{invoicesError}</p>
              ) : invoices.length === 0 && !invoicesLoading ? (
                <p className="admin-billing__invoices-empty">Nessuna fattura disponibile.</p>
              ) : (
                <ul className="admin-billing__invoice-list">
                  {invoices.map((inv) => (
                    <li key={inv.id} className="admin-billing__invoice-item">
                      <div>
                        <strong>{inv.number ?? inv.id}</strong>
                        <span>
                          {inv.createdAt ? formatPeriodDate(inv.createdAt) : '—'} ·{' '}
                          {inv.status ?? '—'}
                        </span>
                      </div>
                      <div className="admin-billing__invoice-amt">
                        {(inv.amountPaid / 100).toLocaleString('it-IT', {
                          style: 'currency',
                          currency: (inv.currency || 'eur').toUpperCase(),
                        })}
                      </div>
                      {inv.hostedInvoiceUrl ? (
                        <a
                          className="admin-billing__ghost-link"
                          href={inv.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Apri
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}
      </div>
    )
  }

  /* Hub */
  const mrrLabel = stats
    ? `€${(stats.mrrCents / 100).toLocaleString('it-IT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`
    : '—'

  return (
    <div className="admin-billing">
      <BillingToast message={toast ?? ''} visible={Boolean(toast)} />

      <div className="admin-billing__hub-head">
        <h1 className="admin-billing__hub-title">Abbonamenti</h1>
        <p className="admin-billing__hub-sub">Curaxe · piani, rinnovi e Stripe</p>
      </div>

      {loading && !stats ? (
        <div className="admin-billing__empty-block">Caricamento…</div>
      ) : error && !stats ? (
        <div className="admin-billing__alert" role="alert">
          <span>{error}</span>
          <button type="button" className="dash-btn dash-btn--ghost" onClick={() => void reload()}>
            Riprova
          </button>
        </div>
      ) : (
        <div className="admin-billing__hub-grid">
          <button
            type="button"
            className="admin-billing-hub-card admin-billing-hub-card--life"
            onClick={() => setView('elenco')}
          >
            <div className="admin-billing-hub-card__top">
              <span className="admin-billing-hub-card__icon" aria-hidden>
                <IconCreditCard size={18} />
              </span>
              <span className="admin-billing-hub-card__badge">Lifecycle</span>
            </div>
            <h2 className="admin-billing-hub-card__title">Abbonamenti</h2>
            <p className="admin-billing-hub-card__sub">
              Iscritti, rinnovi, pause e pagamenti · MRR {mrrLabel}
            </p>
            <div className="admin-billing-hub-card__stats">
              <div>
                <strong>{stats?.activePremium ?? 0}</strong>
                <span>Attivi</span>
              </div>
              <div>
                <strong>{stats?.paused ?? 0}</strong>
                <span>Pausa</span>
              </div>
              <div>
                <strong>{stats?.renewalsWithin7Days ?? 0}</strong>
                <span>Rinnovi 7g</span>
              </div>
              <div>
                <strong>{stats?.renewalsWithin30Days ?? 0}</strong>
                <span>Rinnovi 30g</span>
              </div>
            </div>
            <span className="admin-billing-hub-card__cta">Apri elenco →</span>
          </button>

          <button
            type="button"
            className="admin-billing-hub-card admin-billing-hub-card--plans"
            onClick={() => setView('piani')}
          >
            <div className="admin-billing-hub-card__top">
              <span className="admin-billing-hub-card__icon" aria-hidden>
                <IconGrid size={18} />
              </span>
              <span className="admin-billing-hub-card__badge">Catalogo</span>
            </div>
            <h2 className="admin-billing-hub-card__title">Piani</h2>
            <p className="admin-billing-hub-card__sub">
              Prezzi, intervallo, prova e sync Stripe
            </p>
            <div className="admin-billing-hub-card__stats admin-billing-hub-card__stats--compact">
              <div>
                <strong>{planStats.published}</strong>
                <span>Pubblicati</span>
              </div>
              <div>
                <strong>
                  {planStats.synced}/{planStats.total || '—'}
                </strong>
                <span>Stripe sync</span>
              </div>
            </div>
            <span className="admin-billing-hub-card__cta">Gestisci piani →</span>
          </button>
        </div>
      )}

      {(stats?.failedPayments ?? 0) > 0 ? (
        <div className="admin-billing__hub-note" role="status">
          <IconAlert size={16} />
          <span>{stats?.failedPayments} pagamenti falliti da rivedere nell&apos;elenco.</span>
          <button type="button" className="admin-billing__ghost-link" onClick={() => setView('elenco')}>
            Apri
          </button>
        </div>
      ) : null}
    </div>
  )
}
