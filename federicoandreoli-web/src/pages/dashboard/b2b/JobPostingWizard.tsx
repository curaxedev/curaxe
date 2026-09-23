import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { ItaliaGeoSearchCombobox } from '../../../components/ItaliaGeoSearchCombobox'
import type { ItaliaGeoRow } from '../../../lib/italiaGeo/italiaComuniTypes'
import type {
  JobPosting,
  JobPostingCompensationPeriod,
  JobPostingContractType,
  JobPostingFieldErrors,
  JobPostingFormInput,
  JobPostingRoleId,
  JobPostingWizardStepId,
} from '../../../lib/jobPostingTypes'
import { JOB_POSTING_WIZARD_STEPS } from '../../../lib/jobPostingTypes'
import { useOrganizationLocations } from '../../../hooks/useOrganizationLocations'
import { organizationLocationToJobPostingLocation } from '../../../lib/locationTypes'
import {
  JOB_POSTING_CONTRACT_LABELS,
  JOB_POSTING_DAYS,
  JOB_POSTING_WIZARD_STEP_LABELS,
  emptyJobPostingForm,
  geoRowToJobLocation,
  jobPostingFormFromPosting,
  validateJobPostingStep,
} from '../../../services/jobPostingService'
import { OPEN_POSITION_ROLE_LABELS } from '../../../lib/mockOpenPositions'

type JobPostingWizardProps = {
  open: boolean
  mode: 'create' | 'edit'
  ownerType: 'agency' | 'structure'
  editingPosting: JobPosting | null
  submitting: boolean
  submitError: string | null
  fieldErrors: JobPostingFieldErrors
  onClose: () => void
  onClearFeedback: () => void
  onSubmit: (form: JobPostingFormInput, publishAs: 'draft' | 'active') => void
}

const ROLE_OPTIONS: JobPostingRoleId[] = ['caregiver', 'oss', 'nurse', 'assistant', 'facility']

const CONTRACT_OPTIONS = Object.entries(JOB_POSTING_CONTRACT_LABELS) as [JobPostingContractType, string][]

function stepIndex(step: JobPostingWizardStepId): number {
  return JOB_POSTING_WIZARD_STEPS.indexOf(step)
}

export function JobPostingWizard({
  open,
  mode,
  ownerType,
  editingPosting,
  submitting,
  submitError,
  fieldErrors,
  onClose,
  onClearFeedback,
  onSubmit,
}: JobPostingWizardProps) {
  const titleId = useId()
  const [step, setStep] = useState<JobPostingWizardStepId>('ruolo')
  const [form, setForm] = useState<JobPostingFormInput>(() => emptyJobPostingForm(ownerType))
  const [stepError, setStepError] = useState<string | null>(null)
  const [localFieldErrors, setLocalFieldErrors] = useState<JobPostingFieldErrors>({})
  const [selectedPlace, setSelectedPlace] = useState<ItaliaGeoRow | null>(null)
  const [publishChoice, setPublishChoice] = useState<'draft' | 'active'>('active')
  const [sedeSource, setSedeSource] = useState<'org' | 'manual'>('org')
  const { locations: orgLocations } = useOrganizationLocations()

  const resetWizard = useCallback(() => {
    setStep('ruolo')
    setForm(editingPosting ? jobPostingFormFromPosting(editingPosting) : emptyJobPostingForm(ownerType))
    setStepError(null)
    setLocalFieldErrors({})
    setSelectedPlace(null)
    setPublishChoice(editingPosting?.status === 'draft' ? 'draft' : 'active')
    const locId = editingPosting?.location.organizationLocationId
    setSedeSource(locId || orgLocations.length === 0 ? (locId ? 'org' : 'manual') : 'org')
  }, [editingPosting, ownerType, orgLocations.length])

  useEffect(() => {
    if (open) resetWizard()
  }, [open, resetWizard])

  useEffect(() => {
    if (!open || editingPosting || orgLocations.length === 0) return
    if (form.location.comune.trim()) return
    const primary = orgLocations.find((l) => l.isPrimary) ?? orgLocations[0]
    setSedeSource('org')
    setSelectedPlace({
      id: primary.address.istat,
      comune: primary.address.comune,
      siglaProvincia: primary.address.provincia,
      provincia: primary.address.provincia,
      cap: primary.address.cap,
      regione: primary.address.regione,
    })
    setForm((prev) => ({
      ...prev,
      location: organizationLocationToJobPostingLocation(primary),
    }))
  }, [open, editingPosting, orgLocations, form.location.comune])

  const mergedFieldErrors = { ...localFieldErrors, ...fieldErrors }

  const patchForm = (patch: Partial<JobPostingFormInput>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    onClearFeedback()
    setStepError(null)
    setLocalFieldErrors({})
  }

  const goNext = () => {
    const err = validateJobPostingStep(step, form)
    if (err) {
      setStepError(err.message)
      if (err.fieldErrors) setLocalFieldErrors(err.fieldErrors)
      return
    }
    const idx = stepIndex(step)
    const next = JOB_POSTING_WIZARD_STEPS[idx + 1]
    if (next) setStep(next)
  }

  const goBack = () => {
    const idx = stepIndex(step)
    const prev = JOB_POSTING_WIZARD_STEPS[idx - 1]
    if (prev) setStep(prev)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(form, publishChoice)
  }

  const toggleDay = (day: string) => {
    const days = form.availability.days.includes(day)
      ? form.availability.days.filter((d) => d !== day)
      : [...form.availability.days, day]
    patchForm({ availability: { ...form.availability, days } })
  }

  if (!open) return null

  const progress = (stepIndex(step) + 1) / JOB_POSTING_WIZARD_STEPS.length
  const isLast = step === 'pubblicazione'

  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div
        className="dash-modal"
        style={{ maxWidth: 640, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="dash-modal__header">
          <span className="dash-modal__title" id={titleId}>
            {mode === 'create'
              ? ownerType === 'structure'
                ? 'Nuovo turno / posizione'
                : 'Nuovo annuncio'
              : ownerType === 'structure'
                ? 'Modifica turno'
                : 'Modifica annuncio'}
          </span>
          <button type="button" className="dash-modal__close" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>

        <div style={{ padding: '0 var(--space-6)', marginTop: 'var(--space-2)' }}>
          <div
            className="wz-progress"
            aria-hidden
            style={{ borderRadius: 4, overflow: 'hidden', height: 4, background: 'var(--color-border)' }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.round(progress * 100)}%`,
                background: 'var(--color-primary)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 8 }}>
            Passo {stepIndex(step) + 1} di {JOB_POSTING_WIZARD_STEPS.length}: {JOB_POSTING_WIZARD_STEP_LABELS[step]}
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 'var(--space-3)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {JOB_POSTING_WIZARD_STEPS.map((s) => (
              <span
                key={s}
                className={`dash-badge${s === step ? ' dash-badge--active' : ''}`}
                style={{ fontSize: 'var(--text-xs)' }}
              >
                {JOB_POSTING_WIZARD_STEP_LABELS[s]}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="dash-modal__body">
            {(stepError || submitError) && (
              <div className="dash-card" role="alert" style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-accent)' }}>
                {stepError ?? submitError}
              </div>
            )}

            {step === 'ruolo' && (
              <div className="dash-form-grid">
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="jp-role">Ruolo ricercato</label>
                  <select
                    id="jp-role"
                    className="dash-form-select"
                    value={form.roleId}
                    onChange={(e) => patchForm({ roleId: e.target.value as JobPostingRoleId })}
                  >
                    {ROLE_OPTIONS.map((id) => (
                      <option key={id} value={id}>{OPEN_POSITION_ROLE_LABELS[id]}</option>
                    ))}
                  </select>
                </div>
                {ownerType === 'structure' ? (
                  <div className="dash-form-field">
                    <label className="dash-form-label" htmlFor="jp-dept">Reparto (opzionale)</label>
                    <input
                      id="jp-dept"
                      className="dash-form-input"
                      value={form.department}
                      onChange={(e) => patchForm({ department: e.target.value })}
                      placeholder="Es. Alzheimer, Lungodegenti"
                    />
                  </div>
                ) : null}
                <div className="dash-form-field dash-form-field--full">
                  <label className="dash-form-label" htmlFor="jp-title">Titolo annuncio</label>
                  <input
                    id="jp-title"
                    className="dash-form-input"
                    value={form.title}
                    onChange={(e) => patchForm({ title: e.target.value })}
                    placeholder={ownerType === 'structure' ? 'Es. OSS turno mattina — Reparto Alzheimer' : 'Es. Badante convivente – Milano zona sud'}
                  />
                  {mergedFieldErrors.title ? (
                    <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', marginTop: 4, display: 'block' }}>
                      {mergedFieldErrors.title}
                    </span>
                  ) : null}
                </div>
              </div>
            )}

            {step === 'descrizione' && (
              <div className="dash-form-field">
                <label className="dash-form-label" htmlFor="jp-desc">Descrizione della posizione</label>
                <textarea
                  id="jp-desc"
                  className="dash-form-input dash-form-textarea"
                  rows={8}
                  value={form.description}
                  onChange={(e) => patchForm({ description: e.target.value })}
                  placeholder="Descrivi mansioni, contesto e cosa offre il datore di lavoro…"
                />
                {mergedFieldErrors.description ? (
                  <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', marginTop: 4, display: 'block' }}>
                    {mergedFieldErrors.description}
                  </span>
                ) : null}
              </div>
            )}

            {step === 'requisiti' && (
              <div className="dash-form-field">
                <label className="dash-form-label" htmlFor="jp-req">Requisiti (una riga per punto)</label>
                <textarea
                  id="jp-req"
                  className="dash-form-input dash-form-textarea"
                  rows={6}
                  value={form.requirementsText}
                  onChange={(e) => patchForm({ requirementsText: e.target.value })}
                  placeholder={'Esperienza documentabile\nPatente B\nTitolo OSS valido'}
                />
                {mergedFieldErrors.requirementsText ? (
                  <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', marginTop: 4, display: 'block' }}>
                    {mergedFieldErrors.requirementsText}
                  </span>
                ) : null}
              </div>
            )}

            {step === 'disponibilita' && (
              <div className="dash-form-grid">
                <div className="dash-form-field dash-form-field--full">
                  <label className="dash-form-label">Giorni / fasce</label>
                  <div className="dash-avail-grid">
                    {JOB_POSTING_DAYS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`dash-avail-tag${form.availability.days.includes(d) ? ' dash-avail-tag--selected' : ''}`}
                        onClick={() => toggleDay(d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  {mergedFieldErrors.days ? (
                    <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', marginTop: 4, display: 'block' }}>
                      {mergedFieldErrors.days}
                    </span>
                  ) : null}
                </div>
                <div className="dash-form-field dash-form-field--full">
                  <label className="dash-form-label" htmlFor="jp-sched">Note orari</label>
                  <input
                    id="jp-sched"
                    className="dash-form-input"
                    value={form.availability.scheduleNotes}
                    onChange={(e) =>
                      patchForm({ availability: { ...form.availability, scheduleNotes: e.target.value } })
                    }
                    placeholder="Es. Turno 06:00–14:00, convivenza lun–sab"
                  />
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="jp-start">Data inizio (opz.)</label>
                  <input
                    id="jp-start"
                    type="date"
                    className="dash-form-input"
                    value={form.availability.startDate}
                    onChange={(e) =>
                      patchForm({ availability: { ...form.availability, startDate: e.target.value } })
                    }
                  />
                </div>
              </div>
            )}

            {step === 'retribuzione' && (
              <div className="dash-form-grid">
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="jp-period">Periodo</label>
                  <select
                    id="jp-period"
                    className="dash-form-select"
                    value={form.compensation.period}
                    onChange={(e) =>
                      patchForm({
                        compensation: {
                          ...form.compensation,
                          period: e.target.value as JobPostingCompensationPeriod,
                        },
                      })
                    }
                  >
                    <option value="monthly">Mensile</option>
                    <option value="hourly">Orario</option>
                  </select>
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="jp-min">Min (€)</label>
                  <input
                    id="jp-min"
                    type="number"
                    className="dash-form-input"
                    value={form.compensation.minAmount ?? ''}
                    onChange={(e) =>
                      patchForm({
                        compensation: {
                          ...form.compensation,
                          minAmount: e.target.value ? Number(e.target.value) : null,
                        },
                      })
                    }
                  />
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="jp-max">Max (€)</label>
                  <input
                    id="jp-max"
                    type="number"
                    className="dash-form-input"
                    value={form.compensation.maxAmount ?? ''}
                    onChange={(e) =>
                      patchForm({
                        compensation: {
                          ...form.compensation,
                          maxAmount: e.target.value ? Number(e.target.value) : null,
                        },
                      })
                    }
                  />
                </div>
                <div className="dash-form-field dash-form-field--full">
                  <label className="dash-form-label" htmlFor="jp-pay-notes">Note retribuzione</label>
                  <input
                    id="jp-pay-notes"
                    className="dash-form-input"
                    value={form.compensation.notes}
                    onChange={(e) =>
                      patchForm({ compensation: { ...form.compensation, notes: e.target.value } })
                    }
                    placeholder="Es. CCNL cooperativa, benefit, buoni pasto"
                  />
                  {mergedFieldErrors.minAmount ? (
                    <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', marginTop: 4, display: 'block' }}>
                      {mergedFieldErrors.minAmount}
                    </span>
                  ) : null}
                </div>
              </div>
            )}

            {step === 'sede' && (
              <div className="dash-form-grid">
                {orgLocations.length > 0 ? (
                  <div className="dash-form-field dash-form-field--full">
                    <label className="dash-form-label" htmlFor="jp-org-location">
                      Sede operativa
                    </label>
                    <select
                      id="jp-org-location"
                      className="dash-form-select"
                      value={
                        sedeSource === 'org' && form.location.organizationLocationId
                          ? form.location.organizationLocationId
                          : ''
                      }
                      onChange={(e) => {
                        const value = e.target.value
                        if (!value) {
                          setSedeSource('manual')
                          patchForm({
                            location: {
                              comune: '',
                              provincia: '',
                              cap: '',
                              address: '',
                              organizationLocationId: undefined,
                            },
                          })
                          setSelectedPlace(null)
                          return
                        }
                        const loc = orgLocations.find((l) => l.id === value)
                        if (!loc) return
                        setSedeSource('org')
                        setSelectedPlace({
                          id: loc.address.istat,
                          comune: loc.address.comune,
                          siglaProvincia: loc.address.provincia,
                          provincia: loc.address.provincia,
                          cap: loc.address.cap,
                          regione: loc.address.regione,
                        })
                        patchForm({ location: organizationLocationToJobPostingLocation(loc) })
                      }}
                    >
                      <option value="">Altro comune (ricerca manuale)</option>
                      {orgLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                          {loc.isPrimary ? ' — principale' : ''} · {loc.address.comune}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {sedeSource === 'manual' || orgLocations.length === 0 ? (
                  <div className="dash-form-field">
                    <label className="dash-form-label">Comune sede</label>
                    <ItaliaGeoSearchCombobox
                      selectedPlace={selectedPlace}
                      onSelectedPlaceChange={(place) => {
                        setSelectedPlace(place)
                        if (place) patchForm({ location: geoRowToJobLocation(place) })
                      }}
                    />
                    {mergedFieldErrors.comune ? (
                      <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', marginTop: 4, display: 'block' }}>
                        {mergedFieldErrors.comune}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="jp-address">Indirizzo (opz.)</label>
                  <input
                    id="jp-address"
                    className="dash-form-input"
                    value={form.location.address}
                    onChange={(e) =>
                      patchForm({ location: { ...form.location, address: e.target.value } })
                    }
                  />
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="jp-contract">Tipo contratto</label>
                  <select
                    id="jp-contract"
                    className="dash-form-select"
                    value={form.contractType}
                    onChange={(e) =>
                      patchForm({ contractType: e.target.value as JobPostingContractType })
                    }
                  >
                    {CONTRACT_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {mergedFieldErrors.contractType ? (
                    <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', marginTop: 4, display: 'block' }}>
                      {mergedFieldErrors.contractType}
                    </span>
                  ) : null}
                </div>
              </div>
            )}

            {step === 'pubblicazione' && (
              <div>
                <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-muted)' }}>
                  Riepilogo: <strong>{form.title || '—'}</strong> · {form.location.comune || 'sede da definire'} ·{' '}
                  {JOB_POSTING_CONTRACT_LABELS[form.contractType]}
                </p>
                {editingPosting && editingPosting.changeHistory.length > 0 ? (
                  <div className="dash-card" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="dash-card__title">Storico modifiche</div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: 'var(--text-small)' }}>
                      {[...editingPosting.changeHistory].reverse().slice(0, 5).map((entry) => (
                        <li key={`${entry.version}-${entry.at}`}>
                          v{entry.version} — {entry.summary} ({new Date(entry.at).toLocaleDateString('it-IT')})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                  <legend className="dash-form-label">Stato pubblicazione</legend>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      type="radio"
                      name="publishChoice"
                      checked={publishChoice === 'active'}
                      onChange={() => setPublishChoice('active')}
                    />
                    Pubblica subito (visibile in directory)
                  </label>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="publishChoice"
                      checked={publishChoice === 'draft'}
                      onChange={() => setPublishChoice('draft')}
                    />
                    Salva come bozza
                  </label>
                </fieldset>
              </div>
            )}
          </div>

          <div className="dash-modal__footer">
            {step !== 'ruolo' ? (
              <button type="button" className="dash-btn dash-btn--ghost" onClick={goBack} disabled={submitting}>
                Indietro
              </button>
            ) : (
              <button type="button" className="dash-btn dash-btn--ghost" onClick={onClose} disabled={submitting}>
                Annulla
              </button>
            )}
            {isLast ? (
              <button type="submit" className="dash-btn dash-btn--primary" disabled={submitting}>
                {submitting ? 'Salvataggio…' : mode === 'create' ? 'Crea annuncio' : 'Salva modifiche'}
              </button>
            ) : (
              <button type="button" className="dash-btn dash-btn--primary" onClick={goNext}>
                Avanti
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
