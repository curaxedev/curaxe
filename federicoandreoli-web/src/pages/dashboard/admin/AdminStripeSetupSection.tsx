import { STRIPE_BILLING_EVENTS } from '../../../lib/adminBillingSettingsApi'
import { useStripeSetupWizard } from './useStripeSetupWizard'

const STRIPE_DASH_KEYS_TEST =
  'https://dashboard.stripe.com/test/apikeys'
const STRIPE_DASH_KEYS_LIVE = 'https://dashboard.stripe.com/apikeys'
const STRIPE_DASH_WEBHOOKS_TEST =
  'https://dashboard.stripe.com/test/workbench/webhooks'
const STRIPE_DASH_WEBHOOKS_LIVE =
  'https://dashboard.stripe.com/workbench/webhooks'
const STRIPE_DASH_PRODUCTS_TEST =
  'https://dashboard.stripe.com/test/products'
const STRIPE_DASH_PRODUCTS_LIVE = 'https://dashboard.stripe.com/products'

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
  const productsUrl = isLive ? STRIPE_DASH_PRODUCTS_LIVE : STRIPE_DASH_PRODUCTS_TEST
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
            Setup guidato · chiavi cifrate sul server · webhook firmato · niente secret in frontend
          </p>
        </div>
      </div>

      <div className="dash-stripe-security-note" role="note">
        <strong>Sicurezza:</strong> la Secret key e il webhook secret non vengono mai rispediti al
        browser (solo un hint mascherato). Sul server sono salvati cifrati con{' '}
        <code>APP_KEY</code> Laravel. Non metterli in Git, localStorage o screenshot.
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
            Inizia sempre in <strong>Test</strong> (sandbox). Passa a <strong>Live</strong> solo
            quando hai verificato checkout + webhook con carte di prova.
          </p>
          <ul className="dash-stripe-checklist">
            <li>
              Test → chiavi <code>pk_test_</code> / <code>sk_test_</code>, Dashboard in Sandbox
            </li>
            <li>
              Live → chiavi <code>pk_live_</code> / <code>sk_live_</code>, soldi veri
            </li>
          </ul>
          <div className="dash-inline-actions" style={{ gap: 12, marginTop: 16 }}>
            <button
              type="button"
              className={`dash-btn ${settings?.mode !== 'live' ? 'dash-btn--primary' : 'dash-btn--ghost'}`}
              disabled={w.busy}
              onClick={() => void w.save({ mode: 'test' })}
            >
              Test (consigliato)
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
          <h3 className="dash-settings-card__title">2 · Crea il webhook in Stripe</h3>
          <ol className="dash-stripe-steps">
            <li>
              Apri{' '}
              <a href={webhooksUrl} target="_blank" rel="noopener noreferrer">
                Stripe → Workbench → Webhooks
              </a>{' '}
              ({isLive ? 'Live' : 'Sandbox / Test'}).
            </li>
            <li>
              Crea destinazione → account tuo → payload <strong>Snapshot (Istantanea)</strong> →
              versione API <strong>2026-08-26</strong> (o 26 ago).
            </li>
            <li>Seleziona gli eventi elencati sotto (o “seleziona eventi” e cerca i nomi).</li>
            <li>
              Tipo destinazione: <strong>Webhook endpoint</strong>.
            </li>
            <li>
              Incolla questo URL esatto:
              <CopyField label="URL endpoint" value={settings?.webhookUrl ?? ''} />
            </li>
            <li>
              Nome esempio: <code>curaxe-api-{isLive ? 'live' : 'sandbox'}</code>
            </li>
            <li>
              Dopo “Crea”, apri la destinazione → <strong>Reveal / Mostra signing secret</strong> →
              copia il valore che inizia con <code>whsec_</code> (lo incolli al passo successivo).
            </li>
          </ol>
          <p style={{ marginTop: 12 }}>
            <strong>Eventi obbligatori</strong> ({STRIPE_BILLING_EVENTS.length}):
          </p>
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
              Ho il whsec_ → Continua alle chiavi
            </button>
          </div>
        </div>
      )}

      {stepId === 'keys' && (
        <div className="dash-settings-card">
          <h3 className="dash-settings-card__title">3 · Chiavi API + signing secret</h3>
          <p>
            Modalità <strong>{isLive ? 'Live' : 'Test'}</strong> → prefissi attesi{' '}
            <code>{pkPrefix}</code> / <code>{skPrefix}</code> / <code>whsec_</code>
          </p>

          <ol className="dash-stripe-steps">
            <li>
              Apri{' '}
              <a href={keysUrl} target="_blank" rel="noopener noreferrer">
                Stripe → Developers → API keys
              </a>{' '}
              ({isLive ? 'Live' : 'Test'}).
            </li>
            <li>
              <strong>Publishable key</strong> → bottone Reveal/Copia → inizia con{' '}
              <code>{pkPrefix}</code> (è pubblica: va bene nel frontend).
            </li>
            <li>
              <strong>Secret key</strong> → Reveal → inizia con <code>{skPrefix}</code>.{' '}
              <em>Non condividerla mai</em>; solo in questo form admin.
            </li>
            <li>
              <strong>Webhook signing secret</strong> → dalla destinazione webhook che hai creato
              (passo 2) → Reveal → <code>whsec_…</code>
            </li>
          </ol>

          {settings?.secretKeyHint && (
            <p className="dash-muted">Secret già salvata sul server: {settings.secretKeyHint}</p>
          )}
          {settings?.webhookSecretHint && (
            <p className="dash-muted">Webhook secret già salvato: {settings.webhookSecretHint}</p>
          )}

          <label className="auth-field" style={{ display: 'block', marginTop: 12 }}>
            <span className="auth-field__label">1) Publishable key ({pkPrefix}…)</span>
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
            <span className="auth-field__label">
              2) Secret key ({skPrefix}…) — lascia vuoto per non sovrascrivere
            </span>
            <input
              className="auth-input"
              type="password"
              value={w.secretKey}
              onChange={(e) => w.setSecretKey(e.target.value.trim())}
              placeholder={`${skPrefix}…`}
              autoComplete="new-password"
              spellCheck={false}
            />
          </label>
          <label className="auth-field" style={{ display: 'block', marginTop: 12 }}>
            <span className="auth-field__label">3) Webhook signing secret (whsec_…)</span>
            <input
              className="auth-input"
              type="password"
              value={w.webhookSecret}
              onChange={(e) => w.setWebhookSecret(e.target.value.trim())}
              placeholder="whsec_…"
              autoComplete="new-password"
              spellCheck={false}
            />
          </label>
          <p className="dash-form-hint" style={{ marginTop: 8 }}>
            Dopo Salva, Secret e whsec spariscono dal form: restano solo sul server, cifrati.
          </p>
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
              Salva e continua → Piani
            </button>
          </div>
        </div>
      )}

      {stepId === 'prices' && (
        <div className="dash-settings-card">
          <h3 className="dash-settings-card__title">4 · Prodotti e Price ID</h3>
          <ol className="dash-stripe-steps">
            <li>
              Apri{' '}
              <a href={productsUrl} target="_blank" rel="noopener noreferrer">
                Stripe → Product catalog
              </a>
              .
            </li>
            <li>
              Crea 3 prodotti (o prezzi) ricorrenti: Professionista, Agenzia, Struttura.
            </li>
            <li>
              Per ogni prezzo copia l’ID che inizia con <code>price_</code> (non il Product ID{' '}
              <code>prod_</code>).
            </li>
            <li>Imposta i giorni di prova (carta richiesta al checkout).</li>
          </ol>
          {(
            [
              ['Professionista', w.priceProfessional, w.setPriceProfessional, w.trialDaysProfessional, w.setTrialDaysProfessional],
              ['Agenzia', w.priceAgency, w.setPriceAgency, w.trialDaysAgency, w.setTrialDaysAgency],
              ['Struttura', w.priceStructure, w.setPriceStructure, w.trialDaysStructure, w.setTrialDaysStructure],
            ] as const
          ).map(([label, price, setPrice, days, setDays]) => (
            <div key={label} style={{ marginTop: 16 }}>
              <strong>{label}</strong>
              <label className="auth-field" style={{ display: 'block', marginTop: 8 }}>
                <span className="auth-field__label">Price ID (price_…)</span>
                <input
                  className="auth-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.trim())}
                  placeholder="price_…"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label className="auth-field" style={{ display: 'block', marginTop: 8 }}>
                <span className="auth-field__label">Giorni prova</span>
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
            <button
              type="button"
              className="dash-btn dash-btn--primary"
              disabled={w.busy}
              onClick={() => void savePrices()}
            >
              Salva e continua → Verifica
            </button>
          </div>
        </div>
      )}

      {stepId === 'verify' && (
        <div className="dash-settings-card">
          <h3 className="dash-settings-card__title">5 · Diagnostica</h3>
          <p>
            Controlla che le chiavi rispondano a Stripe, che test/live siano coerenti e che il
            webhook secret sia presente. Nessuna chiave viene stampata nei log.
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
          <h3 className="dash-settings-card__title">6 · Pronto</h3>
          <p>
            Stripe è configurato
            {settings?.setupCompletedAt
              ? ` dal ${new Date(settings.setupCompletedAt).toLocaleString('it-IT')}`
              : ''}
            . Prova un checkout in Test con carta{' '}
            <code>4242 4242 4242 4242</code> e controlla che il webhook risulti consegnato in Stripe.
          </p>
          <button type="button" className="dash-btn dash-btn--ghost" onClick={() => w.setStep(0)}>
            Riapri procedura
          </button>
        </div>
      )}
    </div>
  )
}
