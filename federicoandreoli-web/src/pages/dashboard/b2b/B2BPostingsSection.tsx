import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useJobPostings } from '../../../hooks/useJobPostings'
import type { JobPosting, JobPostingFormInput } from '../../../lib/jobPostingTypes'
import {
  JOB_POSTING_CONTRACT_LABELS,
  JOB_POSTING_STATUS_LABELS,
  formatJobPostingDate,
  jobPostingToOpenPosition,
} from '../../../services/jobPostingService'
import { exportJobPostingsCsv } from '../../../lib/exportUtils'
import { JobPostingWizard } from './JobPostingWizard'
import { B2BCandidatesSection } from './B2BCandidatesSection'
import {
  IconAlert,
  IconBriefcase,
  IconPlus,
} from '../../../components/icons/DashboardIcons'

export type B2BPostingsSectionProps = {
  variant: 'agency' | 'structure'
  onContactCandidate?: (applicationId: string) => void | Promise<void>
  contactingId?: string | null
}

export function B2BPostingsSection({
  variant,
  onContactCandidate,
  contactingId = null,
}: B2BPostingsSectionProps) {
  const {
    postings,
    loading,
    error,
    submitting,
    submitError,
    fieldErrors,
    statusUpdatingId,
    reload,
    createPosting,
    updatePosting,
    deletePosting,
    setPostingStatus,
    clearSubmitFeedback,
  } = useJobPostings()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardMode, setWizardMode] = useState<'create' | 'edit'>('create')
  const [editingPosting, setEditingPosting] = useState<JobPosting | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [candidatesPostingId, setCandidatesPostingId] = useState<string | null>(null)

  const copy =
    variant === 'structure'
      ? {
          title: 'Turni e posizioni aperte',
          subtitle: 'Annunci per reparto pubblicati dalla struttura',
          newLabel: 'Nuovo turno',
          empty: 'Nessun turno pubblicato. Crea il primo con il pulsante sopra.',
        }
      : {
          title: 'I miei annunci',
          subtitle: 'Posizioni aperte pubblicate dall\'agenzia',
          newLabel: 'Nuovo annuncio',
          empty: 'Nessun annuncio pubblicato. Crea il primo con il pulsante sopra.',
        }

  const openCreate = () => {
    setWizardMode('create')
    setEditingPosting(null)
    clearSubmitFeedback()
    setWizardOpen(true)
  }

  const openEdit = (posting: JobPosting) => {
    setWizardMode('edit')
    setEditingPosting(posting)
    clearSubmitFeedback()
    setWizardOpen(true)
  }

  const handleWizardSubmit = async (form: JobPostingFormInput, publishAs: 'draft' | 'active') => {
    if (wizardMode === 'create') {
      const created = await createPosting({ ...form, publishAs })
      if (!created) return
      setSuccessMessage(
        publishAs === 'draft'
          ? 'Bozza salvata. Puoi pubblicarla dalla tabella.'
          : 'Annuncio inviato in revisione. Sarà visibile dopo approvazione admin.',
      )
    } else if (editingPosting) {
      const updated = await updatePosting(editingPosting.id, {
        ...form,
        publishAs: publishAs === 'draft' ? 'draft' : 'active',
        changeSummary: 'Modifica da wizard',
      })
      if (!updated) return
      setSuccessMessage('Annuncio aggiornato.')
    }
    setWizardOpen(false)
  }

  const handleTogglePause = async (posting: JobPosting) => {
    if (posting.status === 'pending_review' || posting.status === 'rejected' || posting.status === 'closed') {
      return
    }
    const next = posting.status === 'active' ? 'paused' : 'active'
    const message =
      next === 'paused'
        ? `Mettere in pausa «${posting.title}»? Non sarà più visibile nella directory pubblica.`
        : `Ripubblicare «${posting.title}»? Tornerà attivo nella directory.`
    if (!window.confirm(message)) return
    const ok = await setPostingStatus(posting.id, next)
    if (ok) {
      setSuccessMessage(next === 'paused' ? 'Annuncio messo in pausa.' : 'Annuncio ripubblicato.')
    }
  }

  const handleClose = async (posting: JobPosting) => {
    if (!window.confirm('Chiudere definitivamente questo annuncio?')) return
    const ok = await setPostingStatus(posting.id, 'closed')
    if (ok) setSuccessMessage('Annuncio chiuso.')
  }

  const handleDelete = async (posting: JobPosting) => {
    if (!window.confirm('Eliminare questo annuncio? L\'azione non è reversibile.')) return
    const ok = await deletePosting(posting.id)
    if (ok) setSuccessMessage('Annuncio eliminato.')
  }

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">{copy.title}</h2>
          <p className="dash-section__subtitle">{copy.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="dash-btn dash-btn--ghost polish-export-btn"
            disabled={loading || postings.length === 0}
            onClick={() => exportJobPostingsCsv(postings, variant)}
            aria-label="Esporta annunci in CSV"
          >
            Esporta CSV
          </button>
          <button type="button" className="dash-btn dash-btn--primary" onClick={openCreate}>
            <IconPlus size={16} />
            {copy.newLabel}
          </button>
        </div>
      </div>

      {successMessage ? (
        <div
          className="dash-card"
          role="status"
          style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-sage)' }}
        >
          {successMessage}
          <button
            type="button"
            className="dash-btn dash-btn--ghost"
            style={{ marginLeft: 12 }}
            onClick={() => setSuccessMessage(null)}
          >
            OK
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="dash-card" aria-busy="true" aria-label="Caricamento annunci">
          <div className="dash-skeleton dash-skeleton--title" style={{ width: 160, height: 20, marginBottom: 12 }} />
          <div className="dash-skeleton" style={{ width: '100%', height: 120 }} />
        </div>
      ) : error ? (
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
      ) : postings.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state__icon">
            <IconBriefcase size={28} />
          </div>
          <div className="dash-empty-state__title">Nessun annuncio</div>
          <div className="dash-empty-state__sub">{copy.empty}</div>
        </div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Posizione</th>
                <th>Contratto</th>
                <th>Zona</th>
                <th>Data</th>
                <th>Candidature</th>
                <th>Status</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {postings.map((p) => {
                const publicId =
                  p.status === 'active' ? jobPostingToOpenPosition(p).id : null
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.title}</td>
                    <td>{JOB_POSTING_CONTRACT_LABELS[p.contractType]}</td>
                    <td>{p.location.comune}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatJobPostingDate(p.updatedAt)}</td>
                    <td><strong>{p.applicationCount}</strong></td>
                    <td>
                      <span
                        className={`dash-badge dash-badge--${
                          p.status === 'draft' || p.status === 'pending_review'
                            ? 'paused'
                            : p.status === 'rejected'
                              ? 'closed'
                              : p.status
                        }`}
                      >
                        {JOB_POSTING_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td>
                      <div className="dash-table__actions">
                        {publicId ? (
                          <Link
                            className="dash-btn dash-btn--ghost"
                            to={`/posizioni/${publicId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Vedi pubblico
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="dash-btn dash-btn--ghost"
                          onClick={() =>
                            setCandidatesPostingId((prev) => (prev === p.id ? null : p.id))
                          }
                        >
                          Candidature
                        </button>
                        <button type="button" className="dash-btn dash-btn--ghost" onClick={() => openEdit(p)}>
                          Modifica
                        </button>
                        {p.status !== 'closed' &&
                          p.status !== 'pending_review' &&
                          p.status !== 'rejected' && (
                          <button
                            type="button"
                            className="dash-btn dash-btn--ghost"
                            disabled={statusUpdatingId === p.id}
                            onClick={() => void handleTogglePause(p)}
                          >
                            {p.status === 'active' ? 'Pausa' : 'Riprendi'}
                          </button>
                        )}
                        {p.status !== 'closed' && (
                          <button
                            type="button"
                            className="dash-btn dash-btn--ghost"
                            disabled={statusUpdatingId === p.id}
                            onClick={() => void handleClose(p)}
                          >
                            Chiudi
                          </button>
                        )}
                        <button
                          type="button"
                          className="dash-btn dash-btn--danger"
                          disabled={submitting}
                          onClick={() => void handleDelete(p)}
                        >
                          Elimina
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

      {candidatesPostingId ? (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <B2BCandidatesSection
            postings={postings}
            initialPostingFilter={candidatesPostingId}
            onContactCandidate={onContactCandidate}
            contactingId={contactingId}
          />
        </div>
      ) : null}

      <JobPostingWizard
        open={wizardOpen}
        mode={wizardMode}
        ownerType={variant}
        editingPosting={editingPosting}
        submitting={submitting}
        submitError={submitError}
        fieldErrors={fieldErrors}
        onClose={() => setWizardOpen(false)}
        onClearFeedback={clearSubmitFeedback}
        onSubmit={(form, publishAs) => void handleWizardSubmit(form, publishAs)}
      />
    </div>
  )
}
