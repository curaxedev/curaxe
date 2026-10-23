import { useCallback, useEffect, useState } from 'react'
import {
  deleteAdminPasskey,
  listAdminPasskeys,
  PASSKEY_LABEL_PRESETS,
  passkeysSupported,
  registerAdminPasskey,
  renameAdminPasskey,
  type AdminPasskey,
} from '../../../lib/adminPasskeyApi'
import { withAdminStepUp } from '../../../lib/adminSecurityApi'
import { AuthError } from '../../../auth/types'
import { HttpError } from '../../../lib/http'

function transportsLabel(transports?: string[]): string {
  if (!transports || transports.length === 0) return ''
  const map: Record<string, string> = {
    internal: 'dispositivo',
    usb: 'USB',
    nfc: 'NFC',
    ble: 'Bluetooth',
    hybrid: 'telefono / hybrid',
  }
  return transports.map((t) => map[t] ?? t).join(', ')
}

export function AdminPasskeysPanel({ onChanged }: { onChanged?: () => void }) {
  const [passkeys, setPasskeys] = useState<AdminPasskey[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('Questo dispositivo')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
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
      await withAdminStepUp('passkey.manage', (token) =>
        registerAdminPasskey(name.trim() || 'Passkey', token),
      )
      setName('Questo dispositivo')
      await reload()
      onChanged?.()
    } catch (err) {
      setError(
        err instanceof AuthError || err instanceof Error
          ? err.message
          : 'Registrazione non riuscita.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    setBusy(true)
    setError(null)
    try {
      await withAdminStepUp('passkey.manage', (token) =>
        renameAdminPasskey(id, editName.trim(), token),
      )
      setEditingId(null)
      await reload()
      onChanged?.()
    } catch (err) {
      setError(err instanceof HttpError || err instanceof Error ? err.message : 'Rinomina non riuscita.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Rimuovere questa passkey? Potrebbe essere richiesta una conferma passkey.')) return
    setBusy(true)
    setError(null)
    try {
      await withAdminStepUp('passkey.manage', (token) => deleteAdminPasskey(id, token))
      await reload()
      onChanged?.()
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
        Aggiungi una o più passkey (Face ID, Touch ID, iCloud, Google Password Manager, chiavetta USB).
        L’etichetta ti aiuta a ricordare dove l’hai salvata.
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
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid var(--color-border, #e5e5e5)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 160 }}>
                {editingId === p.id ? (
                  <input
                    className="auth-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={busy}
                  />
                ) : (
                  <>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      Creata {new Date(p.createdAt).toLocaleString('it-IT')}
                      {p.lastUsedAt
                        ? ` · Ultimo uso ${new Date(p.lastUsedAt).toLocaleString('it-IT')}`
                        : ''}
                      {transportsLabel(p.transports)
                        ? ` · ${transportsLabel(p.transports)}`
                        : ''}
                    </div>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {editingId === p.id ? (
                  <>
                    <button
                      type="button"
                      className="dash-btn dash-btn--primary"
                      disabled={busy}
                      onClick={() => void handleRename(p.id)}
                    >
                      Salva
                    </button>
                    <button
                      type="button"
                      className="dash-btn dash-btn--ghost"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                    >
                      Annulla
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="dash-btn dash-btn--ghost"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(p.id)
                        setEditName(p.name)
                      }}
                    >
                      Rinomina
                    </button>
                    <button
                      type="button"
                      className="dash-btn dash-btn--ghost"
                      disabled={busy}
                      onClick={() => void handleDelete(p.id)}
                    >
                      Rimuovi
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="auth-field" style={{ flex: 1, minWidth: 180 }}>
          <span className="auth-field__label">Etichetta</span>
          <input
            className="auth-input"
            list="passkey-label-presets"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!supported || busy}
            placeholder="Es. Mac / iCloud"
          />
          <datalist id="passkey-label-presets">
            {PASSKEY_LABEL_PRESETS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
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
