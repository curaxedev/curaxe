import { useCallback, useEffect, useState } from 'react'
import type { BillingAudience } from '../../../lib/billingTypes'
import {
  billingSettingsError,
  getAdminBillingSettings,
  putAdminBillingSettings,
  type PlanCatalogEntry,
  type PlanLockInfo,
} from '../../../lib/adminBillingSettingsApi'
import {
  AUDIENCE_LABELS,
  DEFAULT_PLAN_CATALOG,
  emptyPlanDraft,
  formatPlanEuro,
  formatPlanPriceLabel,
} from '../../../lib/planCatalog'
import { IconCheck, IconClose, IconCreditCard } from '../../../components/icons/DashboardIcons'

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
      features: Array.isArray(p.features) ? p.features.map(String) : [],
      active: p.active !== false,
      sortOrder: Number(p.sortOrder) || i + 1,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function PlanEditModal({
  draft,
  isNew,
  lock,
  saving,
  error,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  draft: PlanCatalogEntry
  isNew: boolean
  lock?: PlanLockInfo
  saving: boolean
  error: string | null
  onChange: (patch: Partial<PlanCatalogEntry>) => void
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}) {
  const isLocked = Boolean(lock?.locked)

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
            {isNew ? 'Nuovo piano' : `Modifica · ${draft.label}`}
          </span>
          <button type="button" className="dash-modal__close" onClick={onClose} aria-label="Chiudi">
            <IconClose size={18} />
          </button>
        </div>

        <div className="dash-modal__body">
          {isLocked ? (
            <p className="dash-modal__lead" style={{ color: 'var(--color-text-muted)' }}>
              Piano con {lock?.activeSubscribers ?? 0} iscritti attivi: prezzo, intervallo e collegamento
              Stripe non modificabili. Puoi aggiornare nome, feature e visibilità.
            </p>
          ) : (
            <p className="dash-modal__lead">
              Al salvataggio Stripe crea (o aggiorna) automaticamente Product e Price — non serve
              copiare a mano il Price ID.
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
                  if (!isLocked && !draft.stripePriceId) {
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
                disabled={isLocked}
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
                disabled={isLocked}
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
                disabled={isLocked}
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
                      Collegato · <code>{draft.stripePriceId}</code>
                    </span>
                  </>
                ) : (
                  <span>Al salvataggio verrà creato automaticamente su Stripe</span>
                )}
              </div>
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
                  onClick={() => onChange({ features: draft.features.filter((_, j) => j !== i) })}
                >
                  <IconClose size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-modal__footer dash-admin-plan-modal__footer">
          {!isNew ? (
            <button
              type="button"
              className="dash-btn dash-btn--ghost dash-admin-plan-modal__danger"
              disabled={saving || isLocked}
              title={isLocked ? 'Bloccato: ci sono iscritti attivi' : undefined}
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
              {saving ? 'Salvataggio…' : 'Salva piano'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminPlansCatalogSection() {
  const [plans, setPlans] = useState<PlanCatalogEntry[]>(() =>
    DEFAULT_PLAN_CATALOG.map((p) => ({ ...p, features: [...p.features] })),
  )
  const [locks, setLocks] = useState<Record<string, PlanLockInfo>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [draft, setDraft] = useState<PlanCatalogEntry | null>(null)
  const [isNewDraft, setIsNewDraft] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminBillingSettings()
      setPlans(normalizePlans(data.plans))
      setLocks(data.planLocks ?? {})
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

  function openEdit(plan: PlanCatalogEntry) {
    setDraft({ ...plan, features: [...plan.features] })
    setIsNewDraft(false)
    setModalError(null)
  }

  function openNew() {
    const next = emptyPlanDraft('professional')
    setDraft({ ...next, features: [...next.features], sortOrder: plans.length + 1 })
    setIsNewDraft(true)
    setModalError(null)
  }

  function closeModal() {
    if (saving) return
    setDraft(null)
    setModalError(null)
  }

  function patchDraft(patch: Partial<PlanCatalogEntry>) {
    if (!draft) return
    const lock = locks[draft.key]
    if (lock?.locked) {
      const commercial: (keyof PlanCatalogEntry)[] = [
        'amountCents',
        'interval',
        'stripePriceId',
        'stripeProductId',
        'audience',
        'key',
        'currency',
      ]
      for (const k of commercial) {
        if (k in patch) {
          setModalError(
            `«${draft.label}» ha ${lock.activeSubscribers} iscritti attivi: prezzo e Stripe non modificabili.`,
          )
          return
        }
      }
    }
    setDraft({ ...draft, ...patch })
    setModalError(null)
  }

  async function persistCatalog(nextPlans: PlanCatalogEntry[], successMsg: string) {
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
      const saved = await putAdminBillingSettings({ plans: payload })
      const normalized = normalizePlans(saved.plans)
      setPlans(normalized)
      setLocks(saved.planLocks ?? {})
      setDraft(null)
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
    const next = isNewDraft
      ? [...plans, draft]
      : plans.map((p) => (p.key === draft.key ? draft : p))
    try {
      await persistCatalog(next, isNewDraft ? 'Piano creato e collegato a Stripe.' : 'Piano salvato.')
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

  if (loading) {
    return (
      <div className="dash-admin-plans">
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">Catalogo piani</h2>
            <p className="dash-section__subtitle">Caricamento…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-admin-plans">
      {toast ? (
        <div className="dash-admin-plans__toast" role="status">
          {toast}
        </div>
      ) : null}

      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Catalogo piani</h2>
          <p className="dash-section__subtitle">
            Card dei piani come le vedono i clienti. Modifica o elimina da popup — Stripe Price creato
            in automatico al salvataggio.
          </p>
        </div>
        <div className="dash-admin-plans__actions">
          <button type="button" className="dash-btn dash-btn--ghost" onClick={() => void load()} disabled={saving}>
            Ricarica
          </button>
          <button type="button" className="dash-btn dash-btn--primary" onClick={openNew} disabled={saving}>
            + Nuovo piano
          </button>
        </div>
      </div>

      {error && !draft ? (
        <div className="dash-profile-preview dash-profile-preview--alert" role="alert">
          {error}
        </div>
      ) : null}

      <div className="dash-admin-plans__cards" role="list">
        {plans.map((p) => {
          const lock = locks[p.key]
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

      {draft ? (
        <PlanEditModal
          draft={draft}
          isNew={isNewDraft}
          lock={locks[draft.key]}
          saving={saving}
          error={modalError}
          onChange={patchDraft}
          onClose={closeModal}
          onSave={() => void saveDraft()}
          onDelete={() => void deleteDraft()}
        />
      ) : null}
    </div>
  )
}
