import type { ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useRegisterWizard } from './RegisterWizardContext'
import type { RegisterIntent } from './registerDraft'
import type { RegistrationCompletionState } from './wizard/RegistrationSubmitPanel'
import { IconCheck } from '../../components/icons/DashboardIcons'
import { WizardShell } from './wizard/WizardShell'
import './wizard/register-wizard.css'

function parseCompletionFromQuery(params: URLSearchParams): RegistrationCompletionState | null {
  const intent = params.get('intent')
  const id = params.get('id')
  if ((intent !== 'offer' && intent !== 'seeker') || !id) {
    return null
  }
  return {
    registrationId: id,
    intent,
    emailVerificationRequired: params.get('verify') === '1',
    documentsUploadPending: params.get('docs') === 'pending',
  }
}

export function RegisterFinePage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { draft, clearCompleted } = useRegisterWizard()

  const fromState = location.state as RegistrationCompletionState | null
  const fromQuery = parseCompletionFromQuery(searchParams)
  const completion = fromState ?? fromQuery

  const intent: RegisterIntent | null = completion?.intent ?? draft.intent
  const isOffer = intent === 'offer'
  const registrationId = completion?.registrationId
  const emailVerify = completion?.emailVerificationRequired ?? false
  const docsPending = completion?.documentsUploadPending ?? false

  const title = completion ? 'Registrazione inviata' : 'Registrazione'

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
  } else if (isOffer) {
    body = (
      <>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-muted)', maxWidth: '32rem', margin: '0 auto' }}>
          {emailVerify
            ? 'Controlla la tua email: ti abbiamo inviato un link per confermare l’account e proseguire con la verifica del profilo.'
            : 'La registrazione è stata ricevuta. Ti contatteremo per i prossimi passi.'}
        </p>
        {docsPending ? (
          <p
            className="wz-callout wz-callout--info"
            style={{ marginTop: 'var(--space-4)', maxWidth: '32rem', marginLeft: 'auto', marginRight: 'auto' }}
          >
            Documenti professionali: caricamento in sospeso. Potrai completarli dal profilo dopo l’accesso.
          </p>
        ) : null}
        {registrationId ? (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>
            Riferimento: {registrationId}
          </p>
        ) : null}
        <div className="wz-done-actions">
          <Link
            to="/accedi"
            className="wz-btn-primary"
            onClick={() => intent && clearCompleted(intent)}
          >
            Accedi e completa il profilo
          </Link>
          <Link to="/" className="wz-btn-outline">
            Vai alla home
          </Link>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-muted)', maxWidth: '32rem', margin: '0 auto' }}>
          Il tuo account famiglia è pronto. Accedi per pubblicare una richiesta di assistenza e
          gestire le candidature.
        </p>
        {registrationId ? (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>
            Riferimento: {registrationId}
          </p>
        ) : null}
        <div className="wz-done-actions">
          <Link
            to="/accedi"
            className="wz-btn-primary"
            onClick={() => intent && clearCompleted(intent)}
          >
            Accedi alla dashboard
          </Link>
          <Link to="/" className="wz-btn-outline">
            Vai alla home
          </Link>
        </div>
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
