import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { RegisterDraft, RegisterIntent } from '../registerDraft'
import { useRegisterWizard } from '../RegisterWizardContext'
import { registerProfessional, registerSeeker, RegistrationError } from '../../../lib/registrationApi'
import type { RegistrationSuccessResponse } from '../../../lib/registrationTypes'
import { offerFieldErrors, seekerFieldErrors, type FieldErrorRow } from './registrationFieldLabels'

export type RegistrationCompletionState = {
  registrationId: string
  intent: RegisterIntent
  emailVerificationRequired: boolean
  documentsUploadPending?: boolean
}

type Props = {
  intent: RegisterIntent
  draft: RegisterDraft
  summary: React.ReactNode
  submitLabel: string
}

function registrationErrorMessage(err: unknown): string {
  if (err instanceof RegistrationError) return err.message
  return 'Si è verificato un errore. Riprova.'
}

function fieldRows(intent: RegisterIntent, fieldErrors: Record<string, string[]>): FieldErrorRow[] {
  return intent === 'offer' ? offerFieldErrors(fieldErrors) : seekerFieldErrors(fieldErrors)
}

export function RegistrationSubmitPanel({ intent, draft, summary, submitLabel }: Props) {
  const navigate = useNavigate()
  const { clearCompleted } = useRegisterWizard()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrorRows, setFieldErrorRows] = useState<FieldErrorRow[]>([])

  const handleSubmit = async () => {
    setBusy(true)
    setError(null)
    setFieldErrorRows([])

    try {
      const result: RegistrationSuccessResponse =
        intent === 'offer' ? await registerProfessional(draft) : await registerSeeker(draft)

      clearCompleted(intent)

      const state: RegistrationCompletionState = {
        registrationId: result.id,
        intent,
        emailVerificationRequired: result.emailVerificationRequired,
        documentsUploadPending: result.documentsUploadPending,
      }

      const params = new URLSearchParams({
        intent,
        id: result.id,
      })
      if (result.emailVerificationRequired) {
        params.set('verify', '1')
      }
      if (result.documentsUploadPending) {
        params.set('docs', 'pending')
      }

      navigate(`/registrazione/fine?${params.toString()}`, { state, replace: true })
    } catch (err) {
      if (err instanceof RegistrationError && err.fieldErrors) {
        setFieldErrorRows(fieldRows(intent, err.fieldErrors))
      }
      setError(registrationErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {summary}
      {error ? (
        <div className="wz-callout wz-callout--error" style={{ marginTop: 'var(--space-4)' }} role="alert">
          {error}
        </div>
      ) : null}
      {fieldErrorRows.length > 0 ? (
        <ul className="wz-field-errors" style={{ marginTop: 'var(--space-4)' }}>
          {fieldErrorRows.map((row) => (
            <li key={row.field}>
              <strong>{row.label}:</strong> {row.messages.join(' ')}{' '}
              <Link to={row.fixHref} className="wz-field-errors__fix">
                Correggi
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="wz-footer">
        <button
          type="button"
          className="wz-btn-primary"
          onClick={() => void handleSubmit()}
          disabled={
            busy ||
            !draft.consentTermini ||
            !draft.consentPrivacy ||
            !draft.consentMaggiorenne ||
            !(draft.fullName?.trim().length ?? 0) ||
            !(draft.email?.trim().length ?? 0)
          }
        >
          {busy ? 'Invio in corso…' : submitLabel}
        </button>
      </div>
    </>
  )
}
