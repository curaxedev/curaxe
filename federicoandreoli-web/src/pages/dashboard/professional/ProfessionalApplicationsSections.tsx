import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconBriefcase,
  IconChevronRight,
  IconSend,
} from '../../../components/icons/DashboardIcons'
import { useApplications } from '../../../hooks/useApplications'
import { useDirectoryOpenPositionsList } from '../../../hooks/useDirectoryOpenPositionsList'
import { OPEN_POSITION_ROLE_LABELS } from '../../../lib/mockOpenPositions'
import {
  OUTGOING_STATUS_LABELS,
  toOutgoingDisplayStatus,
} from '../../../lib/applicationApi'
import { formatApplicationDate, hasAppliedToOpenPosition } from '../../../services/applicationService'
import { useAuth } from '../../../auth/useAuth'

const PUBLISHER_COLORS: Record<string, string> = {
  famiglia: '#81B29A',
  agenzia: '#E07A5F',
  struttura: '#2A5C82',
}

export function SectionApplications() {
  const {
    outgoingApplications,
    loading,
    error,
    submitting,
    submitError,
    statusUpdatingId,
    reload,
    withdraw,
    clearSubmitFeedback,
  } = useApplications()

  if (loading) {
    return (
      <div className="dash-card">
        <p style={{ color: 'var(--color-text-muted)' }}>Caricamento candidature…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dash-empty-state" role="alert">
        <div className="dash-empty-state__title">Impossibile caricare le candidature</div>
        <div className="dash-empty-state__sub">{error}</div>
        <button type="button" className="dash-btn dash-btn--primary" onClick={() => void reload()}>
          Riprova
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Le mie candidature</h2>
          <p className="dash-section__subtitle">Annunci ai quali hai inviato la tua candidatura</p>
        </div>
      </div>

      {submitError ? (
        <div className="dash-card" role="alert" style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-accent)' }}>
          {submitError}
          <button type="button" className="dash-btn dash-btn--ghost" style={{ marginLeft: 12 }} onClick={clearSubmitFeedback}>
            OK
          </button>
        </div>
      ) : null}

      {outgoingApplications.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state__icon">
            <IconSend size={28} />
          </div>
          <div className="dash-empty-state__title">Nessuna candidatura inviata</div>
          <div className="dash-empty-state__sub">
            Esplora le posizioni aperte e invia la prima candidatura dalla sezione Posizioni.
          </div>
        </div>
      ) : (
        <div className="dash-app-list">
          {outgoingApplications.map((a) => {
            const displayStatus = toOutgoingDisplayStatus(a.status)
            const publisherLabel =
              a.targetPublisherKind === 'famiglia'
                ? 'Famiglia'
                : a.targetPublisherKind === 'agenzia'
                  ? 'Agenzia'
                  : 'Struttura'
            const col = PUBLISHER_COLORS[a.targetPublisherKind] ?? '#2A5C82'
            return (
              <div key={a.id} className="dash-app-card">
                <div className="dash-app-card__left">
                  <div
                    className="dash-app-card__pub-dot"
                    style={{ background: col + '22', color: col }}
                  >
                    {publisherLabel[0]}
                  </div>
                  <div>
                    <div className="dash-app-card__title">{a.targetTitle}</div>
                    <div className="dash-app-card__meta">
                      {a.targetPublisherName} · {formatApplicationDate(a.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="dash-app-card__right">
                  <span className={`dash-badge dash-badge--${displayStatus}`}>
                    {OUTGOING_STATUS_LABELS[displayStatus]}
                  </span>
                  <div className="dash-table__actions">
                    {a.targetType === 'job_posting' ? (
                      <Link className="dash-btn dash-btn--ghost" to={`/posizioni/jp-op-${a.targetId}`}>
                        Vedi annuncio
                      </Link>
                    ) : (
                      <button type="button" className="dash-btn dash-btn--ghost" disabled>
                        Richiesta famiglia
                      </button>
                    )}
                    {displayStatus === 'pending' && (
                      <button
                        type="button"
                        className="dash-btn dash-btn--danger"
                        disabled={statusUpdatingId === a.id || submitting}
                        onClick={() => void withdraw(a.id)}
                      >
                        Ritira
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SectionOpenPositions() {
  const { user } = useAuth()
  const { items, loading, error, reload } = useDirectoryOpenPositionsList({
    cityQuery: '',
    roleId: 'all',
    poster: 'all',
    contract: 'all',
  })
  const { applyToPosting, submitting, submitError, clearSubmitFeedback, reload: reloadApps } = useApplications()
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [successId, setSuccessId] = useState<string | null>(null)

  const activePositions = useMemo(() => items.slice(0, 12), [items])

  useEffect(() => {
    if (!user?.id) {
      setAppliedIds(new Set())
      return
    }
    const next = new Set<string>()
    for (const row of activePositions) {
      if (hasAppliedToOpenPosition(user.id, row.id)) next.add(row.id)
    }
    setAppliedIds(next)
  }, [activePositions, user?.id])

  const handleApply = async (openPositionId: string) => {
    const created = await applyToPosting(openPositionId)
    if (created) {
      setAppliedIds((prev) => new Set(prev).add(openPositionId))
      setSuccessId(openPositionId)
      void reloadApps()
    }
  }

  if (loading) {
    return (
      <div className="dash-card">
        <p style={{ color: 'var(--color-text-muted)' }}>Caricamento posizioni…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dash-empty-state" role="alert">
        <div className="dash-empty-state__title">Impossibile caricare le posizioni</div>
        <div className="dash-empty-state__sub">{error}</div>
        <button type="button" className="dash-btn dash-btn--primary" onClick={() => void reload()}>
          Riprova
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Posizioni aperte</h2>
          <p className="dash-section__subtitle">Annunci pubblicati da agenzie e strutture — candidati in un click</p>
        </div>
        <Link className="dash-btn dash-btn--ghost" to="/">
          Vedi tutte in home
          <IconChevronRight size={14} />
        </Link>
      </div>

      {submitError ? (
        <div className="dash-card" role="alert" style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-accent)' }}>
          {submitError}
          <button type="button" className="dash-btn dash-btn--ghost" style={{ marginLeft: 12 }} onClick={clearSubmitFeedback}>
            OK
          </button>
        </div>
      ) : null}

      {activePositions.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state__icon">
            <IconBriefcase size={28} />
          </div>
          <div className="dash-empty-state__title">Nessuna posizione disponibile</div>
          <div className="dash-empty-state__sub">Torna più tardi o consulta la home.</div>
        </div>
      ) : (
        <div className="dash-app-list">
          {activePositions.map((row) => {
            const applied = appliedIds.has(row.id)
            const roleLabel = OPEN_POSITION_ROLE_LABELS[row.category]
            return (
              <div key={row.id} className="dash-app-card">
                <div className="dash-app-card__left">
                  <div>
                    <div className="dash-app-card__title">{row.title}</div>
                    <div className="dash-app-card__meta">
                      {roleLabel} · {row.posterDisplayName} · {row.locationLabel}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {row.rateLabel} · {row.scheduleLabel}
                    </div>
                  </div>
                </div>
                <div className="dash-app-card__right">
                  {successId === row.id ? (
                    <span className="dash-badge dash-badge--accepted" role="status">
                      Inviata
                    </span>
                  ) : null}
                  <div className="dash-table__actions">
                    <Link className="dash-btn dash-btn--ghost" to={`/posizioni/${row.id}`}>
                      Dettaglio
                    </Link>
                    <button
                      type="button"
                      className="dash-btn dash-btn--primary"
                      disabled={applied || submitting}
                      onClick={() => void handleApply(row.id)}
                    >
                      {applied ? 'Già candidato' : 'Candidati'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
