import { useEffect } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useRegisterWizard } from '../RegisterWizardContext'
import type { RegisterDraft } from '../registerDraft'
import { WizardShell } from './WizardShell'
import { ConsentStep } from './steps/ConsentStep'
import { RegistrationSubmitPanel } from './RegistrationSubmitPanel'
import {
  SEEKER_STEP_IDS,
  type SeekerStepId,
  isSeekerStepId,
  seekerStepHref,
  seekerProgressIndex,
} from './stepConfig'

const CARE_OPTIONS = [
  ['badante', 'Badante / assistenza domiciliare'],
  ['infermiere', 'Infermiere'],
  ['oss', 'OSS'],
  ['misto', 'Più figure / valuto proposte'],
] as const

const FOR_WHOM_OPTIONS = [
  ['self', 'Per me'],
  ['family', 'Per un familiare'],
  ['other', 'Per un’altra persona in carico a me'],
] as const

const CARE_LABELS: Record<string, string> = Object.fromEntries(CARE_OPTIONS)
const FOR_WHOM_LABELS: Record<string, string> = Object.fromEntries(FOR_WHOM_OPTIONS)

function nextSeekerHref(current: SeekerStepId): string {
  const i = seekerProgressIndex(current)
  const next = SEEKER_STEP_IDS[i + 1]
  return next ? seekerStepHref(next) : '/registrazione/fine'
}

function prevSeekerHref(current: SeekerStepId): string {
  const i = seekerProgressIndex(current)
  if (i <= 0) {
    return '/registrazione/intent'
  }
  return seekerStepHref(SEEKER_STEP_IDS[i - 1])
}

export function SeekerWizardPage() {
  const { stepId } = useParams()
  const navigate = useNavigate()
  const { draft, patchDraft, resetForIntent } = useRegisterWizard()

  useEffect(() => {
    if (draft.intent !== 'seeker') {
      resetForIntent('seeker')
    }
  }, [draft.intent, resetForIntent])

  if (!isSeekerStepId(stepId)) {
    return <Navigate to={seekerStepHref(SEEKER_STEP_IDS[0])} replace />
  }

  const idx = seekerProgressIndex(stepId)
  const progress = (idx + 1) / SEEKER_STEP_IDS.length
  const backTo = prevSeekerHref(stepId)

  const titles: Record<SeekerStepId, string> = {
    'chi-sei': 'Cosa cerchi?',
    account: 'Crea il tuo account',
  }

  return (
    <WizardShell backTo={backTo} progressFraction={progress} title={titles[stepId]}>
      {stepId === 'chi-sei' ? (
        <ChiSeiStep
          draft={draft}
          patchDraft={patchDraft}
          onContinue={() => navigate(nextSeekerHref('chi-sei'))}
        />
      ) : (
        <AccountStep draft={draft} patchDraft={patchDraft} />
      )}
    </WizardShell>
  )
}

function OptionCards({
  options,
  selected,
  onSelect,
}: {
  options: readonly (readonly [string, string])[]
  selected: string | undefined
  onSelect: (value: string) => void
}) {
  return (
    <div className="wz-stack">
      {options.map(([value, label]) => {
        const isSelected = selected === value
        return (
          <button
            key={value}
            type="button"
            className={`wz-card${isSelected ? ' is-selected' : ''}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(value)}
          >
            <span className="wz-card__label">{label}</span>
            <span className="wz-card__chev" aria-hidden>
              {isSelected ? '✓' : '›'}
            </span>
          </button>
        )
      })}
    </div>
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
  const canContinue =
    Boolean(draft.seekerCareType) &&
    Boolean(draft.seekerForWhom) &&
    (draft.addressLine?.trim().length ?? 0) >= 2

  return (
    <>
      <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
        Due passi per iscriverti. Frequenza, urgenza e dettagli della richiesta li pubblicherai dalla
        dashboard famiglia.
      </p>

      <p className="wz-section-label">Che tipo di assistenza cerchi?</p>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <OptionCards
          options={CARE_OPTIONS}
          selected={draft.seekerCareType}
          onSelect={(v) => patchDraft({ seekerCareType: v })}
        />
      </div>

      <p className="wz-section-label">Per chi è la ricerca?</p>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <OptionCards
          options={FOR_WHOM_OPTIONS}
          selected={draft.seekerForWhom}
          onSelect={(v) => patchDraft({ seekerForWhom: v })}
        />
      </div>

      <p className="wz-section-label">Comune o zona</p>
      <label className="wz-field">
        <span className="wz-field__label">Dove serve l&apos;assistenza?</span>
        <input
          type="text"
          className="wz-input"
          placeholder="Es. Monza, centro"
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
  const summary = (
    <div className="wz-summary" style={{ marginBottom: 'var(--space-4)' }}>
      <p className="wz-section-label">Riepilogo</p>
      <ul className="wz-summary__list">
        <li>
          <strong>Cerco:</strong>{' '}
          {draft.seekerCareType ? CARE_LABELS[draft.seekerCareType] ?? draft.seekerCareType : '—'}
        </li>
        <li>
          <strong>Per:</strong>{' '}
          {draft.seekerForWhom ? FOR_WHOM_LABELS[draft.seekerForWhom] ?? draft.seekerForWhom : '—'}
        </li>
        <li>
          <strong>Zona:</strong> {draft.addressLine?.trim() || '—'}
        </li>
      </ul>
    </div>
  )

  return (
    <>
      <label className="wz-field">
        <span className="wz-field__label">Nome e cognome</span>
        <input
          type="text"
          className="wz-input"
          placeholder="Es. Famiglia Bianchi"
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
        intent="seeker"
        draft={draft}
        summary={summary}
        submitLabel="Crea account famiglia"
      />
    </>
  )
}
