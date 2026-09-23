import { useCallback, useEffect, useState } from 'react'
import {
  deleteAdminPasskey,
  listAdminPasskeys,
  passkeysSupported,
  registerAdminPasskey,
  type AdminPasskey,
} from '../../../lib/adminPasskeyApi'
import { AuthError } from '../../../auth/types'

export function AdminPasskeysPanel() {
  const [passkeys, setPasskeys] = useState<AdminPasskey[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('Questo dispositivo')
  const supported = passkeysSupported()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPasskeys(await listAdminPasskeys())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare le passkey.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleRegister() {
    setBusy(true)
    setError(null)
    try {
      await registerAdminPasskey(name.trim() || 'Passkey')
      setName('Questo dispositivo')
      await reload()
    } catch (err) {
      setError(err instanceof AuthError || err instanceof Error ? err.message : 'Registrazione non riuscita.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Rimuovere questa passkey?')) return
    setBusy(true)
    try {
      await deleteAdminPasskey(id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dash-settings-card" style={{ marginTop: 24 }}>
      <h3 className="dash-settings-card__title">Accesso sicuro (Passkey)</h3>
      <p className="dash-section__subtitle">
        Aggiungi una o più passkey (Face ID, Touch ID, chiave di sicurezza) per accedere senza password.
      </p>
      {!supported && (
        <p role="alert" style={{ color: '#D95F5F' }}>
          Il browser corrente non supporta WebAuthn.
        </p>
      )}
      {error && (
        <p role="alert" style={{ color: '#D95F5F' }}>
          {error}
        </p>
      )}
      {loading ? (
        <p>Caricamento…</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0' }}>
          {passkeys.length === 0 && <li>Nessuna passkey registrata.</li>}
          {passkeys.map((p) => (
            <li
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--color-border, #e5e5e5)',
              }}
            >
              <div>
                <strong>{p.name}</strong>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Creata {new Date(p.createdAt).toLocaleString('it-IT')}
                  {p.lastUsedAt ? ` · Ultimo uso ${new Date(p.lastUsedAt).toLocaleString('it-IT')}` : ''}
                </div>
              </div>
              <button type="button" className="dash-btn dash-btn--ghost" disabled={busy} onClick={() => void handleDelete(p.id)}>
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="auth-field" style={{ flex: 1, minWidth: 180 }}>
          <span className="auth-field__label">Nome dispositivo</span>
          <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} disabled={!supported || busy} />
        </label>
        <button
          type="button"
          className="dash-btn dash-btn--primary"
          disabled={!supported || busy}
          onClick={() => void handleRegister()}
        >
          {busy ? 'Attendi…' : 'Aggiungi passkey'}
        </button>
      </div>
    </div>
  )
}
