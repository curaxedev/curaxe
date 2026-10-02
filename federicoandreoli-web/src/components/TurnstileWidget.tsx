import { useEffect, useRef, useState } from 'react'
import { getSecurityMeta, loadTurnstileScript } from '../lib/securityMetaApi'

type Props = {
  onToken: (token: string | null) => void
}

/**
 * Widget Cloudflare Turnstile. Se disabilitato server-side, non renderizza nulla.
 * Se l’API security/meta non risponde, resta silenzioso (niente errore anti-bot spaventoso).
 */
export function TurnstileWidget({ onToken }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function mount() {
      try {
        const meta = await getSecurityMeta()
        if (cancelled || !meta.turnstile.enabled || !meta.turnstile.siteKey) {
          onToken(null)
          return
        }
        setVisible(true)
        await loadTurnstileScript()
        if (cancelled || !hostRef.current || !window.turnstile) return

        widgetIdRef.current = window.turnstile.render(hostRef.current, {
          sitekey: meta.turnstile.siteKey,
          theme: 'auto',
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => {
            setError('Verifica anti-bot non riuscita. Ricarica la pagina.')
            onToken(null)
          },
        })
      } catch {
        // API down o Turnstile non configurato: non bloccare login/registrazione in UI
        if (!cancelled) {
          onToken(null)
          setVisible(false)
          setError(null)
        }
      }
    }

    void mount()

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          /* ignore */
        }
      }
    }
  }, [onToken])

  if (!visible && !error) return null

  return (
    <div className="auth-turnstile" style={{ margin: '12px 0' }}>
      <div ref={hostRef} />
      {error && (
        <p role="alert" style={{ color: '#D95F5F', fontSize: 13 }}>
          {error}
        </p>
      )}
    </div>
  )
}
