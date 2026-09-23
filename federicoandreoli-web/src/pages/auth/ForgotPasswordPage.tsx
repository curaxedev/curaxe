import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from '../../components/AuthShell'
import { IconChevronLeft } from '../../components/icons/DashboardIcons'
import { requestPasswordReset, PASSWORD_RESET_DEV_TOKEN } from '../../lib/passwordResetApi'
import { PasswordResetError } from '../../lib/passwordResetTypes'
import './auth-pages.css'

function resetErrorMessage(err: unknown): string {
  if (err instanceof PasswordResetError) return err.message
  return 'Si è verificato un errore. Riprova.'
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setResetLink(null)
    setBusy(true)
    try {
      const { token } = await requestPasswordReset(email)
      if (token) {
        // Modalità mock: il token viene mostrato inline al posto dell'email.
        setResetLink(`/reimposta-password?token=${encodeURIComponent(token)}`)
      } else {
        setSent(true)
      }
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

          <h1 className="auth-title">Password dimenticata</h1>
          <p className="auth-subtitle">
            Inserisci l&apos;email dell&apos;account con password. Ti invieremo un link per reimpostarla.
          </p>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          {sent ? (
            <div role="status">
              <p className="auth-subtitle" style={{ marginBottom: 'var(--space-4)' }}>
                Se l&apos;email è registrata per un account con password, riceverai a breve un
                messaggio con il link per reimpostarla. Controlla anche la cartella spam.
              </p>
              <p style={{ fontSize: 'var(--text-small)' }}>
                <Link to="/accedi">Torna al login</Link>
              </p>
            </div>
          ) : resetLink ? (
            <div role="status">
              <p className="auth-subtitle" style={{ marginBottom: 'var(--space-4)' }}>
                Se l&apos;email è registrata per un account con password, riceverai le istruzioni (mock: link
                generato sotto).
              </p>
              <p style={{ fontSize: 'var(--text-small)', wordBreak: 'break-all' }}>
                <Link to={resetLink}>Reimposta password</Link>
              </p>
              {import.meta.env.DEV && (
                <p className="auth-dev-hint" style={{ fontSize: '0.8rem', marginTop: 'var(--space-4)' }}>
                  Demo rapida:{' '}
                  <Link to={`/reimposta-password?token=${PASSWORD_RESET_DEV_TOKEN}`}>
                    token <code>{PASSWORD_RESET_DEV_TOKEN}</code>
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
              <label className="auth-field">
                <span className="auth-field__label">Email</span>
                <input
                  type="email"
                  name="email"
                  placeholder="nome@struttura.it"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button type="submit" className="auth-btn-primary auth-btn-primary--block" disabled={busy}>
                {busy ? 'Invio…' : 'Invia link di reimpostazione'}
              </button>
            </form>
          )}
        </div>
      </main>
    </AuthShell>
  )
}
