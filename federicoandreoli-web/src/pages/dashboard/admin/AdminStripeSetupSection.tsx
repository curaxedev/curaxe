import { STRIPE_BILLING_EVENTS } from '../../../lib/adminBillingSettingsApi'
import { useStripeSetupWizard } from './useStripeSetupWizard'

const STRIPE_DASH_KEYS_TEST = 'https://dashboard.stripe.com/test/apikeys'
const STRIPE_DASH_KEYS_LIVE = 'https://dashboard.stripe.com/apikeys'
const STRIPE_DASH_WEBHOOKS_TEST = 'https://dashboard.stripe.com/test/workbench/webhooks'
const STRIPE_DASH_WEBHOOKS_LIVE = 'https://dashboard.stripe.com/workbench/webhooks'

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="dash-stripe-copy">
      <span className="dash-stripe-copy__label">{label}</span>
      <code className="dash-code-block">{value}</code>
      <button
        type="button"
        className="dash-btn dash-btn--ghost dash-btn--sm"
        onClick={() => void navigator.clipboard.writeText(value)}
      >
        Copia
      </button>
    </div>
  )
}

export function AdminStripeSetupSection() {
  const w = useStripeSetupWizard()

  if (w.loading) {
    return <div className="dash-empty-mini">Caricamento configurazione Stripe…</div>
  }

  const settings = w.settings
  const isLive = settings?.mode === 'live'
  const stepId = w.steps[w.step]?.id
  const keysUrl = isLive ? STRIPE_DASH_KEYS_LIVE : STRIPE_DASH_KEYS_TEST
  const webhooksUrl = isLive ? STRIPE_DASH_WEBHOOKS_LIVE : STRIPE_DASH_WEBHOOKS_TEST
  const pkPrefix = isLive ? 'pk_live_' : 'pk_test_'
  const skPrefix = isLive ? 'sk_live_' : 'sk_test_'

  async function nextFromMode() {
    const mode = settings?.mode === 'live' ? 'live' : 'test'
    await w.save({ mode })
    w.setStep(1)
  }

  async function saveKeys() {
    const ok = await w.save({
      publishableKey: w.publishableKey || undefined,
      secretKey: w.secretKey || undefined,
      webhookSecret: w.webhookSecret || undefined,
    })
    if (ok) {
      w.setSecretKey('')
      w.setWebhookSecret('')
      w.setStep(3)
    }
  }

  async function verify() {
    const result = await w.runDiagnostic()
    if (result?.ok) {
      await w.save({ markSetupComplete: true })
      w.setStep(4)
    }
  }

  return (
    <div className="dash-admin-stripe-wizard">
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Connessione Stripe</h2>
          <p className="dash-section__subtitle">
            Solo infrastruttura: modalità, webhook e chiavi. I piani (prezzi, feature, Price ID) si
            gestiscono esclusivamente nel <strong>Catalogo piani</strong> sopra.
          </p>
        </div>
      </div>

      <div className="dash-stripe-security-note" role="note">
        <strong>Sicurezza:</strong> Secret key e webhook secret non tornano mai al browser (solo hint).
        Sul server sono cifrati con <code>APP_KEY</code>. Non metterli in Git o localStorage.
      </div>

      <ol className="dash-wizard-steps" aria-label="Passi configurazione Stripe">
        {w.steps.map((s: { id: string; label: string }, i: number) => (
          <li
            key={s.id}
            className={
              i === w.step
                ? 'dash-wizard-steps__item is-active'
                : i < w.step
                  ? 'dash-wizard-steps__item is-done'
                  : 'dash-wizard-steps__item'
            }
          >
            <button type="button" onClick={() => w.setStep(i)} disabled={w.busy}>
              {i + 1}. {s.label}
            </button>
          </li>
        ))}
      </ol>

      {w.error && (
        <p className="auth-error" role="alert" style={{ marginBottom: 16 }}>
          {w.error}
        </p>
      )}

      {stepId === 'mode' && (
        <div className="dash-settings-card">
          <h3 className="dash-settings-card__title">1 · Modalità Stripe</h3>
          <p>
            Inizia in <strong>Test</strong>. Passa a <strong>Live</strong> solo dopo checkout +
            webhook verificati.
          </p>
          <div className="dash-inline-actions" style={{ gap: 12, marginTop: 16 }}>
            <button
              type="button"
              className={`dash-btn ${settings?.mode !== 'live' ? 'dash-btn--primary' : 'dash-btn--ghost'}`}
              disabled={w.busy}
              onClick={() => void w.save({ mode: 'test' })}
            >
              Test
            </button>
            <button
              type="button"
              className={`dash-btn ${settings?.mode === 'live' ? 'dash-btn--primary' : 'dash-btn--ghost'}`}
              disabled={w.busy}
              onClick={() => void w.save({ mode: 'live' })}
            >
              Live
            </button>
          </div>
          <button
            type="button"
            className="dash-btn dash-btn--primary"
            style={{ marginTop: 20 }}
            onClick={() => void nextFromMode()}
          >
            Continua → Webhook
          </button>
        </div>
      )}

      {stepId === 'webhook' && (
        <div className="dash-settings-card">
          <h3 className="dash-settings-card__title">2 · Webhook</h3>
          <ol className="dash-stripe-steps">
            <li>
              Apri{' '}
              <a href={webhooksUrl} target="_blank" rel="noopener noreferrer">
                Stripe → Webhooks
              </a>{' '}
              ({isLive ? 'Live' : 'Test'}).
            </li>
            <li>
              Destinazione Snapshot · API 2026-08-26 · endpoint:
              <CopyField label="URL" value={settings?.webhookUrl ?? ''} />
            </li>
            <li>Eventi: {STRIPE_BILLING_EVENTS.join(', ')}</li>
            <li>Copia il signing secret <code>whsec_…</code> (lo incolli al passo Chiavi).</li>
          </ol>
          <div style={{ marginTop: 20 }}>
            <button type="button" className="dash-btn dash-btn--ghost" onClick={() => w.setStep(0)}>
              Indietro
            </button>{' '}
            <button type="button" className="dash-btn dash-btn--primary" onClick={() => w.setStep(2)}>
              Continua → Chiavi
            </button>
          </div>
        </div>
      )}

      {stepId === 'keys' && (
        <div className="dash-settings-card">
          <h3 className="dash-settings-card__title">3 · Chiavi API</h3>
          <p>
            Da{' '}
            <a href={keysUrl} target="_blank" rel="noopener noreferrer">
              Stripe → API keys
            </a>
            : publishable ({pkPrefix}…) e secret ({skPrefix}…), più il <code>whsec_</code> del webhook.
          </p>
          <label className="auth-field" style={{ display: 'block', marginTop: 12 }}>
            <span className="auth-field__label">Publishable key</span>
            <input
              className="auth-input"
              value={w.publishableKey}
              onChange={(e) => w.setPublishableKey(e.target.value.trim())}
              placeholder={`${pkPrefix}…`}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="auth-field" style={{ display: 'block', marginTop: 12 }}>
            <span className="auth-field__label">Secret key</span>
            <input
              className="auth-input"
              type="password"
              value={w.secretKey}
              onChange={(e) => w.setSecretKey(e.target.value.trim())}
              placeholder={`${skPrefix}…`}
              autoComplete="new-password"
              spellCheck={false}
            />
            {settings?.secretKeyHint ? (
              <span className="dash-form-hint">Salvata: {settings.secretKeyHint}</span>
            ) : null}
          </label>
          <label className="auth-field" style={{ display: 'block', marginTop: 12 }}>
            <span className="auth-field__label">Webhook signing secret</span>
            <input
              className="auth-input"
              type="password"
              value={w.webhookSecret}
              onChange={(e) => w.setWebhookSecret(e.target.value.trim())}
              placeholder="whsec_…"
              autoComplete="new-password"
              spellCheck={false}
            />
            {settings?.webhookSecretHint ? (
              <span className="dash-form-hint">Salvato: {settings.webhookSecretHint}</span>
            ) : null}
          </label>
          <div style={{ marginTop: 20 }}>
            <button type="button" className="dash-btn dash-btn--ghost" onClick={() => w.setStep(1)}>
              Indietro
            </button>{' '}
            <button
              type="button"
              className="dash-btn dash-btn--primary"
              disabled={w.busy}
              onClick={() => void saveKeys()}
            >
              Salva e continua → Verifica
            </button>
          </div>
        </div>
      )}

      {stepId === 'verify' && (
        <div className="dash-settings-card">
          <h3 className="dash-settings-card__title">4 · Diagnostica</h3>
          <p>
            Verifica chiavi, webhook e che nel <strong>Catalogo piani</strong> ogni audience
            (Professionista, Agenzia, Struttura) abbia un Price ID <code>price_…</code>.
          </p>
          <button
            type="button"
            className="dash-btn dash-btn--primary"
            disabled={w.busy}
            onClick={() => void verify()}
          >
            {w.busy ? 'Verifica…' : 'Esegui diagnostica'}
          </button>
          {w.diagnostic && (
            <ul style={{ marginTop: 16 }}>
              {w.diagnostic.checks.map(
                (c: { id: string; label: string; pass: boolean; detail: string }) => (
                  <li key={c.id} style={{ color: c.pass ? 'var(--color-sage)' : '#D95F5F' }}>
                    {c.pass ? '✓' : '✗'} {c.label}: {c.detail}
                  </li>
                ),
              )}
            </ul>
          )}
          <div style={{ marginTop: 20 }}>
            <button type="button" className="dash-btn dash-btn--ghost" onClick={() => w.setStep(2)}>
              Indietro
            </button>
          </div>
        </div>
      )}

      {stepId === 'done' && (
        <div className="dash-settings-card">
          <h3 className="dash-settings-card__title">5 · Pronto</h3>
          <p>
            Stripe connesso
            {settings?.setupCompletedAt
              ? ` dal ${new Date(settings.setupCompletedAt).toLocaleString('it-IT')}`
              : ''}
            . Gestisci prezzi e piani solo dal Catalogo piani. Checkout test:{' '}
            <code>4242 4242 4242 4242</code>.
          </p>
          <button type="button" className="dash-btn dash-btn--ghost" onClick={() => w.setStep(0)}>
            Riapri procedura
          </button>
        </div>
      )}
    </div>
  )
}
