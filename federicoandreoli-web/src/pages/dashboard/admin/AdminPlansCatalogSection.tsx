import { useCallback, useEffect, useState } from 'react'
import type { BillingAudience } from '../../../lib/billingTypes'
import {
  billingSettingsError,
  getAdminBillingSettings,
  putAdminBillingSettings,
  type PlanCatalogEntry,
  type PlanLockInfo,
  type PlanPriceChangePolicy,
  type PlanPriceChangePolicyInput,
  type PlanPriceChangeRecord,
} from '../../../lib/adminBillingSettingsApi'
import {
  AUDIENCE_LABELS,
  DEFAULT_PLAN_CATALOG,
  emptyPlanDraft,
  formatPlanEuro,
  formatPlanPriceLabel,
} from '../../../lib/planCatalog'
import {
  IconCheck,
  IconClose,
  IconCreditCard,
  IconEye,
  IconEyeOff,
  IconGrid,
  IconList,
  IconRefresh,
  IconTrash,
} from '../../../components/icons/DashboardIcons'

function slugifyKey(label: string, audience: BillingAudience): string {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
  return `${audience}_${base || 'piano'}_monthly`
}

function normalizePlans(raw: PlanCatalogEntry[] | undefined): PlanCatalogEntry[] {
  if (!raw || raw.length === 0) {
    return DEFAULT_PLAN_CATALOG.map((p) => ({ ...p, features: [...p.features] }))
  }
  return raw
    .map((p, i) => ({
      key: String(p.key || `plan_${i}`),
      audience: (p.audience as BillingAudience) || 'professional',
      label: String(p.label || 'Piano'),
      tagline: String(p.tagline || ''),
      amountCents: Number(p.amountCents) || 0,
      currency: 'eur' as const,
      interval: p.interval === 'year' ? ('year' as const) : ('month' as const),
      trialDays: Number(p.trialDays) || 0,
      stripePriceId: p.stripePriceId ? String(p.stripePriceId) : null,
      stripeProductId: p.stripeProductId ? String(p.stripeProductId) : null,
      stripePreviousPriceId: p.stripePreviousPriceId ? String(p.stripePreviousPriceId) : null,
      features: Array.isArray(p.features) ? p.features.map(String) : [],
      active: p.active !== false,
      sortOrder: Number(p.sortOrder) || i + 1,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function commercialDiff(before: PlanCatalogEntry, after: PlanCatalogEntry): boolean {
  return (
    before.amountCents !== after.amountCents ||
    before.interval !== after.interval ||
    before.currency !== after.currency ||
    before.audience !== after.audience ||
    before.key !== after.key
  )
}

function policyLabel(policy: string): string {
  switch (policy) {
    case 'grandfather_indefinite':
      return 'Prezzo storico indefinito'
    case 'grandfather_months':
      return 'Prezzo storico a mesi'
    case 'cancel_at_period_end':
      return 'Disdetta fine periodo'
    case 'cancel_immediately':
      return 'Disdetta immediata'
    default:
      return policy
  }
}

const PRICE_POLICY_OPTIONS: {
  id: PlanPriceChangePolicy
  title: string
  desc: string
}[] = [
  {
    id: 'grandfather_indefinite',
    title: 'Mantieni prezzo storico (consigliato)',
    desc: 'Gli iscritti restano sul Price accettato al checkout. Il nuovo listino vale solo per i nuovi.',
  },
  {
    id: 'grandfather_months',
    title: 'Mantieni per X mesi, poi disdici a fine periodo',
    desc: 'Come sopra fino alla data di grazia; dopo scheduliamo cancel_at_period_end.',
  },
  {
    id: 'cancel_at_period_end',
    title: 'Disdici a fine periodo subito',
    desc: 'Gli iscritti sul Price vecchio restano fino a fine ciclo, poi l’abbonamento termina.',
  },
  {
    id: 'cancel_immediately',
    title: 'Disdici subito',
    desc: 'Chiusura immediata su Stripe. Usare solo se davvero necessario.',
  },
]

function PlanEditModal({
  draft,
  isNew,
  lock,
  saving,
  error,
  policyMode,
  policy,
  grandfatherMonths,
  onChange,
  onPolicyChange,
  onGrandfatherMonthsChange,
  onClose,
  onSave,
  onDelete,
}: {
  draft: PlanCatalogEntry
  isNew: boolean
  lock?: PlanLockInfo
  saving: boolean
  error: string | null
  policyMode: boolean
  policy: PlanPriceChangePolicy
  grandfatherMonths: number
  onChange: (patch: Partial<PlanCatalogEntry>) => void
  onPolicyChange: (p: PlanPriceChangePolicy) => void
  onGrandfatherMonthsChange: (n: number) => void
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}) {
  const hasSubscribers = Boolean(lock?.locked)
  const subscriberCount = lock?.activeSubscribers ?? 0
  const currentPriceSubscribers = lock?.currentPriceSubscribers ?? subscriberCount

  function setFeature(index: number, value: string) {
    const features = [...draft.features]
    features[index] = value
    onChange({ features })
  }

  return (
    <div
      className="dash-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="dash-modal dash-admin-plan-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dash-modal__header">
          <span className="dash-modal__title" id="plan-edit-title">
            {policyMode
              ? 'Policy cambio listino'
              : isNew
                ? 'Nuovo piano'
                : `Modifica · ${draft.label}`}
          </span>
          <button type="button" className="dash-modal__close" onClick={onClose} aria-label="Chiudi">
            <IconClose size={18} />
          </button>
        </div>

        <div className="dash-modal__body">
          {policyMode ? (
            <>
              <p className="dash-modal__lead">
                Stai aggiornando prezzo/intervallo con {currentPriceSubscribers} iscritti sul Price
                corrente del catalogo
                {subscriberCount > currentPriceSubscribers
                  ? ` (${subscriberCount} totali contando anche grandfather su Price storici, non toccati da questa policy)`
                  : ''}
                . Scegli esplicitamente cosa fare (audit trail; nessuna migrazione silenziosa).
              </p>
              {error ? (
                <div className="dash-profile-preview dash-profile-preview--alert" role="alert">
                  {error}
                </div>
              ) : null}
              <div
                className="dash-admin-plans__policy-list"
                role="radiogroup"
                aria-label="Policy cambio prezzo"
              >
                {PRICE_POLICY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={
                      policy === opt.id
                        ? 'dash-admin-plans__policy-opt is-on'
                        : 'dash-admin-plans__policy-opt'
                    }
                  >
                    <input
                      type="radio"
                      name="price-policy"
                      checked={policy === opt.id}
                      disabled={saving}
                      onChange={() => onPolicyChange(opt.id)}
                    />
                    <span>
                      <strong>{opt.title}</strong>
                      <small>{opt.desc}</small>
                    </span>
                  </label>
                ))}
              </div>
              {policy === 'grandfather_months' ? (
                <div className="dash-form-field" style={{ marginTop: 12 }}>
                  <label className="dash-form-label" htmlFor="plan-grace-months">
                    Mesi di grazia sul prezzo storico
                  </label>
                  <input
                    id="plan-grace-months"
                    className="dash-form-input"
                    type="number"
                    min={1}
                    max={36}
                    disabled={saving}
                    value={grandfatherMonths}
                    onChange={(e) =>
                      onGrandfatherMonthsChange(
                        Math.max(1, Math.min(36, Number(e.target.value) || 1)),
                      )
                    }
                  />
                </div>
              ) : null}
            </>
          ) : (
            <>
              {hasSubscribers ? (
                <p className="dash-modal__lead" style={{ color: 'var(--color-text-muted)' }}>
                  Piano con {subscriberCount} iscritti active/trialing. Puoi cambiare il listino: al
                  salvataggio scegli se mantenere il prezzo storico (indefinito o per X mesi),
                  disdire a fine periodo, o disdire subito. Stripe Price immutabili → nuovo Price
                  per i prossimi checkout; gli esistenti restano sul contratto accettato finché la
                  policy non dice altrimenti.
                </p>
              ) : (
                <p className="dash-modal__lead">
                  Su Stripe i Price sono immutabili: se cambi importo/intervallo creiamo un nuovo
                  Price per i prossimi checkout, archiviamo il precedente e aggiorniamo il Product.
                  Nome/feature non creano prezzi nuovi.
                </p>
              )}

              {error ? (
                <div className="dash-profile-preview dash-profile-preview--alert" role="alert">
                  {error}
                </div>
              ) : null}

              <div className="dash-admin-plans__editor-grid">
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="plan-label">
                    Nome piano
                  </label>
                  <input
                    id="plan-label"
                    className="dash-form-input"
                    value={draft.label}
                    onChange={(e) => {
                      const label = e.target.value
                      const patch: Partial<PlanCatalogEntry> = { label }
                      if (!hasSubscribers && !draft.stripePriceId) {
                        patch.key = slugifyKey(label, draft.audience)
                      }
                      onChange(patch)
                    }}
                  />
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="plan-audience">
                    Audience
                  </label>
                  <select
                    id="plan-audience"
                    className="dash-form-input"
                    value={draft.audience}
                    disabled={hasSubscribers}
                    title={
                      hasSubscribers
                        ? 'Audience bloccata con iscritti: crea un piano nuovo se serve un altro target'
                        : undefined
                    }
                    onChange={(e) => onChange({ audience: e.target.value as BillingAudience })}
                  >
                    <option value="professional">{AUDIENCE_LABELS.professional}</option>
                    <option value="agency">{AUDIENCE_LABELS.agency}</option>
                    <option value="structure">{AUDIENCE_LABELS.structure}</option>
                  </select>
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="plan-amount">
                    Prezzo (€)
                  </label>
                  <input
                    id="plan-amount"
                    className="dash-form-input"
                    type="number"
                    min={0}
                    step={0.01}
                    value={(draft.amountCents / 100).toFixed(2)}
                    onChange={(e) =>
                      onChange({
                        amountCents: Math.round(Math.max(0, Number(e.target.value) || 0) * 100),
                      })
                    }
                  />
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="plan-interval">
                    Intervallo
                  </label>
                  <select
                    id="plan-interval"
                    className="dash-form-input"
                    value={draft.interval}
                    onChange={(e) =>
                      onChange({ interval: e.target.value === 'year' ? 'year' : 'month' })
                    }
                  >
                    <option value="month">Mensile</option>
                    <option value="year">Annuale</option>
                  </select>
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="plan-trial">
                    Giorni di prova
                  </label>
                  <input
                    id="plan-trial"
                    className="dash-form-input"
                    type="number"
                    min={0}
                    max={90}
                    value={draft.trialDays}
                    onChange={(e) => onChange({ trialDays: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="plan-active">
                    Visibile ai clienti
                  </label>
                  <label className="dash-admin-plans__toggle">
                    <input
                      id="plan-active"
                      type="checkbox"
                      checked={draft.active}
                      onChange={(e) => onChange({ active: e.target.checked })}
                    />
                    <span>{draft.active ? 'Nel catalogo pubblico' : 'Nascosto'}</span>
                  </label>
                </div>
                <div className="dash-form-field dash-admin-plans__span-2">
                  <label className="dash-form-label" htmlFor="plan-tagline">
                    Tagline
                  </label>
                  <input
                    id="plan-tagline"
                    className="dash-form-input"
                    value={draft.tagline}
                    placeholder="Breve descrizione"
                    onChange={(e) => onChange({ tagline: e.target.value })}
                  />
                </div>
                <div className="dash-form-field dash-admin-plans__span-2">
                  <label className="dash-form-label">Stripe</label>
                  <div className="dash-admin-plans__stripe-status">
                    {draft.stripePriceId ? (
                      <>
                        <IconCheck size={14} />
                        <span>
                          Price corrente · <code>{draft.stripePriceId}</code>
                          {draft.stripeProductId ? (
                            <>
                              {' '}
                              · Product <code>{draft.stripeProductId}</code>
                            </>
                          ) : null}
                        </span>
                      </>
                    ) : (
                      <span>
                        Al salvataggio verrà creato automaticamente Product + Price su Stripe
                      </span>
                    )}
                  </div>
                  {draft.stripePreviousPriceId ? (
                    <p className="dash-admin-plans__stripe-hint">
                      Price precedente archiviato: <code>{draft.stripePreviousPriceId}</code>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="dash-admin-plans__features">
                <div className="dash-admin-plans__features-head">
                  <strong>Feature</strong>
                  <button
                    type="button"
                    className="dash-btn dash-btn--ghost"
                    onClick={() => onChange({ features: [...draft.features, ''] })}
                  >
                    + Feature
                  </button>
                </div>
                {draft.features.map((f, i) => (
                  <div key={i} className="dash-admin-plans__feature-row">
                    <input
                      className="dash-form-input"
                      value={f}
                      placeholder="Es. Candidature illimitate"
                      onChange={(e) => setFeature(i, e.target.value)}
                    />
                    <button
                      type="button"
                      className="dash-btn dash-btn--ghost"
                      aria-label="Rimuovi feature"
                      onClick={() =>
                        onChange({ features: draft.features.filter((_, j) => j !== i) })
                      }
                    >
                      <IconClose size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="dash-modal__footer dash-admin-plan-modal__footer">
          {!isNew && !policyMode ? (
            <button
              type="button"
              className="dash-btn dash-btn--ghost dash-admin-plan-modal__danger"
              disabled={saving || hasSubscribers}
              title={
                hasSubscribers
                  ? 'Con iscritti attivi: applica prima una policy di uscita o migra'
                  : undefined
              }
              onClick={onDelete}
            >
              Elimina
            </button>
          ) : (
            <span />
          )}
          <div className="dash-admin-plan-modal__footer-right">
            <button type="button" className="dash-btn dash-btn--ghost" disabled={saving} onClick={onClose}>
              Annulla
            </button>
            <button type="button" className="dash-btn dash-btn--primary" disabled={saving} onClick={onSave}>
              {saving
                ? 'Salvataggio…'
                : policyMode
                  ? 'Conferma e applica'
                  : 'Salva piano'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminPlansCatalogSection({ wineos = false }: { wineos?: boolean }) {
  const [plans, setPlans] = useState<PlanCatalogEntry[]>(() =>
    DEFAULT_PLAN_CATALOG.map((p) => ({ ...p, features: [...p.features] })),
  )
  const [locks, setLocks] = useState<Record<string, PlanLockInfo>>({})
  const [priceChanges, setPriceChanges] = useState<PlanPriceChangeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [draft, setDraft] = useState<PlanCatalogEntry | null>(null)
  const [originalDraft, setOriginalDraft] = useState<PlanCatalogEntry | null>(null)
  const [isNewDraft, setIsNewDraft] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [layout, setLayout] = useState<'box' | 'lista'>('box')
  const [policyMode, setPolicyMode] = useState(false)
  const [policy, setPolicy] = useState<PlanPriceChangePolicy>('grandfather_indefinite')
  const [grandfatherMonths, setGrandfatherMonths] = useState(3)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminBillingSettings()
      setPlans(normalizePlans(data.plans))
      setLocks(data.planLocks ?? {})
      setPriceChanges(Array.isArray(data.planPriceChanges) ? data.planPriceChanges : [])
    } catch (err) {
      setError(billingSettingsError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  function resetPolicyState() {
    setPolicyMode(false)
    setPolicy('grandfather_indefinite')
    setGrandfatherMonths(3)
  }

  function openEdit(plan: PlanCatalogEntry) {
    const copy = { ...plan, features: [...plan.features] }
    setDraft(copy)
    setOriginalDraft({ ...plan, features: [...plan.features] })
    setIsNewDraft(false)
    setModalError(null)
    resetPolicyState()
  }

  function openNew() {
    const next = emptyPlanDraft('professional')
    const copy = { ...next, features: [...next.features], sortOrder: plans.length + 1 }
    setDraft(copy)
    setOriginalDraft(null)
    setIsNewDraft(true)
    setModalError(null)
    resetPolicyState()
  }

  function closeModal() {
    if (saving) return
    setDraft(null)
    setOriginalDraft(null)
    setModalError(null)
    resetPolicyState()
  }

  function patchDraft(patch: Partial<PlanCatalogEntry>) {
    if (!draft) return
    const lock = locks[draft.key]
    if (lock?.locked) {
      if ('key' in patch || 'audience' in patch || 'currency' in patch) {
        setModalError(
          `«${draft.label}» ha ${lock.activeSubscribers} iscritti: key/audience non modificabili. Cambia prezzo/intervallo con policy, oppure crea un piano nuovo.`,
        )
        return
      }
      if ('stripePriceId' in patch || 'stripeProductId' in patch) {
        setModalError('Gli ID Stripe non si modificano a mano: sync automatico al salvataggio.')
        return
      }
    }
    setDraft({ ...draft, ...patch })
    setModalError(null)
  }

  async function persistCatalog(
    nextPlans: PlanCatalogEntry[],
    successMsg: string,
    policies?: Record<string, PlanPriceChangePolicyInput>,
  ) {
    setSaving(true)
    setError(null)
    setModalError(null)
    try {
      const keys = new Set<string>()
      for (const p of nextPlans) {
        if (!p.label.trim()) {
          throw new Error('Ogni piano deve avere un nome.')
        }
        if (!p.key.trim() || keys.has(p.key)) {
          throw new Error('Chiavi piano duplicate o vuote.')
        }
        keys.add(p.key)
      }
      if (nextPlans.length < 1) {
        throw new Error('Serve almeno un piano nel catalogo.')
      }
      const payload = nextPlans.map((p, i) => ({
        ...p,
        label: p.label.trim(),
        tagline: p.tagline.trim(),
        stripePriceId: (p.stripePriceId ?? '').trim() || null,
        stripeProductId: (p.stripeProductId ?? '').trim() || null,
        features: p.features.map((f) => f.trim()).filter(Boolean),
        sortOrder: i + 1,
      }))
      const saved = await putAdminBillingSettings({
        plans: payload,
        ...(policies && Object.keys(policies).length > 0
          ? { priceChangePolicies: policies }
          : {}),
      })
      const normalized = normalizePlans(saved.plans)
      setPlans(normalized)
      setLocks(saved.planLocks ?? {})
      setPriceChanges(Array.isArray(saved.planPriceChanges) ? saved.planPriceChanges : [])
      setDraft(null)
      setOriginalDraft(null)
      resetPolicyState()
      setToast(successMsg)
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'Error' && !('status' in err)
          ? err.message
          : billingSettingsError(err)
      setModalError(msg)
      setError(msg)
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function saveDraft() {
    if (!draft) return
    const lock = locks[draft.key]
    const onCurrentPrice = lock?.currentPriceSubscribers ?? lock?.activeSubscribers ?? 0
    const needsPolicy =
      !isNewDraft &&
      onCurrentPrice > 0 &&
      originalDraft !== null &&
      commercialDiff(originalDraft, draft)

    if (needsPolicy && !policyMode) {
      setPolicyMode(true)
      setModalError(null)
      return
    }

    if (needsPolicy && policy === 'grandfather_months') {
      if (grandfatherMonths < 1 || grandfatherMonths > 36) {
        setModalError('Indica i mesi di grazia tra 1 e 36.')
        return
      }
    }

    if (needsPolicy && policy === 'cancel_immediately') {
      if (
        !confirm(
          `Disdetta immediata per ${onCurrentPrice} iscritti sul Price corrente di «${draft.label}»? Operazione irreversibile su Stripe.`,
        )
      ) {
        return
      }
    }

    const next = isNewDraft
      ? [...plans, draft]
      : plans.map((p) => (p.key === draft.key ? draft : p))

    const policies: Record<string, PlanPriceChangePolicyInput> | undefined = needsPolicy
      ? {
          [draft.key]: {
            policy,
            ...(policy === 'grandfather_months' ? { grandfatherMonths } : {}),
          },
        }
      : undefined

    try {
      await persistCatalog(
        next,
        needsPolicy
          ? `Listino aggiornato · policy «${policyLabel(policy)}» applicata.`
          : isNewDraft
            ? 'Piano creato e collegato a Stripe.'
            : 'Piano salvato.',
        policies,
      )
    } catch {
      // errore già in modal
    }
  }

  async function deleteDraft() {
    if (!draft || isNewDraft) return
    const lock = locks[draft.key]
    if (lock?.locked) {
      setModalError(`Non puoi eliminare questo piano: ha ${lock.activeSubscribers} iscritti attivi.`)
      return
    }
    if (plans.length <= 1) {
      setModalError('Serve almeno un piano nel catalogo.')
      return
    }
    if (!confirm(`Eliminare definitivamente «${draft.label}» dal catalogo?`)) return
    const next = plans.filter((p) => p.key !== draft.key).map((p, i) => ({ ...p, sortOrder: i + 1 }))
    try {
      await persistCatalog(next, `«${draft.label}» eliminato.`)
    } catch {
      // errore già in modal
    }
  }

  async function toggleActive(plan: PlanCatalogEntry) {
    // Nascondere dal catalogo è ok anche con iscritti/grandfather: non tocca Stripe.
    const next = plans.map((p) => (p.key === plan.key ? { ...p, active: !p.active } : p))
    try {
      await persistCatalog(
        next,
        plan.active ? `«${plan.label}» impostato come bozza.` : `«${plan.label}» pubblicato.`,
      )
    } catch {
      // errore già in state
    }
  }

  async function deletePlan(plan: PlanCatalogEntry) {
    const lock = locks[plan.key]
    if (lock?.locked) {
      setError(`Non puoi eliminare «${plan.label}»: ha ${lock.activeSubscribers} iscritti attivi.`)
      return
    }
    if (plans.length <= 1) {
      setError('Serve almeno un piano nel catalogo.')
      return
    }
    if (!confirm(`Eliminare definitivamente «${plan.label}» dal catalogo?`)) return
    const next = plans.filter((p) => p.key !== plan.key).map((p, i) => ({ ...p, sortOrder: i + 1 }))
    try {
      await persistCatalog(next, `«${plan.label}» eliminato.`)
    } catch {
      // errore già in state
    }
  }

  const publishedCount = plans.filter((p) => p.active).length

  if (loading) {
    return (
      <div className={`dash-admin-plans${wineos ? ' dash-admin-plans--wineos' : ''}`}>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Piani</h2>
            <p className="dash-section__subtitle">Caricamento…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`dash-admin-plans${wineos ? ' dash-admin-plans--wineos' : ''}`}>
      {toast ? (
        <div className="dash-admin-plans__toast" role="status">
          {toast}
        </div>
      ) : null}

      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">{wineos ? 'Piani' : 'Catalogo piani'}</h2>
          <p className="dash-section__subtitle">
            {wineos
              ? `${plans.length} piani · ${publishedCount} pubblicati`
              : 'Card dei piani come le vedono i clienti. Modifica o elimina da popup — Stripe Price creato in automatico al salvataggio.'}
          </p>
        </div>
        <div className="dash-admin-plans__actions">
          {wineos ? (
            <div className="admin-billing__view-toggle" role="group" aria-label="Vista piani">
              <button
                type="button"
                className={layout === 'box' ? 'is-active' : undefined}
                onClick={() => setLayout('box')}
              >
                <IconGrid size={14} />
                Box
              </button>
              <button
                type="button"
                className={layout === 'lista' ? 'is-active' : undefined}
                onClick={() => setLayout('lista')}
              >
                <IconList size={14} />
                Lista
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className={wineos ? 'admin-billing__icon-btn' : 'dash-btn dash-btn--ghost'}
            onClick={() => void load()}
            disabled={saving}
            aria-label="Ricarica"
            title="Ricarica"
          >
            {wineos ? <IconRefresh size={15} /> : 'Ricarica'}
          </button>
          <button
            type="button"
            className={wineos ? 'admin-billing__ghost-cta is-active' : 'dash-btn dash-btn--primary'}
            onClick={openNew}
            disabled={saving}
          >
            + Nuovo piano
          </button>
        </div>
      </div>

      {error && !draft ? (
        <div className="dash-profile-preview dash-profile-preview--alert" role="alert">
          {error}
        </div>
      ) : null}

      <div
        className={`dash-admin-plans__cards${wineos ? ' dash-admin-plans__cards--wineos' : ''}${
          wineos && layout === 'lista' ? ' is-list' : ''
        }`}
        role="list"
      >
        {plans.map((p) => {
          const lock = locks[p.key]
          if (wineos) {
            return (
              <article
                key={p.key}
                className={`admin-plan-box${!p.active ? ' is-draft' : ''}`}
                role="listitem"
              >
                <div className="admin-plan-box__top">
                  <span className="admin-plan-box__icon" aria-hidden>
                    <IconCreditCard size={16} />
                  </span>
                  <span
                    className={`admin-plan-box__status${p.active ? ' is-pub' : ' is-draft'}`}
                  >
                    {p.active ? 'Pubblicato' : 'Bozza'}
                  </span>
                </div>
                <h3 className="admin-plan-box__name">{p.label}</h3>
                <p className="admin-plan-box__key">{p.key}</p>
                <div className="admin-plan-box__price">{formatPlanEuro(p.amountCents)}</div>
                <div className="admin-plan-box__meta">
                  <div>
                    <span>Intervallo</span>
                    <strong>{p.interval === 'year' ? 'annuale' : 'mensile'}</strong>
                  </div>
                  <div>
                    <span>Rinnovo</span>
                    <strong>Automatico</strong>
                  </div>
                  <div>
                    <span>Stripe</span>
                    <strong className={p.stripePriceId ? 'is-ok' : 'is-warn'}>
                      {p.stripePriceId ? 'Sync OK' : 'Da sincronizzare'}
                    </strong>
                  </div>
                </div>
                <div className="admin-plan-box__foot">
                  <span className="admin-plan-box__audience">{AUDIENCE_LABELS[p.audience]}</span>
                  <div className="admin-plan-box__actions">
                    <button
                      type="button"
                      className="admin-billing__icon-btn"
                      title={p.active ? 'Nascondi (bozza)' : 'Pubblica'}
                      disabled={saving}
                      onClick={() => void toggleActive(p)}
                    >
                      {p.active ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                    </button>
                    <button
                      type="button"
                      className="admin-billing__icon-btn"
                      title="Modifica / sync Stripe"
                      disabled={saving}
                      onClick={() => openEdit(p)}
                    >
                      <IconRefresh size={14} />
                    </button>
                    <button
                      type="button"
                      className="admin-billing__icon-btn admin-billing__icon-btn--danger"
                      title="Elimina"
                      disabled={saving || Boolean(lock?.locked)}
                      onClick={() => void deletePlan(p)}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              </article>
            )
          }

          return (
            <article
              key={p.key}
              className={`dash-admin-plans__card${!p.active ? ' is-inactive' : ''}`}
              role="listitem"
            >
              <div className="dash-admin-plans__card-top">
                <span className="dash-admin-plans__card-icon" aria-hidden>
                  <IconCreditCard size={18} />
                </span>
                <div className="dash-admin-plans__card-meta">
                  <strong>{p.label}</strong>
                  <span>
                    {AUDIENCE_LABELS[p.audience]} · {formatPlanPriceLabel(p)}
                    {p.trialDays > 0 ? ` · ${p.trialDays}gg prova` : ''}
                  </span>
                </div>
                <div className="dash-admin-plans__card-pills">
                  {lock?.locked ? <span className="dash-admin-plans__pill">Bloccato</span> : null}
                  {!p.active ? <span className="dash-admin-plans__pill">Off</span> : null}
                  {p.stripePriceId ? (
                    <span className="dash-admin-plans__pill dash-admin-plans__pill--ok">Stripe</span>
                  ) : (
                    <span className="dash-admin-plans__pill">No Price</span>
                  )}
                </div>
              </div>
              {p.tagline ? <p className="dash-admin-plans__card-tagline">{p.tagline}</p> : null}
              <ul className="dash-admin-plans__card-features">
                {(p.features.length > 0 ? p.features.slice(0, 4) : ['—']).map((f) => (
                  <li key={f}>
                    <IconCheck size={12} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="dash-admin-plans__card-price">{formatPlanEuro(p.amountCents)}</div>
              <div className="dash-admin-plans__card-actions">
                <button
                  type="button"
                  className="dash-btn dash-btn--primary"
                  onClick={() => openEdit(p)}
                  disabled={saving}
                >
                  Modifica
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {priceChanges.length > 0 ? (
        <section className="dash-admin-plans__audit" aria-label="Storico cambi listino">
          <div className="dash-admin-plans__audit-head">
            <h3>Storico cambi listino</h3>
            <p>Audit di policy applicate in produzione (grandfather / grazia / disdetta).</p>
          </div>
          <ul className="dash-admin-plans__audit-list">
            {priceChanges.slice(0, 12).map((row) => (
              <li key={row.id}>
                <div className="dash-admin-plans__audit-main">
                  <strong>{row.planLabel || row.planKey}</strong>
                  <span>{policyLabel(String(row.policy))}</span>
                  {row.policy === 'grandfather_months' && row.grandfatherMonths ? (
                    <span>{row.grandfatherMonths} mesi</span>
                  ) : null}
                  <span className="dash-admin-plans__audit-status">{row.status}</span>
                </div>
                <div className="dash-admin-plans__audit-meta">
                  <span>
                    {row.oldAmountCents != null && row.newAmountCents != null
                      ? `${formatPlanEuro(row.oldAmountCents)} → ${formatPlanEuro(row.newAmountCents)}`
                      : '—'}
                  </span>
                  <span>{row.affectedSubscriptions} abbonamenti</span>
                  {row.graceEndsAt ? (
                    <span>grazia fino {new Date(row.graceEndsAt).toLocaleDateString('it-IT')}</span>
                  ) : null}
                  {row.createdAt ? (
                    <span>{new Date(row.createdAt).toLocaleString('it-IT')}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {draft ? (
        <PlanEditModal
          draft={draft}
          isNew={isNewDraft}
          lock={locks[draft.key]}
          saving={saving}
          error={modalError}
          policyMode={policyMode}
          policy={policy}
          grandfatherMonths={grandfatherMonths}
          onChange={patchDraft}
          onPolicyChange={setPolicy}
          onGrandfatherMonthsChange={setGrandfatherMonths}
          onClose={closeModal}
          onSave={() => void saveDraft()}
          onDelete={() => void deleteDraft()}
        />
      ) : null}
    </div>
  )
}
