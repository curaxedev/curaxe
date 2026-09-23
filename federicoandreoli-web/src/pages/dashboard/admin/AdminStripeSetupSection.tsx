import { STRIPE_BILLING_EVENTS } from '../../../lib/adminBillingSettingsApi'
import { useStripeSetupWizard } from './useStripeSetupWizard'

export function AdminStripeSetupSection() {
  const w = useStripeSetupWizard()

  if (w.loading) {
    return <div className="dash-empty-mini">Caricamento configurazione Stripe…</div>
  }

  const settings = w.settings
  const stepId = w.steps[w.step]?.id

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

  async function savePrices() {
    const ok = await w.save({
      priceProfessional: w.priceProfessional || undefined,
      priceAgency: w.priceAgency || undefined,
      priceStructure: w.priceStructure || undefined,
      trialDaysProfessional: w.trialDaysProfessional,
      trialDaysAgency: w.trialDaysAgency,
      trialDaysStructure: w.trialDaysStructure,
    })
    if (ok) w.setStep(4)
  }

  async function verify() {
    const result = await w.runDiagnostic()
    if (result?.ok) {
      await w.save({ markSetupComplete: true })
      w.setStep(5)
    }
  }

  return (
    <div className="dash-admin-stripe-wizard">
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Pagamenti Stripe</h2>
          <p className="dash-section__subtitle">
            Procedura guidata landlord · webhook su api.curaxe.it · trial con carta
          </p>
        </div>
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
          <h3>Modalità Stripe</h3>
          <p>Usa test finché non sei pronto per i pagamenti reali.</p>
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
          <p style={{ marginTop: 12, color: 'var(--color-text-muted)' }}>
            Modalità attuale: <strong>{settings?.mode ?? 'test'}</strong>
          </p>
          <button type="button" className="dash-btn dash-btn--primary" style={{ marginTop: 20 }} onClick={() => void nextFromMode()}>
            Continua
          </button>
        </div>
      )}

      {stepId === 'webhook' && (
        <div className="dash-settings-card">
          <h3>Endpoint webhook</h3>
          <p>In Stripe Dashboard → Developers → Webhooks crea un endpoint con URL:</p>
          <code className="dash-code-block">{settings?.webhookUrl}</code>
          <p style={{ marginTop: 12 }}>Seleziona questi eventi:</p>
          <ul className="dash-event-list">
            {STRIPE_BILLING_EVENTS.map((ev) => (
              <li key={ev}>
                <code>{ev}</code>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="dash-btn dash-btn--ghost"
            onClick={() => {
              void navigator.clipboard.writeText(STRIPE_BILLING_EVENTS.join('\n'))
            }}
          >
            Copia elenco eventi
          </button>
          <div style={{ marginTop: 20 }}>
            <button type="button" className="dash-btn dash-btn--ghost" onClick={() => w.setStep(0)}>
              Indietro
            </button>{' '}
            <button type="button" className="dash-btn dash-btn--primary" onClick={() => w.setStep(2)}>
              Continua
            </button>
          </div>
        </div>
      )}

      {stepId === 'keys' && (
        <div className="dash-settings-card">
          <h3>Chiavi API</h3>
          <p>
            Prefisso atteso:{' '}
            <code>{settings?.mode === 'live' ? 'pk_live_ / sk_live_' : 'pk_test_ / sk_test_'}</code>
          </p>
          {settings?.secretKeyHint && (
            <p className="dash-muted">Secret salvata: {settings.secretKeyHint}</p>
          )}
          {settings?.webhookSecretHint && (
            <p className="dash-muted">Webhook secret: {settings.webhookSecretHint}</p>
          )}
          <label className="auth-field" style={{ display: 'block', marginTop: 12 }}>
            <span className="auth-field__label">Publishable key</span>
            <input
              className="auth-input"
              value={w.publishableKey}
              onChange={(e) => w.setPublishableKey(e.target.value)}
              placeholder="pk_…"
              autoComplete="off"
            />
          </label>
          <label className="auth-field" style={{ display: 'block', marginTop: 12 }}>
            <span className="auth-field__label">Secret key (lascia vuoto per non cambiare)</span>
            <input
              className="auth-input"
              type="password"
              value={w.secretKey}
              onChange={(e) => w.setSecretKey(e.target.value)}
              placeholder="sk_…"
              autoComplete="off"
            />
          </label>
          <label className="auth-field" style={{ display: 'block', marginTop: 12 }}>
            <span className="auth-field__label">Webhook signing secret</span>
            <input
              className="auth-input"
              type="password"
              value={w.webhookSecret}
              onChange={(e) => w.setWebhookSecret(e.target.value)}
              placeholder="whsec_…"
              autoComplete="off"
            />
          </label>
          <div style={{ marginTop: 20 }}>
            <button type="button" className="dash-btn dash-btn--ghost" onClick={() => w.setStep(1)}>
              Indietro
            </button>{' '}
            <button type="button" className="dash-btn dash-btn--primary" disabled={w.busy} onClick={() => void saveKeys()}>
              Salva e continua
            </button>
          </div>
        </div>
      )}

      {stepId === 'prices' && (
        <div className="dash-settings-card">
          <h3>Price ID e giorni di prova</h3>
          <p>Crea i prodotti in Stripe Billing e incolla i Price ID (`price_…`).</p>
          {(
            [
              ['Professional', w.priceProfessional, w.setPriceProfessional, w.trialDaysProfessional, w.setTrialDaysProfessional],
              ['Agency', w.priceAgency, w.setPriceAgency, w.trialDaysAgency, w.setTrialDaysAgency],
              ['Structure', w.priceStructure, w.setPriceStructure, w.trialDaysStructure, w.setTrialDaysStructure],
            ] as const
          ).map(([label, price, setPrice, days, setDays]) => (
            <div key={label} style={{ marginTop: 16 }}>
              <strong>{label}</strong>
              <label className="auth-field" style={{ display: 'block', marginTop: 8 }}>
                <span className="auth-field__label">Price ID</span>
                <input className="auth-input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="price_…" />
              </label>
              <label className="auth-field" style={{ display: 'block', marginTop: 8 }}>
                <span className="auth-field__label">Giorni prova (carta obbligatoria)</span>
                <input
                  className="auth-input"
                  type="number"
                  min={0}
                  max={90}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                />
              </label>
            </div>
          ))}
          <div style={{ marginTop: 20 }}>
            <button type="button" className="dash-btn dash-btn--ghost" onClick={() => w.setStep(2)}>
              Indietro
            </button>{' '}
            <button type="button" className="dash-btn dash-btn--primary" disabled={w.busy} onClick={() => void savePrices()}>
              Salva e continua
            </button>
          </div>
        </div>
      )}

      {stepId === 'verify' && (
        <div className="dash-settings-card">
          <h3>Diagnostica</h3>
          <p>Verifica connessione API, coerenza chiavi e webhook.</p>
          <button type="button" className="dash-btn dash-btn--primary" disabled={w.busy} onClick={() => void verify()}>
            {w.busy ? 'Verifica…' : 'Esegui diagnostica'}
          </button>
          {w.diagnostic && (
            <ul style={{ marginTop: 16 }}>
              {w.diagnostic.checks.map((c: { id: string; label: string; pass: boolean; detail: string }) => (
                <li key={c.id} style={{ color: c.pass ? 'var(--color-sage)' : '#D95F5F' }}>
                  {c.pass ? '✓' : '✗'} {c.label}: {c.detail}
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginTop: 20 }}>
            <button type="button" className="dash-btn dash-btn--ghost" onClick={() => w.setStep(3)}>
              Indietro
            </button>
          </div>
        </div>
      )}

      {stepId === 'done' && (
        <div className="dash-settings-card">
          <h3>Configurazione completa</h3>
          <p>
            Stripe è pronto. Checkout, Customer Portal, trial e webhook sono attivi
            {settings?.setupCompletedAt ? ` dal ${new Date(settings.setupCompletedAt).toLocaleString('it-IT')}` : ''}.
          </p>
          <button type="button" className="dash-btn dash-btn--ghost" onClick={() => w.setStep(0)}>
            Riapri procedura
          </button>
        </div>
      )}
    </div>
  )
}
