import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../../components/AuthShell'
import { IconChevronLeft } from '../../components/icons/DashboardIcons'
import { resetPassword, validateResetToken } from '../../lib/passwordResetApi'
import { PasswordResetError } from '../../lib/passwordResetTypes'
import './auth-pages.css'

function resetErrorMessage(err: unknown): string {
  if (err instanceof PasswordResetError) return err.message
  return 'Si è verificato un errore. Riprova.'
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')?.trim() ?? ''
  const emailParam = searchParams.get('email')?.trim() ?? ''

  const [validating, setValidating] = useState(() => Boolean(token))
  const [tokenError, setTokenError] = useState<string | null>(() =>
    token ? null : 'Link di reimpostazione non valido.'
  )
  const [emailHint, setEmailHint] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) return

    let cancelled = false
    void validateResetToken(token, emailParam || undefined)
      .then((payload) => {
        if (cancelled) return
        setEmailHint(payload.email)
        setTokenError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setTokenError(resetErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setValidating(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, emailParam])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token || busy) return
    setError(null)
    setBusy(true)
    try {
      await resetPassword(token, password, confirm, emailParam || undefined)
      setDone(true)
    } catch (err) {
      setError(resetErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell className="auth-page auth-page--login" hideBrandBar>
      <main className="auth-login-main">
        <div className="auth-card auth-card--login">
          <p className="auth-login-home">
            <Link to="/accedi">
              <IconChevronLeft size={16} aria-hidden />
              Torna al login
            </Link>
          </p>

          <h1 className="auth-title">Reimposta password</h1>

          {validating && <p className="auth-subtitle">Verifica del link in corso…</p>}

          {!validating && tokenError && (
            <>
              <p className="auth-error" role="alert">
                {tokenError}
              </p>
              <p style={{ marginTop: 'var(--space-4)' }}>
                <Link to="/password-dimenticata">Richiedi un nuovo link</Link>
              </p>
            </>
          )}

          {!validating && !tokenError && done && (
            <div role="status">
              <p className="auth-subtitle">Password aggiornata. Puoi accedere con la nuova password.</p>
              <button
                type="button"
                className="auth-btn-primary auth-btn-primary--block"
                style={{ marginTop: 'var(--space-5)' }}
                onClick={() => navigate('/accedi', { replace: true })}
              >
                Vai al login
              </button>
            </div>
          )}

          {!validating && !tokenError && !done && (
            <>
              <p className="auth-subtitle">
                Nuova password per <strong className="auth-email-emphasis">{emailHint}</strong>
              </p>
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
                <label className="auth-field">
                  <span className="auth-field__label">Nuova password</span>
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <label className="auth-field">
                  <span className="auth-field__label">Conferma password</span>
                  <input
                    type="password"
                    name="confirm"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
                <button type="submit" className="auth-btn-primary auth-btn-primary--block" disabled={busy}>
                  {busy ? 'Salvataggio…' : 'Salva nuova password'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </AuthShell>
  )
}
