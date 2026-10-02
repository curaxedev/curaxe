import { useEffect } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useRegisterWizard } from '../RegisterWizardContext'
import type { RegisterDraft, SeekerOrgKind } from '../registerDraft'
import { WizardShell } from './WizardShell'
import { ConsentStep } from './steps/ConsentStep'
import { RegistrationSubmitPanel } from './RegistrationSubmitPanel'
import { WizardPlaceSearch } from './WizardPlaceSearch'
import {
  SEEKER_STEP_IDS,
  type SeekerStepId,
  isSeekerStepId,
  seekerStepHref,
  seekerProgressIndex,
  seekerStepsForOrg,
  nextSeekerStep,
  prevSeekerStep,
} from './stepConfig'

const CARE_OPTIONS = [
  ['badante', 'Badante / assistenza domiciliare'],
  ['infermiere', 'Infermiere'],
  ['oss', 'OSS'],
] as const

const FOR_WHOM_OPTIONS = [
  ['self', 'Per me'],
  ['family', 'Per un familiare'],
  ['other', 'Per un’altra persona in carico a me'],
] as const

const ORG_OPTIONS: Array<{
  value: SeekerOrgKind
  title: string
  description: string
}> = [
  {
    value: 'family',
    title: 'Sono una famiglia',
    description: 'Cerco un professionista per me o per un familiare.',
  },
  {
    value: 'agency',
    title: 'Sono un’agenzia per il lavoro',
    description: 'Agenzia che colloca e gestisce professionisti socio-sanitari.',
  },
]

const CARE_LABELS: Record<string, string> = Object.fromEntries(CARE_OPTIONS)
const FOR_WHOM_LABELS: Record<string, string> = Object.fromEntries(FOR_WHOM_OPTIONS)

const TITLES: Record<SeekerStepId, string> = {
  tipo: 'Chi sei?',
  figura: 'Che tipo di figura stai cercando?',
  'per-chi': 'Per chi è la ricerca?',
  dove: 'Dove serve l’assistenza?',
  account: 'Crea il tuo account',
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

  // Se agenzia apre uno step solo-famiglia, riporta al percorso corretto
  const steps = seekerStepsForOrg(draft.seekerOrgKind)
  if (draft.seekerOrgKind === 'agency' && !steps.includes(stepId)) {
    return <Navigate to={seekerStepHref('dove')} replace />
  }

  const idx = seekerProgressIndex(stepId, draft.seekerOrgKind)
  const total = steps.length
  const progress = (idx + 1) / total

  const prev = prevSeekerStep(stepId, draft.seekerOrgKind)
  const backTo = prev ? seekerStepHref(prev) : '/registrazione/intent'

  const goNext = (orgKind = draft.seekerOrgKind) => {
    const next = nextSeekerStep(stepId, orgKind)
    if (next) navigate(seekerStepHref(next))
  }

  return (
    <WizardShell backTo={backTo} progressFraction={progress} title={TITLES[stepId]}>
      {stepId === 'tipo' ? (
        <TipoStep
          selected={draft.seekerOrgKind}
          onSelect={(kind) => {
            if (kind === 'agency') {
              patchDraft({
                seekerOrgKind: kind,
                seekerCareType: 'agenzia',
                seekerForWhom: 'clienti',
              })
            } else {
              patchDraft({
                seekerOrgKind: kind,
                seekerCareType: undefined,
                seekerForWhom: undefined,
              })
            }
            goNext(kind)
          }}
        />
      ) : null}

      {stepId === 'figura' ? (
        <OptionStep
          options={CARE_OPTIONS}
          selected={draft.seekerCareType}
          onSelect={(v) => {
            patchDraft({ seekerCareType: v })
            goNext()
          }}
        />
      ) : null}

      {stepId === 'per-chi' ? (
        <OptionStep
          options={FOR_WHOM_OPTIONS}
          selected={draft.seekerForWhom}
          onSelect={(v) => {
            patchDraft({ seekerForWhom: v })
            goNext()
          }}
        />
      ) : null}

      {stepId === 'dove' ? (
        <DoveStep
          draft={draft}
          patchDraft={patchDraft}
          onContinue={() => goNext()}
        />
      ) : null}

      {stepId === 'account' ? <AccountStep draft={draft} patchDraft={patchDraft} /> : null}
    </WizardShell>
  )
}

function TipoStep({
  selected,
  onSelect,
}: {
  selected: SeekerOrgKind | undefined
  onSelect: (kind: SeekerOrgKind) => void
}) {
  return (
    <div className="wz-intent-grid wz-intent-grid--stack">
      {ORG_OPTIONS.map((opt) => {
        const isSelected = selected === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            className={`wz-intent-card${isSelected ? ' is-selected' : ''}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(opt.value)}
          >
            <h2>{opt.title}</h2>
            <p>{opt.description}</p>
          </button>
        )
      })}
    </div>
  )
}

function OptionStep({
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

function DoveStep({
  draft,
  patchDraft,
  onContinue,
}: {
  draft: RegisterDraft
  patchDraft: (p: Partial<RegisterDraft>) => void
  onContinue: () => void
}) {
  const canContinue = (draft.addressLine?.trim().length ?? 0) >= 2

  return (
    <>
      <p
        style={{
          fontSize: 'var(--text-small)',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-4)',
          textAlign: 'center',
        }}
      >
        {draft.seekerOrgKind === 'agency'
          ? 'Indica la zona operativa principale della tua agenzia.'
          : 'Comune o zona in cui serve l’assistenza.'}
      </p>

      <WizardPlaceSearch
        value={draft.addressLine ?? ''}
        onChange={(label) => patchDraft({ addressLine: label })}
      />

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
  const isAgency = draft.seekerOrgKind === 'agency'

  const summary = (
    <div className="wz-summary" style={{ marginBottom: 'var(--space-4)' }}>
      <p className="wz-section-label">Riepilogo</p>
      <ul className="wz-summary__list">
        <li>
          <strong>Profilo:</strong> {isAgency ? 'Agenzia per il lavoro' : 'Famiglia'}
        </li>
        {!isAgency ? (
          <>
            <li>
              <strong>Cerco:</strong>{' '}
              {draft.seekerCareType ? CARE_LABELS[draft.seekerCareType] ?? draft.seekerCareType : '—'}
            </li>
            <li>
              <strong>Per:</strong>{' '}
              {draft.seekerForWhom
                ? FOR_WHOM_LABELS[draft.seekerForWhom] ?? draft.seekerForWhom
                : '—'}
            </li>
          </>
        ) : null}
        <li>
          <strong>Zona:</strong> {draft.addressLine?.trim() || '—'}
        </li>
      </ul>
    </div>
  )

  return (
    <>
      <label className="wz-field">
        <span className="wz-field__label">{isAgency ? 'Ragione sociale / referente' : 'Nome e cognome'}</span>
        <input
          type="text"
          className="wz-input"
          placeholder={isAgency ? 'Es. CareStaff Srl' : 'Es. Famiglia Bianchi'}
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
        submitLabel={isAgency ? 'Crea account agenzia' : 'Crea account famiglia'}
      />
    </>
  )
}
