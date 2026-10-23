import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BillingAudience } from '../../../lib/billingTypes'
import {
  billingSettingsError,
  getAdminBillingSettings,
  putAdminBillingSettings,
  type PlanCatalogEntry,
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
      features: Array.isArray(p.features) ? p.features.map(String) : [],
      active: p.active !== false,
      sortOrder: Number(p.sortOrder) || i + 1,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function CustomerPreviewCard({ plan }: { plan: PlanCatalogEntry }) {
  return (
    <article
      className={`dash-plan-card dash-admin-plan-preview${plan.active ? ' dash-plan-card--featured' : ''}`}
      aria-label={`Anteprima cliente: ${plan.label}`}
    >
      {!plan.active && <div className="dash-admin-plan-preview__inactive">Non visibile ai clienti</div>}
      <div className="dash-plan__name">{plan.label}</div>
      <div className="dash-plan__price">{formatPlanEuro(plan.amountCents)}</div>
      <div className="dash-plan__price-note">
        {plan.interval === 'year' ? 'all’anno' : 'al mese'}
        {plan.trialDays > 0 ? ` · ${plan.trialDays} giorni di prova` : ''}
      </div>
      {plan.tagline ? <p className="dash-admin-plan-preview__tagline">{plan.tagline}</p> : null}
      <ul className="dash-plan__features">
        {(plan.features.length > 0 ? plan.features : ['—']).map((f) => (
          <li key={f} className="dash-plan__feature">
            <span className="dash-plan__feature-icon--check">
              <IconCheck size={14} />
            </span>
            <span>{f || '—'}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="dash-btn dash-btn--primary dash-btn--lg" style={{ width: '100%' }} disabled>
        Attiva {plan.label}
      </button>
    </article>
  )
}

export function AdminPlansCatalogSection() {
  const [plans, setPlans] = useState<PlanCatalogEntry[]>(() =>
    DEFAULT_PLAN_CATALOG.map((p) => ({ ...p, features: [...p.features] })),
  )
  const [selectedKey, setSelectedKey] = useState<string>(DEFAULT_PLAN_CATALOG[0]?.key ?? '')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminBillingSettings()
      const next = normalizePlans(data.plans)
      setPlans(next)
      setSelectedKey((prev) => (next.some((p) => p.key === prev) ? prev : next[0]?.key ?? ''))
      setDirty(false)
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

  const selected = useMemo(
    () => plans.find((p) => p.key === selectedKey) ?? plans[0] ?? null,
    [plans, selectedKey],
  )

  const activePreview = useMemo(
    () => plans.filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [plans],
  )

  function updateSelected(patch: Partial<PlanCatalogEntry>) {
    if (!selected) return
    setPlans((prev) =>
      prev.map((p) => (p.key === selected.key ? { ...p, ...patch } : p)),
    )
    setDirty(true)
  }

  function setFeature(index: number, value: string) {
    if (!selected) return
    const features = [...selected.features]
    features[index] = value
    updateSelected({ features })
  }

  function addFeature() {
    if (!selected) return
    updateSelected({ features: [...selected.features, ''] })
  }

  function removeFeature(index: number) {
    if (!selected) return
    updateSelected({ features: selected.features.filter((_, i) => i !== index) })
  }

  function addPlan() {
    const draft = emptyPlanDraft('professional')
    setPlans((prev) => [...prev, { ...draft, sortOrder: prev.length + 1 }])
    setSelectedKey(draft.key)
    setDirty(true)
  }

  function removePlan(key: string) {
    setPlans((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((p) => p.key !== key)
      if (selectedKey === key) setSelectedKey(next[0]?.key ?? '')
      return next.map((p, i) => ({ ...p, sortOrder: i + 1 }))
    })
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const keys = new Set<string>()
      for (const p of plans) {
        if (!p.label.trim()) {
          setError('Ogni piano deve avere un nome.')
          setSaving(false)
          return
        }
        if (!p.key.trim() || keys.has(p.key)) {
          setError('Chiavi piano duplicate o vuote.')
          setSaving(false)
          return
        }
        keys.add(p.key)
        const price = (p.stripePriceId ?? '').trim()
        if (price && !price.startsWith('price_')) {
          setError(`Stripe Price ID di «${p.label}» deve iniziare con price_.`)
          setSaving(false)
          return
        }
      }
      const payload = plans.map((p, i) => ({
        ...p,
        label: p.label.trim(),
        tagline: p.tagline.trim(),
        stripePriceId: (p.stripePriceId ?? '').trim() || null,
        features: p.features.map((f) => f.trim()).filter(Boolean),
        sortOrder: i + 1,
      }))
      const saved = await putAdminBillingSettings({ plans: payload })
      const next = normalizePlans(saved.plans)
      setPlans(next)
      setSelectedKey((prev) => (next.some((p) => p.key === prev) ? prev : next[0]?.key ?? ''))
      setDirty(false)
      setToast('Catalogo piani salvato. I clienti vedono gli stessi importi e feature.')
    } catch (err) {
      setError(billingSettingsError(err))
    } finally {
      setSaving(false)
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
            Stessi nomi, prezzi e feature che vedono i clienti in dashboard e su Come funziona.
            L’importo in UI deve coincidere con il Price ID Stripe collegato.
          </p>
        </div>
        <div className="dash-admin-plans__actions">
          <button type="button" className="dash-btn dash-btn--ghost" onClick={() => void load()} disabled={saving}>
            Ricarica
          </button>
          <button type="button" className="dash-btn dash-btn--ghost" onClick={addPlan} disabled={saving}>
            + Nuovo piano
          </button>
          <button
            type="button"
            className="dash-btn dash-btn--primary"
            disabled={saving || !dirty}
            onClick={() => void save()}
          >
            {saving ? 'Salvataggio…' : dirty ? 'Salva catalogo' : 'Salvato'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="dash-profile-preview dash-profile-preview--alert" role="alert">
          {error}
        </div>
      ) : null}

      <div className="dash-admin-plans__layout">
        <aside className="dash-admin-plans__list" aria-label="Elenco piani">
          {plans.map((p) => {
            const isSel = p.key === selected?.key
            return (
              <button
                key={p.key}
                type="button"
                className={`dash-admin-plans__list-item${isSel ? ' is-selected' : ''}${p.active ? '' : ' is-inactive'}`}
                onClick={() => setSelectedKey(p.key)}
              >
                <span className="dash-admin-plans__list-icon" aria-hidden>
                  <IconCreditCard size={16} />
                </span>
                <span className="dash-admin-plans__list-body">
                  <strong>{p.label}</strong>
                  <span>
                    {AUDIENCE_LABELS[p.audience]} · {formatPlanPriceLabel(p)}
                  </span>
                </span>
                {!p.active ? <span className="dash-admin-plans__pill">Off</span> : null}
              </button>
            )
          })}
        </aside>

        <div className="dash-admin-plans__editor">
          {selected ? (
            <>
              <div className="dash-admin-plans__editor-grid">
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="plan-label">
                    Nome piano (cliente)
                  </label>
                  <input
                    id="plan-label"
                    className="dash-form-input"
                    value={selected.label}
                    onChange={(e) => {
                      const label = e.target.value
                      const patch: Partial<PlanCatalogEntry> = { label }
                      if (selected.key.includes('_custom_') || selected.key.endsWith('_monthly') === false) {
                        /* keep key */
                      } else if (!selected.stripePriceId) {
                        patch.key = slugifyKey(label, selected.audience)
                      }
                      updateSelected(patch)
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
                    value={selected.audience}
                    onChange={(e) =>
                      updateSelected({ audience: e.target.value as BillingAudience })
                    }
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
                    value={(selected.amountCents / 100).toFixed(2)}
                    onChange={(e) =>
                      updateSelected({
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
                    value={selected.interval}
                    onChange={(e) =>
                      updateSelected({ interval: e.target.value === 'year' ? 'year' : 'month' })
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
                    value={selected.trialDays}
                    onChange={(e) => updateSelected({ trialDays: Number(e.target.value) || 0 })}
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
                      checked={selected.active}
                      onChange={(e) => updateSelected({ active: e.target.checked })}
                    />
                    <span>{selected.active ? 'Attivo nel catalogo pubblico' : 'Nascosto'}</span>
                  </label>
                </div>
                <div className="dash-form-field dash-admin-plans__span-2">
                  <label className="dash-form-label" htmlFor="plan-tagline">
                    Tagline
                  </label>
                  <input
                    id="plan-tagline"
                    className="dash-form-input"
                    value={selected.tagline}
                    placeholder="Breve descrizione sotto il prezzo"
                    onChange={(e) => updateSelected({ tagline: e.target.value })}
                  />
                </div>
                <div className="dash-form-field dash-admin-plans__span-2">
                  <label className="dash-form-label" htmlFor="plan-price-id">
                    Stripe Price ID
                  </label>
                  <input
                    id="plan-price-id"
                    className="dash-form-input"
                    value={selected.stripePriceId ?? ''}
                    placeholder="price_…"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => updateSelected({ stripePriceId: e.target.value.trim() || null })}
                  />
                  <p className="dash-admin-plans__hint">
                    Deve corrispondere all’importo sopra (best practice Stripe: un Price = un importo fisso).
                    Se cambi il prezzo in UI, crea un nuovo Price su Stripe e aggiorna questo ID.
                  </p>
                </div>
                <div className="dash-form-field dash-admin-plans__span-2">
                  <label className="dash-form-label" htmlFor="plan-key">
                    Chiave interna
                  </label>
                  <input
                    id="plan-key"
                    className="dash-form-input"
                    value={selected.key}
                    onChange={(e) => updateSelected({ key: e.target.value.trim() })}
                  />
                </div>
              </div>

              <div className="dash-admin-plans__features">
                <div className="dash-admin-plans__features-head">
                  <strong>Feature (come le vede il cliente)</strong>
                  <button type="button" className="dash-btn dash-btn--ghost" onClick={addFeature}>
                    + Feature
                  </button>
                </div>
                {selected.features.map((f, i) => (
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
                      onClick={() => removeFeature(i)}
                    >
                      <IconClose size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="dash-admin-plans__danger">
                <button
                  type="button"
                  className="dash-btn dash-btn--ghost"
                  disabled={plans.length <= 1}
                  onClick={() => removePlan(selected.key)}
                >
                  Elimina piano
                </button>
              </div>
            </>
          ) : (
            <p className="dash-empty-mini">Nessun piano selezionato.</p>
          )}
        </div>

        <div className="dash-admin-plans__preview" aria-label="Anteprima come la vedono i clienti">
          <div className="dash-admin-plans__preview-head">
            <strong>Anteprima cliente</strong>
            <span>Allineata alle card in dashboard</span>
          </div>
          <div className="dash-plans dash-admin-plans__preview-grid">
            {activePreview.length === 0 ? (
              <p className="dash-empty-mini">Nessun piano attivo da mostrare.</p>
            ) : (
              activePreview.map((p) => <CustomerPreviewCard key={p.key} plan={p} />)
            )}
          </div>
          {selected && !selected.active ? (
            <div className="dash-admin-plans__preview-off">
              <CustomerPreviewCard plan={selected} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
