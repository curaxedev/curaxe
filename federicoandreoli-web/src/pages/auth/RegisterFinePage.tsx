import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { resolvePostLoginPath } from '../../auth/roleDashboard'
import { AuthError } from '../../auth/types'
import { OtpCodeInput } from '../../components/OtpCodeInput'
import { TurnstileWidget } from '../../components/TurnstileWidget'
import { IconCheck } from '../../components/icons/DashboardIcons'
import { requestOtp, verifyOtp } from '../../lib/authApi'
import { useRegisterWizard } from './RegisterWizardContext'
import type { RegisterIntent } from './registerDraft'
import type { RegistrationCompletionState } from './wizard/RegistrationSubmitPanel'
import { WizardShell } from './wizard/WizardShell'
import './wizard/register-wizard.css'
import './auth-pages.css'

function parseCompletionFromQuery(params: URLSearchParams): RegistrationCompletionState | null {
  const intent = params.get('intent')
  const id = params.get('id')
  if ((intent !== 'offer' && intent !== 'seeker') || !id) {
    return null
  }
  return {
    registrationId: id,
    intent,
    email: params.get('email')?.trim() || undefined,
    emailVerificationRequired: params.get('verify') !== '0',
    documentsUploadPending: params.get('docs') === 'pending',
  }
}

function authErrorMessage(err: unknown): string {
  if (err instanceof AuthError) return err.message
  return 'Si è verificato un errore. Riprova.'
}

export function RegisterFinePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { draft, clearCompleted } = useRegisterWizard()

  const fromState = location.state as RegistrationCompletionState | null
  const fromQuery = parseCompletionFromQuery(searchParams)
  const completion = fromState ?? fromQuery

  const intent: RegisterIntent | null = completion?.intent ?? draft.intent
  const isOffer = intent === 'offer'
  const registrationId = completion?.registrationId
  const docsPending = completion?.documentsUploadPending ?? false
  const email = (completion?.email ?? draft.email ?? '').trim().toLowerCase()

  const [otpCode, setOtpCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [resendHint, setResendHint] = useState<string | null>(null)

  const title = completion ? 'Conferma il tuo account' : 'Registrazione'

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    if (!email || busy || otpCode.trim().length < 6) return
    setError(null)
    setResendHint(null)
    setBusy(true)
    try {
      const user = await verifyOtp(email, otpCode.trim())
      if (intent) clearCompleted(intent)
      navigate(resolvePostLoginPath(user.role), { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    if (!email || busy) return
    setError(null)
    setResendHint(null)
    setBusy(true)
    try {
      await requestOtp(email, turnstileToken)
      setResendHint('Nuovo codice inviato. Controlla la posta.')
      setOtpCode('')
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  let body: ReactNode
  if (!completion) {
    body = (
      <>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-muted)', maxWidth: '32rem', margin: '0 auto' }}>
          Nessuna registrazione completata in questa sessione. Avvia il wizard per inviare i tuoi dati.
        </p>
        <div className="wz-done-actions">
          <Link to="/registrazione/intent" className="wz-btn-primary">
            Inizia registrazione
          </Link>
        </div>
      </>
    )
  } else if (!email) {
    body = (
      <>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-muted)', maxWidth: '32rem', margin: '0 auto' }}>
          Ti abbiamo inviato un codice di conferma via email. Accedi con quel codice per attivare
          l’account.
        </p>
        <div className="wz-done-actions">
          <Link to="/accedi" className="wz-btn-primary">
            Vai all’accesso
          </Link>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <p
          style={{
            fontSize: 'var(--text-body)',
            color: 'var(--color-text-muted)',
            maxWidth: '32rem',
            margin: '0 auto',
          }}
        >
          {isOffer
            ? 'Inserisci il codice ricevuto nell’email di benvenuto per confermare e attivare il tuo account professionista.'
            : 'Inserisci il codice ricevuto nell’email di benvenuto per confermare e attivare il tuo account famiglia.'}
        </p>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            marginTop: 'var(--space-2)',
          }}
        >
          Inviato a <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
        </p>

        {docsPending ? (
          <p
            className="wz-callout wz-callout--info"
            style={{ marginTop: 'var(--space-4)', maxWidth: '32rem', marginLeft: 'auto', marginRight: 'auto' }}
          >
            Documenti professionali: potrai completarli dal profilo dopo l’accesso.
          </p>
        ) : null}

        <form
          className="auth-form"
          style={{ maxWidth: '22rem', margin: 'var(--space-5) auto 0' }}
          onSubmit={(e) => void handleVerify(e)}
        >
          <div className="auth-field">
            <span className="auth-field__label" id="reg-otp-label">
              Codice a 6 cifre
            </span>
            <OtpCodeInput
              value={otpCode}
              onChange={setOtpCode}
              name="code"
              aria-label="Codice di conferma a 6 cifre"
            />
          </div>

          {error ? (
            <div className="wz-callout wz-callout--error" role="alert">
              {error}
            </div>
          ) : null}
          {resendHint ? (
            <div className="wz-callout wz-callout--info" role="status">
              {resendHint}
            </div>
          ) : null}

          <button
            type="submit"
            className="wz-btn-primary"
            style={{ width: '100%' }}
            disabled={busy || otpCode.trim().length < 6}
          >
            {busy ? 'Verifica…' : 'Conferma e vai alla dashboard'}
          </button>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <TurnstileWidget onToken={setTurnstileToken} />
          </div>

          <button
            type="button"
            className="auth-link-resend"
            disabled={busy}
            onClick={() => void handleResend()}
          >
            Non hai ricevuto il codice? Invia di nuovo
          </button>
        </form>

        {registrationId ? (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-4)' }}>
            Riferimento: {registrationId}
          </p>
        ) : null}
      </>
    )
  }

  return (
    <WizardShell backTo="/" backLabel="Home" progressFraction={1} title={title}>
      <div className="wz-done">
        {completion ? (
          <div className="wz-success-ring wz-success-ring--pop" aria-hidden>
            <IconCheck size={48} />
          </div>
        ) : null}
        {body}
      </div>
    </WizardShell>
  )
}
