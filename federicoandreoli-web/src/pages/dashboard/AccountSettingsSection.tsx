import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { NotificationPreferences } from '../../lib/accountSettingsTypes'
import { useAccountSettings } from '../../hooks/useAccountSettings'
import { useAuth } from '../../auth/useAuth'
import { useCookieConsent } from '../../context/CookieConsentContext'
import type { ConsentRecord } from '../../lib/gdprTypes'
import {
  downloadMyData,
  eraseMyAccount,
  fetchConsentRecord,
  patchOptionalConsents,
} from '../../lib/gdprApi'
import { GdprError } from '../../lib/gdprTypes'

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <div className="dash-toggle-row">
      <span className="dash-toggle-label">{label}</span>
      <label className="dash-toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="dash-toggle__slider" />
      </label>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Caricamento impostazioni">
      <div className="dash-skeleton dash-skeleton--title" style={{ width: 200, height: 28, marginBottom: 8 }} />
      <div className="dash-skeleton" style={{ width: 280, height: 16, marginBottom: 24 }} />
      <div className="dash-settings-grid">
        {[0, 1, 2].map((key) => (
          <div key={key} className="dash-settings-card">
            <div className="dash-skeleton" style={{ width: 140, height: 20, marginBottom: 16 }} />
            <div className="dash-skeleton" style={{ width: '100%', height: 40, marginBottom: 12 }} />
            <div className="dash-skeleton" style={{ width: 120, height: 36 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

type AccountSettingsSectionProps = {
  title?: string
  subtitle?: string
}

export function AccountSettingsSection({
  title = 'Impostazioni account',
  subtitle = 'Email, password, preferenze e diritti GDPR',
}: AccountSettingsSectionProps) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const cookieConsent = useCookieConsent()
  const {
    settings,
    loading,
    error,
    saving,
    successMessage,
    fieldErrors,
    reload,
    clearFeedback,
    saveEmail,
    savePassword,
    savePreferences,
  } = useAccountSettings()

  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [consents, setConsents] = useState<ConsentRecord | null>(null)
  const [gdprBusy, setGdprBusy] = useState(false)
  const [gdprMessage, setGdprMessage] = useState<string | null>(null)
  const [gdprError, setGdprError] = useState<string | null>(null)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [deleteStep, setDeleteStep] = useState(0)

  useEffect(() => {
    if (!settings) return
    setEmail(settings.email)
    setPrefs(settings.notificationPreferences)
  }, [settings])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    void fetchConsentRecord(user.id).then((record) => {
      if (!cancelled) setConsents(record)
    })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (loading) return <SettingsSkeleton />

  if (error && !settings) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h1 className="dash-section-title">{title}</h1>
            <p className="dash-section-sub">{subtitle}</p>
          </div>
        </div>
        <div className="dash-card" role="alert" style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-accent)' }}>
          {error}
        </div>
        <button type="button" className="dash-btn dash-btn--ghost" onClick={() => void reload()}>
          Riprova
        </button>
      </div>
    )
  }

  if (!settings || !prefs) return null

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    await saveEmail(email)
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = await savePassword(currentPassword, newPassword, confirmPassword)
    if (ok) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  async function handlePrefsSubmit(e: FormEvent) {
    e.preventDefault()
    await savePreferences(prefs!)
  }

  async function handleExportData() {
    if (!user) return
    setGdprBusy(true)
    setGdprError(null)
    setGdprMessage(null)
    try {
      await downloadMyData(user)
      setGdprMessage('Download avviato: file JSON con i tuoi dati (art. 20 GDPR).')
    } catch (err) {
      setGdprError(err instanceof GdprError ? err.message : 'Esportazione non riuscita.')
    } finally {
      setGdprBusy(false)
    }
  }

  async function handleOptionalConsent(key: 'comunicazioni' | 'profilazione', value: boolean) {
    if (!user?.id) return
    setGdprBusy(true)
    setGdprError(null)
    try {
      const next = await patchOptionalConsents(user.id, { [key]: value })
      setConsents(next)
      setGdprMessage('Preferenze consenso aggiornate.')
    } catch (err) {
      setGdprError(err instanceof GdprError ? err.message : 'Aggiornamento consensi non riuscito.')
    } finally {
      setGdprBusy(false)
    }
  }

  async function handleDeleteAccount() {
    if (!user) return
    if (deleteStep < 1) {
      setDeleteStep(1)
      return
    }
    setGdprBusy(true)
    setGdprError(null)
    try {
      await eraseMyAccount(user, deleteConfirmEmail)
      await signOut()
      navigate('/accedi', { replace: true })
    } catch (err) {
      setGdprError(err instanceof GdprError ? err.message : 'Eliminazione non riuscita.')
      setGdprBusy(false)
    }
  }

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h1 className="dash-section-title">{title}</h1>
          <p className="dash-section-sub">{subtitle}</p>
        </div>
      </div>

      {error && (
        <div className="dash-card" role="alert" style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-accent)' }}>
          {error}
        </div>
      )}
      {successMessage && (
        <div
          className="dash-card"
          role="status"
          style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-sage)' }}
        >
          {successMessage}
        </div>
      )}
      {gdprMessage && (
        <div
          className="dash-card"
          role="status"
          style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-sage)' }}
        >
          {gdprMessage}
        </div>
      )}
      {gdprError && (
        <div
          className="dash-card"
          role="alert"
          style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-accent)' }}
        >
          {gdprError}
        </div>
      )}

      <div className="dash-settings-grid">
        <form className="dash-settings-card" onSubmit={(e) => void handleEmailSubmit(e)}>
          <div className="dash-settings-card__title">Email account</div>
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="account-email">
              Indirizzo email
            </label>
            <input
              id="account-email"
              className="dash-form-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                clearFeedback()
                setEmail(e.target.value)
              }}
              required
            />
            {fieldErrors?.email && (
              <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', marginTop: 4, display: 'block' }}>
                {fieldErrors.email}
              </span>
            )}
          </div>
          <button type="submit" className="dash-btn dash-btn--primary" disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva email'}
          </button>
        </form>

        <form className="dash-settings-card" onSubmit={(e) => void handlePasswordSubmit(e)}>
          <div className="dash-settings-card__title">Password</div>
          {settings.usesOtpLogin ? (
            <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Il tuo account usa il codice monouso via email. Per modificare l&apos;accesso contatta il supporto.
            </p>
          ) : (
            <>
              <div className="dash-form-field">
                <label className="dash-form-label" htmlFor="account-current-pwd">
                  Password attuale
                </label>
                <input
                  id="account-current-pwd"
                  className="dash-form-input"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => {
                    clearFeedback()
                    setCurrentPassword(e.target.value)
                  }}
                  required
                />
                {fieldErrors?.currentPassword && (
                  <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', marginTop: 4, display: 'block' }}>
                    {fieldErrors.currentPassword}
                  </span>
                )}
              </div>
              <div className="dash-form-field">
                <label className="dash-form-label" htmlFor="account-new-pwd">
                  Nuova password
                </label>
                <input
                  id="account-new-pwd"
                  className="dash-form-input"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    clearFeedback()
                    setNewPassword(e.target.value)
                  }}
                  required
                  minLength={8}
                />
                {fieldErrors?.newPassword && (
                  <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', marginTop: 4, display: 'block' }}>
                    {fieldErrors.newPassword}
                  </span>
                )}
              </div>
              <div className="dash-form-field">
                <label className="dash-form-label" htmlFor="account-confirm-pwd">
                  Conferma nuova password
                </label>
                <input
                  id="account-confirm-pwd"
                  className="dash-form-input"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    clearFeedback()
                    setConfirmPassword(e.target.value)
                  }}
                  required
                  minLength={8}
                />
                {fieldErrors?.confirmPassword && (
                  <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', marginTop: 4, display: 'block' }}>
                    {fieldErrors.confirmPassword}
                  </span>
                )}
              </div>
              <button type="submit" className="dash-btn dash-btn--primary" disabled={saving}>
                {saving ? 'Salvataggio…' : 'Aggiorna password'}
              </button>
            </>
          )}
        </form>

        <form className="dash-settings-card" onSubmit={(e) => void handlePrefsSubmit(e)}>
          <div className="dash-settings-card__title">Notifiche</div>
          <Toggle
            label="Email: nuove candidature e richieste"
            checked={prefs.emailApplications}
            onChange={(v) => {
              clearFeedback()
              setPrefs((p) => (p ? { ...p, emailApplications: v } : p))
            }}
          />
          <Toggle
            label="Email: messaggi e aggiornamenti"
            checked={prefs.emailMessages}
            onChange={(v) => {
              clearFeedback()
              setPrefs((p) => (p ? { ...p, emailMessages: v } : p))
            }}
          />
          <Toggle
            label="Email: novità e promozioni"
            checked={prefs.emailMarketing}
            onChange={(v) => {
              clearFeedback()
              setPrefs((p) => (p ? { ...p, emailMarketing: v } : p))
            }}
          />
          <Toggle
            label="Avvisi in app (push)"
            checked={prefs.pushAlerts}
            onChange={(v) => {
              clearFeedback()
              setPrefs((p) => (p ? { ...p, pushAlerts: v } : p))
            }}
          />
          <button
            type="submit"
            className="dash-btn dash-btn--primary"
            style={{ marginTop: 'var(--space-4)' }}
            disabled={saving}
          >
            {saving ? 'Salvataggio…' : 'Salva preferenze'}
          </button>
        </form>

        <div className="dash-settings-card">
          <div className="dash-settings-card__title">Privacy e consensi (GDPR)</div>
          {consents ? (
            <>
              <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Registro consensi · versione {consents.version} ·{' '}
                {new Date(consents.recordedAt).toLocaleString('it-IT')}
              </p>
              <ul style={{ fontSize: 'var(--text-small)', margin: '0 0 16px', paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Termini: {consents.termini ? 'accettati' : 'non accettati'}</li>
                <li>Privacy: {consents.privacy ? 'accettata' : 'non accettata'}</li>
                <li>Maggiorenne: {consents.maggiorenne ? 'confermato' : 'non confermato'}</li>
              </ul>
              <Toggle
                label="Comunicazioni commerciali (revocabile)"
                checked={consents.comunicazioni}
                onChange={(v) => void handleOptionalConsent('comunicazioni', v)}
              />
              <Toggle
                label="Profilazione per abbinamenti (revocabile)"
                checked={consents.profilazione}
                onChange={(v) => void handleOptionalConsent('profilazione', v)}
              />
            </>
          ) : (
            <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)' }}>
              Nessun registro consensi trovato. Verrà creato al prossimo aggiornamento preferenze.
            </p>
          )}
          <button
            type="button"
            className="dash-btn dash-btn--ghost"
            style={{ marginTop: 'var(--space-4)' }}
            onClick={() => cookieConsent.openPanel()}
          >
            Gestisci cookie
          </button>
        </div>

        <div className="dash-settings-card">
          <div className="dash-settings-card__title">I tuoi diritti</div>
          <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            Puoi esercitare portabilità (art. 20) e cancellazione (art. 17) direttamente da qui.
            Maggiori dettagli nella{' '}
            <a href="/privacy#diritti">Informativa Privacy</a>.
          </p>
          <button
            type="button"
            className="dash-btn dash-btn--primary"
            style={{ marginTop: 'var(--space-3)' }}
            disabled={gdprBusy}
            onClick={() => void handleExportData()}
          >
            {gdprBusy ? 'Preparazione…' : 'Esporta i miei dati (JSON)'}
          </button>

          <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <div className="dash-settings-card__title" style={{ color: 'var(--color-accent)' }}>
              Elimina account
            </div>
            <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Cancella definitivamente i dati mock locali associati a questo account. L&apos;azione non è
              reversibile in demo.
            </p>
            {deleteStep >= 1 ? (
              <>
                <div className="dash-form-field" style={{ marginTop: 12 }}>
                  <label className="dash-form-label" htmlFor="delete-confirm-email">
                    Digita la tua email per confermare
                  </label>
                  <input
                    id="delete-confirm-email"
                    className="dash-form-input"
                    type="email"
                    value={deleteConfirmEmail}
                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                    placeholder={user?.email}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  <button
                    type="button"
                    className="dash-btn dash-btn--danger"
                    disabled={gdprBusy || !deleteConfirmEmail}
                    onClick={() => void handleDeleteAccount()}
                  >
                    {gdprBusy ? 'Eliminazione…' : 'Conferma eliminazione'}
                  </button>
                  <button
                    type="button"
                    className="dash-btn dash-btn--ghost"
                    onClick={() => {
                      setDeleteStep(0)
                      setDeleteConfirmEmail('')
                    }}
                  >
                    Annulla
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="dash-btn dash-btn--danger"
                style={{ marginTop: 12 }}
                onClick={() => setDeleteStep(1)}
              >
                Elimina il mio account
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
