import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ADMIN_USER_ROLE_LABELS,
  ADMIN_USER_STATUS_LABELS,
  formatAdminUserDate,
  formatAdminUserDateTime,
} from '../../../lib/adminUserApi'
import type { AdminUserDetail, AdminUserListItem, AdminUserRole, AdminUserStatus } from '../../../lib/adminUserTypes'
import { KYC_DOCUMENT_TYPE_LABELS } from '../../../lib/adminKycApi'
import { profileDetailPath } from '../../../lib/siteRoutes'
import { useAdminUsers } from '../../../hooks/useAdminUsers'
import { buildCsv, dateStampForFilename, downloadCsv } from '../../../lib/exportUtils'
import {
  IconAlert,
  IconCheck,
  IconMail,
  IconRefresh,
  IconSearch,
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

function exportUsersCsv(users: AdminUserListItem[]): void {
  const headers = ['id', 'nome', 'email', 'ruolo', 'status', 'iscritto'] as const
  const rows = users.map((u) => [
    u.id,
    u.name,
    u.email,
    ADMIN_USER_ROLE_LABELS[u.role],
    ADMIN_USER_STATUS_LABELS[u.status],
    formatAdminUserDate(u.registeredAt),
  ])
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
  onBack: () => void
  onRetry: () => void
  onRefresh: () => void
  onToggleStatus: () => void
  onDelete: () => void
}) {
  const [tab, setTab] = useState<DetailTab>('profilo')

  const nameParts = splitName(detail?.name ?? '')
  const lastActivity = detail?.activity[0]
  const kycDocs = detail?.kycDocuments ?? []
  const kycApproved = kycDocs.filter((d) => d.status === 'approved').length
  const kycPending = kycDocs.filter((d) => d.status !== 'approved' && d.status !== 'rejected').length

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
                  {kycDocs.length > 0 ? (
                    <span
                      className={
                        kycPending > 0
                          ? 'admin-users__status admin-users__status--verify'
                          : 'admin-users__status admin-users__status--active'
                      }
                    >
                      KYC {kycPending > 0 ? 'in revisione' : 'ok'}
                    </span>
                  ) : (
                    <span className="admin-users__status admin-users__status--neutral">KYC n/d</span>
                  )}
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
                <IconRefresh size={16} />
              </button>
              <a
                className="admin-users-detail__action-label"
                href={`mailto:${detail.email}`}
                title="Scrivi email"
              >
                <IconMail size={15} />
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
                  <IconTrash size={16} />
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
              <strong className="admin-users-metric__value">{detail.subscriptionPlan ?? '—'}</strong>
              <span className="admin-users-metric__meta">
                {detail.subscriptionPlan ? 'Piano registrato' : 'Nessun piano in anagrafica'}
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
                  <div className="admin-users-field admin-users-field--full">
                    <label htmlFor="admin-user-role">Ruolo</label>
                    <input id="admin-user-role" readOnly value={ADMIN_USER_ROLE_LABELS[detail.role]} />
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
                  <p className="admin-users-panel__sub">Piano collegato all&apos;anagrafica utente</p>
                </div>
              </div>
              <div className="admin-users-metric">
                <span className="admin-users-metric__label">Piano</span>
                <strong className="admin-users-metric__value">{detail.subscriptionPlan ?? 'Nessun piano'}</strong>
                <span className="admin-users-metric__meta">
                  Per gestione abbonamenti completa usa la sezione Abbonamenti.
                </span>
              </div>
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
      <div className="admin-users">
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
          detail={adminUsers.detail}
          loading={adminUsers.detailLoading}
          error={adminUsers.detailError}
          actionLoading={adminUsers.actionLoadingId === adminUsers.detailTargetId}
          onBack={adminUsers.closeDetail}
          onRetry={() => {
            if (adminUsers.detailTargetId) adminUsers.openDetail(adminUsers.detailTargetId)
          }}
          onRefresh={() => {
            if (adminUsers.detailTargetId) adminUsers.openDetail(adminUsers.detailTargetId)
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
      <div className="admin-users">
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
      <div className="admin-users">
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
    <div className="admin-users">
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
            <IconRefresh size={16} />
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
            <IconSearch size={15} />
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
              <th>Iscritto</th>
              <th aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {visibleUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-users__empty">
                  Nessun utente corrisponde ai filtri selezionati.
                </td>
              </tr>
            ) : (
              visibleUsers.map((u) => {
                const busy = adminUsers.actionLoadingId === u.id
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
                    <td style={{ whiteSpace: 'nowrap' }}>{formatAdminUserDate(u.registeredAt)}</td>
                    <td>
                      <div className="admin-users__row-actions" onClick={(e) => e.stopPropagation()}>
                        <a
                          className="admin-users__icon-btn"
                          href={`mailto:${u.email}`}
                          aria-label={`Email a ${u.name}`}
                          title="Email"
                        >
                          <IconMail size={15} />
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
                          <IconTrash size={15} />
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
