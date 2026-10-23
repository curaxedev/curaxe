import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../../components/BrandLogo'
import { IconCheckMark } from '../../components/icons/DashboardIcons'
import { registerProfessional, registerSeeker, RegistrationError } from '../../lib/registrationApi'
import { useRegisterWizard } from '../auth/RegisterWizardContext'
import type { RegistrationCompletionState } from '../auth/wizard/RegistrationSubmitPanel'
import { WizardPlaceSearch } from '../auth/wizard/WizardPlaceSearch'
import '../auth/wizard/register-wizard.css'
import { type SignupLandingConfig } from './signupLandingConfig'
import './signup-landing.css'

type Phase = 'intro' | 'identity' | 'privacy' | 'place'

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function SignupLandingPage({ config }: { config: SignupLandingConfig }) {
  const navigate = useNavigate()
  const { draft, patchDraft, resetForIntent, clearCompleted } = useRegisterWizard()
  const [phase, setPhase] = useState<Phase>('intro')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    resetForIntent(config.intent)
    patchDraft({
      intent: config.intent,
      primaryRole: config.primaryRole,
      seekerOrgKind: config.seekerOrgKind,
      seekerCareType: config.seekerCareType,
      seekerForWhom: config.seekerOrgKind === 'agency' ? 'agenzia' : undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per landing
  }, [config.id])

  const nameOk = (draft.fullName?.trim().length ?? 0) >= 2
  const emailOk = isValidEmail(draft.email ?? '')
  const privacyOk = draft.consentPrivacy && draft.consentTermini && draft.consentMaggiorenne
  const placeOk = Boolean(draft.addressLine?.trim()) && Boolean(draft.addressIstat || draft.addressComune)

  const phaseIndex = useMemo(() => {
    const order: Phase[] = ['intro', 'identity', 'privacy', 'place']
    return order.indexOf(phase)
  }, [phase])

  async function submitRegistration() {
    if (!placeOk || !privacyOk || !nameOk || !emailOk) return
    setBusy(true)
    setError(null)
    try {
      const result =
        config.intent === 'offer' ? await registerProfessional(draft) : await registerSeeker(draft)

      clearCompleted(config.intent)

      const email = draft.email?.trim().toLowerCase() || undefined
      const state: RegistrationCompletionState = {
        registrationId: result.id,
        intent: config.intent,
        email,
        emailVerificationRequired: result.emailVerificationRequired ?? true,
        documentsUploadPending: result.documentsUploadPending,
      }

      const params = new URLSearchParams({
        intent: config.intent,
        id: result.id,
        verify: '1',
      })
      if (email) params.set('email', email)
      if (result.documentsUploadPending) params.set('docs', 'pending')

      navigate(`/registrazione/fine?${params.toString()}`, { state, replace: true })
    } catch (err) {
      setError(
        err instanceof RegistrationError ? err.message : 'Si è verificato un errore. Riprova.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sul">
      <header className="sul-top">
        <BrandLogo size="sm" />
        <Link to="/" className="sul-top__exit">
          Esci
        </Link>
      </header>

      <main className="sul-main">
        {phase !== 'intro' ? (
          <div className="sul-progress" aria-hidden>
            <span style={{ width: `${Math.max(12, (phaseIndex / 3) * 100)}%` }} />
          </div>
        ) : null}

        {phase === 'intro' ? (
          <section className="sul-intro" aria-labelledby="sul-title">
            <p className="sul-eyebrow">{config.eyebrow}</p>
            <h1 id="sul-title" className="sul-title">
              {config.title}
            </h1>
            <p className="sul-lead">{config.lead}</p>

            <ul className="sul-trust" aria-label="Punti chiave">
              {config.bullets.map((b) => (
                <li key={b}>
                  <IconCheckMark size={14} aria-hidden />
                  {b}
                </li>
              ))}
            </ul>

            <ol className="sul-steps">
              {config.steps.map((step, i) => (
                <li key={step.title} className="sul-step">
                  <span className="sul-step__n">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <button type="button" className="sul-btn" onClick={() => setPhase('identity')}>
              Inizia iscrizione
            </button>
            <p className="sul-foot-link">
              Hai già un account? <Link to="/accedi">Accedi</Link>
            </p>
          </section>
        ) : null}

        {phase === 'identity' ? (
          <section className="sul-panel" aria-labelledby="sul-id-title">
            <button type="button" className="sul-back" onClick={() => setPhase('intro')}>
              ← Indietro
            </button>
            <h2 id="sul-id-title" className="sul-panel__title">
              I tuoi dati essenziali
            </h2>
            <p className="sul-panel__lead">Solo nome ed email. Niente documenti o dati personali sensibili qui.</p>

            <label className="wz-field">
              <span className="wz-field__label">{config.nameLabel}</span>
              <input
                type="text"
                className="wz-input"
                placeholder={config.namePlaceholder}
                value={draft.fullName ?? ''}
                autoComplete="name"
                onChange={(e) => patchDraft({ fullName: e.target.value })}
              />
            </label>

            <label className="wz-field">
              <span className="wz-field__label">Email</span>
              <input
                type="email"
                className="wz-input"
                placeholder="nome@email.it"
                value={draft.email ?? ''}
                autoComplete="email"
                onChange={(e) => patchDraft({ email: e.target.value })}
              />
            </label>

            <button
              type="button"
              className="sul-btn"
              disabled={!nameOk || !emailOk}
              onClick={() => setPhase('privacy')}
            >
              Avanti
            </button>
          </section>
        ) : null}

        {phase === 'privacy' ? (
          <section className="sul-panel" aria-labelledby="sul-privacy-title">
            <button type="button" className="sul-back" onClick={() => setPhase('identity')}>
              ← Indietro
            </button>
            <h2 id="sul-privacy-title" className="sul-panel__title">
              Privacy per procedere
            </h2>
            <p className="sul-panel__lead">
              Per creare l’account serve accettare l’informativa. I consensi facoltativi li puoi lasciare dopo.
            </p>

            <label className="sul-check">
              <input
                type="checkbox"
                checked={draft.consentPrivacy}
                onChange={(e) => {
                  const on = e.target.checked
                  // Gate unico: privacy + termini + maggiorenne (minimo legale)
                  patchDraft({
                    consentPrivacy: on,
                    consentTermini: on,
                    consentMaggiorenne: on,
                  })
                }}
              />
              <span>
                Ho letto e accetto l’{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer">
                  Informativa Privacy
                </Link>{' '}
                e i{' '}
                <Link to="/termini" target="_blank" rel="noopener noreferrer">
                  Termini
                </Link>
                , e dichiaro di avere almeno 18 anni.
              </span>
            </label>

            <button
              type="button"
              className="sul-btn"
              disabled={!privacyOk}
              onClick={() => setPhase('place')}
            >
              Continua
            </button>
          </section>
        ) : null}

        {phase === 'place' ? (
          <section className="sul-panel" aria-labelledby="sul-place-title">
            <button type="button" className="sul-back" onClick={() => setPhase('privacy')}>
              ← Indietro
            </button>
            <h2 id="sul-place-title" className="sul-panel__title">
              Zona operativa
            </h2>
            <p className="sul-panel__lead">
              Seleziona un comune dai suggerimenti: così i matching in directory restano coerenti.
            </p>

            <WizardPlaceSearch
              value={draft.addressLine ?? ''}
              requireSelection
              fieldLabel={config.placeLabel}
              onChange={(label) => {
                if (!label) {
                  patchDraft({
                    addressLine: '',
                    addressIstat: undefined,
                    addressComune: undefined,
                    addressRegione: undefined,
                    addressCap: undefined,
                  })
                }
              }}
              onPlaceSelect={(place) => {
                patchDraft({
                  addressLine: place.label,
                  addressIstat: place.istat,
                  addressComune: place.comune,
                  addressRegione: place.regione,
                  addressCap: place.cap,
                })
              }}
            />

            {error ? (
              <div className="wz-callout wz-callout--error" role="alert">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              className="sul-btn"
              disabled={!placeOk || busy}
              onClick={() => void submitRegistration()}
            >
              {busy ? 'Invio…' : config.submitLabel}
            </button>
          </section>
        ) : null}
      </main>
    </div>
  )
}
