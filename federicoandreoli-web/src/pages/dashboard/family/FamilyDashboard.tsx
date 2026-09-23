import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../auth/useAuth'
import { ItaliaGeoSearchCombobox } from '../../../components/ItaliaGeoSearchCombobox'
import type { ItaliaGeoRow } from '../../../lib/italiaGeo/italiaComuniTypes'
import type {
  FamilyAssistanceType,
  FamilyBeneficiaryType,
  FamilyCandidateStatus,
  FamilyEmploymentType,
  FamilyRequest,
  FamilyRequestCreateInput,
} from '../../../lib/familyRequestTypes'
import {
  ASSISTANCE_TYPE_LABELS,
  BENEFICIARY_TYPE_LABELS,
  CANDIDATE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  formatFamilyRequestDate,
  REQUEST_STATUS_LABELS,
} from '../../../services/familyRequestService'
import { useFamilyRequests } from '../../../hooks/useFamilyRequests'
import { useMessaging } from '../../../hooks/useMessaging'
import { useNotifications } from '../../../hooks/useNotifications'
import { openDirectContactThread } from '../../../lib/messagingApi'
import {
  IconAlert,
  IconBell,
  IconEdit,
  IconHeart,
  IconHome,
  IconInbox,
  IconList,
  IconMessages,
  IconPlus,
  IconSettings,
  IconStar,
  IconStarFilled,
  IconUsers,
  IconWave,
} from '../../../components/icons/DashboardIcons'
import { AccountSettingsSection } from '../AccountSettingsSection'
import { DashboardLayout } from '../DashboardLayout'
import { DashboardMessagingSection } from '../DashboardMessagingSection'
import { DashboardNotificationsSection } from '../DashboardNotificationsSection'
import { useSavedProfiles } from '../../../hooks/useSavedProfiles'
import type { SavedProfile } from '../../../lib/savedProfileTypes'
import { profileDetailPath } from '../../../lib/siteRoutes'

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'] as const

const ASSISTANCE_OPTIONS = Object.entries(ASSISTANCE_TYPE_LABELS) as [FamilyAssistanceType, string][]
const BENEFICIARY_OPTIONS = Object.entries(BENEFICIARY_TYPE_LABELS) as [FamilyBeneficiaryType, string][]
const EMPLOYMENT_OPTIONS = Object.entries(EMPLOYMENT_TYPE_LABELS) as [FamilyEmploymentType, string][]

function StarRating({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <span className="dash-rating" role="img" aria-label={`Valutazione ${count} su ${max}`}>
      {Array.from({ length: max }, (_, i) =>
        i < count ? (
          <IconStarFilled key={i} size={13} className="dash-rating__star dash-rating__star--filled" />
        ) : (
          <IconStar key={i} size={13} className="dash-rating__star" />
        ),
      )}
    </span>
  )
}

function RequestsLoadSkeleton() {
  return (
    <div aria-busy="true" aria-label="Caricamento richieste">
      <div className="dash-skeleton dash-skeleton--title" style={{ width: 200, height: 28, marginBottom: 12 }} />
      <div className="dash-skeleton" style={{ width: '100%', height: 220 }} />
    </div>
  )
}

function SectionErrorState({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <div className="dash-empty-state" role="alert">
      <div className="dash-empty-state__icon">
        <IconAlert size={28} />
      </div>
      <div className="dash-empty-state__title">{title}</div>
      <div className="dash-empty-state__sub">{message}</div>
      <button type="button" className="dash-btn dash-btn--primary" onClick={onRetry}>
        Riprova
      </button>
    </div>
  )
}

type FamilyRequestsContext = ReturnType<typeof useFamilyRequests>

/* ── Section: Home ─────────────────────────────────────────── */
function SectionHome({
  onNewRequest,
  onGoToCandidates,
  userName,
  loading,
  activeRequest,
  stats,
}: {
  onNewRequest: () => void
  onGoToCandidates: () => void
  userName: string
  loading: boolean
  activeRequest: FamilyRequest | null
  stats: FamilyRequestsContext['stats']
}) {
  return (
    <div className="dash-home">
      <div className="dash-welcome-banner">
        <div className="dash-welcome-banner__greeting">
          <span className="dash-welcome-banner__greeting-icon"><IconWave size={16} /></span>
          Bentornati
        </div>
        <div className="dash-welcome-banner__name">{userName}</div>
        <div className="dash-welcome-banner__sub">
          Account Gratuito ·{' '}
          {loading
            ? '…'
            : stats.activeCount === 0
              ? 'nessuna richiesta attiva'
              : stats.activeCount === 1
                ? '1 richiesta attiva'
                : `${stats.activeCount} richieste attive`}
        </div>
      </div>

      <div className="dash-stat-grid">
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-sage-softer)', color: 'var(--color-sage)' }}>
            <IconList size={20} />
          </div>
          <div className="dash-stat-card__value">{loading ? '—' : stats.publishedCount}</div>
          <div className="dash-stat-card__label">Richieste pubblicate</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-primary-softer)', color: 'var(--color-primary)' }}>
            <IconUsers size={20} />
          </div>
          <div className="dash-stat-card__value">{loading ? '—' : stats.applicationCount}</div>
          <div className="dash-stat-card__label">Candidature ricevute</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-accent-softer)', color: 'var(--color-accent)' }}>
            <IconHeart size={20} />
          </div>
          <div className="dash-stat-card__value">3</div>
          <div className="dash-stat-card__label">Profili salvati</div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card__title">
          Richiesta attiva
          <button type="button" className="dash-btn dash-btn--primary" onClick={onNewRequest}>
            <IconPlus size={16} /> Nuova richiesta
          </button>
        </div>
        {loading ? (
          <div className="dash-skeleton" style={{ width: '100%', height: 56 }} />
        ) : activeRequest ? (
          <div className="dash-family-active-req">
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{activeRequest.title}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Pubblicata il {formatFamilyRequestDate(activeRequest.createdAt)} · {activeRequest.applicationCount} candidature ricevute
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <span className="dash-badge dash-badge--active">{REQUEST_STATUS_LABELS.active}</span>
              <button type="button" className="dash-btn dash-btn--ghost" onClick={onGoToCandidates}>
                Vedi candidature
              </button>
            </div>
          </div>
        ) : (
          <div className="dash-empty-state dash-empty-mini">
            <div className="dash-empty-state__icon">
              <IconInbox size={24} />
            </div>
            <div className="dash-empty-state__title">Nessuna richiesta attiva</div>
            <div className="dash-empty-state__sub">Pubblica un annuncio per ricevere candidature dai professionisti.</div>
            <button type="button" className="dash-btn dash-btn--primary" onClick={onNewRequest}>
              Pubblica richiesta
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Section: My Requests ───────────────────────────────────── */
function SectionMyRequests({
  onNewRequest,
  requests,
  loading,
  error,
  onReload,
  onCloseRequest,
  statusUpdatingId,
}: {
  onNewRequest: () => void
  requests: FamilyRequest[]
  loading: boolean
  error: string | null
  onReload: () => void
  onCloseRequest: (id: string) => void
  statusUpdatingId: string | null
}) {
  if (loading) {
    return <RequestsLoadSkeleton />
  }

  if (error) {
    return (
      <SectionErrorState
        title="Impossibile caricare le richieste"
        message={error}
        onRetry={onReload}
      />
    )
  }

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Le mie richieste</h2>
          <p className="dash-section__subtitle">Annunci di assistenza pubblicati dalla famiglia</p>
        </div>
        <button type="button" className="dash-btn dash-btn--primary" onClick={onNewRequest}>
          <IconPlus size={16} /> Pubblica nuova richiesta
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state__icon">
            <IconList size={28} />
          </div>
          <div className="dash-empty-state__title">Nessuna richiesta pubblicata</div>
          <div className="dash-empty-state__sub">Crea il tuo primo annuncio per trovare un professionista.</div>
          <button type="button" className="dash-btn dash-btn--primary" onClick={onNewRequest}>
            Pubblica richiesta
          </button>
        </div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Titolo</th>
                <th>Zona</th>
                <th>Data</th>
                <th>Candidature</th>
                <th>Status</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.title}</td>
                  <td>{r.comune}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatFamilyRequestDate(r.createdAt)}</td>
                  <td>
                    <strong>{r.applicationCount}</strong>
                  </td>
                  <td>
                    <span className={`dash-badge dash-badge--${r.status}`}>{REQUEST_STATUS_LABELS[r.status]}</span>
                  </td>
                  <td>
                    <div className="dash-table__actions">
                      <button type="button" className="dash-btn dash-btn--primary">Candidature</button>
                      <button type="button" className="dash-btn dash-btn--ghost">Modifica</button>
                      {r.status === 'active' && (
                        <button
                          type="button"
                          className="dash-btn dash-btn--danger"
                          disabled={statusUpdatingId === r.id}
                          onClick={() => onCloseRequest(r.id)}
                        >
                          {statusUpdatingId === r.id ? 'Chiusura…' : 'Chiudi'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Section: Candidates Received ───────────────────────────── */
function SectionCandidates({
  candidates,
  loading,
  error,
  onReload,
  onUpdateStatus,
  onContact,
}: {
  candidates: FamilyRequestsContext['applicationsForActiveRequests']
  loading: boolean
  error: string | null
  onReload: () => void
  onUpdateStatus: (id: string, status: FamilyCandidateStatus) => void
  onContact: (professionalId: string, name: string) => void
}) {
  const [statusFilter, setStatusFilter] = useState<FamilyCandidateStatus | 'all'>('all')

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return candidates
    return candidates.filter((c) => c.status === statusFilter)
  }, [candidates, statusFilter])

  if (loading) {
    return <RequestsLoadSkeleton />
  }

  if (error) {
    return (
      <SectionErrorState
        title="Impossibile caricare le candidature"
        message={error}
        onRetry={onReload}
      />
    )
  }

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Candidature ricevute</h2>
          <p className="dash-section__subtitle">Professionisti che si sono candidati alla tua richiesta attiva</p>
        </div>
        <div className="dash-filters">
          <select
            className="dash-form-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FamilyCandidateStatus | 'all')}
            aria-label="Filtra per stato candidatura"
          >
            <option value="all">Tutti gli status</option>
            {(Object.keys(CANDIDATE_STATUS_LABELS) as FamilyCandidateStatus[]).map((key) => (
              <option key={key} value={key}>
                {CANDIDATE_STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state__icon">
            <IconUsers size={28} />
          </div>
          <div className="dash-empty-state__title">Nessuna candidatura</div>
          <div className="dash-empty-state__sub">
            Quando un professionista si candida alla tua richiesta attiva, lo vedrai qui.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state__icon">
            <IconInbox size={28} />
          </div>
          <div className="dash-empty-state__title">Nessun risultato</div>
          <div className="dash-empty-state__sub">Prova a cambiare il filtro status.</div>
        </div>
      ) : (
        <div className="dash-card" style={{ padding: 0 }}>
          {filtered.map((c) => (
            <div key={c.id} className="dash-candidate-row">
              <div className="dash-candidate-row__avatar">{c.initials}</div>
              <div className="dash-candidate-row__info">
                <div className="dash-candidate-row__name">{c.name}</div>
                <div className="dash-candidate-row__meta">
                  {c.category} · {c.zone} · <StarRating count={c.stars} />
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{c.preview}</div>
              </div>
              <div className="dash-candidate-row__actions">
                <span className={`dash-badge dash-badge--${c.status}`}>{CANDIDATE_STATUS_LABELS[c.status]}</span>
                <button type="button" className="dash-btn dash-btn--ghost">Vedi profilo</button>
                {c.status !== 'contacted' && c.status !== 'in-selection' && (
                  <button
                    type="button"
                    className="dash-btn dash-btn--primary"
                    onClick={() => {
                      onUpdateStatus(c.id, 'contacted')
                      onContact(c.professionalId, c.name)
                    }}
                  >
                    Contatta
                  </button>
                )}
                {c.status === 'contacted' && (
                  <button type="button" className="dash-btn dash-btn--sage" onClick={() => onUpdateStatus(c.id, 'in-selection')}>
                    In selezione
                  </button>
                )}
                {c.status !== 'discarded' && (
                  <button type="button" className="dash-btn dash-btn--danger" onClick={() => onUpdateStatus(c.id, 'discarded')}>
                    Scarta
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Section: Saved ─────────────────────────────────────────── */
function SectionSaved({
  items,
  loading,
  error,
  mutatingId,
  onReload,
  onRemove,
  onContact,
}: {
  items: SavedProfile[]
  loading: boolean
  error: string | null
  mutatingId: string | null
  onReload: () => void
  onRemove: (professionalId: string) => void
  onContact: (professionalId: string, name: string) => void
}) {
  if (loading) {
    return <RequestsLoadSkeleton />
  }

  if (error) {
    return (
      <SectionErrorState title="Impossibile caricare i salvati" message={error} onRetry={onReload} />
    )
  }

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Professionisti salvati</h2>
          <p className="dash-section__subtitle">
            Profili preferiti salvati sul tuo account ({items.length})
          </p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state__icon">
            <IconHeart size={28} />
          </div>
          <div className="dash-empty-state__title">Nessun profilo salvato</div>
          <div className="dash-empty-state__sub">
            Usa «Salva profilo» dalla scheda pubblica per aggiungerli qui.
          </div>
        </div>
      ) : (
        items.map((p) => {
          const initials = p.name
            .split(' ')
            .slice(0, 2)
            .map((n) => n[0] ?? '')
            .join('')
            .toUpperCase()
          return (
            <div key={p.id} className="dash-saved-card">
              <div className="dash-saved-card__avatar">{initials}</div>
              <div className="dash-saved-card__info">
                <div className="dash-saved-card__name">{p.name}</div>
                <div className="dash-saved-card__meta">
                  {p.category} · {p.zone}
                  {p.stars > 0 ? (
                    <>
                      {' '}
                      · <StarRating count={p.stars} />
                    </>
                  ) : null}
                </div>
                {p.note ? (
                  <div className="dash-saved-card__note">
                    <span className="dash-saved-card__note-icon" aria-hidden="true">
                      <IconEdit size={13} />
                    </span>
                    {p.note}
                  </div>
                ) : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flexShrink: 0 }}>
                <Link to={profileDetailPath(p.professionalId)} className="dash-btn dash-btn--primary">
                  Vedi profilo
                </Link>
                <button
                  type="button"
                  className="dash-btn dash-btn--ghost"
                  onClick={() => onContact(p.professionalId, p.name)}
                >
                  Contatta
                </button>
                <button
                  type="button"
                  className="dash-btn dash-btn--danger"
                  disabled={mutatingId === p.professionalId}
                  onClick={() => onRemove(p.professionalId)}
                >
                  Rimuovi
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

/* ── Section: New Request Form ──────────────────────────────── */
function SectionNewRequest({
  onPublished,
  createRequest,
  submitting,
  submitError,
  fieldErrors,
  onClearSubmitFeedback,
}: {
  onPublished: () => void
  createRequest: FamilyRequestsContext['createRequest']
  submitting: boolean
  submitError: string | null
  fieldErrors: FamilyRequestsContext['fieldErrors']
  onClearSubmitFeedback: () => void
}) {
  const [assistanceType, setAssistanceType] = useState<FamilyAssistanceType>('badante')
  const [beneficiary, setBeneficiary] = useState<FamilyBeneficiaryType>('non_autosufficient_elderly')
  const [employmentType, setEmploymentType] = useState<FamilyEmploymentType>('live_in')
  const [selectedPlace, setSelectedPlace] = useState<ItaliaGeoRow | null>(null)
  const [budgetMonthly, setBudgetMonthly] = useState('')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const toggleDay = (day: string) =>
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))

  const buildInput = (): FamilyRequestCreateInput => ({
    assistanceType,
    beneficiary,
    employmentType,
    comune: selectedPlace?.comune ?? '',
    budgetMonthly: budgetMonthly.trim() ? Number(budgetMonthly) : null,
    days: selectedDays,
    notes,
  })

  const handlePublish = async () => {
    onClearSubmitFeedback()
    setSuccessMessage(null)
    const created = await createRequest(buildInput())
    if (!created) return
    setSuccessMessage('Richiesta pubblicata con successo.')
    setSelectedPlace(null)
    setBudgetMonthly('')
    setSelectedDays([])
    setNotes('')
    onPublished()
  }

  const handleDraft = async () => {
    onClearSubmitFeedback()
    setSuccessMessage(null)
    const created = await createRequest(buildInput(), { asDraft: true })
    if (!created) return
    setSuccessMessage('Bozza salvata. Puoi pubblicarla da «Le mie richieste».')
  }

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Pubblica nuova richiesta</h2>
          <p className="dash-section__subtitle">Descrivete le vostre esigenze per trovare il professionista giusto</p>
        </div>
      </div>

      {submitError ? (
        <div className="dash-card" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {submitError}
        </div>
      ) : null}

      {successMessage ? (
        <div className="dash-card" role="status" style={{ marginBottom: 'var(--space-4)' }}>
          {successMessage}
        </div>
      ) : null}

      <div className="dash-card">
        <div className="dash-form-grid">
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="req-assistance">Tipo di assistenza</label>
            <select
              id="req-assistance"
              className="dash-form-select"
              value={assistanceType}
              onChange={(e) => setAssistanceType(e.target.value as FamilyAssistanceType)}
            >
              {ASSISTANCE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="req-beneficiary">Per chi è il servizio</label>
            <select
              id="req-beneficiary"
              className="dash-form-select"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value as FamilyBeneficiaryType)}
            >
              {BENEFICIARY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="req-employment">Tipo di impiego</label>
            <select
              id="req-employment"
              className="dash-form-select"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value as FamilyEmploymentType)}
            >
              {EMPLOYMENT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label">Comune</label>
            <ItaliaGeoSearchCombobox
              selectedPlace={selectedPlace}
              onSelectedPlaceChange={(place) => {
                setSelectedPlace(place)
                onClearSubmitFeedback()
              }}
            />
            {fieldErrors.comune ? (
              <span className="dash-form-error" role="alert">
                {fieldErrors.comune}
              </span>
            ) : null}
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="req-budget">Budget indicativo (€/mese)</label>
            <input
              id="req-budget"
              className="dash-form-input"
              type="number"
              placeholder="Es. 1200"
              value={budgetMonthly}
              onChange={(e) => setBudgetMonthly(e.target.value)}
            />
          </div>
          <div className="dash-form-field dash-form-field--full">
            <label className="dash-form-label">Giorni richiesti</label>
            <div className="dash-avail-grid">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`dash-avail-tag${selectedDays.includes(d) ? ' dash-avail-tag--selected' : ''}`}
                  onClick={() => toggleDay(d)}
                >
                  {d}
                </button>
              ))}
            </div>
            {fieldErrors.days ? (
              <span className="dash-form-error" role="alert">
                {fieldErrors.days}
              </span>
            ) : null}
          </div>
          <div className="dash-form-field dash-form-field--full">
            <label className="dash-form-label" htmlFor="req-notes">Note aggiuntive</label>
            <textarea
              id="req-notes"
              className="dash-form-input dash-form-textarea"
              placeholder="Descrivi la situazione: condizioni dell'assistito, eventuali patologie, esigenze particolari, orari preferiti..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="dash-btn dash-btn--primary dash-btn--lg"
            disabled={submitting}
            onClick={() => void handlePublish()}
          >
            {submitting ? 'Pubblicazione…' : 'Pubblica richiesta'}
          </button>
          <button
            type="button"
            className="dash-btn dash-btn--ghost dash-btn--lg"
            disabled={submitting}
            onClick={() => void handleDraft()}
          >
            Salva come bozza
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Nav items ──────────────────────────────────────────────── */
function buildNavItems(unreadNotifications: number, unreadMessages: number) {
  return [
    { id: 'home', label: 'Home', icon: <IconHome size={18} /> },
    { id: 'richieste', label: 'Le mie richieste', tabLabel: 'Richieste', icon: <IconList size={18} /> },
    { id: 'candidature', label: 'Candidature ricevute', tabLabel: 'Candidati', icon: <IconUsers size={18} /> },
    { id: 'messaggi', label: 'Messaggi', tabLabel: 'Messaggi', icon: <IconMessages size={18} />, badge: unreadMessages },
    { id: 'notifiche', label: 'Notifiche', tabLabel: 'Notifiche', icon: <IconBell size={18} />, badge: unreadNotifications },
    { id: 'salvati', label: 'Professionisti salvati', tabLabel: 'Salvati', icon: <IconHeart size={18} /> },
    { id: 'nuova-richiesta', label: 'Pubblica richiesta', tabLabel: 'Pubblica', icon: <IconPlus size={18} /> },
    { id: 'impostazioni', label: 'Impostazioni', tabLabel: 'Impostaz.', icon: <IconSettings size={18} /> },
  ]
}

/* ── Main component ─────────────────────────────────────────── */
export function FamilyDashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const notifications = useNotifications()
  const familyData = useFamilyRequests()
  const sectionParam = searchParams.get('section')
  const threadParam = searchParams.get('thread')
  const messaging = useMessaging({ initialThreadId: threadParam })
  const savedProfiles = useSavedProfiles()
  const [activeSection, setActiveSection] = useState(sectionParam === 'messaggi' ? 'messaggi' : 'home')

  useEffect(() => {
    if (sectionParam === 'messaggi') {
      setActiveSection('messaggi')
    }
    if (threadParam) {
      messaging.selectThread(threadParam)
    }
  }, [sectionParam, threadParam, messaging.selectThread])

  const goToNewRequest = () => setActiveSection('nuova-richiesta')

  const openMessaging = (threadId?: string) => {
    setActiveSection('messaggi')
    if (threadId) {
      messaging.selectThread(threadId)
      setSearchParams({ section: 'messaggi', thread: threadId }, { replace: true })
    } else {
      setSearchParams({ section: 'messaggi' }, { replace: true })
    }
  }

  const startContact = async (professionalId: string, professionalName: string, initialMessage?: string) => {
    if (!user?.id) return
    try {
      const thread = await openDirectContactThread(user.id, user.name, {
        professionalId,
        professionalName,
        initialMessage,
      })
      await messaging.reloadThreads({ silent: true })
      openMessaging(thread.id)
    } catch {
      openMessaging()
    }
  }

  const handleCloseRequest = (id: string) => {
    void familyData.updateRequestStatus(id, 'closed')
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <SectionHome
            onNewRequest={goToNewRequest}
            onGoToCandidates={() => setActiveSection('candidature')}
            userName={user?.name ?? 'Famiglia'}
            loading={familyData.loading}
            activeRequest={familyData.activeRequest}
            stats={familyData.stats}
          />
        )
      case 'richieste':
        return (
          <SectionMyRequests
            onNewRequest={goToNewRequest}
            requests={familyData.requests}
            loading={familyData.loading}
            error={familyData.error}
            onReload={() => void familyData.reload()}
            onCloseRequest={handleCloseRequest}
            statusUpdatingId={familyData.statusUpdatingId}
          />
        )
      case 'candidature':
        return (
          <SectionCandidates
            candidates={familyData.applicationsForActiveRequests}
            loading={familyData.loading}
            error={familyData.error}
            onReload={() => void familyData.reload()}
            onUpdateStatus={(id, status) => void familyData.updateApplicationStatus(id, status)}
            onContact={(professionalId, name) => {
              void startContact(professionalId, name)
            }}
          />
        )
      case 'messaggi':
        return (
          <DashboardMessagingSection
            title="Messaggi"
            subtitle="Conversazioni con i professionisti che hai contattato o che si sono candidati"
            userId={user?.id ?? ''}
            threads={messaging.threads}
            messages={messaging.messages}
            selectedThread={messaging.selectedThread}
            selectedThreadId={messaging.selectedThreadId}
            loading={messaging.loading}
            messagesLoading={messaging.messagesLoading}
            error={messaging.error}
            messagesError={messaging.messagesError}
            sending={messaging.sending}
            onReload={() => void messaging.reloadThreads()}
            onSelectThread={(id) => {
              messaging.selectThread(id)
              if (id) {
                setSearchParams({ section: 'messaggi', thread: id }, { replace: true })
              } else {
                setSearchParams({ section: 'messaggi' }, { replace: true })
              }
            }}
            onSendMessage={messaging.sendMessage}
          />
        )
      case 'salvati':
        return (
          <SectionSaved
            items={savedProfiles.items}
            loading={savedProfiles.loading}
            error={savedProfiles.error}
            mutatingId={savedProfiles.mutatingId}
            onReload={() => void savedProfiles.reload()}
            onRemove={(professionalId) => void savedProfiles.remove(professionalId)}
            onContact={(professionalId, name) => void startContact(professionalId, name)}
          />
        )
      case 'notifiche':
        return (
          <DashboardNotificationsSection
            title="Notifiche"
            subtitle="Candidature e aggiornamenti sulle tue richieste"
            notifications={notifications.notifications}
            unreadCount={notifications.unreadCount}
            loading={notifications.loading}
            error={notifications.error}
            markingAll={notifications.markingAll}
            onReload={() => void notifications.reload()}
            onMarkAllRead={() => void notifications.markAllRead()}
            onMarkRead={(id) => void notifications.markRead(id)}
          />
        )
      case 'nuova-richiesta':
        return (
          <SectionNewRequest
            onPublished={() => setActiveSection('richieste')}
            createRequest={familyData.createRequest}
            submitting={familyData.submitting}
            submitError={familyData.submitError}
            fieldErrors={familyData.fieldErrors}
            onClearSubmitFeedback={familyData.clearSubmitFeedback}
          />
        )
      case 'impostazioni':
        return (
          <div className="dash-family-settings">
            <AccountSettingsSection />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <DashboardLayout
      accountType="family"
      userName={user?.name ?? 'Famiglia'}
      userRole="Account Famiglia"
      navItems={buildNavItems(notifications.unreadCount, messaging.unreadCount)}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      planType="free"
    >
      {renderSection()}
    </DashboardLayout>
  )
}
