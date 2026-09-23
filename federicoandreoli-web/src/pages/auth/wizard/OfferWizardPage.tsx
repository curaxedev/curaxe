import { useEffect } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useRegisterWizard } from '../RegisterWizardContext'
import type { PrimaryRole, RegisterDraft } from '../registerDraft'
import { WizardShell } from './WizardShell'
import {
  OFFER_STEP_IDS,
  type OfferStepId,
  isOfferStepId,
  offerStepHref,
  offerProgressIndex,
} from './stepConfig'
import { ConsentStep } from './steps/ConsentStep'
import { RegistrationSubmitPanel } from './RegistrationSubmitPanel'

const ROLE_OPTIONS: { value: PrimaryRole; label: string }[] = [
  { value: 'nurse', label: 'Infermiere / Infermiera' },
  { value: 'oss', label: 'OSS' },
  { value: 'caregiver', label: 'Badante / caregiver' },
  { value: 'other', label: 'Altro ruolo socio-sanitario' },
]

const ROLE_LABELS: Record<PrimaryRole, string> = {
  nurse: 'Infermiere / Infermiera',
  oss: 'OSS',
  caregiver: 'Badante / caregiver',
  other: 'Altro ruolo socio-sanitario',
}

function nextOfferHref(current: OfferStepId): string {
  const i = offerProgressIndex(current)
  const next = OFFER_STEP_IDS[i + 1]
  return next ? offerStepHref(next) : '/registrazione/fine'
}

function prevOfferHref(current: OfferStepId): string {
  const i = offerProgressIndex(current)
  if (i <= 0) {
    return '/registrazione/intent'
  }
  return offerStepHref(OFFER_STEP_IDS[i - 1])
}

export function OfferWizardPage() {
  const { stepId } = useParams()
  const navigate = useNavigate()
  const { draft, patchDraft, resetForIntent } = useRegisterWizard()

  useEffect(() => {
    if (draft.intent !== 'offer') {
      resetForIntent('offer')
    }
  }, [draft.intent, resetForIntent])

  if (!isOfferStepId(stepId)) {
    return <Navigate to={offerStepHref(OFFER_STEP_IDS[0])} replace />
  }

  const idx = offerProgressIndex(stepId)
  const progress = (idx + 1) / OFFER_STEP_IDS.length
  const backTo = prevOfferHref(stepId)

  const titles: Record<OfferStepId, string> = {
    'chi-sei': 'Chi sei e dove lavori?',
    account: 'Crea il tuo account',
  }

  return (
    <WizardShell backTo={backTo} progressFraction={progress} title={titles[stepId]}>
      {stepId === 'chi-sei' ? (
        <ChiSeiStep
          draft={draft}
          patchDraft={patchDraft}
          onContinue={() => navigate(nextOfferHref('chi-sei'))}
        />
      ) : (
        <AccountStep draft={draft} patchDraft={patchDraft} />
      )}
    </WizardShell>
  )
}

function ChiSeiStep({
  draft,
  patchDraft,
  onContinue,
}: {
  draft: RegisterDraft
  patchDraft: (p: Partial<RegisterDraft>) => void
  onContinue: () => void
}) {
  const canContinue = Boolean(draft.primaryRole) && (draft.addressLine?.trim().length ?? 0) >= 2

  return (
    <>
      <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
        Due passi per iscriverti. Completerai esperienza, disponibilità e documenti dal profilo dopo
        l&apos;accesso.
      </p>

      <p className="wz-section-label">Ruolo principale</p>
      <div className="wz-stack" style={{ marginBottom: 'var(--space-5)' }}>
        {ROLE_OPTIONS.map(({ value, label }) => {
          const selected = draft.primaryRole === value
          return (
            <button
              key={value}
              type="button"
              className={`wz-card${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => patchDraft({ primaryRole: value })}
            >
              <span className="wz-card__label">{label}</span>
              {selected ? (
                <span className="wz-card__chev" aria-hidden>
                  ✓
                </span>
              ) : (
                <span className="wz-card__chev" aria-hidden>
                  ›
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="wz-section-label">Comune o zona di lavoro</p>
      <label className="wz-field">
        <span className="wz-field__label">Dove operi principalmente?</span>
        <input
          type="text"
          className="wz-input"
          placeholder="Es. Milano, zona Porta Romana"
          value={draft.addressLine ?? ''}
          onChange={(e) => patchDraft({ addressLine: e.target.value })}
          autoComplete="address-level2"
        />
      </label>

      <div className="wz-footer">
        <button type="button" className="wz-btn-primary" onClick={onContinue} disabled={!canContinue}>
          Avanti
        </button>
      </div>
    </>
  )
}

function AccountStep({
  draft,
  patchDraft,
}: {
  draft: RegisterDraft
  patchDraft: (p: Partial<RegisterDraft>) => void
}) {
  const roleLabel = draft.primaryRole ? ROLE_LABELS[draft.primaryRole] : '—'
  const summary = (
    <div className="wz-summary" style={{ marginBottom: 'var(--space-4)' }}>
      <p className="wz-section-label">Riepilogo</p>
      <ul className="wz-summary__list">
        <li>
          <strong>Ruolo:</strong> {roleLabel}
        </li>
        <li>
          <strong>Zona:</strong> {draft.addressLine?.trim() || '—'}
        </li>
      </ul>
      <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>
        Esperienza, tariffe, disponibilità e documenti si completano dal profilo dopo l&apos;accesso.
      </p>
    </div>
  )

  return (
    <>
      <label className="wz-field">
        <span className="wz-field__label">Nome e cognome</span>
        <input
          type="text"
          className="wz-input"
          placeholder="Es. Maria Rossi"
          value={draft.fullName ?? ''}
          onChange={(e) => patchDraft({ fullName: e.target.value })}
          autoComplete="name"
        />
      </label>

      <label className="wz-field">
        <span className="wz-field__label">Email</span>
        <input
          type="email"
          className="wz-input"
          placeholder="nome@email.it"
          value={draft.email ?? ''}
          onChange={(e) => patchDraft({ email: e.target.value })}
          autoComplete="email"
        />
      </label>

      <ConsentStep draft={draft} patchDraft={patchDraft} hideFooter />

      <RegistrationSubmitPanel
        intent="offer"
        draft={draft}
        summary={summary}
        submitLabel="Crea account professionista"
      />
    </>
  )
}
