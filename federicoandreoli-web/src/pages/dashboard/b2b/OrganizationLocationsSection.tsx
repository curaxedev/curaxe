import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ItaliaGeoSearchCombobox } from '../../../components/ItaliaGeoSearchCombobox'
import type { ItaliaGeoRow } from '../../../lib/italiaGeo/italiaComuniTypes'
import type {
  OrganizationLocation,
  OrganizationLocationInput,
} from '../../../lib/locationTypes'
import { geoRowToLocationAddress } from '../../../services/locationService'
import { useOrganizationLocations } from '../../../hooks/useOrganizationLocations'
import {
  IconAlert,
  IconMapPin,
  IconPlus,
} from '../../../components/icons/DashboardIcons'

type FormState = {
  name: string
  phone: string
  addressLine: string
  isPrimary: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  phone: '',
  addressLine: '',
  isPrimary: false,
}

function locationToForm(loc: OrganizationLocation): FormState {
  return {
    name: loc.name,
    phone: loc.phone,
    addressLine: loc.address.addressLine,
    isPrimary: loc.isPrimary,
  }
}

function LocationsSkeleton() {
  return (
    <div className="dash-card" aria-busy="true" aria-label="Caricamento sedi">
      <div className="dash-skeleton" style={{ width: 180, height: 20, marginBottom: 16 }} />
      <div className="dash-skeleton" style={{ width: '100%', height: 72, marginBottom: 12 }} />
      <div className="dash-skeleton" style={{ width: '100%', height: 72 }} />
    </div>
  )
}

export function OrganizationLocationsSection() {
  const {
    locations,
    loading,
    error,
    saving,
    saveError,
    deletingId,
    reload,
    clearSaveFeedback,
    createLocation,
    updateLocation,
    deleteLocation,
    setPrimary,
  } = useOrganizationLocations()

  const [panelMode, setPanelMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [selectedPlace, setSelectedPlace] = useState<ItaliaGeoRow | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const resetPanel = useCallback(() => {
    setPanelMode('closed')
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSelectedPlace(null)
    clearSaveFeedback()
  }, [clearSaveFeedback])

  const openCreate = () => {
    resetPanel()
    setPanelMode('create')
    setForm({ ...EMPTY_FORM, isPrimary: locations.length === 0 })
  }

  const openEdit = (loc: OrganizationLocation) => {
    clearSaveFeedback()
    setPanelMode('edit')
    setEditingId(loc.id)
    setForm(locationToForm(loc))
    setSelectedPlace({
      id: loc.address.istat,
      comune: loc.address.comune,
      siglaProvincia: loc.address.provincia,
      provincia: loc.address.provincia,
      cap: loc.address.cap,
      regione: loc.address.regione,
    })
  }

  useEffect(() => {
    if (!successMessage) return undefined
    const t = window.setTimeout(() => setSuccessMessage(null), 4000)
    return () => window.clearTimeout(t)
  }, [successMessage])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedPlace) {
      clearSaveFeedback()
      return
    }

    const input: OrganizationLocationInput = {
      name: form.name,
      phone: form.phone,
      isPrimary: form.isPrimary,
      address: geoRowToLocationAddress(selectedPlace, form.addressLine),
    }

    if (panelMode === 'create') {
      const created = await createLocation(input)
      if (created) {
        setSuccessMessage('Sede aggiunta.')
        resetPanel()
      }
      return
    }

    if (panelMode === 'edit' && editingId) {
      const updated = await updateLocation(editingId, input)
      if (updated) {
        setSuccessMessage('Sede aggiornata.')
        resetPanel()
      }
    }
  }

  const handleDelete = async (loc: OrganizationLocation) => {
    const ok = window.confirm(`Eliminare la sede «${loc.name}»?`)
    if (!ok) return
    const deleted = await deleteLocation(loc.id)
    if (deleted) {
      setSuccessMessage('Sede eliminata.')
      if (editingId === loc.id) resetPanel()
    }
  }

  return (
    <div className="dash-card" style={{ marginTop: 'var(--space-5)' }}>
      <div className="dash-section-header" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <div className="dash-card__title">Sedi operative</div>
          <p className="dash-section__subtitle" style={{ marginTop: 4 }}>
            Filiali e punti operativi visibili sulla scheda pubblica e negli annunci
          </p>
        </div>
        <button
          type="button"
          className="dash-btn dash-btn--primary"
          onClick={openCreate}
          disabled={panelMode === 'create'}
        >
          <IconPlus size={16} />
          Aggiungi sede
        </button>
      </div>

      {error ? (
        <div className="dash-b2b-alert" role="alert">
          <IconAlert size={16} />
          <span>{error}</span>
          <button type="button" className="dash-btn dash-btn--ghost" onClick={() => void reload()}>
            Riprova
          </button>
        </div>
      ) : null}

      {successMessage ? (
        <p className="dash-b2b-success" role="status">
          {successMessage}
        </p>
      ) : null}

      {saveError ? (
        <div className="dash-b2b-alert" role="alert">
          <IconAlert size={16} />
          <span>{saveError}</span>
        </div>
      ) : null}

      {loading ? (
        <LocationsSkeleton />
      ) : locations.length === 0 ? (
        <div className="dash-empty-state dash-empty-state--compact">
          <div className="dash-empty-state__icon">
            <IconMapPin size={24} />
          </div>
          <div className="dash-empty-state__title">Nessuna sede</div>
          <div className="dash-empty-state__sub">
            Aggiungi la sede principale per pubblicare annunci con indirizzo coerente.
          </div>
        </div>
      ) : (
        <ul className="dash-locations-list">
          {locations.map((loc) => (
            <li key={loc.id} className="dash-location-item">
              <div className="dash-location-item__main">
                <div>
                  <div className="dash-location-item__name">
                    {loc.name}
                    {loc.isPrimary ? (
                      <span className="dash-badge dash-badge--active">Principale</span>
                    ) : null}
                  </div>
                  <div className="dash-location-item__meta">
                    {loc.address.comune} ({loc.address.provincia}) · CAP {loc.address.cap}
                    {loc.address.addressLine ? ` · ${loc.address.addressLine}` : null}
                  </div>
                  {loc.phone ? (
                    <div className="dash-location-item__meta">{loc.phone}</div>
                  ) : null}
                </div>
                <div className="dash-location-item__actions">
                  {!loc.isPrimary ? (
                    <button
                      type="button"
                      className="dash-btn dash-btn--ghost"
                      disabled={saving}
                      onClick={() => void setPrimary(loc.id)}
                    >
                      Imposta principale
                    </button>
                  ) : null}
                  <button type="button" className="dash-btn dash-btn--ghost" onClick={() => openEdit(loc)}>
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="dash-btn dash-btn--ghost"
                    disabled={deletingId === loc.id || locations.length <= 1}
                    onClick={() => void handleDelete(loc)}
                  >
                    {deletingId === loc.id ? 'Eliminazione…' : 'Elimina'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {panelMode !== 'closed' ? (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="dash-location-form"
        >
          <div className="dash-card__title" style={{ marginBottom: 'var(--space-3)' }}>
            {panelMode === 'create' ? 'Nuova sede' : 'Modifica sede'}
          </div>
          <div className="dash-form-grid">
            <div className="dash-form-field dash-form-field--full">
              <label className="dash-form-label" htmlFor="loc-name">
                Nome sede
              </label>
              <input
                id="loc-name"
                className="dash-form-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Es. Sede principale — Monza"
                required
              />
            </div>
            <div className="dash-form-field">
              <label className="dash-form-label">Comune</label>
              <ItaliaGeoSearchCombobox
                selectedPlace={selectedPlace}
                onSelectedPlaceChange={setSelectedPlace}
              />
            </div>
            <div className="dash-form-field">
              <label className="dash-form-label" htmlFor="loc-address">
                Indirizzo
              </label>
              <input
                id="loc-address"
                className="dash-form-input"
                value={form.addressLine}
                onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
                placeholder="Via e numero civico"
              />
            </div>
            <div className="dash-form-field">
              <label className="dash-form-label" htmlFor="loc-phone">
                Telefono (opz.)
              </label>
              <input
                id="loc-phone"
                className="dash-form-input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="dash-form-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label className="dash-toggle-row" style={{ width: '100%' }}>
                <span className="dash-toggle-label">Sede principale</span>
                <input
                  type="checkbox"
                  checked={form.isPrimary}
                  onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                />
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
            <button type="submit" className="dash-btn dash-btn--primary" disabled={saving || !selectedPlace}>
              {saving ? 'Salvataggio…' : 'Salva sede'}
            </button>
            <button type="button" className="dash-btn dash-btn--ghost" onClick={resetPanel} disabled={saving}>
              Annulla
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
