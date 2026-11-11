import { useCallback, useEffect, useState } from 'react'
import {
  getAdminSecuritySettings,
  putAdminSecuritySettings,
  regenerateAdminRecoveryCodes,
  revokeOtherAdminSessions,
  withAdminStepUp,
  type AdminSecuritySettings,
} from '../../../lib/adminSecurityApi'
import { AdminPasskeysPanel } from './AdminPasskeysPanel'
import { HttpError } from '../../../lib/http'

function downloadCodes(codes: string[]) {
  const blob = new Blob(
    [
      'Curaxe admin — codici di ripristino\n',
      'Conservali offline. Ogni codice è monouso.\n\n',
      ...codes.map((c) => `${c}\n`),
    ],
    { type: 'text/plain;charset=utf-8' },
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'curaxe-admin-recovery-codes.txt'
  a.click()
  URL.revokeObjectURL(url)
}

export function AdminSecuritySection() {
  const [settings, setSettings] = useState<AdminSecuritySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [emailDraft, setEmailDraft] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSettings(await getAdminSecuritySettings())
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
      if (next.recoveryCodes && next.recoveryCodes.length > 0) {
        setRecoveryCodes(next.recoveryCodes)
      }
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
      <div className="dash-admin-security">
        <header className="dash-admin-security__hero">
          <h2 className="dash-section__title">Sicurezza account</h2>
          <p className="dash-section__subtitle">Caricamento…</p>
        </header>
        {error ? <p className="dash-admin-security__error">{error}</p> : null}
      </div>
    )
  }

  const pageOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const originOk =
    !settings.webauthn?.allowedOrigins?.length ||
    settings.webauthn.allowedOrigins.some(
      (o) => o.replace(/\/$/, '') === pageOrigin.replace(/\/$/, ''),
    )

  return (
    <div className="dash-admin-security">
      {toast ? (
        <div className="dash-admin-plans__toast" role="status">
          {toast}
        </div>
      ) : null}

      {recoveryCodes ? (
        <div className="dash-admin-security__modal" role="dialog" aria-modal="true">
          <div className="dash-admin-security__modal-card">
            <h3>Salva i codici di ripristino</h3>
            <p>
              Mostrati una sola volta. Servono se perdi tutte le passkey con accesso password
              disattivato. Ogni codice è monouso e salvato solo come hash sul server.
            </p>
            <ul className="dash-admin-security__codes">
              {recoveryCodes.map((c) => (
                <li key={c}>
                  <code>{c}</code>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="dash-btn dash-btn--ghost"
                onClick={() => downloadCodes(recoveryCodes)}
              >
                Scarica .txt
              </button>
              <button
                type="button"
                className="dash-btn dash-btn--ghost"
                onClick={() => void navigator.clipboard.writeText(recoveryCodes.join('\n'))}
              >
                Copia
              </button>
              <button
                type="button"
                className="dash-btn dash-btn--primary"
                onClick={() => setRecoveryCodes(null)}
              >
                Li ho salvati
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="dash-admin-security__hero">
        <div>
          <p className="dash-admin-security__eyebrow">Account amministratore</p>
          <h2 className="dash-section__title">Sicurezza</h2>
          <p className="dash-section__subtitle">
            Passkey per accedere e confermare le azioni critiche. Un solo posto per totale, alert,
            accesso password e ripristino.
          </p>
        </div>
        <ol className="dash-admin-security__steps" aria-label="Ordine consigliato">
          <li className={settings.passkeyCount > 0 ? 'is-done' : 'is-current'}>
            <span>1</span> Registra una passkey
          </li>
          <li
            className={
              settings.securityTotalEnabled
                ? 'is-done'
                : settings.passkeyCount > 0
                  ? 'is-current'
                  : ''
            }
          >
            <span>2</span> Attiva Sicurezza totale
          </li>
          <li className={settings.loginAlertsEnabled ? 'is-done' : ''}>
            <span>3</span> Alert di accesso
          </li>
          <li className={!settings.passwordLoginEnabled ? 'is-done' : ''}>
            <span>4</span> Solo passkey (opzionale)
          </li>
        </ol>
      </header>

      {error ? (
        <div className="dash-admin-security__error" role="alert">
          {error}
        </div>
      ) : null}

      {!originOk ? (
        <div className="dash-admin-security__warn" role="status">
          <strong>Origine non allineata.</strong> Sei su <code>{pageOrigin}</code>, ma il server
          accetta: {(settings.webauthn?.allowedOrigins ?? []).join(', ') || '—'}. Apri{' '}
          <code>https://curaxe.it</code> e sul server imposta{' '}
          <code>WEBAUTHN_ORIGINS</code> / <code>FRONTEND_URLS</code>, poi{' '}
          <code>php artisan config:cache</code>.
        </div>
      ) : null}

      {settings.passkeyCount === 0 ? (
        <div className="dash-admin-security__banner">
          <strong>Prima passo: una passkey</strong>
          <p>
            Senza passkey non puoi attivare Sicurezza totale né disattivare l’accesso password. Usa
            Face ID, Touch ID, iCloud, Google Password Manager o una chiavetta USB.
          </p>
        </div>
      ) : null}

      <section className="dash-admin-security__card">
        <div className="dash-admin-security__card-head">
          <h3>Sicurezza totale</h3>
          <span className={`dash-admin-security__badge ${settings.securityTotalEnabled ? 'is-on' : ''}`}>
            {settings.securityTotalEnabled ? 'Attiva' : 'Spenta'}
          </span>
        </div>
        <p className="dash-admin-security__lead">
          Con la conferma passkey su utenti, piani, rimborsi, abbonamenti, chiavi Stripe, KYC e
          impostazioni.
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
              ? 'Step-up richiesto sulle azioni sensibili'
              : settings.canEnableSecurityTotal
                ? 'Attiva per proteggere le operazioni critiche'
                : 'Registra almeno una passkey per abilitare'}
          </span>
        </label>
        {settings.securityTotalEnabled && settings.sensitiveActions ? (
          <ul className="dash-admin-security__actions">
            {Object.values(settings.sensitiveActions).map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="dash-admin-security__card">
        <div className="dash-admin-security__card-head">
          <h3>Accesso password</h3>
          <span className={`dash-admin-security__badge ${settings.passwordLoginEnabled ? 'is-on' : ''}`}>
            {settings.passwordLoginEnabled ? 'Attivo' : 'Solo passkey'}
          </span>
        </div>
        <p className="dash-admin-security__lead">
          Default attivo. Con passkey registrate il login propone prima la passkey; la password resta
          come alternativa. Se spegni l’accesso password, dopo l’email admin si entra solo con
          passkey (o recupero).
        </p>
        <label className="dash-admin-plans__toggle">
          <input
            type="checkbox"
            checked={settings.passwordLoginEnabled}
            disabled={
              busy ||
              (!settings.passwordLoginEnabled
                ? false
                : !settings.canDisablePasswordLogin)
            }
            onChange={(e) => {
              const enable = e.target.checked
              if (!enable) {
                if (
                  !confirm(
                    'Disattivare l’accesso password? Genereremo codici di ripristino da salvare subito. Il login userà solo passkey.',
                  )
                ) {
                  return
                }
              }
              void savePatch(
                { passwordLoginEnabled: enable },
                enable
                  ? 'Accesso password riattivato.'
                  : 'Accesso password disattivato. Salva i codici di ripristino.',
              )
            }}
          />
          <span>
            {settings.passwordLoginEnabled
              ? settings.canDisablePasswordLogin
                ? 'Accesso password consentito (fallback dopo passkey)'
                : 'Serve almeno una passkey e un’email di notifica per spegnerlo'
              : 'Solo passkey — password rifiutata al login'}
          </span>
        </label>
        <p className="dash-admin-security__lead" style={{ marginTop: 12 }}>
          Codici di ripristino rimanenti: <strong>{settings.recoveryCodesRemaining}</strong>
          {settings.recoveryCodesGeneratedAt
            ? ` · generati ${new Date(settings.recoveryCodesGeneratedAt).toLocaleString('it-IT')}`
            : ''}
        </p>
        <button
          type="button"
          className="dash-btn dash-btn--ghost"
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true)
              setError(null)
              try {
                const res = await withAdminStepUp('security.settings', (token) =>
                  regenerateAdminRecoveryCodes(token),
                )
                setRecoveryCodes(res.recoveryCodes)
                await reload()
                setToast('Nuovi codici di ripristino generati.')
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Rigenerazione non riuscita.')
              } finally {
                setBusy(false)
              }
            })()
          }}
        >
          Rigenera codici di ripristino
        </button>
      </section>

      <section className="dash-admin-security__card">
        <div className="dash-admin-security__card-head">
          <h3>Notifiche di accesso</h3>
        </div>
        <p className="dash-admin-security__lead">
          Email a ogni login admin, nuovo dispositivo, tentativi falliti e codici per nuova passkey /
          ripristino.
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
        <div className="dash-admin-security__chips">
          {settings.loginAlertEmails.map((email) => (
            <span key={email} className="dash-admin-security__chip">
              {email}
              <button
                type="button"
                disabled={busy}
                aria-label={`Rimuovi ${email}`}
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
        <div className="dash-admin-security__email-row">
          <input
            className="dash-form-input"
            type="email"
            placeholder="email@esempio.it"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            disabled={busy}
          />
          <button type="button" className="dash-btn dash-btn--ghost" disabled={busy} onClick={addEmail}>
            Aggiungi
          </button>
        </div>
      </section>

      <section className="dash-admin-security__card">
        <div className="dash-admin-security__card-head">
          <h3>Dispositivi recenti</h3>
        </div>
        {settings.devices.length === 0 ? (
          <p className="dash-empty-mini">Nessun accesso registrato ancora.</p>
        ) : (
          <ul className="dash-admin-security__devices">
            {settings.devices.map((d) => (
              <li key={d.id}>
                <strong>{d.label ?? 'Dispositivo'}</strong>
                <span>
                  IP {d.lastIp ?? '—'} ·{' '}
                  {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString('it-IT') : '—'}
                </span>
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
      </section>

      <AdminPasskeysPanel onChanged={() => void reload()} />

      {settings.webauthn ? (
        <details className="dash-admin-security__tech">
          <summary>Diagnostica WebAuthn (server)</summary>
          <p>
            RP ID: <code>{settings.webauthn.rpId || '—'}</code>
          </p>
          <p>
            Origini: <code>{settings.webauthn.allowedOrigins.join(', ') || '—'}</code>
          </p>
          <p>{settings.webauthn.hint}</p>
        </details>
      ) : null}
    </div>
  )
}
