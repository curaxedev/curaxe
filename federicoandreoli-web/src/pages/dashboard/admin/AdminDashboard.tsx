import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/useAuth'
import {
  formatAdminKycDate,
  formatAdminKycDocumentsSummary,
  KYC_DOCUMENT_TYPE_LABELS,
} from '../../../lib/adminKycApi'
import {
  ADMIN_JOB_OWNER_TYPE_LABELS,
  formatAdminJobModerationDate,
} from '../../../lib/adminJobModerationApi'
import type { AdminJobModerationQueueItem } from '../../../lib/adminJobModerationTypes'
import type { AdminKycDocument, AdminKycQueueItem } from '../../../lib/adminKycTypes'
import { profileDetailPath } from '../../../lib/siteRoutes'
import { useAdminBilling } from '../../../hooks/useAdminBilling'
import { useAdminJobModeration } from '../../../hooks/useAdminJobModeration'
import { useAdminKycQueue } from '../../../hooks/useAdminKycQueue'
import { useAdminSettings } from '../../../hooks/useAdminSettings'
import {
  ADMIN_EMAIL_NOTIFICATION_LABELS,
  type AdminEmailNotificationKey,
} from '../../../lib/adminSettingsApi'
import {
  buildAdminAnalyticsSnapshot,
  exportAdminAnalyticsCsv,
  exportAdminAnalyticsJson,
} from '../../../lib/exportUtils'
import {
  IconAlert,
  IconBell,
  IconBriefcase,
  IconCheck,
  IconClose,
  IconCreditCard,
  IconGrid,
  IconProfile,
  IconSettings,
  IconShield,
  IconTrendUp,
  IconUpload,
  IconUsers,
} from '../../../components/icons/DashboardIcons'
import { AccountSettingsSection } from '../AccountSettingsSection'
import { DashboardLayout } from '../DashboardLayout'
import { getAdminOverview, type AdminOverviewPayload } from '../../../lib/adminOverviewApi'
import { getApiBaseUrl } from '../../../lib/runtimeConfig'
import { httpGetBlob } from '../../../lib/http'
import { AdminStripeSetupSection } from './AdminStripeSetupSection'
import { AdminPlansCatalogSection } from './AdminPlansCatalogSection'
import { AdminSecuritySection } from './AdminSecuritySection'
import { AdminUsersSection } from './AdminUsersSection'
import './admin-dashboard-home.css'
import {
  deleteAdminSubscriptionPermanent,
  postAdminCancelSubscription,
  postAdminCheckoutLink,
  postAdminExtendTrial,
  postAdminPortalLink,
  postAdminRestoreSubscription,
  postAdminSubscriptionRefund,
  postAdminTrashSubscription,
} from '../../../lib/adminBillingSettingsApi'


/* ── Revenue SVG chart ──────────────────────────────────────── */
function RevenueChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1)
  const barW = 22
  const gap = 6
  const h = 72
  const totalW = data.length * (barW + gap) - gap

  return (
    <svg viewBox={`0 0 ${totalW} ${h + 20}`} className="dash-chart-svg" style={{ height: 100 }}>
      {data.map((v, i) => {
        const barH = Math.max(6, (v / max) * h)
        const isLast = i === data.length - 1
        const x = i * (barW + gap)
        const tip = `€${v.toLocaleString('it-IT')}`
        return (
          <g key={i} className="polish-chart-bar" tabIndex={0} role="graphics-symbol" aria-label={`${labels[i]}: ${tip}`}>
            <rect
              className="polish-chart-bar__fill"
              x={x}
              y={h - barH}
              width={barW}
              height={barH}
              rx="4"
              fill={isLast ? 'var(--color-primary)' : 'var(--color-primary-soft)'}
            />
            <text className="polish-chart-tip" x={x + barW / 2} y={h - barH - 6} textAnchor="middle">
              {tip}
            </text>
            <title>{`${labels[i]}: ${tip}`}</title>
            <text
              x={x + barW / 2}
              y={h + 14}
              textAnchor="middle"
              fontSize="9"
              fill="var(--color-text-muted)"
            >
              {labels[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function formatIntIt(n: number): string {
  return new Intl.NumberFormat('it-IT').format(n)
}

function formatEurIt(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

/* ── Section: Overview (WineOS compact) ─────────────────────── */
function SectionOverview({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { user } = useAuth()
  const { stats: billingStats } = useAdminBilling()
  const [overview, setOverview] = useState<AdminOverviewPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let cancelled = false
    void getAdminOverview()
      .then((data) => {
        if (!cancelled) {
          setOverview(data)
          setLoadError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Errore caricamento')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const revenueMonthly = overview?.revenueMonthly ?? []
  const chartData = revenueMonthly.map((r) => r.amountEur)
  const chartLabels = revenueMonthly.map((r) => r.month)
  const kpis = overview?.kpis
  const pendingKyc = kpis?.pendingKyc ?? 0
  const pendingJobs = kpis?.pendingJobs ?? 0
  const premium = kpis?.premiumSubscriptions ?? 0
  const mrr = kpis?.mrrEstimateEur ?? (billingStats ? billingStats.mrrCents / 100 : 0)
  const platformOk = !loadError

  const analyticsSnapshot = useMemo(
    () =>
      buildAdminAnalyticsSnapshot({
        billing: billingStats,
        requests: [],
        revenueMonthly,
      }),
    [billingStats, revenueMonthly],
  )

  const updatedLabel = overview?.generatedAt
    ? new Date(overview.generatedAt).toLocaleString('it-IT')
    : '…'
  const hour = now.getHours()
  const greet = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'
  const firstName = (user?.name ?? 'Admin').trim().split(/\s+/)[0] || 'Admin'
  const clockTime = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const clockDate = now.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const queueTotal = pendingKyc + pendingJobs

  return (
    <div className="admin-home">
      <header className="admin-home__hero">
        <div>
          <p className="admin-home__brandline">Curaxe Admin</p>
          <h1 className="admin-home__greet">
            {greet}, <em>{firstName}</em>
          </h1>
          <p className="admin-home__sub">
            {platformOk ? 'Piattaforma operativa' : 'Attenzione piattaforma'} · aggiornato {updatedLabel}
          </p>
        </div>
        <div className="admin-home__hero-actions">
          <button
            type="button"
            className="dash-btn dash-btn--ghost polish-export-btn"
            onClick={() => exportAdminAnalyticsCsv(analyticsSnapshot)}
            aria-label="Esporta report analytics in CSV"
          >
            <IconUpload size={14} />
            CSV
          </button>
          <button
            type="button"
            className="dash-btn dash-btn--ghost polish-export-btn"
            onClick={() => exportAdminAnalyticsJson(analyticsSnapshot)}
            aria-label="Esporta report analytics in JSON"
          >
            <IconUpload size={14} />
            JSON
          </button>
          <div className="admin-home__clock" aria-hidden="true">
            <span className="admin-home__clock-time">{clockTime}</span>
            <span className="admin-home__clock-date">{clockDate}</span>
          </div>
        </div>
      </header>

      {loadError ? (
        <div className="admin-home__error" role="alert">
          Overview non disponibile — {loadError}
        </div>
      ) : null}

      <div className="admin-home__pulse" role="list">
        <div className="admin-home__pulse-item" role="listitem">
          <span className="admin-home__pulse-label">Utenti</span>
          <strong className="admin-home__pulse-value">{formatIntIt(kpis?.totalUsers ?? 0)}</strong>
          <span className="admin-home__pulse-meta">
            {formatIntIt(kpis?.professionals ?? 0)} pro · {formatIntIt(kpis?.families ?? 0)} famiglie
          </span>
        </div>
        <div className="admin-home__pulse-item" role="listitem">
          <span className="admin-home__pulse-label">MRR</span>
          <strong className="admin-home__pulse-value">{formatEurIt(mrr)}</strong>
          <span className="admin-home__pulse-meta">{formatIntIt(premium)} premium attivi</span>
        </div>
        <div className="admin-home__pulse-item" role="listitem">
          <span className="admin-home__pulse-label">Code</span>
          <strong className="admin-home__pulse-value">{formatIntIt(queueTotal)}</strong>
          <span className="admin-home__pulse-meta">
            KYC {formatIntIt(pendingKyc)} · annunci {formatIntIt(pendingJobs)}
          </span>
        </div>
        <div className="admin-home__pulse-item" role="listitem">
          <span className="admin-home__pulse-label">Stato</span>
          <strong className="admin-home__pulse-value">{platformOk ? 'OK' : 'Check'}</strong>
          <span className="admin-home__pulse-meta">{platformOk ? 'Servizi raggiungibili' : 'Verifica overview'}</span>
        </div>
      </div>

      <div className="admin-home__rooms">
        <button type="button" className="admin-home-room admin-home-room--users" onClick={() => onNavigate('utenti')}>
          <span className="admin-home-room__kicker">Anagrafica</span>
          <span className="admin-home-room__visual" aria-hidden="true"><IconUsers size={28} /></span>
          <span className="admin-home-room__title">Utenti</span>
          <p className="admin-home-room__desc">
            Ruoli, sospensioni e dettagli account — {formatIntIt(kpis?.totalUsers ?? 0)} registrati.
          </p>
          <span className="admin-home-room__cta">Entra</span>
        </button>

        <button type="button" className="admin-home-room admin-home-room--billing" onClick={() => onNavigate('abbonamenti')}>
          <span className="admin-home-room__kicker">Ricavi</span>
          <span className="admin-home-room__visual" aria-hidden="true"><IconCreditCard size={28} /></span>
          <span className="admin-home-room__title">Abbonamenti</span>
          <p className="admin-home-room__desc">
            Piani, trial, refund e catalogo — MRR {formatEurIt(mrr)}.
          </p>
          <span className="admin-home-room__cta">Entra</span>
        </button>

        <button type="button" className="admin-home-room admin-home-room--kyc" onClick={() => onNavigate('verifica')}>
          <span className="admin-home-room__kicker">Compliance</span>
          <span className="admin-home-room__visual" aria-hidden="true"><IconShield size={28} /></span>
          <span className="admin-home-room__title">Verifica KYC</span>
          <p className="admin-home-room__desc">
            Documenti in revisione — coda {formatIntIt(pendingKyc)}.
          </p>
          <span className="admin-home-room__cta">Entra</span>
        </button>

        <button type="button" className="admin-home-room admin-home-room--jobs" onClick={() => onNavigate('moderazione')}>
          <span className="admin-home-room__kicker">Contenuti</span>
          <span className="admin-home-room__visual" aria-hidden="true"><IconBriefcase size={28} /></span>
          <span className="admin-home-room__title">Moderazione</span>
          <p className="admin-home-room__desc">
            Annunci da approvare — in attesa {formatIntIt(pendingJobs)}.
          </p>
          <span className="admin-home-room__cta">Entra</span>
        </button>
      </div>

      <div className="admin-home__split">
        <section className="admin-home-panel admin-home-panel__chart">
          <div className="admin-home-panel__head">
            <div>
              <h2 className="admin-home-panel__title">Andamento revenue</h2>
              <p className="admin-home-panel__sub">Stima ultimi mesi da piani × abbonamenti</p>
            </div>
            <button type="button" className="admin-home__link" onClick={() => onNavigate('abbonamenti')}>
              Apri →
            </button>
          </div>
          {chartData.length > 0 ? (
            <>
              <RevenueChart data={chartData} labels={chartLabels} />
              <p className="admin-home-panel__footnote">
                <IconTrendUp size={12} />
                MRR da catalogo piani × abbonamenti attivi/trial
              </p>
            </>
          ) : (
            <p className="admin-home-panel__sub">Nessun dato revenue disponibile.</p>
          )}
        </section>

        <section className="admin-home-panel">
          <div className="admin-home-panel__head">
            <div>
              <h2 className="admin-home-panel__title">Priorità operative</h2>
              <p className="admin-home-panel__sub">Code e sicurezza</p>
            </div>
            <button type="button" className="admin-home__link" onClick={() => onNavigate('impostazioni')}>
              Impostazioni →
            </button>
          </div>
          <div className="admin-home-sec-list">
            <button type="button" className="admin-home-sec-item" onClick={() => onNavigate('verifica')}>
              <span className={`admin-home-sec-item__icon ${pendingKyc > 0 ? 'admin-home-sec-item__icon--warn' : 'admin-home-sec-item__icon--ok'}`}>
                <IconShield size={15} />
              </span>
              <span className="admin-home-sec-item__body">
                <span className="admin-home-sec-item__title">Verifica KYC</span>
                <span className="admin-home-sec-item__meta">Documenti in revisione</span>
              </span>
              <span className={`admin-home-sec-item__badge ${pendingKyc > 0 ? 'admin-home-sec-item__badge--warn' : 'admin-home-sec-item__badge--ok'}`}>
                {formatIntIt(pendingKyc)}
              </span>
            </button>
            <button type="button" className="admin-home-sec-item" onClick={() => onNavigate('moderazione')}>
              <span className={`admin-home-sec-item__icon ${pendingJobs > 0 ? 'admin-home-sec-item__icon--warn' : 'admin-home-sec-item__icon--ok'}`}>
                <IconBriefcase size={15} />
              </span>
              <span className="admin-home-sec-item__body">
                <span className="admin-home-sec-item__title">Moderazione annunci</span>
                <span className="admin-home-sec-item__meta">In attesa di approvazione</span>
              </span>
              <span className={`admin-home-sec-item__badge ${pendingJobs > 0 ? 'admin-home-sec-item__badge--warn' : 'admin-home-sec-item__badge--ok'}`}>
                {formatIntIt(pendingJobs)}
              </span>
            </button>
            <button type="button" className="admin-home-sec-item" onClick={() => onNavigate('account')}>
              <span className="admin-home-sec-item__icon admin-home-sec-item__icon--ok">
                <IconCheck size={15} />
              </span>
              <span className="admin-home-sec-item__body">
                <span className="admin-home-sec-item__title">Sicurezza account</span>
                <span className="admin-home-sec-item__meta">Step-up e passkey</span>
              </span>
              <span className="admin-home-sec-item__badge admin-home-sec-item__badge--ok">OK</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ── Section: Subscriptions + Stripe landlord wizard ── */
function SectionSubscriptions() {
  const [showTrash, setShowTrash] = useState(false)
  const { subscriptions, stats, loading, error, reload } = useAdminBilling(showTrash)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  const mrrLabel = stats
    ? `€${(stats.mrrCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : '—'

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
      }
      if (kind === 'portal') {
        const { url } = await postAdminPortalLink(id)
        await navigator.clipboard.writeText(url)
        window.open(url, '_blank', 'noopener,noreferrer')
      }
      if (kind !== 'checkout' && kind !== 'portal') await reload()
    } catch {
      // errori gestiti a livello API; reload comunque
      await reload()
    } finally {
      setActionBusy(null)
    }
  }

  if (loading && !stats) {
    return (
      <div>
        <div className="dash-section-header">
          <h2 className="dash-section__title">Abbonamenti e pagamenti</h2>
        </div>
        <div className="dash-empty-mini">Caricamento abbonamenti…</div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div>
        <div className="dash-section-header">
          <h2 className="dash-section__title">Abbonamenti e pagamenti</h2>
        </div>
        <p style={{ color: '#D95F5F', marginBottom: 'var(--space-4)' }}>{error}</p>
        <button type="button" className="dash-btn dash-btn--ghost" onClick={() => void reload()}>
          Riprova
        </button>
      </div>
    )
  }

  return (
    <div className="dash-admin-billing">
      <AdminPlansCatalogSection />

      <AdminStripeSetupSection />

      <div className="dash-section-header" style={{ marginTop: 32 }}>
        <div>
          <h2 className="dash-section__title">Abbonamenti clienti</h2>
          <p className="dash-section__subtitle">
            {stats?.activePremium ?? 0} attivi/trial · MRR {mrrLabel}
            {(stats?.trashed ?? 0) > 0 ? ` · ${stats?.trashed} nel cestino` : ''}
          </p>
        </div>
        <div className="dash-admin-plans__actions">
          <button
            type="button"
            className={`dash-btn ${showTrash ? 'dash-btn--ghost' : 'dash-btn--primary'}`}
            onClick={() => setShowTrash(false)}
          >
            Attivi
          </button>
          <button
            type="button"
            className={`dash-btn ${showTrash ? 'dash-btn--primary' : 'dash-btn--ghost'}`}
            onClick={() => setShowTrash(true)}
          >
            Cestino{typeof stats?.trashed === 'number' ? ` (${stats.trashed})` : ''}
          </button>
        </div>
      </div>

      <div className="dash-stat-grid dash-admin-billing-stats">
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-sage-softer)', color: 'var(--color-sage)' }}>
            <IconCreditCard size={20} />
          </div>
          <div className="dash-stat-card__value" style={{ color: 'var(--color-sage)' }}>{stats?.activePremium ?? 0}</div>
          <div className="dash-stat-card__label">Premium / trial</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-accent-softer)', color: 'var(--color-accent)' }}>
            <IconTrendUp size={20} />
          </div>
          <div className="dash-stat-card__value" style={{ color: 'var(--color-accent)' }}>{stats?.renewalsWithin7Days ?? 0}</div>
          <div className="dash-stat-card__label">In cancellazione</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'rgba(217, 95, 95, 0.12)', color: '#D95F5F' }}>
            <IconAlert size={20} />
          </div>
          <div className="dash-stat-card__value" style={{ color: '#D95F5F' }}>{stats?.failedPayments ?? 0}</div>
          <div className="dash-stat-card__label">Pagamenti falliti</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-primary-softer)', color: 'var(--color-primary)' }}>
            <IconCreditCard size={20} />
          </div>
          <div className="dash-stat-card__value" style={{ color: 'var(--color-primary)' }}>{mrrLabel}</div>
          <div className="dash-stat-card__label">MRR stimato</div>
        </div>
      </div>

      {showTrash ? (
        <p className="dash-section__subtitle" style={{ marginBottom: 12 }}>
          Abbonamenti falliti o scaduti spostati qui. Puoi ripristinarli o eliminarli definitivamente.
        </p>
      ) : null}

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Utente</th>
              <th>Piano</th>
              <th>Rinnovo / prova</th>
              <th>Status</th>
              <th>Tipo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
                  Caricamento…
                </td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
                  {showTrash ? 'Cestino vuoto.' : 'Nessun abbonamento registrato.'}
                </td>
              </tr>
            ) : (
              subscriptions.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>
                    {s.userName}
                    <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-muted)' }}>{s.userEmail}</div>
                  </td>
                  <td>{s.plan}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{s.renewal}</td>
                  <td>
                    <span className={`dash-badge dash-badge--${s.status === 'active' ? 'active' : s.status === 'failed' ? 'failed' : 'paused'}`}>
                      {s.status === 'active' ? 'Attivo' : s.status === 'failed' ? 'Fallito' : 'In scadenza'}
                    </span>
                  </td>
                  <td>{s.audience === 'agency' ? 'B2B' : s.audience === 'structure' ? 'RSA' : 'PRO'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {showTrash ? (
                        <>
                          <button
                            type="button"
                            className="dash-btn dash-btn--ghost"
                            style={{ fontSize: 12, padding: '4px 8px' }}
                            disabled={actionBusy !== null}
                            onClick={() => void runAction(s.id, 'restore')}
                          >
                            Ripristina
                          </button>
                          <button
                            type="button"
                            className="dash-btn dash-btn--ghost"
                            style={{ fontSize: 12, padding: '4px 8px', color: '#D95F5F' }}
                            disabled={actionBusy !== null}
                            onClick={() => void runAction(s.id, 'purge')}
                          >
                            Elimina
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="dash-btn dash-btn--ghost"
                            style={{ fontSize: 12, padding: '4px 8px' }}
                            disabled={actionBusy !== null}
                            title="Apre Stripe Checkout (carta solo su Stripe)"
                            onClick={() => void runAction(s.id, 'checkout')}
                          >
                            Link Checkout
                          </button>
                          <button
                            type="button"
                            className="dash-btn dash-btn--ghost"
                            style={{ fontSize: 12, padding: '4px 8px' }}
                            disabled={actionBusy !== null}
                            title="Customer Portal Stripe"
                            onClick={() => void runAction(s.id, 'portal')}
                          >
                            Link Portal
                          </button>
                          <button
                            type="button"
                            className="dash-btn dash-btn--ghost"
                            style={{ fontSize: 12, padding: '4px 8px' }}
                            disabled={actionBusy !== null}
                            onClick={() => void runAction(s.id, 'trial')}
                          >
                            +7gg prova
                          </button>
                          <button
                            type="button"
                            className="dash-btn dash-btn--ghost"
                            style={{ fontSize: 12, padding: '4px 8px' }}
                            disabled={actionBusy !== null}
                            onClick={() => void runAction(s.id, 'refund')}
                          >
                            Rimborso
                          </button>
                          <button
                            type="button"
                            className="dash-btn dash-btn--ghost"
                            style={{ fontSize: 12, padding: '4px 8px' }}
                            disabled={actionBusy !== null}
                            onClick={() => void runAction(s.id, 'cancel')}
                          >
                            Cancella
                          </button>
                          {s.canTrash || s.status === 'failed' || s.status === 'expiring' ? (
                            <button
                              type="button"
                              className="dash-btn dash-btn--ghost"
                              style={{ fontSize: 12, padding: '4px 8px' }}
                              disabled={actionBusy !== null}
                              title="Sposta nel cestino"
                              onClick={() => void runAction(s.id, 'trash')}
                            >
                              Cestino
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function VerifyToast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={`dash-toast polish-toast${visible ? ' dash-toast--visible' : ''}`}>
      <span className="dash-toast__icon"><IconCheck size={18} /></span>
      {message}
    </div>
  )
}

function VerifyLoadSkeleton() {
  return (
    <div aria-busy="true" aria-label="Caricamento coda verifica">
      <div className="dash-skeleton dash-skeleton--title" style={{ width: 220, height: 28, marginBottom: 12 }} />
      <div className="dash-skeleton" style={{ width: '100%', height: 120, marginBottom: 12 }} />
      <div className="dash-skeleton" style={{ width: '100%', height: 120 }} />
    </div>
  )
}

function VerifyErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="dash-empty-state" role="alert">
      <div className="dash-empty-state__icon">
        <IconAlert size={28} />
      </div>
      <div className="dash-empty-state__title">Impossibile caricare la coda</div>
      <div className="dash-empty-state__sub">{message}</div>
      <button type="button" className="dash-btn dash-btn--primary" onClick={onRetry}>
        Riprova
      </button>
    </div>
  )
}

function KycDocumentPreview({ document }: { document: AdminKycDocument }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let revoke: string | null = null
    let cancelled = false
    const path = document.url.startsWith('http')
      ? document.url
      : document.url.startsWith('/')
        ? document.url
        : `/${document.url}`

    if (path.startsWith('blob:') || path.startsWith('data:')) {
      setObjectUrl(path)
      return
    }

    // Path API relativo → download autenticato
    if (path.startsWith('/api/')) {
      void httpGetBlob(path)
        .then((blob) => {
          if (cancelled) return
          const url = URL.createObjectURL(blob)
          revoke = url
          setObjectUrl(url)
        })
        .catch(() => {
          if (!cancelled) setError('Anteprima non disponibile.')
        })
      return () => {
        cancelled = true
        if (revoke) URL.revokeObjectURL(revoke)
      }
    }

    setObjectUrl(getApiBaseUrl() ? `${getApiBaseUrl().replace(/\/$/, '')}${path}` : path)
    return () => {
      cancelled = true
    }
  }, [document.url])

  if (error) {
    return <div className="dash-kyc-preview__hint">{error}</div>
  }

  if (!objectUrl) {
    return <div className="dash-kyc-preview__hint">Caricamento documento…</div>
  }

  if (document.mimeType === 'image') {
    return (
      <img
        src={objectUrl}
        alt={document.label}
        className="dash-kyc-preview__image"
      />
    )
  }

  return (
    <div className="dash-kyc-preview dash-kyc-preview--pdf">
      <iframe title={document.label} src={objectUrl} className="dash-kyc-preview__frame" />
      <a className="dash-btn dash-btn--primary" href={objectUrl} target="_blank" rel="noopener noreferrer">
        Apri PDF
      </a>
    </div>
  )
}

function KycDocumentsModal({
  item,
  onClose,
}: {
  item: AdminKycQueueItem
  onClose: () => void
}) {
  const [activeDocId, setActiveDocId] = useState(item.documents[0]?.id ?? '')
  const activeDoc = item.documents.find((d) => d.id === activeDocId) ?? item.documents[0]

  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div
        className="dash-modal"
        role="dialog"
        aria-labelledby="kyc-docs-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720 }}
      >
        <div className="dash-modal__header">
          <span className="dash-modal__title" id="kyc-docs-title">
            Documenti — {item.name}
          </span>
          <button type="button" className="dash-modal__close" onClick={onClose} aria-label="Chiudi">
            <IconClose size={18} />
          </button>
        </div>
        <div className="dash-modal__body">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-4)' }}>
            {item.documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className={`dash-btn dash-btn--ghost${activeDoc?.id === doc.id ? ' dash-btn--primary' : ''}`}
                onClick={() => setActiveDocId(doc.id)}
              >
                {KYC_DOCUMENT_TYPE_LABELS[doc.type]}
              </button>
            ))}
          </div>
          {activeDoc ? <KycDocumentPreview document={activeDoc} /> : null}
        </div>
        <div className="dash-modal__footer">
          <Link className="dash-btn dash-btn--ghost" to={profileDetailPath(item.professionalId)} target="_blank">
            Profilo pubblico
          </Link>
          <button type="button" className="dash-btn dash-btn--primary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

function KycRejectModal({
  reason,
  error,
  loading,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  reason: string
  error: string | null
  loading: boolean
  onReasonChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div
        className="dash-modal"
        role="dialog"
        aria-labelledby="kyc-reject-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dash-modal__header">
          <span className="dash-modal__title" id="kyc-reject-title">
            Rifiuta verifica
          </span>
          <button type="button" className="dash-modal__close" onClick={onClose} aria-label="Chiudi">
            <IconClose size={18} />
          </button>
        </div>
        <div className="dash-modal__body">
          <p className="dash-modal__lead">
            Il professionista verrà aggiornato con lo stato di rifiuto e il motivo.
          </p>
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="kyc-reject-reason">
              Motivo del rifiuto
            </label>
            <textarea
              id="kyc-reject-reason"
              className="dash-form-input dash-form-textarea"
              style={{ minHeight: 96 }}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Es. documento scaduto o illeggibile"
            />
          </div>
          {error ? (
            <p role="alert" style={{ color: 'var(--color-danger, #c62828)', fontSize: 'var(--text-xs)', marginTop: 8 }}>
              {error}
            </p>
          ) : null}
        </div>
        <div className="dash-modal__footer">
          <button type="button" className="dash-btn dash-btn--ghost" onClick={onClose} disabled={loading}>
            Annulla
          </button>
          <button type="button" className="dash-btn dash-btn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Invio…' : 'Conferma rifiuto'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Section: B2B job moderation (ADM-014) ──────────────────── */
function JobModerationRejectModal({
  title,
  reason,
  error,
  loading,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  title: string
  reason: string
  error: string | null
  loading: boolean
  onReasonChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="dash-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="job-reject-title" onClick={onClose}>
      <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dash-modal__header">
          <span className="dash-modal__title" id="job-reject-title">
            Rifiuta annuncio
          </span>
          <button type="button" className="dash-modal__close" onClick={onClose} aria-label="Chiudi">
            <IconClose size={18} />
          </button>
        </div>
        <div className="dash-modal__body">
          <p className="dash-modal__lead">{title}</p>
          <div className="dash-form-field dash-form-field--full">
            <label className="dash-form-label" htmlFor="job-reject-reason">
              Motivo del rifiuto
            </label>
            <textarea
              id="job-reject-reason"
              className="dash-form-input dash-form-textarea"
              rows={4}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Descrivi cosa correggere prima di ripubblicare…"
            />
          </div>
          {error ? <p className="dash-form-error" role="alert">{error}</p> : null}
        </div>
        <div className="dash-modal__footer">
          <button type="button" className="dash-btn dash-btn--ghost" onClick={onClose}>
            Annulla
          </button>
          <button type="button" className="dash-btn dash-btn--danger" disabled={loading} onClick={onConfirm}>
            {loading ? 'Invio…' : 'Conferma rifiuto'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionJobModeration() {
  const mod = useAdminJobModeration()

  if (mod.loading) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Moderazione annunci B2B</h2>
            <p className="dash-section__subtitle">Caricamento coda…</p>
          </div>
        </div>
        <VerifyLoadSkeleton />
      </div>
    )
  }

  if (mod.error) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Moderazione annunci B2B</h2>
          </div>
        </div>
        <VerifyErrorState message={mod.error} onRetry={mod.reload} />
      </div>
    )
  }

  return (
    <div className="dash-admin-moderation">
      <VerifyToast message={mod.toast ?? ''} visible={Boolean(mod.toast)} />

      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Moderazione annunci B2B</h2>
          <p className="dash-section__subtitle">
            {mod.pending.length} annunci in attesa di approvazione
          </p>
        </div>
      </div>

      {mod.actionError && !mod.rejectTarget ? (
        <div className="dash-profile-preview dash-profile-preview--alert" role="alert">
          {mod.actionError}
          <button type="button" className="dash-btn dash-btn--ghost dash-profile-preview__action" onClick={mod.clearActionError}>
            Chiudi
          </button>
        </div>
      ) : null}

      {mod.pending.length === 0 ? (
        <div className="dash-profile-preview dash-profile-preview--success">
          <IconCheck size={16} />
          Nessun annuncio in coda di moderazione.
        </div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Annuncio</th>
                <th>Organizzazione</th>
                <th>Tipo</th>
                <th>Sede</th>
                <th>Inviato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {mod.pending.map((item: AdminJobModerationQueueItem) => {
                const busy = mod.actionLoadingId === item.id
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.title}</td>
                    <td>{item.ownerDisplayName}</td>
                    <td>{ADMIN_JOB_OWNER_TYPE_LABELS[item.ownerType]}</td>
                    <td>{item.locationLabel}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatAdminJobModerationDate(item.submittedAt)}</td>
                    <td>
                      <div className="dash-table__actions">
                        <button
                          type="button"
                          className="dash-btn dash-btn--sage"
                          disabled={busy}
                          onClick={() => void mod.approve(item)}
                        >
                          {busy ? '…' : 'Approva'}
                        </button>
                        <button
                          type="button"
                          className="dash-btn dash-btn--danger"
                          disabled={busy}
                          onClick={() => mod.openReject(item)}
                        >
                          Rifiuta
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {mod.rejectTarget ? (
        <JobModerationRejectModal
          title={mod.rejectTarget.title}
          reason={mod.rejectReason}
          error={mod.actionError}
          loading={mod.actionLoadingId === mod.rejectTarget.id}
          onReasonChange={mod.setRejectReason}
          onClose={mod.closeReject}
          onConfirm={() => void mod.confirmReject()}
        />
      ) : null}
    </div>
  )
}

/* ── Section: Verify Profiles ───────────────────────────────── */
function SectionVerify() {
  const kyc = useAdminKycQueue()

  if (kyc.loading) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Verifica profili</h2>
            <p className="dash-section__subtitle">Caricamento coda…</p>
          </div>
        </div>
        <VerifyLoadSkeleton />
      </div>
    )
  }

  if (kyc.error) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Verifica profili</h2>
          </div>
        </div>
        <VerifyErrorState message={kyc.error} onRetry={kyc.reload} />
      </div>
    )
  }

  return (
    <div className="dash-admin-verify">
      <VerifyToast message={kyc.toast ?? ''} visible={Boolean(kyc.toast)} />

      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Verifica profili</h2>
          <p className="dash-section__subtitle">{kyc.pending.length} profili in attesa di verifica</p>
        </div>
      </div>

      {kyc.actionError && !kyc.rejectTargetId ? (
        <div className="dash-profile-preview dash-profile-preview--alert" role="alert">
          {kyc.actionError}
          <button type="button" className="dash-btn dash-btn--ghost dash-profile-preview__action" onClick={kyc.clearActionError}>
            Chiudi
          </button>
        </div>
      ) : null}

      {kyc.pending.length === 0 ? (
        <div className="dash-profile-preview dash-profile-preview--success">
          <IconCheck size={16} />
          Nessun profilo in attesa di verifica. Ottimo lavoro!
        </div>
      ) : null}

      <div className="dash-verify-list">
      {kyc.pending.map((p) => {
        const busy = kyc.actionLoadingId === p.id
        return (
          <div key={p.id} className="dash-verify-card">
            <div className="dash-verify-card__avatar">{p.initials}</div>
            <div className="dash-verify-card__info">
              <div className="dash-verify-card__name">
                {p.name}
                <Link
                  to={profileDetailPath(p.professionalId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginLeft: 8, fontSize: 'var(--text-xs)', fontWeight: 500 }}
                >
                  Vedi profilo
                </Link>
              </div>
              <div className="dash-verify-card__meta">
                {p.category} · Richiesta il {formatAdminKycDate(p.submittedAt)}
              </div>
              <div className="dash-verify-card__docs">
                Documenti: {formatAdminKycDocumentsSummary(p.documents)}
              </div>
            </div>
            <div className="dash-verify-card__actions">
              <button
                type="button"
                className="dash-btn dash-btn--ghost"
                onClick={() => kyc.openDocuments(p)}
                disabled={busy}
              >
                Vedi documenti
              </button>
              <button
                type="button"
                className="dash-btn dash-btn--sage"
                onClick={() => void kyc.approve(p.id)}
                disabled={busy}
              >
                {busy ? '…' : 'Approva'}
              </button>
              <button type="button" className="dash-btn dash-btn--ghost" disabled title="Disponibile in un prossimo sprint">
                Richiedi info
              </button>
              <button
                type="button"
                className="dash-btn dash-btn--danger"
                onClick={() => kyc.openReject(p.id)}
                disabled={busy}
              >
                Rifiuta
              </button>
            </div>
          </div>
        )
      })}
      </div>

      {kyc.documentsTarget ? (
        <KycDocumentsModal item={kyc.documentsTarget} onClose={kyc.closeDocuments} />
      ) : null}

      {kyc.rejectTargetId ? (
        <KycRejectModal
          reason={kyc.rejectReason}
          error={kyc.actionError}
          loading={kyc.actionLoadingId === kyc.rejectTargetId}
          onReasonChange={kyc.setRejectReason}
          onClose={kyc.closeReject}
          onConfirm={() => void kyc.confirmReject()}
        />
      ) : null}
    </div>
  )
}

const EMAIL_NOTIFICATION_KEYS = Object.keys(
  ADMIN_EMAIL_NOTIFICATION_LABELS,
) as AdminEmailNotificationKey[]

/* ── Section: Settings ──────────────────────────────────────── */
function SectionSettings({ onGoToPlans }: { onGoToPlans: () => void }) {
  const settingsHook = useAdminSettings()
  const s = settingsHook.settings

  if (settingsHook.loading) {
    return (
      <div className="admin-settings">
        <header className="admin-settings__hero">
          <div>
            <div className="admin-settings__eyebrow"><IconSettings size={12} /> Piattaforma</div>
            <h1 className="admin-settings__title">Impostazioni</h1>
            <p className="admin-settings__sub">Caricamento…</p>
          </div>
        </header>
        <VerifyLoadSkeleton />
      </div>
    )
  }

  if (settingsHook.error || !s) {
    return (
      <div className="admin-settings">
        <header className="admin-settings__hero">
          <div>
            <div className="admin-settings__eyebrow"><IconSettings size={12} /> Piattaforma</div>
            <h1 className="admin-settings__title">Impostazioni</h1>
          </div>
        </header>
        <VerifyErrorState
          message={settingsHook.error ?? 'Impostazioni non disponibili.'}
          onRetry={settingsHook.reload}
        />
      </div>
    )
  }

  return (
    <div className="admin-settings">
      <VerifyToast message={settingsHook.toast ?? ''} visible={Boolean(settingsHook.toast)} />

      <header className="admin-settings__hero">
        <div>
          <div className="admin-settings__eyebrow"><IconSettings size={12} /> Piattaforma</div>
          <h1 className="admin-settings__title">Impostazioni</h1>
          <p className="admin-settings__sub">Configurazioni globali · salvataggio per sezione</p>
        </div>
      </header>

      {settingsHook.saveError ? (
        <div className="admin-settings__error" role="alert">
          {settingsHook.saveError}
        </div>
      ) : null}

      <div className="admin-settings__grid">
        <section className="admin-settings-card admin-settings-card--span-4">
          <div className="admin-settings-card__head">
            <h2 className="admin-settings-card__title">Piani e prezzi</h2>
            <span className="admin-settings-card__icon" aria-hidden="true"><IconCreditCard size={15} /></span>
          </div>
          <p className="admin-settings-card__desc">
            Catalogo piani (nomi, importi, feature, Stripe Price ID) in Abbonamenti → Catalogo piani.
          </p>
          <div className="admin-settings-card__actions">
            <button type="button" className="dash-btn dash-btn--ghost" onClick={onGoToPlans}>
              Vai al catalogo
            </button>
          </div>
        </section>

        <section className="admin-settings-card admin-settings-card--span-8">
          <div className="admin-settings-card__head">
            <h2 className="admin-settings-card__title">Email notifiche</h2>
            <span className="admin-settings-card__icon" aria-hidden="true"><IconBell size={15} /></span>
          </div>
          {EMAIL_NOTIFICATION_KEYS.map((key) => (
            <div key={key} className="dash-settings-row">
              <span className="dash-settings-row__label">
                {ADMIN_EMAIL_NOTIFICATION_LABELS[key]}
              </span>
              <input
                type="checkbox"
                className="dash-settings-row__checkbox"
                checked={s.emailNotifications[key]}
                onChange={(e) =>
                  settingsHook.updateLocal({
                    emailNotifications: { ...s.emailNotifications, [key]: e.target.checked },
                  })
                }
                aria-label={ADMIN_EMAIL_NOTIFICATION_LABELS[key]}
              />
            </div>
          ))}
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="adm-email-welcome">
              Oggetto email benvenuto (stub)
            </label>
            <input
              id="adm-email-welcome"
              className="dash-form-input"
              type="text"
              value={s.emailTemplates.welcomeSubject}
              onChange={(e) =>
                settingsHook.updateLocal({
                  emailTemplates: { ...s.emailTemplates, welcomeSubject: e.target.value },
                })
              }
            />
          </div>
          <div className="admin-settings-card__actions">
            <button
              type="button"
              className="dash-btn dash-btn--primary"
              disabled={settingsHook.saving}
              onClick={() =>
                void settingsHook.save(
                  {
                    emailNotifications: s.emailNotifications,
                    emailTemplates: s.emailTemplates,
                  },
                  'Notifiche email salvate.',
                )
              }
            >
              {settingsHook.saving ? 'Salvataggio…' : 'Salva notifiche'}
            </button>
          </div>
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card__head">
            <h2 className="admin-settings-card__title">Manutenzione</h2>
            <span className="admin-settings-card__icon admin-settings-card__icon--warn" aria-hidden="true">
              <IconAlert size={15} />
            </span>
          </div>
          <div className="dash-settings-row dash-settings-row--stack">
            <div className="dash-settings-row__main">
              <span className="dash-settings-row__label">Modalità manutenzione</span>
              <span
                className={`dash-badge dash-badge--${s.maintenance.enabled ? 'ongoing' : 'closed'}`}
              >
                {s.maintenance.enabled ? 'Attiva' : 'Disattiva'}
              </span>
            </div>
            <p className="dash-settings-row__hint">
              Blocca scritture API (richieste, candidature, annunci, messaggi, checkout). Banner
              separato nella card Funzionalità.
            </p>
            <button
              type="button"
              className="dash-btn dash-btn--ghost"
              disabled={settingsHook.saving}
              onClick={() =>
                settingsHook.updateLocal({
                  maintenance: { ...s.maintenance, enabled: !s.maintenance.enabled },
                })
              }
            >
              {s.maintenance.enabled ? 'Disattiva' : 'Attiva'}
            </button>
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="adm-maintenance-msg">
              Messaggio di manutenzione
            </label>
            <textarea
              id="adm-maintenance-msg"
              className="dash-form-input dash-form-textarea"
              value={s.maintenance.message}
              onChange={(e) =>
                settingsHook.updateLocal({
                  maintenance: { ...s.maintenance, message: e.target.value },
                })
              }
            />
          </div>
          <div className="admin-settings-card__actions">
            <button
              type="button"
              className="dash-btn dash-btn--primary"
              disabled={settingsHook.saving}
              onClick={() =>
                void settingsHook.save({ maintenance: s.maintenance }, 'Impostazioni manutenzione salvate.')
              }
            >
              {settingsHook.saving ? 'Salvataggio…' : 'Salva manutenzione'}
            </button>
          </div>
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card__head">
            <h2 className="admin-settings-card__title">Limiti piano FREE</h2>
            <span className="admin-settings-card__icon" aria-hidden="true"><IconUsers size={15} /></span>
          </div>
          <p className="admin-settings-card__desc">
            Account senza Premium. Applicati subito dall’API su richieste e candidature.
          </p>
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="adm-free-requests">
              Max richieste/mese (FREE)
            </label>
            <p className="dash-settings-row__hint">Famiglia: pubblicazioni nel mese (bozze escluse).</p>
            <input
              id="adm-free-requests"
              className="dash-form-input"
              type="number"
              min="0"
              value={s.freeLimits.maxRequestsPerMonth}
              onChange={(e) =>
                settingsHook.updateLocal({
                  freeLimits: {
                    ...s.freeLimits,
                    maxRequestsPerMonth: Number(e.target.value),
                  },
                })
              }
            />
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="adm-free-applications">
              Max candidature attive (FREE)
            </label>
            <p className="dash-settings-row__hint">Professionista non Premium: inviate / in valutazione.</p>
            <input
              id="adm-free-applications"
              className="dash-form-input"
              type="number"
              min="0"
              value={s.freeLimits.maxActiveApplications}
              onChange={(e) =>
                settingsHook.updateLocal({
                  freeLimits: {
                    ...s.freeLimits,
                    maxActiveApplications: Number(e.target.value),
                  },
                })
              }
            />
          </div>
          <div className="admin-settings-card__actions">
            <button
              type="button"
              className="dash-btn dash-btn--primary"
              disabled={settingsHook.saving}
              onClick={() =>
                void settingsHook.save({ freeLimits: s.freeLimits }, 'Limiti piano FREE salvati.')
              }
            >
              {settingsHook.saving ? 'Salvataggio…' : 'Salva limiti'}
            </button>
          </div>
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card__head">
            <h2 className="admin-settings-card__title">Commissioni marketplace</h2>
            <span className="admin-settings-card__icon admin-settings-card__icon--ok" aria-hidden="true">
              <IconTrendUp size={15} />
            </span>
          </div>
          <span className="dash-badge dash-badge--ongoing" style={{ alignSelf: 'flex-start' }}>
            Pianificato — non attivo
          </span>
          <p className="admin-settings-card__desc">
            Riferimento futuro: non influenzano Stripe né i flussi attuali.
          </p>
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="adm-comm-pro">
              Professionisti (%) — riferimento
            </label>
            <input
              id="adm-comm-pro"
              className="dash-form-input"
              type="number"
              min="0"
              max="100"
              value={s.commissionRates.professionalPercent}
              disabled
              readOnly
              aria-readonly="true"
            />
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="adm-comm-agency">
              Agenzie (%) — riferimento
            </label>
            <input
              id="adm-comm-agency"
              className="dash-form-input"
              type="number"
              min="0"
              max="100"
              value={s.commissionRates.agencyPercent}
              disabled
              readOnly
              aria-readonly="true"
            />
          </div>
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card__head">
            <h2 className="admin-settings-card__title">Funzionalità</h2>
            <span className="admin-settings-card__icon" aria-hidden="true"><IconGrid size={15} /></span>
          </div>
          <p className="admin-settings-card__desc">
            Flag operativi: disattivando, l’API blocca subito l’azione.
          </p>
          {(
            [
              [
                'b2bJobPostings',
                'Annunci B2B',
                'Agenzie e strutture: creare o ripubblicare annunci.',
              ],
              [
                'familyMessaging',
                'Messaggistica famiglia',
                'Famiglie: contatti e thread diretti.',
              ],
              [
                'stripeCheckout',
                'Checkout Stripe',
                'Avvio checkout Premium.',
              ],
              [
                'maintenanceBanner',
                'Banner manutenzione',
                'Con modalità manutenzione: messaggio in alto sul sito.',
              ],
            ] as const
          ).map(([key, label, hint]) => (
            <div key={key} className="dash-settings-row dash-settings-row--stack">
              <div className="dash-settings-row__main">
                <span className="dash-settings-row__label">{label}</span>
                <input
                  type="checkbox"
                  className="dash-settings-row__checkbox"
                  checked={s.featureFlags[key]}
                  onChange={(e) =>
                    settingsHook.updateLocal({
                      featureFlags: { ...s.featureFlags, [key]: e.target.checked },
                    })
                  }
                  aria-label={label}
                />
              </div>
              <p className="dash-settings-row__hint">{hint}</p>
            </div>
          ))}
          <div className="admin-settings-card__actions">
            <button
              type="button"
              className="dash-btn dash-btn--primary"
              disabled={settingsHook.saving}
              onClick={() =>
                void settingsHook.save({ featureFlags: s.featureFlags }, 'Funzionalità salvate.')
              }
            >
              {settingsHook.saving ? 'Salvataggio…' : 'Salva funzionalità'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ── Nav items ──────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', tabLabel: 'Home', icon: <IconGrid size={18} /> },
  { id: 'utenti', label: 'Utenti', tabLabel: 'Utenti', icon: <IconUsers size={18} /> },
  { id: 'abbonamenti', label: 'Abbonamenti', tabLabel: 'Piani', icon: <IconCreditCard size={18} /> },
  { id: 'verifica', label: 'Verifica', tabLabel: 'KYC', icon: <IconShield size={18} /> },
  { id: 'moderazione', label: 'Moderazione', tabLabel: 'Annunci', icon: <IconBriefcase size={18} /> },
  { id: 'impostazioni', label: 'Impostazioni', tabLabel: 'Settings', icon: <IconSettings size={18} /> },
  { id: 'account', label: 'Account', tabLabel: 'Account', icon: <IconProfile size={18} /> },
]

/* ── Main component ─────────────────────────────────────────── */
export function AdminDashboard() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('overview')

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':      return <SectionOverview onNavigate={setActiveSection} />
      case 'utenti':        return <AdminUsersSection />
      case 'abbonamenti':   return <SectionSubscriptions />
      case 'verifica':      return <SectionVerify />
      case 'moderazione':   return <SectionJobModeration />
      case 'impostazioni':  return <SectionSettings onGoToPlans={() => setActiveSection('abbonamenti')} />
      case 'account':       return (
        <div className="dash-admin-account">
          <AccountSettingsSection title="Il mio account" subtitle="Email, password e notifiche personali" />
          <AdminSecuritySection />
        </div>
      )
      default:              return null
    }
  }

  return (
    <DashboardLayout
      accountType="admin"
      userName={user?.name ?? 'Admin'}
      userRole="Amministratore piattaforma"
      navItems={NAV_ITEMS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      mobileTabIds={['overview', 'utenti', 'abbonamenti', 'verifica']}
    >
      {renderSection()}
    </DashboardLayout>
  )
}
