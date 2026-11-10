import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ADMIN_USER_ROLE_LABELS,
  ADMIN_USER_STATUS_LABELS,
  formatAdminUserDate,
  formatAdminUserDateTime,
  formatSubscriptionPlanLabel,
  trialDaysRemaining,
} from '../../../lib/adminUserApi'
import type { AdminUserDetail, AdminUserListItem, AdminUserRole, AdminUserStatus } from '../../../lib/adminUserTypes'
import { KYC_DOCUMENT_TYPE_LABELS } from '../../../lib/adminKycApi'
import { profileDetailPath } from '../../../lib/siteRoutes'
import { useAdminUsers } from '../../../hooks/useAdminUsers'
import { buildCsv, dateStampForFilename, downloadCsv } from '../../../lib/exportUtils'
import {
  IconAlert,
  IconCheck,
  IconCreditCard,
  IconEye,
  IconMail,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconTrash,
} from '../../../components/icons/DashboardIcons'

function UsersToast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={`dash-toast polish-toast${visible ? ' dash-toast--visible' : ''}`}>
      <span className="dash-toast__icon">
        <IconCheck size={18} />
      </span>
      {message}
    </div>
  )
}

type DetailTab = 'profilo' | 'sicurezza' | 'abbonamento' | 'kyc' | 'attivita'
type StatusChipFilter = AdminUserStatus | 'all' | 'professionals' | 'today'

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function isSameDay(iso: string, day: Date): boolean {
  const d = new Date(iso)
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  )
}

function statusClass(status: AdminUserStatus): string {
  if (status === 'active') return 'admin-users__status admin-users__status--active'
  if (status === 'suspended') return 'admin-users__status admin-users__status--suspended'
  return 'admin-users__status admin-users__status--verify'
}

function visibilityLabel(visible: boolean | null): string {
  if (visible === null) return 'N/D'
  return visible ? 'Visibile' : 'Nascosto'
}

function visibilityClass(visible: boolean | null): string {
  if (visible === true) return 'admin-users__status admin-users__status--active'
  if (visible === false) return 'admin-users__status admin-users__status--neutral'
  return 'admin-users__status admin-users__status--neutral'
}

function subscriptionPill(user: Pick<
  AdminUserListItem,
  'subscriptionActive' | 'subscriptionStatus' | 'trialEndsAt'
>): { label: string; className: string; trialHint: string | null } {
  const days = trialDaysRemaining(user.trialEndsAt)
  const inTrial =
    user.subscriptionStatus === 'trialing' || (Boolean(user.trialEndsAt) && days !== null)

  if (user.subscriptionActive) {
    return {
      label: 'Attivo',
      className: 'admin-users__status admin-users__status--active',
      trialHint: inTrial && days !== null ? `Prova · ${days}g` : null,
    }
  }

  return {
    label: 'Non attivo',
    className: 'admin-users__status admin-users__status--neutral',
    trialHint: null,
  }
}

function exportUsersCsv(users: AdminUserListItem[]): void {
  const headers = [
    'id',
    'nome',
    'email',
    'ruolo',
    'status',
    'abbonamento',
    'prova_giorni',
    'visibilita',
    'iscritto',
  ] as const
  const rows = users.map((u) => {
    const sub = subscriptionPill(u)
    const days = trialDaysRemaining(u.trialEndsAt)
    return [
      u.id,
      u.name,
      u.email,
      ADMIN_USER_ROLE_LABELS[u.role],
      ADMIN_USER_STATUS_LABELS[u.status],
      sub.label,
      days !== null ? String(days) : '',
      visibilityLabel(u.profileVisible),
      formatAdminUserDate(u.registeredAt),
    ]
  })
  downloadCsv(`curaxe-utenti-${dateStampForFilename()}.csv`, buildCsv(headers, rows))
}

function UsersLoadSkeleton() {
  return (
    <div aria-busy="true" aria-label="Caricamento utenti">
      <div className="dash-skeleton dash-skeleton--title" style={{ width: 220, height: 28, marginBottom: 12 }} />
      <div className="dash-skeleton" style={{ width: '100%', height: 40, marginBottom: 12 }} />
      <div className="dash-skeleton" style={{ width: '100%', height: 280 }} />
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

function UserDetailView({
  detail,
  loading,
  error,
  actionLoading,
  initialTab,
  onBack,
  onRetry,
  onRefresh,
  onToggleStatus,
  onDelete,
}: {
  detail: AdminUserDetail | null
  loading: boolean
  error: string | null
  actionLoading: boolean
  initialTab: DetailTab
  onBack: () => void
  onRetry: () => void
  onRefresh: () => void
  onToggleStatus: () => void
  onDelete: () => void
}) {
  const [tab, setTab] = useState<DetailTab>(initialTab)

  const nameParts = splitName(detail?.name ?? '')
  const lastActivity = detail?.activity[0]
  const kycDocs = detail?.kycDocuments ?? []
  const kycApproved = kycDocs.filter((d) => d.status === 'approved').length
  const kycPending = kycDocs.filter((d) => d.status !== 'approved' && d.status !== 'rejected').length
  const subPill = detail
    ? subscriptionPill(detail)
    : { label: '—', className: 'admin-users__status admin-users__status--neutral', trialHint: null }
  const trialDays = detail ? trialDaysRemaining(detail.trialEndsAt) : null

  const kycLabel =
    kycDocs.length === 0
      ? 'Nessun doc'
      : kycPending > 0
        ? `${kycPending} in coda`
        : `${kycApproved}/${kycDocs.length} OK`

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'profilo', label: 'Profilo' },
    { id: 'sicurezza', label: 'Sicurezza' },
    { id: 'abbonamento', label: 'Abbonamento' },
    { id: 'kyc', label: 'KYC / Verifica' },
    { id: 'attivita', label: 'Attività' },
  ]

  return (
    <div className="admin-users-detail">
      <button type="button" className="admin-users-detail__back" onClick={onBack}>
        ← Torna all&apos;elenco
      </button>

      {loading && !detail ? (
        <UsersLoadSkeleton />
      ) : error && !detail ? (
        <UsersErrorState message={error} onRetry={onRetry} />
      ) : detail ? (
        <>
          <header className="admin-users-detail__hero">
            <div className="admin-users-detail__identity">
              <div className="admin-users__avatar admin-users__avatar--lg" aria-hidden="true">
                {detail.initials}
              </div>
              <div className="admin-users-detail__name-block">
                <h1 className="admin-users-detail__name">{detail.name}</h1>
                <div className="admin-users-detail__badges">
                  <span className={statusClass(detail.status)}>{ADMIN_USER_STATUS_LABELS[detail.status]}</span>
                  <span className="admin-users__status admin-users__status--neutral">
                    {ADMIN_USER_ROLE_LABELS[detail.role]}
                  </span>
                  <span className={subPill.className}>{subPill.label}</span>
                  {detail.profileVisible !== null ? (
                    <span className={visibilityClass(detail.profileVisible)}>
                      {visibilityLabel(detail.profileVisible)}
                    </span>
                  ) : null}
                </div>
                <div className="admin-users-detail__sub">
                  <span>{detail.email}</span>
                  <span>ruolo {ADMIN_USER_ROLE_LABELS[detail.role].toLowerCase()}</span>
                  <span>#{detail.id}</span>
                </div>
              </div>
            </div>

            <div className="admin-users-detail__actions">
              <button
                type="button"
                className="admin-users__icon-btn"
                onClick={onRefresh}
                aria-label="Aggiorna"
                title="Aggiorna"
              >
                <IconRefresh size={15} />
              </button>
              <a
                className="admin-users-detail__action-label"
                href={`mailto:${detail.email}`}
                title="Scrivi email"
              >
                <IconMail size={14} />
                Email
              </a>
              {detail.role !== 'admin' ? (
                <button
                  type="button"
                  className="admin-users__icon-btn admin-users__icon-btn--danger"
                  disabled={actionLoading}
                  title="Elimina account"
                  aria-label="Elimina account"
                  onClick={onDelete}
                >
                  <IconTrash size={15} />
                </button>
              ) : null}
            </div>
          </header>

          <div className="admin-users-detail__metrics" role="list">
            <div className="admin-users-metric" role="listitem">
              <span className="admin-users-metric__label">Ruolo</span>
              <strong className="admin-users-metric__value">{ADMIN_USER_ROLE_LABELS[detail.role]}</strong>
              <span className="admin-users-metric__meta">Account piattaforma</span>
            </div>
            <div className="admin-users-metric" role="listitem">
              <span className="admin-users-metric__label">KYC</span>
              <strong className="admin-users-metric__value">{kycLabel}</strong>
              <span className="admin-users-metric__meta">
                {kycDocs.length === 0 ? 'Nessun documento caricato' : `${kycDocs.length} documenti`}
              </span>
            </div>
            <div className="admin-users-metric" role="listitem">
              <span className="admin-users-metric__label">Abbonamento</span>
              <strong className="admin-users-metric__value">
                {formatSubscriptionPlanLabel(detail.subscriptionPlan)}
              </strong>
              <span className="admin-users-metric__meta">
                {subPill.trialHint ?? (detail.subscriptionActive ? 'Attivo' : 'Non attivo')}
              </span>
            </div>
            <div className="admin-users-metric" role="listitem">
              <span className="admin-users-metric__label">Attività</span>
              <strong className="admin-users-metric__value">
                {lastActivity ? formatAdminUserDate(lastActivity.occurredAt) : formatAdminUserDate(detail.registeredAt)}
              </strong>
              <span className="admin-users-metric__meta">
                {lastActivity ? lastActivity.label : 'Data iscrizione'}
              </span>
            </div>
          </div>

          <nav className="admin-users-detail__tabs" aria-label="Sezioni profilo utente">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`admin-users-detail__tab${tab === t.id ? ' is-active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === 'profilo' ? (
            <div className="admin-users-detail__grid">
              <section className="admin-users-panel">
                <div className="admin-users-panel__head">
                  <div>
                    <h2 className="admin-users-panel__title">Operazioni account</h2>
                    <p className="admin-users-panel__sub">Stato, sospensione e accesso profilo</p>
                  </div>
                  <span className={statusClass(detail.status)}>{ADMIN_USER_STATUS_LABELS[detail.status]}</span>
                </div>

                <div className="admin-users-field">
                  <label htmlFor="admin-user-note">Nota operativa</label>
                  <textarea
                    id="admin-user-note"
                    readOnly
                    value={
                      detail.status === 'verify'
                        ? 'Profilo in coda verifica — gestisci i documenti nella tab KYC / Verifica o nella sezione Verifica.'
                        : detail.status === 'suspended'
                          ? 'Account sospeso. Puoi riattivarlo da qui se la revisione è conclusa.'
                          : 'Account operativo. Usa sospensione solo per moderazione o sicurezza.'
                    }
                  />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {detail.status !== 'verify' ? (
                    <button
                      type="button"
                      className="admin-users-panel__cta"
                      disabled={actionLoading || detail.role === 'admin'}
                      onClick={onToggleStatus}
                    >
                      {actionLoading
                        ? '…'
                        : detail.status === 'suspended'
                          ? 'Riattiva account'
                          : 'Sospendi account'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="admin-users-panel__cta admin-users-panel__cta--ghost"
                      onClick={() => setTab('kyc')}
                    >
                      Apri KYC / Verifica
                    </button>
                  )}
                  {detail.professionalId ? (
                    <Link
                      className="admin-users-panel__cta admin-users-panel__cta--ghost"
                      to={profileDetailPath(detail.professionalId)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Profilo pubblico
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="admin-users-panel__cta admin-users-panel__cta--ghost"
                    onClick={() => setTab('abbonamento')}
                  >
                    Apri Abbonamento
                  </button>
                </div>

                {detail.activity.length > 0 ? (
                  <ul className="admin-users-activity" aria-label="Ultime attività">
                    {detail.activity.slice(0, 3).map((entry) => (
                      <li key={entry.id} className="admin-users-activity__item">
                        <span className="admin-users-activity__label">{entry.label}</span>
                        <span className="admin-users-activity__date">
                          {formatAdminUserDateTime(entry.occurredAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section className="admin-users-panel">
                <div className="admin-users-panel__head">
                  <div>
                    <h2 className="admin-users-panel__title">Anagrafica</h2>
                    <p className="admin-users-panel__sub">Profilo</p>
                  </div>
                </div>
                <div className="admin-users-form">
                  <div className="admin-users-field">
                    <label htmlFor="admin-user-first">Nome</label>
                    <input id="admin-user-first" readOnly value={nameParts.first} />
                  </div>
                  <div className="admin-users-field">
                    <label htmlFor="admin-user-last">Cognome</label>
                    <input id="admin-user-last" readOnly value={nameParts.last || '—'} />
                  </div>
                  <div className="admin-users-field admin-users-field--full">
                    <label htmlFor="admin-user-email">Email</label>
                    <input id="admin-user-email" readOnly value={detail.email} />
                  </div>
                  <div className="admin-users-field">
                    <label htmlFor="admin-user-phone">Telefono</label>
                    <input id="admin-user-phone" readOnly value={detail.phone || '—'} />
                  </div>
                  <div className="admin-users-field">
                    <label htmlFor="admin-user-city">Città</label>
                    <input id="admin-user-city" readOnly value={detail.city || '—'} />
                  </div>
                  <div className="admin-users-field">
                    <label htmlFor="admin-user-role">Ruolo</label>
                    <input id="admin-user-role" readOnly value={ADMIN_USER_ROLE_LABELS[detail.role]} />
                  </div>
                  <div className="admin-users-field">
                    <label htmlFor="admin-user-vis">Visibilità</label>
                    <input id="admin-user-vis" readOnly value={visibilityLabel(detail.profileVisible)} />
                  </div>
                  <div className="admin-users-field admin-users-field--full">
                    <label htmlFor="admin-user-joined">Iscritto</label>
                    <input id="admin-user-joined" readOnly value={formatAdminUserDate(detail.registeredAt)} />
                  </div>
                </div>
                <p className="admin-users-panel__sub">
                  Anagrafica in sola lettura — le modifiche anagrafiche restano sul profilo utente.
                </p>
              </section>
            </div>
          ) : null}

          {tab === 'sicurezza' ? (
            <section className="admin-users-panel">
              <div className="admin-users-panel__head">
                <div>
                  <h2 className="admin-users-panel__title">Sicurezza</h2>
                  <p className="admin-users-panel__sub">Stato account e azioni di moderazione</p>
                </div>
              </div>
              <div className="admin-users-form">
                <div className="admin-users-field">
                  <label>Status</label>
                  <input readOnly value={ADMIN_USER_STATUS_LABELS[detail.status]} />
                </div>
                <div className="admin-users-field">
                  <label>Ruolo</label>
                  <input readOnly value={ADMIN_USER_ROLE_LABELS[detail.role]} />
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {detail.status !== 'verify' && detail.role !== 'admin' ? (
                  <button
                    type="button"
                    className="admin-users-panel__cta"
                    disabled={actionLoading}
                    onClick={onToggleStatus}
                  >
                    {detail.status === 'suspended' ? 'Riattiva account' : 'Sospendi account'}
                  </button>
                ) : null}
                {detail.role !== 'admin' ? (
                  <button
                    type="button"
                    className="admin-users-panel__cta admin-users-panel__cta--danger"
                    disabled={actionLoading}
                    onClick={onDelete}
                  >
                    Elimina account
                  </button>
                ) : (
                  <p className="admin-users-panel__sub">Gli account admin non sono eliminabili da qui.</p>
                )}
              </div>
            </section>
          ) : null}

          {tab === 'abbonamento' ? (
            <section className="admin-users-panel">
              <div className="admin-users-panel__head">
                <div>
                  <h2 className="admin-users-panel__title">Abbonamento</h2>
                  <p className="admin-users-panel__sub">Stato piano e periodo di prova</p>
                </div>
                <span className={subPill.className}>{subPill.label}</span>
              </div>
              <div className="admin-users-form">
                <div className="admin-users-field">
                  <label>Stato</label>
                  <input readOnly value={subPill.label} />
                </div>
                <div className="admin-users-field">
                  <label>Piano</label>
                  <input readOnly value={formatSubscriptionPlanLabel(detail.subscriptionPlan)} />
                </div>
                <div className="admin-users-field">
                  <label>Status billing</label>
                  <input readOnly value={detail.subscriptionStatus ?? '—'} />
                </div>
                <div className="admin-users-field">
                  <label>Prova</label>
                  <input
                    readOnly
                    value={
                      trialDays !== null
                        ? `${trialDays} giorni rimanenti`
                        : detail.trialEndsAt
                          ? `Scaduta (${formatAdminUserDate(detail.trialEndsAt)})`
                          : 'Nessuna prova attiva'
                    }
                  />
                </div>
                <div className="admin-users-field">
                  <label>Fine periodo</label>
                  <input
                    readOnly
                    value={
                      detail.subscriptionPeriodEnd
                        ? formatAdminUserDate(detail.subscriptionPeriodEnd)
                        : '—'
                    }
                  />
                </div>
                <div className="admin-users-field">
                  <label>Cancella a fine periodo</label>
                  <input readOnly value={detail.cancelAtPeriodEnd ? 'Sì' : 'No'} />
                </div>
              </div>
              <p className="admin-users-panel__sub">
                Per operazioni Stripe avanzate usa la sezione Abbonamenti dell&apos;admin.
              </p>
            </section>
          ) : null}

          {tab === 'kyc' ? (
            <section className="admin-users-panel">
              <div className="admin-users-panel__head">
                <div>
                  <h2 className="admin-users-panel__title">KYC / Verifica</h2>
                  <p className="admin-users-panel__sub">Documenti caricati per questo utente</p>
                </div>
              </div>
              {kycDocs.length === 0 ? (
                <p className="admin-users-panel__sub">Nessun documento KYC disponibile.</p>
              ) : (
                <div className="admin-users-kyc-list">
                  {kycDocs.map((doc) => (
                    <div key={doc.id} className="admin-users-kyc-item">
                      <div>
                        <strong>
                          {KYC_DOCUMENT_TYPE_LABELS[doc.type as keyof typeof KYC_DOCUMENT_TYPE_LABELS] ??
                            doc.label}
                        </strong>
                        <div className="admin-users-panel__sub">{doc.label}</div>
                      </div>
                      <span
                        className={
                          doc.status === 'approved'
                            ? 'admin-users__status admin-users__status--active'
                            : doc.status === 'rejected'
                              ? 'admin-users__status admin-users__status--suspended'
                              : 'admin-users__status admin-users__status--verify'
                        }
                      >
                        {doc.status === 'approved'
                          ? 'OK'
                          : doc.status === 'rejected'
                            ? 'Rifiutato'
                            : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {tab === 'attivita' ? (
            <section className="admin-users-panel">
              <div className="admin-users-panel__head">
                <div>
                  <h2 className="admin-users-panel__title">Attività</h2>
                  <p className="admin-users-panel__sub">Storico recente dall&apos;audit log</p>
                </div>
              </div>
              {detail.activity.length === 0 ? (
                <p className="admin-users-panel__sub">Nessuna attività registrata.</p>
              ) : (
                <ul className="admin-users-activity">
                  {detail.activity.map((entry) => (
                    <li key={entry.id} className="admin-users-activity__item">
                      <span className="admin-users-activity__label">{entry.label}</span>
                      <span className="admin-users-activity__date">
                        {formatAdminUserDateTime(entry.occurredAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export function AdminUsersSection() {
  const adminUsers = useAdminUsers()
  const [chipFilter, setChipFilter] = useState<StatusChipFilter>('all')

  const today = useMemo(() => new Date(), [])
  const counts = useMemo(() => {
    const users = adminUsers.users
    return {
      total: users.length,
      active: users.filter((u) => u.status === 'active').length,
      verify: users.filter((u) => u.status === 'verify').length,
      suspended: users.filter((u) => u.status === 'suspended').length,
      professionals: users.filter((u) => u.role === 'professional').length,
      today: users.filter((u) => isSameDay(u.registeredAt, today)).length,
    }
  }, [adminUsers.users, today])

  const visibleUsers = useMemo(() => {
    let list = adminUsers.filteredUsers
    if (chipFilter === 'professionals') {
      list = list.filter((u) => u.role === 'professional')
    } else if (chipFilter === 'today') {
      list = list.filter((u) => isSameDay(u.registeredAt, today))
    } else if (chipFilter !== 'all') {
      list = list.filter((u) => u.status === chipFilter)
    }
    return list
  }, [adminUsers.filteredUsers, chipFilter, today])

  const confirmDelete = (name: string, email: string): boolean =>
    window.confirm(
      `Eliminare definitivamente l'account di ${name} (${email})?\n\nL'operazione non si può annullare.`,
    )

  if (adminUsers.detailTargetId) {
    return (
      <div className="admin-users admin-users--compact">
        <UsersToast message={adminUsers.toast ?? ''} visible={Boolean(adminUsers.toast)} />
        {adminUsers.actionError ? (
          <div className="admin-users__alert" role="alert">
            <span>{adminUsers.actionError}</span>
            <button type="button" className="dash-btn dash-btn--ghost" onClick={adminUsers.clearActionError}>
              Chiudi
            </button>
          </div>
        ) : null}
        <UserDetailView
          key={`${adminUsers.detailTargetId}-${adminUsers.detailInitialTab}`}
          detail={adminUsers.detail}
          loading={adminUsers.detailLoading}
          error={adminUsers.detailError}
          actionLoading={adminUsers.actionLoadingId === adminUsers.detailTargetId}
          initialTab={adminUsers.detailInitialTab}
          onBack={adminUsers.closeDetail}
          onRetry={() => {
            if (adminUsers.detailTargetId) {
              adminUsers.openDetail(adminUsers.detailTargetId, { tab: adminUsers.detailInitialTab })
            }
          }}
          onRefresh={() => {
            if (adminUsers.detailTargetId) {
              adminUsers.openDetail(adminUsers.detailTargetId, { tab: adminUsers.detailInitialTab })
            }
          }}
          onToggleStatus={() => {
            if (!adminUsers.detail) return
            void adminUsers.toggleStatus(adminUsers.detail.id, adminUsers.detail.status)
          }}
          onDelete={() => {
            if (!adminUsers.detail) return
            if (!confirmDelete(adminUsers.detail.name, adminUsers.detail.email)) return
            void adminUsers.remove(adminUsers.detail.id)
          }}
        />
      </div>
    )
  }

  if (adminUsers.loading) {
    return (
      <div className="admin-users admin-users--compact">
        <div className="admin-users__crumb">
          <span>Admin</span>
          <span className="admin-users__crumb-sep">›</span>
          <strong>Utenti</strong>
        </div>
        <UsersLoadSkeleton />
      </div>
    )
  }

  if (adminUsers.error) {
    return (
      <div className="admin-users admin-users--compact">
        <div className="admin-users__crumb">
          <span>Admin</span>
          <span className="admin-users__crumb-sep">›</span>
          <strong>Utenti</strong>
        </div>
        <UsersErrorState message={adminUsers.error} onRetry={() => void adminUsers.reload()} />
      </div>
    )
  }

  const pills: { id: StatusChipFilter; label: string; value: number }[] = [
    { id: 'all', label: 'Totale', value: counts.total },
    { id: 'active', label: 'Attivi', value: counts.active },
    { id: 'professionals', label: 'Professionisti', value: counts.professionals },
    { id: 'verify', label: 'Da verificare', value: counts.verify },
    { id: 'suspended', label: 'Sospesi', value: counts.suspended },
    { id: 'today', label: 'Nuovi oggi', value: counts.today },
  ]

  return (
    <div className="admin-users admin-users--compact">
      <UsersToast message={adminUsers.toast ?? ''} visible={Boolean(adminUsers.toast)} />

      <div className="admin-users__crumb">
        <span>Admin</span>
        <span className="admin-users__crumb-sep">›</span>
        <strong>Utenti</strong>
      </div>

      <div className="admin-users__head">
        <div className="admin-users__title-row">
          <h1 className="admin-users__title">Utenti</h1>
          <span className="admin-users__count">{visibleUsers.length} in elenco</span>
        </div>
        <div className="admin-users__head-actions">
          <button
            type="button"
            className="admin-users__ghost-cta"
            onClick={() => exportUsersCsv(visibleUsers)}
          >
            Esporta CSV →
          </button>
          <button
            type="button"
            className="admin-users__icon-btn"
            onClick={() => void adminUsers.reload()}
            aria-label="Aggiorna elenco"
            title="Aggiorna"
          >
            <IconRefresh size={15} />
          </button>
        </div>
      </div>

      {adminUsers.actionError ? (
        <div className="admin-users__alert" role="alert">
          <span>{adminUsers.actionError}</span>
          <button type="button" className="dash-btn dash-btn--ghost" onClick={adminUsers.clearActionError}>
            Chiudi
          </button>
        </div>
      ) : null}

      <div className="admin-users__pills" role="toolbar" aria-label="Filtri rapidi">
        {pills.map((pill) => (
          <button
            key={pill.id}
            type="button"
            className={`admin-users__pill${chipFilter === pill.id ? ' is-active' : ''}`}
            onClick={() => {
              setChipFilter(pill.id)
              if (pill.id === 'active' || pill.id === 'verify' || pill.id === 'suspended') {
                adminUsers.setFilterStatus(pill.id)
                adminUsers.setFilterRole('all')
              } else if (pill.id === 'professionals') {
                adminUsers.setFilterStatus('all')
                adminUsers.setFilterRole('professional')
              } else {
                adminUsers.setFilterStatus('all')
                adminUsers.setFilterRole('all')
              }
            }}
          >
            <strong>{pill.value}</strong>
            {pill.label}
          </button>
        ))}
      </div>

      <div className="admin-users__toolbar">
        <div className="admin-users__search">
          <span className="admin-users__search-icon" aria-hidden="true">
            <IconSearch size={14} />
          </span>
          <input
            type="search"
            className="admin-users__search-input"
            placeholder="Cerca nome o email"
            value={adminUsers.searchQuery}
            onChange={(e) => adminUsers.setSearchQuery(e.target.value)}
            aria-label="Cerca utenti"
          />
        </div>
        <select
          className="admin-users__select"
          value={adminUsers.filterRole}
          onChange={(e) => {
            const role = e.target.value as AdminUserRole | 'all'
            adminUsers.setFilterRole(role)
            if (role === 'professional') setChipFilter('professionals')
            else if (chipFilter === 'professionals') setChipFilter('all')
          }}
          aria-label="Filtro ruolo"
        >
          <option value="all">Ruolo: tutti</option>
          <option value="professional">Professionisti</option>
          <option value="family">Famiglie</option>
          <option value="agency">Agenzie</option>
          <option value="structure">Strutture RSA</option>
          <option value="admin">Admin</option>
        </select>
        <select
          className="admin-users__select"
          value={adminUsers.filterStatus}
          onChange={(e) => {
            const status = e.target.value as AdminUserStatus | 'all'
            adminUsers.setFilterStatus(status)
            if (status === 'all') {
              if (chipFilter === 'active' || chipFilter === 'verify' || chipFilter === 'suspended') {
                setChipFilter('all')
              }
            } else {
              setChipFilter(status)
            }
          }}
          aria-label="Filtro status"
        >
          <option value="all">Status: tutti</option>
          <option value="active">Attivi</option>
          <option value="suspended">Sospesi</option>
          <option value="verify">Da verificare</option>
        </select>
      </div>

      <div className="admin-users__table-wrap">
        <table className="admin-users__table">
          <thead>
            <tr>
              <th>Utente</th>
              <th>Email</th>
              <th>Ruolo</th>
              <th>Status</th>
              <th>Abbonamento</th>
              <th>Visibilità</th>
              <th>Iscritto</th>
              <th aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {visibleUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-users__empty">
                  Nessun utente corrisponde ai filtri selezionati.
                </td>
              </tr>
            ) : (
              visibleUsers.map((u) => {
                const busy = adminUsers.actionLoadingId === u.id
                const sub = subscriptionPill(u)
                return (
                  <tr
                    key={u.id}
                    onClick={() => adminUsers.openDetail(u.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        adminUsers.openDetail(u.id)
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Apri profilo di ${u.name}`}
                  >
                    <td>
                      <div className="admin-users__guest">
                        <div className="admin-users__avatar" aria-hidden="true">
                          {u.initials}
                        </div>
                        <div className="admin-users__guest-meta">
                          <span className="admin-users__guest-name">{u.name}</span>
                          <span className="admin-users__guest-id">#{u.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-users__muted">{u.email}</span>
                    </td>
                    <td>
                      <span className="admin-users__role">{ADMIN_USER_ROLE_LABELS[u.role]}</span>
                    </td>
                    <td>
                      <span className={statusClass(u.status)}>{ADMIN_USER_STATUS_LABELS[u.status]}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-users__sub-cell"
                        title="Apri dettaglio Abbonamento"
                        onClick={(e) => {
                          e.stopPropagation()
                          adminUsers.openDetail(u.id, { tab: 'abbonamento' })
                        }}
                      >
                        <span className={sub.className}>{sub.label}</span>
                        {sub.trialHint ? (
                          <span className="admin-users__trial-hint">{sub.trialHint}</span>
                        ) : null}
                      </button>
                    </td>
                    <td>
                      <span className={visibilityClass(u.profileVisible)}>
                        {visibilityLabel(u.profileVisible)}
                      </span>
                    </td>
                    <td className="admin-users__date">{formatAdminUserDate(u.registeredAt)}</td>
                    <td>
                      <div className="admin-users__row-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="admin-users__icon-btn"
                          title="Apri dettaglio"
                          aria-label={`Apri dettaglio di ${u.name}`}
                          onClick={() => adminUsers.openDetail(u.id)}
                        >
                          <IconEye size={14} />
                        </button>
                        <button
                          type="button"
                          className="admin-users__icon-btn"
                          title="Gestisci"
                          aria-label={`Gestisci ${u.name}`}
                          onClick={() => adminUsers.openDetail(u.id, { tab: 'sicurezza' })}
                        >
                          <IconSettings size={14} />
                        </button>
                        <button
                          type="button"
                          className="admin-users__icon-btn"
                          title="Abbonamento"
                          aria-label={`Abbonamento di ${u.name}`}
                          onClick={() => adminUsers.openDetail(u.id, { tab: 'abbonamento' })}
                        >
                          <IconCreditCard size={14} />
                        </button>
                        <a
                          className="admin-users__icon-btn"
                          href={`mailto:${u.email}`}
                          aria-label={`Email a ${u.name}`}
                          title="Email"
                        >
                          <IconMail size={14} />
                        </a>
                        <button
                          type="button"
                          className="admin-users__icon-btn admin-users__icon-btn--danger"
                          disabled={busy || u.role === 'admin'}
                          title={u.role === 'admin' ? 'Non puoi eliminare un admin' : 'Elimina'}
                          aria-label={`Elimina ${u.name}`}
                          onClick={() => {
                            if (!confirmDelete(u.name, u.email)) return
                            void adminUsers.remove(u.id)
                          }}
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
    </div>
  )
}
