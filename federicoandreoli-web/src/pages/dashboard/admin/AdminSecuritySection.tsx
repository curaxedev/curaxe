import { useCallback, useEffect, useState } from 'react'
import {
  getAdminSecuritySettings,
  putAdminSecuritySettings,
  revokeOtherAdminSessions,
  withAdminStepUp,
  type AdminSecuritySettings,
} from '../../../lib/adminSecurityApi'
import { AdminPasskeysPanel } from './AdminPasskeysPanel'
import { HttpError } from '../../../lib/http'

export function AdminSecuritySection() {
  const [settings, setSettings] = useState<AdminSecuritySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [emailDraft, setEmailDraft] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminSecuritySettings()
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare la sicurezza.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  async function savePatch(
    patch: Parameters<typeof putAdminSecuritySettings>[0],
    successMsg: string,
  ) {
    setBusy(true)
    setError(null)
    try {
      const next = await withAdminStepUp('security.settings', (token) =>
        putAdminSecuritySettings(patch, token),
      )
      setSettings(next)
      setToast(successMsg)
    } catch (err) {
      setError(err instanceof HttpError || err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    } finally {
      setBusy(false)
    }
  }

  function addEmail() {
    if (!settings) return
    const email = emailDraft.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setError('Inserisci un’email valida.')
      return
    }
    if (settings.loginAlertEmails.includes(email)) {
      setEmailDraft('')
      return
    }
    if (settings.loginAlertEmails.length >= 5) {
      setError('Massimo 5 email di notifica.')
      return
    }
    void savePatch(
      { loginAlertEmails: [...settings.loginAlertEmails, email] },
      'Email di notifica aggiunta.',
    )
    setEmailDraft('')
  }

  if (loading || !settings) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Sicurezza account</h2>
            <p className="dash-section__subtitle">Caricamento…</p>
          </div>
        </div>
        {error ? <p style={{ color: '#D95F5F' }}>{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="dash-admin-security">
      {toast ? (
        <div className="dash-admin-plans__toast" role="status">
          {toast}
        </div>
      ) : null}

      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Sicurezza account</h2>
          <p className="dash-section__subtitle">
            Passkey, Sicurezza totale (step-up sulle azioni sensibili) e alert di accesso.
          </p>
        </div>
      </div>

      {error ? (
        <div className="dash-profile-preview dash-profile-preview--alert" role="alert">
          {error}
        </div>
      ) : null}

      {settings.passkeyCount === 0 ? (
        <div className="dash-settings-card" style={{ marginBottom: 16 }}>
          <strong>Attiva almeno una passkey</strong>
          <p style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
            Consigliato dopo il login con password: accelera gli accessi e sblocca Sicurezza totale.
          </p>
        </div>
      ) : null}

      <div className="dash-settings-card">
        <div className="dash-settings-card__title">Sicurezza totale</div>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
          Quando è attiva, le azioni sensibili (utenti, piani, rimborsi, abbonamenti, chiavi Stripe, KYC,
          impostazioni) richiedono una conferma passkey. Serve almeno una passkey registrata.
        </p>
        <label className="dash-admin-plans__toggle">
          <input
            type="checkbox"
            checked={settings.securityTotalEnabled}
            disabled={busy || (!settings.securityTotalEnabled && !settings.canEnableSecurityTotal)}
            onChange={(e) => {
              void savePatch(
                { securityTotalEnabled: e.target.checked },
                e.target.checked ? 'Sicurezza totale attiva.' : 'Sicurezza totale disattivata.',
              )
            }}
          />
          <span>
            {settings.securityTotalEnabled
              ? 'Attiva — conferma passkey sulle azioni sensibili'
              : settings.canEnableSecurityTotal
                ? 'Disattivata — attiva per proteggere le operazioni critiche'
                : 'Disattivata — registra una passkey per poterla attivare'}
          </span>
        </label>
        {settings.securityTotalEnabled && settings.sensitiveActions ? (
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--color-text-muted)' }}>
            {Object.values(settings.sensitiveActions).map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="dash-settings-card" style={{ marginTop: 16 }}>
        <div className="dash-settings-card__title">Notifiche di accesso</div>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
          Ricevi un’email a ogni accesso admin, su nuovi dispositivi e su tentativi sospetti (falliti o
          bloccati).
        </p>
        <label className="dash-admin-plans__toggle" style={{ marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={settings.loginAlertsEnabled}
            disabled={busy}
            onChange={(e) => {
              void savePatch(
                { loginAlertsEnabled: e.target.checked },
                e.target.checked ? 'Notifiche accesso attive.' : 'Notifiche accesso disattivate.',
              )
            }}
          />
          <span>{settings.loginAlertsEnabled ? 'Notifiche attive' : 'Notifiche disattivate'}</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {settings.loginAlertEmails.map((email) => (
            <span
              key={email}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid var(--color-border)',
                fontSize: 13,
              }}
            >
              {email}
              <button
                type="button"
                className="dash-btn dash-btn--ghost"
                style={{ padding: '0 4px', fontSize: 12 }}
                disabled={busy}
                onClick={() => {
                  void savePatch(
                    {
                      loginAlertEmails: settings.loginAlertEmails.filter((e) => e !== email),
                    },
                    'Email rimossa.',
                  )
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="dash-form-input"
            type="email"
            placeholder="email@esempio.it"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            disabled={busy}
            style={{ flex: 1, minWidth: 180 }}
          />
          <button type="button" className="dash-btn dash-btn--ghost" disabled={busy} onClick={addEmail}>
            Aggiungi email
          </button>
        </div>
      </div>

      <div className="dash-settings-card" style={{ marginTop: 16 }}>
        <div className="dash-settings-card__title">Dispositivi recenti</div>
        {settings.devices.length === 0 ? (
          <p className="dash-empty-mini">Nessun accesso registrato ancora.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {settings.devices.map((d) => (
              <li
                key={d.id}
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: 14,
                }}
              >
                <strong>{d.label ?? 'Dispositivo'}</strong>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                  IP {d.lastIp ?? '—'} · ultimo accesso{' '}
                  {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString('it-IT') : '—'}
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="dash-btn dash-btn--ghost"
          style={{ marginTop: 12 }}
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true)
              setError(null)
              try {
                await withAdminStepUp('security.settings', (token) =>
                  revokeOtherAdminSessions(token),
                )
                setToast('Altre sessioni disconnesse.')
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Operazione non riuscita.')
              } finally {
                setBusy(false)
              }
            })()
          }}
        >
          Disconnetti altre sessioni
        </button>
      </div>

      <AdminPasskeysPanel onChanged={() => void reload()} />
    </div>
  )
}
