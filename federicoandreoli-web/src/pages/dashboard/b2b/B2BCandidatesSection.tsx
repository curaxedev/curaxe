import { useMemo, useState } from 'react'
import { useApplications } from '../../../hooks/useApplications'
import type { JobPosting } from '../../../lib/jobPostingTypes'
import {
  B2B_PIPELINE_ORDER,
  B2B_RECEIVED_STATUS_LABELS,
  toB2BDisplayStatus,
} from '../../../lib/applicationApi'
import { exportB2bCandidatesCsv } from '../../../lib/exportUtils'
import { formatApplicationDate } from '../../../services/applicationService'
import {
  IconAlert,
  IconEye,
  IconInbox,
} from '../../../components/icons/DashboardIcons'

export type B2BCandidatesSectionProps = {
  postings: JobPosting[]
  postingsLoading?: boolean
  initialPostingFilter?: string
  onContactCandidate?: (applicationId: string) => void | Promise<void>
  contactingId?: string | null
}

type DisplayStatus = keyof typeof B2B_RECEIVED_STATUS_LABELS

const NEXT_ACTION: Partial<Record<DisplayStatus, { next: DisplayStatus; label: string }>> = {
  new: { next: 'viewed', label: 'In valutazione' },
  viewed: { next: 'in-selection', label: 'In selezione' },
  'in-selection': { next: 'interview', label: 'Fissa colloquio' },
  interview: { next: 'offer', label: 'Invia offerta' },
  offer: { next: 'hired', label: 'Segna come assunto' },
}

function PipelineTimeline({ current }: { current: DisplayStatus }) {
  if (current === 'rejected') {
    return (
      <div className="dash-pipeline dash-pipeline--rejected" aria-label="Candidatura rifiutata">
        Rifiutata
      </div>
    )
  }
  const currentIndex = B2B_PIPELINE_ORDER.indexOf(current)
  return (
    <ol className="dash-pipeline" aria-label="Pipeline selezione">
      {B2B_PIPELINE_ORDER.map((step, index) => {
        const done = index <= currentIndex
        return (
          <li
            key={step}
            className={`dash-pipeline__step${done ? ' is-done' : ''}${index === currentIndex ? ' is-current' : ''}`}
          >
            <span className="dash-pipeline__dot" />
            <span className="dash-pipeline__label">{B2B_RECEIVED_STATUS_LABELS[step]}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function B2BCandidatesSection({
  postings,
  postingsLoading,
  initialPostingFilter = '',
  onContactCandidate,
  contactingId = null,
}: B2BCandidatesSectionProps) {
  const {
    b2bReceivedApplications,
    loading,
    error,
    statusUpdatingId,
    reload,
    setB2BStatus,
  } = useApplications()

  const [postingFilter, setPostingFilter] = useState(initialPostingFilter)
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | 'all'>('all')

  const filtered = useMemo(() => {
    return b2bReceivedApplications.filter((a) => {
      if (postingFilter && a.targetId !== postingFilter) return false
      if (statusFilter === 'all') return true
      return toB2BDisplayStatus(a.status) === statusFilter
    })
  }, [b2bReceivedApplications, postingFilter, statusFilter])

  if (loading || postingsLoading) {
    return (
      <div className="dash-card" aria-busy="true" aria-label="Caricamento candidature">
        <div className="dash-skeleton dash-skeleton--title" style={{ width: 180, height: 20, marginBottom: 12 }} />
        <div className="dash-skeleton" style={{ width: '100%', height: 100 }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="dash-empty-state" role="alert">
        <div className="dash-empty-state__icon">
          <IconAlert size={28} />
        </div>
        <div className="dash-empty-state__title">Errore di caricamento</div>
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
          <h2 className="dash-section__title">Candidature ricevute</h2>
          <p className="dash-section__subtitle">
            Pipeline: nuovo → valutazione → selezione → colloquio → offerta → assunto
          </p>
        </div>
        <div className="dash-filters" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="dash-btn dash-btn--ghost polish-export-btn"
            disabled={filtered.length === 0}
            onClick={() => exportB2bCandidatesCsv(filtered, 'b2b')}
            aria-label="Esporta candidature in CSV"
          >
            Esporta CSV
          </button>
          <select
            className="dash-form-select"
            style={{ width: 'auto' }}
            value={postingFilter}
            onChange={(e) => setPostingFilter(e.target.value)}
            aria-label="Filtra per annuncio"
          >
            <option value="">Tutti gli annunci</option>
            {postings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <select
            className="dash-form-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DisplayStatus | 'all')}
            aria-label="Filtra per stato pipeline"
          >
            <option value="all">Tutti gli stati</option>
            {(Object.keys(B2B_RECEIVED_STATUS_LABELS) as DisplayStatus[]).map((key) => (
              <option key={key} value={key}>
                {B2B_RECEIVED_STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state__icon">
            <IconInbox size={28} />
          </div>
          <div className="dash-empty-state__title">Nessuna candidatura</div>
          <div className="dash-empty-state__sub">
            {postingFilter || statusFilter !== 'all'
              ? 'Nessun risultato con i filtri selezionati.'
              : 'Le candidature ai tuoi annunci attivi compariranno qui.'}
          </div>
        </div>
      ) : (
        <div className="dash-card" style={{ padding: 0 }}>
          {filtered.map((c) => {
            const displayStatus = toB2BDisplayStatus(c.status)
            const next = NEXT_ACTION[displayStatus]
            return (
              <div key={c.id} className="dash-candidate-row dash-candidate-row--pipeline">
                <div className="dash-candidate-row__avatar">{c.applicantInitials}</div>
                <div className="dash-candidate-row__info">
                  <div className="dash-candidate-row__name">{c.applicantName}</div>
                  <div className="dash-candidate-row__meta">
                    {c.applicantCategory} · {c.applicantZone}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Per: {c.targetTitle} · {formatApplicationDate(c.createdAt)}
                  </div>
                  {c.applicantPreview ? (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {c.applicantPreview}
                    </div>
                  ) : null}
                  <PipelineTimeline current={displayStatus} />
                </div>
                <div className="dash-candidate-row__actions">
                  <span className={`dash-badge dash-badge--${displayStatus}`}>
                    {B2B_RECEIVED_STATUS_LABELS[displayStatus]}
                  </span>
                  <button type="button" className="dash-btn dash-btn--ghost">
                    <IconEye size={16} />
                    Vedi profilo
                  </button>
                  {displayStatus !== 'rejected' && displayStatus !== 'hired' && (
                    <button
                      type="button"
                      className="dash-btn dash-btn--primary"
                      disabled={contactingId === c.id || statusUpdatingId === c.id}
                      onClick={async () => {
                        await onContactCandidate?.(c.id)
                        await reload()
                      }}
                    >
                      {contactingId === c.id ? 'Apertura…' : 'Contatta'}
                    </button>
                  )}
                  {next ? (
                    <button
                      type="button"
                      className="dash-btn dash-btn--sage"
                      disabled={statusUpdatingId === c.id}
                      onClick={() => void setB2BStatus(c.id, next.next)}
                    >
                      {next.label}
                    </button>
                  ) : null}
                  {displayStatus !== 'rejected' && displayStatus !== 'hired' && (
                    <button
                      type="button"
                      className="dash-btn dash-btn--danger"
                      disabled={statusUpdatingId === c.id}
                      onClick={() => {
                        if (window.confirm(`Rifiutare la candidatura di ${c.applicantName}?`)) {
                          void setB2BStatus(c.id, 'rejected')
                        }
                      }}
                    >
                      Rifiuta
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
