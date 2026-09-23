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
import {
  ADMIN_USER_ROLE_LABELS,
  ADMIN_USER_STATUS_LABELS,
  formatAdminUserDate,
  formatAdminUserDateTime,
} from '../../../lib/adminUserApi'
import type { AdminUserDetail } from '../../../lib/adminUserTypes'
import { profileDetailPath } from '../../../lib/siteRoutes'
import { useAdminBilling } from '../../../hooks/useAdminBilling'
import { useAdminJobModeration } from '../../../hooks/useAdminJobModeration'
import { useAdminKycQueue } from '../../../hooks/useAdminKycQueue'
import { useAdminSettings } from '../../../hooks/useAdminSettings'
import { useAdminTickets } from '../../../hooks/useAdminTickets'
import { useAdminUsers } from '../../../hooks/useAdminUsers'
import {
  ADMIN_EMAIL_NOTIFICATION_LABELS,
  type AdminEmailNotificationKey,
} from '../../../lib/adminSettingsApi'
import {
  ADMIN_TICKET_PRIORITY_LABELS,
  ADMIN_TICKET_STATUS_LABELS,
  formatAdminTicketDate,
  formatAdminTicketDateTime,
} from '../../../lib/adminTicketApi'
import type { AdminTicket, AdminTicketMessage } from '../../../lib/adminTicketTypes'
import {
  buildAdminAnalyticsSnapshot,
  exportAdminAnalyticsCsv,
  exportAdminAnalyticsJson,
} from '../../../lib/exportUtils'
import {
  IconAlert,
  IconBriefcase,
  IconCheck,
  IconClose,
  IconCreditCard,
  IconGrid,
  IconInbox,
  IconList,
  IconMessages,
  IconProfile,
  IconSettings,
  IconShield,
  IconTrendUp,
  IconUpload,
  IconUsers,
} from '../../../components/icons/DashboardIcons'
import { AccountSettingsSection } from '../AccountSettingsSection'
import { DashboardLayout } from '../DashboardLayout'
import {
  AdminRequestsSection,
  collectFamilyRequests,
} from './sections/AdminRequestsSection'
import { AdminStripeSetupSection } from './AdminStripeSetupSection'
import { AdminPasskeysPanel } from './AdminPasskeysPanel'
import {
  postAdminCancelSubscription,
  postAdminExtendTrial,
  postAdminSubscriptionRefund,
} from '../../../lib/adminBillingSettingsApi'

const REVENUE_DATA = [2100, 2400, 2800, 3100, 3500, 3800, 4100, 4300, 4400, 4658]
const REVENUE_MONTHS = ['Ago', 'Set', 'Ott', 'Nov', 'Dic', 'Gen', 'Feb', 'Mar', 'Apr', 'Mag']

/* ── Revenue SVG chart ──────────────────────────────────────── */
function RevenueChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data)
  const barW = 28
  const gap = 8
  const h = 80
  const totalW = data.length * (barW + gap) - gap

  return (
    <svg viewBox={`0 0 ${totalW} ${h + 20}`} className="dash-chart-svg" style={{ height: 110 }}>
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

/* ── Section: Overview ──────────────────────────────────────── */
function SectionOverview() {
  const { user } = useAuth()
  const { stats: billingStats } = useAdminBilling()

  const revenueMonthly = useMemo(
    () =>
      REVENUE_MONTHS.map((month, i) => ({
        month,
        amountEur: REVENUE_DATA[i] ?? 0,
      })),
    [],
  )

  const requestRows = useMemo(() => collectFamilyRequests(), [])

  const analyticsSnapshot = useMemo(
    () =>
      buildAdminAnalyticsSnapshot({
        billing: billingStats,
        requests: requestRows,
        revenueMonthly,
      }),
    [billingStats, requestRows, revenueMonthly],
  )

  return (
    <div className="dash-admin-overview">
      <div className="dash-welcome-banner dash-welcome-banner--admin">
        <div className="dash-welcome-banner__greeting">
          <span className="dash-welcome-banner__greeting-icon"><IconShield size={16} /></span>
          Console amministrazione
        </div>
        <div className="dash-welcome-banner__name">{user?.name ?? 'Admin'}</div>
        <div className="dash-welcome-banner__sub">Panoramica piattaforma · dati aggiornati al 12 maggio 2026</div>
      </div>

      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Metriche chiave</h2>
          <p className="dash-section__subtitle">KPI piattaforma e revenue mensile</p>
        </div>
        <div className="dash-section-header__actions">
          <button
            type="button"
            className="dash-btn dash-btn--ghost polish-export-btn"
            onClick={() => exportAdminAnalyticsCsv(analyticsSnapshot)}
            aria-label="Esporta report analytics in CSV"
          >
            <IconUpload size={16} />
            Esporta CSV
          </button>
          <button
            type="button"
            className="dash-btn dash-btn--ghost polish-export-btn"
            onClick={() => exportAdminAnalyticsJson(analyticsSnapshot)}
            aria-label="Esporta report analytics in JSON"
          >
            <IconUpload size={16} />
            Esporta JSON
          </button>
        </div>
      </div>

      <div className="dash-admin-kpi-grid">
        {[
          { value: '1.247', label: 'Utenti totali registrati', color: 'var(--color-primary)' },
          { value: '892', label: 'Professionisti', color: 'var(--color-primary)' },
          { value: '287', label: 'Famiglie', color: 'var(--color-sage)' },
          { value: '68', label: 'Agenzie / Strutture', color: 'var(--color-accent)' },
          { value: '143', label: 'Richieste attive', color: '#5B4BCC' },
          { value: '234', label: 'Abbonamenti Premium', color: 'var(--color-primary)' },
          { value: '€4.658', label: 'MRR stimato / mese', color: 'var(--color-sage)' },
        ].map((kpi) => (
          <div key={kpi.label} className="dash-admin-kpi">
            <div className="dash-admin-kpi__value" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="dash-admin-kpi__label">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="dash-chart-wrap dash-chart-wrap--admin">
        <div className="dash-chart-title">Revenue mensile (ultimi 10 mesi)</div>
        <RevenueChart data={REVENUE_DATA} labels={REVENUE_MONTHS} />
        <p className="dash-chart-footnote">
          <IconTrendUp size={14} />
          Crescita mensile media: +{Math.round(((REVENUE_DATA[REVENUE_DATA.length - 1] - REVENUE_DATA[0]) / REVENUE_DATA[0]) / (REVENUE_DATA.length - 1) * 100)}%
        </p>
      </div>
    </div>
  )
}

function UsersLoadSkeleton() {
  return (
    <div aria-busy="true" aria-label="Caricamento utenti">
      <div className="dash-skeleton dash-skeleton--title" style={{ width: 220, height: 28, marginBottom: 12 }} />
      <div className="dash-skeleton" style={{ width: '100%', height: 48, marginBottom: 12 }} />
      <div className="dash-skeleton" style={{ width: '100%', height: 240 }} />
    </div>
  )
}

function UsersErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="dash-empty-state" role="alert">
      <div className="dash-empty-state__icon">
        <IconAlert size={28} />
      </div>
      <div className="dash-empty-state__title">Impossibile caricare gli utenti</div>
      <div className="dash-empty-state__sub">{message}</div>
      <button type="button" className="dash-btn dash-btn--primary" onClick={onRetry}>
        Riprova
      </button>
    </div>
  )
}

function UserDetailModal({
  detail,
  loading,
  error,
  actionLoading,
  onClose,
  onToggleStatus,
  onRetry,
}: {
  detail: AdminUserDetail | null
  loading: boolean
  error: string | null
  actionLoading: boolean
  onClose: () => void
  onToggleStatus: () => void
  onRetry: () => void
}) {
  const [activeDocId, setActiveDocId] = useState(detail?.kycDocuments[0]?.id ?? '')

  useEffect(() => {
    setActiveDocId(detail?.kycDocuments[0]?.id ?? '')
  }, [detail?.id, detail?.kycDocuments])

  const activeDoc = detail?.kycDocuments.find((d) => d.id === activeDocId) ?? detail?.kycDocuments[0]

  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div
        className="dash-modal"
        role="dialog"
        aria-labelledby="user-detail-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720 }}
      >
        <div className="dash-modal__header">
          <span className="dash-modal__title" id="user-detail-title">
            {detail ? detail.name : 'Dettaglio utente'}
          </span>
          <button type="button" className="dash-modal__close" onClick={onClose} aria-label="Chiudi">
            <IconClose size={18} />
          </button>
        </div>
        <div className="dash-modal__body">
          {loading ? (
            <div className="dash-empty-mini">Caricamento profilo…</div>
          ) : error ? (
            <div role="alert">
              <p style={{ color: '#D95F5F', marginBottom: 'var(--space-4)' }}>{error}</p>
              <button type="button" className="dash-btn dash-btn--ghost" onClick={onRetry}>
                Riprova
              </button>
            </div>
          ) : detail ? (
            <>
              <div className="dash-user-cell" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="dash-user-avatar">{detail.initials}</div>
                <div className="dash-user-info">
                  <span className="dash-user-name">{detail.name}</span>
                  <span className="dash-user-email">{detail.email}</span>
                </div>
              </div>

              <div className="dash-stat-grid" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="dash-stat-card">
                  <div className="dash-stat-card__label">Ruolo</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{ADMIN_USER_ROLE_LABELS[detail.role]}</div>
                </div>
                <div className="dash-stat-card">
                  <div className="dash-stat-card__label">Status</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`dash-badge dash-badge--${detail.status}`}>
                      {ADMIN_USER_STATUS_LABELS[detail.status]}
                    </span>
                  </div>
                </div>
                <div className="dash-stat-card">
                  <div className="dash-stat-card__label">Registrazione</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{formatAdminUserDate(detail.registeredAt)}</div>
                </div>
                {detail.subscriptionPlan ? (
                  <div className="dash-stat-card">
                    <div className="dash-stat-card__label">Abbonamento</div>
                    <div style={{ fontWeight: 600, marginTop: 4 }}>{detail.subscriptionPlan}</div>
                  </div>
                ) : null}
              </div>

              {(detail.phone || detail.city) ? (
                <div style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                  {detail.phone ? <>Tel. {detail.phone}</> : null}
                  {detail.phone && detail.city ? ' · ' : null}
                  {detail.city ? detail.city : null}
                </div>
              ) : null}

              <div className="dash-modal-detail-section">
                <div className="dash-settings-card__title">Storico attività</div>
                {detail.activity.length === 0 ? (
                  <div className="dash-empty-mini">Nessuna attività registrata.</div>
                ) : (
                  <ul className="dash-activity-list">
                    {detail.activity.map((entry) => (
                      <li key={entry.id} className="dash-activity-list__item">
                        <div className="dash-activity-list__label">{entry.label}</div>
                        <div className="dash-activity-list__date">
                          {formatAdminUserDateTime(entry.occurredAt)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {detail.kycDocuments.length > 0 ? (
                <div>
                  <div className="dash-settings-card__title" style={{ marginBottom: 'var(--space-3)' }}>
                    Documenti KYC
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-4)' }}>
                    {detail.kycDocuments.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        className={`dash-btn dash-btn--ghost${activeDoc?.id === doc.id ? ' dash-btn--primary' : ''}`}
                        onClick={() => setActiveDocId(doc.id)}
                      >
                        {KYC_DOCUMENT_TYPE_LABELS[doc.type]}
                        {' '}
                        <span className={`dash-badge dash-badge--${doc.status === 'approved' ? 'active' : doc.status === 'rejected' ? 'failed' : 'verify'}`} style={{ marginLeft: 4 }}>
                          {doc.status === 'approved' ? 'OK' : doc.status === 'rejected' ? 'Rifiutato' : 'Pending'}
                        </span>
                      </button>
                    ))}
                  </div>
                  {activeDoc ? <KycDocumentPreview document={activeDoc} /> : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        {detail && !loading && !error ? (
          <div className="dash-modal__footer">
            {detail.professionalId ? (
              <Link className="dash-btn dash-btn--ghost" to={profileDetailPath(detail.professionalId)} target="_blank">
                Profilo pubblico
              </Link>
            ) : null}
            {detail.status !== 'verify' ? (
              <button
                type="button"
                className={detail.status === 'suspended' ? 'dash-btn dash-btn--sage' : 'dash-btn dash-btn--ghost'}
                onClick={onToggleStatus}
                disabled={actionLoading}
              >
                {actionLoading ? '…' : detail.status === 'suspended' ? 'Riattiva account' : 'Sospendi account'}
              </button>
            ) : null}
            <button type="button" className="dash-btn dash-btn--primary" onClick={onClose}>
              Chiudi
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ── Section: Users ─────────────────────────────────────────── */
function SectionUsers() {
  const adminUsers = useAdminUsers()

  if (adminUsers.loading) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Gestione utenti</h2>
            <p className="dash-section__subtitle">Caricamento…</p>
          </div>
        </div>
        <UsersLoadSkeleton />
      </div>
    )
  }

  if (adminUsers.error) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Gestione utenti</h2>
          </div>
        </div>
        <UsersErrorState message={adminUsers.error} onRetry={adminUsers.reload} />
      </div>
    )
  }

  return (
    <div className="dash-admin-users">
      <VerifyToast message={adminUsers.toast ?? ''} visible={Boolean(adminUsers.toast)} />

      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Gestione utenti</h2>
          <p className="dash-section__subtitle">
            {adminUsers.users.length} utenti totali
            {adminUsers.filteredUsers.length !== adminUsers.users.length
              ? ` · ${adminUsers.filteredUsers.length} visualizzati`
              : ''}
          </p>
        </div>
      </div>

      {adminUsers.actionError ? (
        <div className="dash-profile-preview dash-profile-preview--alert" role="alert">
          {adminUsers.actionError}
          <button type="button" className="dash-btn dash-btn--ghost dash-profile-preview__action" onClick={adminUsers.clearActionError}>
            Chiudi
          </button>
        </div>
      ) : null}

      <div className="dash-filters">
        <input
          type="search"
          className="dash-form-input"
          placeholder="Cerca per nome o email…"
          value={adminUsers.searchQuery}
          onChange={(e) => adminUsers.setSearchQuery(e.target.value)}
          style={{ width: 'auto', minWidth: 220 }}
          aria-label="Cerca utenti"
        />
        <select
          className="dash-form-select"
          style={{ width: 'auto' }}
          value={adminUsers.filterRole}
          onChange={(e) => adminUsers.setFilterRole(e.target.value as typeof adminUsers.filterRole)}
        >
          <option value="all">Tutti i ruoli</option>
          <option value="professional">Professionisti</option>
          <option value="family">Famiglie</option>
          <option value="agency">Agenzie</option>
          <option value="structure">Strutture RSA</option>
        </select>
        <select
          className="dash-form-select"
          style={{ width: 'auto' }}
          value={adminUsers.filterStatus}
          onChange={(e) => adminUsers.setFilterStatus(e.target.value as typeof adminUsers.filterStatus)}
        >
          <option value="all">Tutti gli status</option>
          <option value="active">Attivi</option>
          <option value="suspended">Sospesi</option>
          <option value="verify">Da verificare</option>
        </select>
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Utente</th>
              <th>Ruolo</th>
              <th>Registrazione</th>
              <th>Status</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {adminUsers.filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
                  Nessun utente corrisponde ai filtri selezionati.
                </td>
              </tr>
            ) : (
              adminUsers.filteredUsers.map((u) => {
                const busy = adminUsers.actionLoadingId === u.id
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="dash-user-cell">
                        <div className="dash-user-avatar">{u.initials}</div>
                        <div className="dash-user-info">
                          <span className="dash-user-name">{u.name}</span>
                          <span className="dash-user-email">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{ADMIN_USER_ROLE_LABELS[u.role]}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatAdminUserDate(u.registeredAt)}</td>
                    <td>
                      <span className={`dash-badge dash-badge--${u.status}`}>
                        {ADMIN_USER_STATUS_LABELS[u.status]}
                      </span>
                    </td>
                    <td>
                      <div className="dash-table__actions">
                        <button
                          type="button"
                          className="dash-btn dash-btn--ghost"
                          onClick={() => adminUsers.openDetail(u.id)}
                        >
                          Vedi profilo
                        </button>
                        {u.status !== 'verify' ? (
                          <button
                            type="button"
                            className="dash-btn dash-btn--ghost"
                            onClick={() => void adminUsers.toggleStatus(u.id, u.status)}
                            disabled={busy}
                          >
                            {busy ? '…' : u.status === 'suspended' ? 'Riattiva' : 'Sospendi'}
                          </button>
                        ) : (
                          <button type="button" className="dash-btn dash-btn--sage" disabled title="Usa la sezione Verifica profili">
                            Verifica
                          </button>
                        )}
                        <button type="button" className="dash-btn dash-btn--danger" disabled title="Disponibile in un prossimo sprint">
                          Elimina
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

      {adminUsers.detailTargetId ? (
        <UserDetailModal
          detail={adminUsers.detail}
          loading={adminUsers.detailLoading}
          error={adminUsers.detailError}
          actionLoading={adminUsers.actionLoadingId === adminUsers.detailTargetId}
          onClose={adminUsers.closeDetail}
          onToggleStatus={() => {
            if (!adminUsers.detail) return
            void adminUsers.toggleStatus(adminUsers.detail.id, adminUsers.detail.status)
          }}
          onRetry={() => {
            if (adminUsers.detailTargetId) {
              adminUsers.openDetail(adminUsers.detailTargetId)
            }
          }}
        />
      ) : null}
    </div>
  )
}

/* ── Section: Subscriptions + Stripe landlord wizard ── */
function SectionSubscriptions() {
  const { subscriptions, stats, loading, error, reload } = useAdminBilling()
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  const mrrLabel = stats
    ? `€${(stats.mrrCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : '—'

  async function runAction(id: string, kind: 'refund' | 'trial' | 'cancel') {
    setActionBusy(`${kind}-${id}`)
    try {
      if (kind === 'refund') await postAdminSubscriptionRefund(id, undefined, 'requested_by_customer')
      if (kind === 'trial') await postAdminExtendTrial(id, 7)
      if (kind === 'cancel') await postAdminCancelSubscription(id)
      await reload()
    } catch {
      // errori gestiti a livello API; reload comunque
    } finally {
      setActionBusy(null)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="dash-section-header">
          <h2 className="dash-section__title">Abbonamenti e pagamenti</h2>
        </div>
        <div className="dash-empty-mini">Caricamento abbonamenti…</div>
      </div>
    )
  }

  if (error) {
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
      <AdminStripeSetupSection />

      <div className="dash-section-header" style={{ marginTop: 32 }}>
        <div>
          <h2 className="dash-section__title">Abbonamenti clienti</h2>
          <p className="dash-section__subtitle">
            {stats?.activePremium ?? 0} attivi/trial · MRR {mrrLabel}
          </p>
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
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
                  Nessun abbonamento registrato.
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

function TicketThreadMessage({ message }: { message: AdminTicketMessage }) {
  const isAdmin = message.author === 'admin'
  const isSystem = message.author === 'system'
  return (
    <div
      className={`dash-ticket-msg${isSystem ? ' dash-ticket-msg--system' : isAdmin ? ' dash-ticket-msg--admin' : ' dash-ticket-msg--user'}`}
    >
      <div className="dash-ticket-msg__meta">
        {message.authorName} · {formatAdminTicketDateTime(message.sentAt)}
      </div>
      <div className="dash-ticket-msg__body">{message.body}</div>
    </div>
  )
}

function TicketThreadModal({
  ticket,
  loading,
  error,
  actionLoading,
  onClose,
  onTakeCharge,
  onCloseTicket,
}: {
  ticket: AdminTicket | null
  loading: boolean
  error: string | null
  actionLoading: boolean
  onClose: () => void
  onTakeCharge: () => void
  onCloseTicket: () => void
}) {
  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div
        className="dash-modal"
        role="dialog"
        aria-labelledby="ticket-thread-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        <div className="dash-modal__header">
          <span className="dash-modal__title" id="ticket-thread-title">
            {ticket ? `${ticket.id} — ${ticket.category}` : 'Conversazione ticket'}
          </span>
          <button type="button" className="dash-modal__close" onClick={onClose} aria-label="Chiudi">
            <IconClose size={18} />
          </button>
        </div>
        <div className="dash-modal__body">
          {loading ? (
            <div className="dash-skeleton" style={{ width: '100%', height: 120 }} aria-busy="true" />
          ) : error ? (
            <p role="alert" style={{ color: 'var(--color-danger, #c62828)' }}>{error}</p>
          ) : ticket ? (
            <>
              <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                Utente: {ticket.userName} · {formatAdminTicketDate(ticket.openedAt)} ·{' '}
                <span className={`dash-badge dash-badge--${ticket.priority}`}>
                  {ADMIN_TICKET_PRIORITY_LABELS[ticket.priority]}
                </span>
              </p>
              {ticket.messages.map((m) => (
                <TicketThreadMessage key={m.id} message={m} />
              ))}
            </>
          ) : null}
        </div>
        {ticket && !loading && !error ? (
          <div className="dash-modal__footer">
            {ticket.status === 'open' ? (
              <button
                type="button"
                className="dash-btn dash-btn--primary"
                onClick={onTakeCharge}
                disabled={actionLoading}
              >
                {actionLoading ? '…' : 'Prendi in carico'}
              </button>
            ) : null}
            {ticket.status !== 'closed' ? (
              <button
                type="button"
                className="dash-btn dash-btn--sage"
                onClick={onCloseTicket}
                disabled={actionLoading}
              >
                {actionLoading ? '…' : 'Chiudi ticket'}
              </button>
            ) : null}
            <button type="button" className="dash-btn dash-btn--ghost" onClick={onClose}>
              Chiudi
            </button>
          </div>
        ) : (
          <div className="dash-modal__footer">
            <button type="button" className="dash-btn dash-btn--primary" onClick={onClose}>
              Chiudi
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Section: Tickets ───────────────────────────────────────── */
function SectionTickets() {
  const ticketsHook = useAdminTickets()

  if (ticketsHook.loading) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Dispute e assistenza</h2>
            <p className="dash-section__subtitle">Caricamento ticket…</p>
          </div>
        </div>
        <VerifyLoadSkeleton />
      </div>
    )
  }

  if (ticketsHook.error) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Dispute e assistenza</h2>
          </div>
        </div>
        <VerifyErrorState message={ticketsHook.error} onRetry={ticketsHook.reload} />
      </div>
    )
  }

  return (
    <div className="dash-admin-tickets">
      <VerifyToast message={ticketsHook.toast ?? ''} visible={Boolean(ticketsHook.toast)} />

      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Dispute e assistenza</h2>
          <p className="dash-section__subtitle">
            {ticketsHook.tickets.filter((t) => t.status !== 'closed').length} ticket aperti
          </p>
        </div>
      </div>

      {ticketsHook.actionError && !ticketsHook.threadTargetId ? (
        <div className="dash-profile-preview dash-profile-preview--alert" role="alert">
          {ticketsHook.actionError}
          <button
            type="button"
            className="dash-btn dash-btn--ghost dash-profile-preview__action"
            onClick={ticketsHook.clearActionError}
          >
            Chiudi
          </button>
        </div>
      ) : null}

      {ticketsHook.tickets.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state__icon">
            <IconInbox size={28} />
          </div>
          <div className="dash-empty-state__title">Nessun ticket</div>
          <div className="dash-empty-state__sub">Non ci sono richieste di assistenza al momento.</div>
        </div>
      ) : null}

      <div className="dash-ticket-list">
      {ticketsHook.tickets.map((t) => {
        const busy = ticketsHook.actionLoadingId === t.id
        return (
          <div key={t.id} className="dash-ticket">
            <div className="dash-ticket__id">{t.id}</div>
            <div className="dash-ticket__info">
              <div className="dash-ticket__title">{t.category}</div>
              <div className="dash-ticket__meta">
                Utente: {t.userName} · {formatAdminTicketDate(t.openedAt)} ·{' '}
                <span className={`dash-badge dash-badge--${t.priority}`}>
                  {ADMIN_TICKET_PRIORITY_LABELS[t.priority]}
                </span>
              </div>
            </div>
            <div className="dash-ticket__actions">
              <span
                className={`dash-badge dash-badge--${t.status === 'open' ? 'new' : t.status === 'in-progress' ? 'ongoing' : 'closed'}`}
              >
                {ADMIN_TICKET_STATUS_LABELS[t.status]}
              </span>
              <button
                type="button"
                className="dash-btn dash-btn--ghost"
                onClick={() => void ticketsHook.openThread(t.id)}
              >
                Vedi
              </button>
              {t.status === 'open' ? (
                <button
                  type="button"
                  className="dash-btn dash-btn--primary"
                  onClick={() => void ticketsHook.takeCharge(t.id)}
                  disabled={busy}
                >
                  {busy ? '…' : 'Prendi in carico'}
                </button>
              ) : null}
              {t.status !== 'closed' ? (
                <button
                  type="button"
                  className="dash-btn dash-btn--sage"
                  onClick={() => void ticketsHook.closeTicket(t.id)}
                  disabled={busy}
                >
                  {busy ? '…' : 'Chiudi'}
                </button>
              ) : null}
            </div>
          </div>
        )
      })}
      </div>

      {ticketsHook.threadTargetId ? (
        <TicketThreadModal
          ticket={ticketsHook.threadTicket}
          loading={ticketsHook.threadLoading}
          error={ticketsHook.threadError}
          actionLoading={ticketsHook.actionLoadingId === ticketsHook.threadTargetId}
          onClose={ticketsHook.closeThread}
          onTakeCharge={() => {
            if (ticketsHook.threadTargetId) void ticketsHook.takeCharge(ticketsHook.threadTargetId)
          }}
          onCloseTicket={() => {
            if (ticketsHook.threadTargetId) void ticketsHook.closeTicket(ticketsHook.threadTargetId)
          }}
        />
      ) : null}
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
  if (document.mimeType === 'image') {
    return (
      <img
        src={document.url}
        alt={document.label}
        className="dash-kyc-preview__image"
      />
    )
  }

  return (
    <div className="dash-kyc-preview dash-kyc-preview--pdf">
      <div className="dash-kyc-preview__hint">
        Anteprima PDF non disponibile in mock. Apri il file in una nuova scheda.
      </div>
      <a className="dash-btn dash-btn--primary" href={document.url} target="_blank" rel="noopener noreferrer">
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
            Il professionista riceverà una notifica con il motivo indicato (mock).
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
function SectionSettings() {
  const settingsHook = useAdminSettings()
  const s = settingsHook.settings

  if (settingsHook.loading) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Impostazioni piattaforma</h2>
            <p className="dash-section__subtitle">Caricamento…</p>
          </div>
        </div>
        <VerifyLoadSkeleton />
      </div>
    )
  }

  if (settingsHook.error || !s) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Impostazioni piattaforma</h2>
          </div>
        </div>
        <VerifyErrorState
          message={settingsHook.error ?? 'Impostazioni non disponibili.'}
          onRetry={settingsHook.reload}
        />
      </div>
    )
  }

  return (
    <div className="dash-admin-settings">
      <VerifyToast message={settingsHook.toast ?? ''} visible={Boolean(settingsHook.toast)} />

      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Impostazioni piattaforma</h2>
          <p className="dash-section__subtitle">Configurazioni globali della piattaforma</p>
        </div>
      </div>

      {settingsHook.saveError ? (
        <div className="dash-profile-preview dash-profile-preview--alert" role="alert">
          {settingsHook.saveError}
        </div>
      ) : null}

      <div className="dash-settings-grid dash-admin-settings-grid">
        <div className="dash-settings-card">
          <div className="dash-settings-card__title">Prezzi piani</div>
          <div className="dash-form-field" style={{ marginBottom: 'var(--space-3)' }}>
            <label className="dash-form-label" htmlFor="adm-premium-monthly">
              Piano Premium (€/mese)
            </label>
            <input
              id="adm-premium-monthly"
              className="dash-form-input"
              type="number"
              step="0.01"
              min="0"
              value={s.pricing.premiumMonthlyEur}
              onChange={(e) =>
                settingsHook.updateLocal({
                  pricing: { ...s.pricing, premiumMonthlyEur: Number(e.target.value) },
                })
              }
            />
          </div>
          <div className="dash-form-field" style={{ marginBottom: 'var(--space-3)' }}>
            <label className="dash-form-label" htmlFor="adm-premium-yearly">
              Piano Premium (€/anno)
            </label>
            <input
              id="adm-premium-yearly"
              className="dash-form-input"
              type="number"
              step="0.01"
              min="0"
              value={s.pricing.premiumYearlyEur}
              onChange={(e) =>
                settingsHook.updateLocal({
                  pricing: { ...s.pricing, premiumYearlyEur: Number(e.target.value) },
                })
              }
            />
          </div>
          <button
            type="button"
            className="dash-btn dash-btn--primary"
            style={{ marginTop: 'var(--space-2)' }}
            disabled={settingsHook.saving}
            onClick={() => void settingsHook.save({ pricing: s.pricing }, 'Prezzi piani salvati.')}
          >
            {settingsHook.saving ? 'Salvataggio…' : 'Salva prezzi'}
          </button>
        </div>

        <div className="dash-settings-card">
          <div className="dash-settings-card__title">Email notifiche</div>
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
          <div className="dash-form-field" style={{ marginTop: 'var(--space-4)' }}>
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
          <button
            type="button"
            className="dash-btn dash-btn--primary"
            style={{ marginTop: 'var(--space-3)' }}
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

        <div className="dash-settings-card">
          <div className="dash-settings-card__title">Manutenzione</div>
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
              Attiva per mostrare una pagina di manutenzione agli utenti.
            </p>
            <button
              type="button"
              className="dash-btn dash-btn--ghost"
              style={{ width: '100%' }}
              disabled={settingsHook.saving}
              onClick={() =>
                settingsHook.updateLocal({
                  maintenance: { ...s.maintenance, enabled: !s.maintenance.enabled },
                })
              }
            >
              {s.maintenance.enabled ? 'Disattiva manutenzione' : 'Attiva manutenzione'}
            </button>
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="adm-maintenance-msg">
              Messaggio di manutenzione
            </label>
            <textarea
              id="adm-maintenance-msg"
              className="dash-form-input dash-form-textarea"
              style={{ minHeight: 64 }}
              value={s.maintenance.message}
              onChange={(e) =>
                settingsHook.updateLocal({
                  maintenance: { ...s.maintenance, message: e.target.value },
                })
              }
            />
          </div>
          <button
            type="button"
            className="dash-btn dash-btn--primary"
            style={{ marginTop: 'var(--space-3)' }}
            disabled={settingsHook.saving}
            onClick={() =>
              void settingsHook.save({ maintenance: s.maintenance }, 'Impostazioni manutenzione salvate.')
            }
          >
            {settingsHook.saving ? 'Salvataggio…' : 'Salva manutenzione'}
          </button>
        </div>

        <div className="dash-settings-card">
          <div className="dash-settings-card__title">Limiti piano FREE</div>
          <div className="dash-form-field" style={{ marginBottom: 'var(--space-3)' }}>
            <label className="dash-form-label" htmlFor="adm-free-requests">
              Max richieste/mese (FREE)
            </label>
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
          <div className="dash-form-field" style={{ marginBottom: 'var(--space-3)' }}>
            <label className="dash-form-label" htmlFor="adm-free-applications">
              Max candidature attive (FREE)
            </label>
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
          <button
            type="button"
            className="dash-btn dash-btn--primary"
            style={{ marginTop: 'var(--space-2)' }}
            disabled={settingsHook.saving}
            onClick={() =>
              void settingsHook.save({ freeLimits: s.freeLimits }, 'Limiti piano FREE salvati.')
            }
          >
            {settingsHook.saving ? 'Salvataggio…' : 'Salva limiti'}
          </button>
        </div>

        <div className="dash-settings-card">
          <div className="dash-settings-card__title">Commissioni e funzionalità</div>
          <div className="dash-form-field" style={{ marginBottom: 'var(--space-3)' }}>
            <label className="dash-form-label" htmlFor="adm-comm-pro">
              Commissione professionisti (%)
            </label>
            <input
              id="adm-comm-pro"
              className="dash-form-input"
              type="number"
              min="0"
              max="100"
              value={s.commissionRates.professionalPercent}
              onChange={(e) =>
                settingsHook.updateLocal({
                  commissionRates: {
                    ...s.commissionRates,
                    professionalPercent: Number(e.target.value),
                  },
                })
              }
            />
          </div>
          <div className="dash-form-field" style={{ marginBottom: 'var(--space-3)' }}>
            <label className="dash-form-label" htmlFor="adm-comm-agency">
              Commissione agenzie (%)
            </label>
            <input
              id="adm-comm-agency"
              className="dash-form-input"
              type="number"
              min="0"
              max="100"
              value={s.commissionRates.agencyPercent}
              onChange={(e) =>
                settingsHook.updateLocal({
                  commissionRates: {
                    ...s.commissionRates,
                    agencyPercent: Number(e.target.value),
                  },
                })
              }
            />
          </div>
          {(
            [
              ['b2bJobPostings', 'Annunci B2B'],
              ['familyMessaging', 'Messaggistica famiglia'],
              ['stripeCheckout', 'Checkout Stripe'],
              ['maintenanceBanner', 'Banner manutenzione'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="dash-settings-row">
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
          ))}
          <button
            type="button"
            className="dash-btn dash-btn--primary"
            style={{ marginTop: 'var(--space-3)' }}
            disabled={settingsHook.saving}
            onClick={() =>
              void settingsHook.save(
                {
                  commissionRates: s.commissionRates,
                  featureFlags: s.featureFlags,
                },
                'Commissioni e funzionalità salvate.',
              )
            }
          >
            {settingsHook.saving ? 'Salvataggio…' : 'Salva commissioni'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Nav items ──────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: <IconGrid size={18} /> },
  { id: 'utenti', label: 'Gestione utenti', tabLabel: 'Utenti', icon: <IconUsers size={18} /> },
  { id: 'richieste', label: 'Richieste', icon: <IconList size={18} /> },
  { id: 'abbonamenti', label: 'Abbonamenti', icon: <IconCreditCard size={18} /> },
  { id: 'dispute', label: 'Dispute e assistenza', tabLabel: 'Assistenza', icon: <IconMessages size={18} /> },
  { id: 'verifica', label: 'Verifica profili', tabLabel: 'Verifica', icon: <IconShield size={18} /> },
  { id: 'moderazione', label: 'Moderazione annunci', tabLabel: 'Annunci', icon: <IconBriefcase size={18} /> },
  { id: 'impostazioni', label: 'Impostazioni piattaforma', tabLabel: 'Piattaforma', icon: <IconSettings size={18} /> },
  { id: 'account', label: 'Il mio account', tabLabel: 'Account', icon: <IconProfile size={18} /> },
]

/* ── Main component ─────────────────────────────────────────── */
export function AdminDashboard() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('overview')

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':      return <SectionOverview />
      case 'utenti':        return <SectionUsers />
      case 'richieste':     return <AdminRequestsSection />
      case 'abbonamenti':   return <SectionSubscriptions />
      case 'dispute':       return <SectionTickets />
      case 'verifica':      return <SectionVerify />
      case 'moderazione':   return <SectionJobModeration />
      case 'impostazioni':  return <SectionSettings />
      case 'account':       return (
        <div className="dash-admin-account">
          <AccountSettingsSection title="Il mio account" subtitle="Email, password e notifiche personali" />
          <AdminPasskeysPanel />
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
    >
      {renderSection()}
    </DashboardLayout>
  )
}
