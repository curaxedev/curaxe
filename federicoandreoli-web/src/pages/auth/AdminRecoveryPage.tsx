import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAuthSessionSnapshot, setAuthSession } from '../../auth/authSessionStore'
import type { AuthUser } from '../../auth/types'
import {
  recoveryRegisterPasskey,
  recoveryReenablePassword,
} from '../../lib/adminSecurityApi'
import { AuthShell } from '../../components/AuthShell'
import { PASSKEY_LABEL_PRESETS, passkeysSupported } from '../../lib/adminPasskeyApi'
import './auth-pages.css'

export function AdminRecoveryPage() {
  const navigate = useNavigate()
  const session = getAuthSessionSnapshot()
  const [name, setName] = useState('Questo dispositivo')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  if (!session?.recoverySession) {
    return (
      <AuthShell className="auth-page auth-page--login" hideBrandBar>
        <main className="auth-login-main">
          <div className="auth-card auth-card--login">
            <h1 className="auth-title">Recupero non attivo</h1>
            <p className="auth-subtitle">Avvia il recupero dalla schermata di accesso admin.</p>
            <Link to="/accedi" className="auth-btn-primary auth-btn-primary--block">
              Vai ad Accedi
            </Link>
          </div>
        </main>
      </AuthShell>
    )
  }

  async function finishAndLogout(message: string) {
    setDone(message)
    setAuthSession(null)
    window.setTimeout(() => navigate('/accedi', { replace: true }), 1600)
  }

  async function handleAddPasskey() {
    setBusy(true)
    setError(null)
    try {
      if (!passkeysSupported()) throw new Error('Passkey non supportate su questo browser.')
      await recoveryRegisterPasskey(name.trim() || 'Passkey')
      await finishAndLogout('Passkey aggiunta. Accedi di nuovo con la passkey.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrazione non riuscita.')
    } finally {
      setBusy(false)
    }
  }

  async function handleReenablePassword() {
    if (!confirm('Riattivare l’accesso password per questo account admin?')) return
    setBusy(true)
    setError(null)
    try {
      await recoveryReenablePassword()
      await finishAndLogout('Password riattivata. Accedi con password o passkey.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell className="auth-page auth-page--login" hideBrandBar>
      <main className="auth-login-main">
        <div className="auth-card auth-card--login">
          <h1 className="auth-title">Recupero accesso admin</h1>
          <p className="auth-subtitle">
            Sessione limitata per {(session.user as AuthUser).email}: puoi solo aggiungere una
            passkey o riattivare la password.
          </p>
          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
          {done ? (
            <p className="auth-channel-hint" role="status">
              {done}
            </p>
          ) : null}

          <div className="auth-form" style={{ gap: 12 }}>
            <label className="auth-field">
              <span className="auth-field__label">Etichetta passkey</span>
              <input
                className="auth-input"
                list="recovery-passkey-labels"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy || !!done}
              />
              <datalist id="recovery-passkey-labels">
                {PASSKEY_LABEL_PRESETS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
            <button
              type="button"
              className="auth-btn-primary auth-btn-primary--block"
              disabled={busy || !!done}
              onClick={() => void handleAddPasskey()}
            >
              {busy ? 'Attendi…' : 'Aggiungi passkey su questo dispositivo'}
            </button>
            <button
              type="button"
              className="auth-btn-social auth-btn-social--block"
              style={{ width: '100%' }}
              disabled={busy || !!done}
              onClick={() => void handleReenablePassword()}
            >
              Riattiva accesso password
            </button>
            <button
              type="button"
              className="auth-change-email"
              disabled={busy}
              onClick={() => {
                setAuthSession(null)
                navigate('/accedi', { replace: true })
              }}
            >
              Annulla e torna al login
            </button>
          </div>
        </div>
      </main>
    </AuthShell>
  )
}
