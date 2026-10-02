import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ItaliaGeoSearchCombobox } from '../../../components/ItaliaGeoSearchCombobox'
import { MultiSelectSearchPicker } from '../../../components/MultiSelectSearchPicker'
import {
  IconCheckMark,
  IconChevronRight,
  IconClose,
  IconEye,
  IconStar,
  IconUpload,
} from '../../../components/icons/DashboardIcons'
import type { ItaliaGeoRow } from '../../../lib/italiaGeo/italiaComuniTypes'
import {
  CERTIFICATION_OPTIONS,
  normalizeCertifications,
  normalizeSpecializations,
  SPECIALIZATION_OPTIONS,
} from '../../../lib/professionalCompetences'
import type {
  ProfessionalProfile,
  ProfessionalProfilePatch,
} from '../../../lib/professionalProfileTypes'
import {
  getProfileCompletionChecklist,
  type ProfileCompletionSectionId,
} from '../../../services/professionalProfileService'

type ProfileStepId = 'dati' | 'competenze' | 'disponibilita' | 'zone'

const STEPS: Array<{ id: ProfileStepId; label: string; short: string }> = [
  { id: 'dati', label: 'Dati personali', short: 'Dati' },
  { id: 'competenze', label: 'Ruolo & competenze', short: 'Ruolo' },
  { id: 'disponibilita', label: 'Disponibilità & orari', short: 'Orari' },
  { id: 'zone', label: 'Tariffe & zone', short: 'Zone' },
]

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const LANGUAGES = ['Italiano', 'Inglese', 'Francese', 'Spagnolo', 'Rumeno', 'Ucraino', 'Filippino']
const EMPLOYMENT_TYPES = ['Convivente', 'A ore', 'Part-time', 'Weekend', 'Notte']
const SHIFTS = ['Mattina 7–13', 'Pomeriggio 13–19', 'Sera 19–23', 'Notte 23–7']
const NATIONALITIES = ['Italiana', 'Rumena', 'Ucraina', 'Filippina', 'Altra']
const CATEGORIES = ['Badante', 'OSS', 'Infermiere', 'Assistente familiare', 'Fisioterapista']
const EXPERIENCE_OPTIONS = ['Meno di 1 anno', '1-2 anni', '3-5 anni', '6-9 anni', '10+ anni']
const BIO_SUGGESTIONS = [
  'Somministrazione farmaci',
  'Mobilizzazione e igiene',
  'Supporto emotivo quotidiano',
  'Preparazione pasti',
]
const PRIMARY_RADIUS_KM = [5, 10, 15, 20, 30, 50] as const
const DEFAULT_PRIMARY_RADIUS_KM = 10

function RadiusRingVisual({ km, placeLabel }: { km: number; placeLabel: string }) {
  const max = PRIMARY_RADIUS_KM[PRIMARY_RADIUS_KM.length - 1]!
  const scale = Math.max(0.22, Math.min(1, km / max))
  const rings = PRIMARY_RADIUS_KM.map((option) => option / max)

  return (
    <div className="dash-prof-radius" aria-live="polite">
      <div className="dash-prof-radius__visual" aria-hidden>
        <svg viewBox="0 0 200 200" className="dash-prof-radius__svg">
          {rings.map((ratio) => (
            <circle
              key={ratio}
              cx="100"
              cy="100"
              r={18 + ratio * 72}
              fill="none"
              stroke={Math.abs(ratio - scale) < 0.02 ? 'var(--color-primary)' : 'rgba(22, 58, 82, 0.14)'}
              strokeWidth={Math.abs(ratio - scale) < 0.02 ? 2.5 : 1}
            />
          ))}
          <circle cx="100" cy="100" r={18 + scale * 72} fill="rgba(42, 92, 130, 0.12)" stroke="var(--color-primary)" strokeWidth="2" />
          <circle cx="100" cy="100" r="7" fill="var(--color-primary)" />
        </svg>
      </div>
      <div className="dash-prof-radius__copy">
        <strong>Raggio effettivo: {km} km</strong>
        <span>
          Operi entro circa {km} km da <em>{placeLabel}</em>
        </span>
      </div>
    </div>
  )
}

function formatCoverageLabel(place: ItaliaGeoRow): string {
  return `${place.comune} (${place.siglaProvincia})`
}
function formatProvinceLabel(place: ItaliaGeoRow): string {
  return `Provincia di ${place.provincia}`
}
function formatRegionLabel(place: ItaliaGeoRow): string {
  return place.regione
}

function initialsFromName(firstName: string, lastName: string): string {
  return `${(firstName.charAt(0) || '?').toUpperCase()}${(lastName.charAt(0) || '').toUpperCase()}`
}

function sectionToStep(id?: ProfileCompletionSectionId): ProfileStepId {
  switch (id) {
    case 'foto':
    case 'bio':
    case 'titolo':
    case 'lingue':
      return 'dati'
    case 'categoria':
    case 'specializzazioni':
      return 'competenze'
    case 'disponibilita':
      return 'disponibilita'
    case 'tariffe':
    case 'zone':
      return 'zone'
    default:
      return 'dati'
  }
}

function visibilityCopy(percent: number): { title: string; tip: string } {
  if (percent >= 85) {
    return {
      title: 'Ottimo livello di visibilità',
      tip: 'Manca poco al 100%: completa le ultime voci per comparire meglio nelle ricerche.',
    }
  }
  if (percent >= 55) {
    return {
      title: 'Buon livello di visibilità',
      tip: 'Aggiungi foto, bio e zone coperte per aumentare i contatti dalle famiglie.',
    }
  }
  return {
    title: 'Visibilità da potenziare',
    tip: 'Completa le sezioni sotto: ogni voce migliora posizione e fiducia.',
  }
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <div className="dash-prof-toggle">
      <div className="dash-prof-toggle__text">
        <span className="dash-prof-toggle__label">{label}</span>
        {hint ? <span className="dash-prof-toggle__hint">{hint}</span> : null}
      </div>
      <label className="dash-toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="dash-toggle__slider" />
      </label>
    </div>
  )
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={`dash-toast polish-toast${visible ? ' dash-toast--visible' : ''}`}>
      <span className="dash-toast__icon">
        <IconCheckMark size={18} />
      </span>
      {message}
    </div>
  )
}

type Props = {
  profile: ProfessionalProfile | null
  loading: boolean
  error: string | null
  saving: boolean
  saveError: string | null
  uploadBusy: boolean
  onReload: () => void
  onSave: (patch: ProfessionalProfilePatch) => Promise<boolean>
  onUploadPhoto: (file: File) => Promise<boolean>
}

export function ProfessionalProfileEditor({
  profile,
  loading,
  error,
  saving,
  saveError,
  uploadBusy,
  onReload,
  onSave,
  onUploadPhoto,
}: Props) {
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [step, setStep] = useState<ProfileStepId>('dati')
  const [saved, setSaved] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [formReady, setFormReady] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [professionalTitle, setProfessionalTitle] = useState('')
  const [birthYear, setBirthYear] = useState(1982)
  const [nationality, setNationality] = useState('Rumena')
  const [bio, setBio] = useState('')
  const [category, setCategory] = useState('Badante')
  const [experienceYears, setExperienceYears] = useState('6-9 anni')
  const [hasCar, setHasCar] = useState(false)
  const [hasLicense, setHasLicense] = useState(true)
  const [availableToMove, setAvailableToMove] = useState(false)
  const [hourlyRate, setHourlyRate] = useState(12)
  const [monthlyRate, setMonthlyRate] = useState(1200)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [specializations, setSpecializations] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([])
  const [shifts, setShifts] = useState<string[]>([])
  const [certifications, setCertifications] = useState<string[]>([])
  const [zones, setZones] = useState<string[]>([])
  const [primaryZone, setPrimaryZone] = useState('')
  const [radiusKm, setRadiusKm] = useState<number | null>(null)
  const [primaryPlace, setPrimaryPlace] = useState<ItaliaGeoRow | null>(null)
  const [availableFrom, setAvailableFrom] = useState('')
  const [coverageSearchKey, setCoverageSearchKey] = useState(0)
  const [coveragePick, setCoveragePick] = useState<ItaliaGeoRow | null>(null)

  useEffect(() => {
    if (!profile) {
      setFormReady(false)
      return
    }
    setFirstName(profile.identity.firstName)
    setLastName(profile.identity.lastName)
    setProfessionalTitle(profile.identity.professionalTitle)
    setBirthYear(profile.identity.birthYear)
    setNationality(profile.identity.nationality)
    setBio(profile.identity.bio)
    setCategory(profile.professional.category)
    setExperienceYears(profile.professional.experienceYears)
    setSpecializations(normalizeSpecializations(profile.professional.specializations))
    setLanguages(profile.professional.languages)
    const certNorm = normalizeCertifications(profile.certifications)
    setHasLicense(profile.professional.hasLicense || certNorm.hadDriverLicense)
    setHasCar(profile.professional.hasCar)
    setEmploymentTypes(profile.availability.employmentTypes)
    setSelectedDays(profile.availability.days)
    setShifts(profile.availability.shifts)
    setAvailableFrom(profile.availability.availableFrom)
    setHourlyRate(profile.rates.hourly)
    setMonthlyRate(profile.rates.monthlyLiveIn)
    setZones(profile.zones)
    setPrimaryZone(profile.primaryZone)
    setRadiusKm(profile.radiusKm ?? null)
    setPrimaryPlace(null)
    setAvailableToMove(profile.availableToMove)
    setCertifications(certNorm.certifications)
    setFormReady(true)
  }, [profile])

  const draftProfile = useMemo((): ProfessionalProfile | null => {
    if (!profile) return null
    return {
      ...profile,
      identity: {
        ...profile.identity,
        firstName,
        lastName,
        professionalTitle,
        birthYear,
        nationality,
        bio,
      },
      professional: {
        ...profile.professional,
        category,
        experienceYears,
        specializations,
        languages,
        hasLicense,
        hasCar,
      },
      availability: {
        employmentTypes,
        days: selectedDays,
        shifts,
        availableFrom,
      },
      rates: {
        hourly: hourlyRate,
        monthlyLiveIn: monthlyRate,
      },
      zones,
      primaryZone,
      radiusKm,
      availableToMove,
      certifications,
    }
  }, [
    profile,
    firstName,
    lastName,
    professionalTitle,
    birthYear,
    nationality,
    bio,
    category,
    experienceYears,
    specializations,
    languages,
    hasLicense,
    hasCar,
    employmentTypes,
    selectedDays,
    shifts,
    availableFrom,
    hourlyRate,
    monthlyRate,
    zones,
    primaryZone,
    radiusKm,
    availableToMove,
    certifications,
  ])

  const checklist = useMemo(
    () => getProfileCompletionChecklist(draftProfile),
    [draftProfile],
  )
  const doneCount = checklist.filter((i) => i.done).length
  const livePercent =
    checklist.length === 0 ? 0 : Math.round((doneCount / checklist.length) * 100)
  const pending = checklist.filter((i) => !i.done)
  const vis = visibilityCopy(livePercent)

  const stepDone = useMemo(() => {
    const map: Record<ProfileStepId, boolean> = {
      dati: false,
      competenze: false,
      disponibilita: false,
      zone: false,
    }
    const byStep: Record<ProfileStepId, { total: number; done: number }> = {
      dati: { total: 0, done: 0 },
      competenze: { total: 0, done: 0 },
      disponibilita: { total: 0, done: 0 },
      zone: { total: 0, done: 0 },
    }
    for (const item of checklist) {
      const s = sectionToStep(item.id)
      byStep[s].total += 1
      if (item.done) byStep[s].done += 1
    }
    for (const s of STEPS) {
      map[s.id] = byStep[s.id].total > 0 && byStep[s.id].done === byStep[s.id].total
    }
    return map
  }, [checklist])

  const toggle = (arr: string[], set: (v: string[]) => void, item: string) => {
    set(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item])
  }

  const buildPatch = (): ProfessionalProfilePatch => ({
    identity: {
      firstName,
      lastName,
      professionalTitle,
      birthYear,
      nationality,
      bio,
    },
    professional: {
      category,
      experienceYears,
      specializations,
      languages,
      hasLicense,
      hasCar,
    },
    availability: {
      employmentTypes,
      days: selectedDays,
      shifts,
      availableFrom,
    },
    rates: {
      hourly: hourlyRate,
      monthlyLiveIn: monthlyRate,
    },
    zones,
    primaryZone,
    radiusKm,
    availableToMove,
    certifications,
  })

  const handleSave = async () => {
    const ok = await onSave(buildPatch())
    if (!ok) return
    setSaved(true)
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    toastTimeout.current = setTimeout(() => setSaved(false), 3000)
  }

  const addCoverageLabel = (label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    setZones((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
  }

  const addCoveragePlace = (place: ItaliaGeoRow | null) => {
    if (!place) return
    setCoveragePick(place)
    setCoverageSearchKey((k) => k + 1)
  }

  const confirmCoverageScope = (scope: 'comune' | 'provincia' | 'regione') => {
    if (!coveragePick) return
    if (scope === 'comune') addCoverageLabel(formatCoverageLabel(coveragePick))
    if (scope === 'provincia') addCoverageLabel(formatProvinceLabel(coveragePick))
    if (scope === 'regione') addCoverageLabel(formatRegionLabel(coveragePick))
    setCoveragePick(null)
  }

  const appendBioSuggestion = (text: string) => {
    setBio((prev) => {
      const base = prev.trim()
      const next = base ? `${base}${base.endsWith('.') ? '' : '.'} ${text}` : text
      return next.slice(0, 500)
    })
  }

  const goStep = (id: ProfileStepId) => {
    setStep(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const nextStep = STEPS[stepIndex + 1]
  const prevStep = STEPS[stepIndex - 1]

  if (loading) {
    return (
      <div className="dash-prof-editor" aria-busy="true" aria-label="Caricamento profilo">
        <div className="dash-skeleton dash-skeleton--title" style={{ width: 260, height: 32 }} />
        <div className="dash-skeleton" style={{ width: '100%', height: 72, marginTop: 16 }} />
        <div className="dash-skeleton" style={{ width: '100%', height: 320, marginTop: 16 }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="dash-empty-state" role="alert">
        <div className="dash-empty-state__title">Impossibile caricare il profilo</div>
        <div className="dash-empty-state__sub">{error}</div>
        <button type="button" className="dash-btn dash-btn--primary" onClick={onReload}>
          Riprova
        </button>
      </div>
    )
  }

  if (!profile || !formReady || !draftProfile) return null

  const displayName = `${firstName || 'Nome'} ${lastName || ''}`.trim()
  const locationHint = primaryZone
    ? radiusKm
      ? `${primaryZone} · ${radiusKm} km`
      : primaryZone
    : zones[0] || 'Zona non impostata'
  const publicHref = `/profili/${profile.id}`

  const previewPanel = (
    <aside className="dash-prof-aside">
      <div className="dash-prof-aside__card">
        <div className="dash-prof-aside__kicker">Anteprima scheda famiglie</div>
        <div className="dash-prof-preview">
          <div className="dash-prof-preview__top">
            {profile.identity.photoUrl ? (
              <img
                className="dash-prof-preview__avatar"
                src={profile.identity.photoUrl}
                alt=""
                width={56}
                height={56}
              />
            ) : (
              <div className="dash-prof-preview__avatar dash-prof-preview__avatar--fallback">
                {initialsFromName(firstName, lastName)}
              </div>
            )}
            <div className="dash-prof-preview__meta">
              <strong>{displayName}</strong>
              <span className="dash-prof-preview__role">
                {category || 'Professionista'}
                {experienceYears ? ` · ${experienceYears}` : ''}
              </span>
              <span className="dash-prof-preview__loc">{locationHint}</span>
            </div>
          </div>
          <div className="dash-prof-preview__stats">
            <span>
              <IconStar size={14} /> Nuovo
            </span>
            <span>€{hourlyRate}/ora</span>
          </div>
          {professionalTitle ? (
            <p className="dash-prof-preview__title">{professionalTitle}</p>
          ) : (
            <p className="dash-prof-preview__title dash-prof-preview__title--muted">
              Aggiungi un titolo professionale
            </p>
          )}
          <Link to={publicHref} className="dash-btn dash-btn--primary dash-btn--sm" style={{ width: '100%' }}>
            Contatta {firstName || 'professionista'}
          </Link>
        </div>

        <div className="dash-prof-checklist">
          <div className="dash-prof-checklist__title">
            Cosa manca per il 100%?
            <span>
              {doneCount}/{checklist.length}
            </span>
          </div>
          <ul className="dash-prof-checklist__list">
            {(pending.length > 0 ? pending : checklist).slice(0, 6).map((item) => (
              <li key={`${item.id}-${item.label}`}>
                <button
                  type="button"
                  className={`dash-prof-checklist__item${item.done ? ' is-done' : ''}`}
                  onClick={() => {
                    goStep(sectionToStep(item.id))
                    setPreviewOpen(false)
                  }}
                >
                  <span className="dash-prof-checklist__icon" aria-hidden>
                    {item.done ? <IconCheckMark size={12} /> : '+'}
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    <em>{item.hint}</em>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="dash-prof-editor">
      <header className="dash-prof-editor__header">
        <div>
          <h2 className="dash-prof-editor__title">Modifica profilo professionale</h2>
          <p className="dash-prof-editor__sub">
            Come appare a famiglie, strutture e agenzie — completa le sezioni per aumentare i contatti.
          </p>
        </div>
        <div className="dash-prof-editor__actions">
          <button
            type="button"
            className="dash-btn dash-btn--ghost dash-prof-editor__preview-btn"
            onClick={() => setPreviewOpen(true)}
          >
            <IconEye size={16} /> Anteprima
          </button>
          <Link to={publicHref} className="dash-btn dash-btn--ghost dash-prof-editor__public-btn">
            <IconEye size={16} /> Anteprima pubblica
          </Link>
          <button
            type="button"
            className="dash-btn dash-btn--primary dash-prof-save-desktop"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>
      </header>

      <div
        className="dash-prof-visibility"
        style={{ '--prof-vis': `${livePercent}%` } as CSSProperties}
      >
        <div className="dash-prof-visibility__top">
          <strong>
            {livePercent}% · {vis.title}
          </strong>
          <span>
            {doneCount} di {checklist.length} voci complete
          </span>
        </div>
        <div className="dash-prof-visibility__track" aria-hidden>
          <div className="dash-prof-visibility__fill" />
        </div>
        <p className="dash-prof-visibility__tip">{vis.tip}</p>
      </div>

      {saveError ? (
        <div className="dash-card" role="alert" style={{ marginBottom: 16, borderColor: 'var(--color-accent)' }}>
          {saveError}
        </div>
      ) : null}

      <nav className="dash-prof-steps" aria-label="Sezioni profilo">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`dash-prof-steps__item${step === s.id ? ' is-active' : ''}${stepDone[s.id] ? ' is-done' : ''}`}
            onClick={() => goStep(s.id)}
          >
            <span className="dash-prof-steps__num" aria-hidden>
              {stepDone[s.id] ? <IconCheckMark size={14} /> : i + 1}
            </span>
            <span className="dash-prof-steps__label">
              <span className="dash-prof-steps__label-full">{s.label}</span>
              <span className="dash-prof-steps__label-short">{s.short}</span>
            </span>
          </button>
        ))}
      </nav>

      <div className="dash-prof-editor__layout">
        <div className="dash-prof-editor__main">
          {step === 'dati' ? (
            <section className="dash-prof-panel" id="prof-section-foto">
              <div className="dash-prof-panel__head">
                <h3>Scheda anagrafica & bio</h3>
                <p>Foto, identità e presentazione: la prima cosa che vedono le famiglie.</p>
              </div>

              <div className="dash-prof-photo">
                {profile.identity.photoUrl ? (
                  <img
                    className="dash-prof-photo__img"
                    src={profile.identity.photoUrl}
                    alt={`Foto di ${firstName} ${lastName}`}
                    width={88}
                    height={88}
                  />
                ) : (
                  <div className="dash-prof-photo__img dash-prof-photo__img--fallback">
                    {initialsFromName(firstName, lastName)}
                  </div>
                )}
                <div className="dash-prof-photo__body">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (file) void onUploadPhoto(file)
                    }}
                  />
                  <button
                    type="button"
                    className="dash-btn dash-btn--ghost"
                    disabled={uploadBusy}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <IconUpload size={16} /> {uploadBusy ? 'Caricamento…' : 'Cambia foto'}
                  </button>
                  <p className="dash-form-hint">
                    JPG o PNG, max 2 MB. Una foto chiara aumenta i contatti.
                  </p>
                </div>
              </div>

              <div className="dash-form-grid">
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="prof-first-name">
                    Nome
                  </label>
                  <input
                    id="prof-first-name"
                    className="dash-form-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="prof-last-name">
                    Cognome
                  </label>
                  <input
                    id="prof-last-name"
                    className="dash-form-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="prof-birth-year">
                    Anno di nascita
                  </label>
                  <select
                    id="prof-birth-year"
                    className="dash-form-select"
                    value={birthYear}
                    onChange={(e) => setBirthYear(Number(e.target.value))}
                  >
                    {Array.from({ length: 50 }, (_, i) => 1955 + i).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="prof-nationality">
                    Nazionalità
                  </label>
                  <select
                    id="prof-nationality"
                    className="dash-form-select"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                  >
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dash-form-field dash-form-field--full" id="prof-section-titolo">
                  <label className="dash-form-label" htmlFor="prof-title">
                    Titolo professionale sintetico
                  </label>
                  <input
                    id="prof-title"
                    className="dash-form-input"
                    value={professionalTitle}
                    onChange={(e) => setProfessionalTitle(e.target.value)}
                    placeholder="Es. Badante esperta — Torino e provincia"
                  />
                  <p className="dash-form-hint">Una riga chiara su ruolo e zona aiuta nelle ricerche.</p>
                </div>
                <div className="dash-form-field dash-form-field--full" id="prof-section-bio">
                  <label className="dash-form-label" htmlFor="prof-bio">
                    <span>Bio e approccio alla cura</span>
                    <span className="dash-form-label__counter">{bio.length}/500</span>
                  </label>
                  <textarea
                    id="prof-bio"
                    className="dash-form-input dash-form-textarea"
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 500))}
                    rows={5}
                    placeholder="Racconta esperienza, stile di lavoro e cosa ti distingue…"
                  />
                  <div className="dash-prof-suggest">
                    <span>Suggerimenti rapidi</span>
                    <div className="dash-prof-suggest__chips">
                      {BIO_SUGGESTIONS.map((s) => (
                        <button key={s} type="button" onClick={() => appendBioSuggestion(s)}>
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="dash-prof-panel__block" id="prof-section-lingue">
                <div className="dash-prof-section__title">Lingue parlate</div>
                <div className="dash-prof-lang">
                  {LANGUAGES.map((l) => {
                    const on = languages.includes(l)
                    return (
                      <button
                        key={l}
                        type="button"
                        className={`dash-prof-lang__chip${on ? ' is-on' : ''}`}
                        onClick={() => toggle(languages, setLanguages, l)}
                      >
                        {l}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="dash-prof-toggles">
                <Toggle
                  checked={hasLicense}
                  onChange={setHasLicense}
                  label="Patente B"
                  hint="Necessaria per accompagnamenti"
                />
                <Toggle
                  checked={hasCar}
                  onChange={setHasCar}
                  label="Automunita"
                  hint="Veicolo proprio"
                />
              </div>
            </section>
          ) : null}

          {step === 'competenze' ? (
            <section className="dash-prof-panel" id="prof-section-categoria">
              <div className="dash-prof-panel__head">
                <h3>Ruolo & competenze</h3>
                <p>Categoria, esperienza, specializzazioni e certificazioni dichiarate.</p>
              </div>
              <div className="dash-form-grid">
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="prof-category">
                    Categoria principale
                  </label>
                  <select
                    id="prof-category"
                    className="dash-form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label" htmlFor="prof-experience">
                    Anni di esperienza
                  </label>
                  <select
                    id="prof-experience"
                    className="dash-form-select"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                  >
                    {EXPERIENCE_OPTIONS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="dash-prof-panel__block" id="prof-section-specializzazioni">
                <div className="dash-prof-section__title">Specializzazioni</div>
                <p className="dash-prof-section__hint">
                  Ambiti di cura e tipologie di assistiti in cui hai esperienza.
                </p>
                <MultiSelectSearchPicker
                  title="Seleziona specializzazioni"
                  description="Cerca e seleziona gli ambiti in cui sei operativo. Puoi sceglierne più di uno."
                  options={SPECIALIZATION_OPTIONS}
                  value={specializations}
                  onChange={setSpecializations}
                  emptyLabel="Nessuna specializzazione selezionata"
                  triggerLabel="Seleziona specializzazioni"
                />
              </div>

              <div className="dash-prof-panel__block">
                <div className="dash-prof-section__title">Certificazioni e corsi</div>
                <p className="dash-prof-section__hint">
                  Titoli e corsi formali. La patente resta nel toggle «Patente B» nei dati personali.
                </p>
                <MultiSelectSearchPicker
                  title="Seleziona certificazioni"
                  description="Cerca e seleziona titoli o corsi. Niente patente qui: usala nel passo Dati personali."
                  options={CERTIFICATION_OPTIONS}
                  value={certifications}
                  onChange={setCertifications}
                  emptyLabel="Nessuna certificazione selezionata"
                  triggerLabel="Seleziona certificazioni"
                />
              </div>
            </section>
          ) : null}

          {step === 'disponibilita' ? (
            <section className="dash-prof-panel" id="prof-section-disponibilita">
              <div className="dash-prof-panel__head">
                <h3>Disponibilità & orari</h3>
                <p>Tipo di impiego, giorni e fasce in cui sei raggiungibile.</p>
              </div>

              <div className="dash-prof-panel__block">
                <div className="dash-prof-section__title">Tipo di impiego</div>
                <div className="dash-checkbox-group">
                  {EMPLOYMENT_TYPES.map((t) => (
                    <label key={t} className="dash-checkbox-item">
                      <input
                        type="checkbox"
                        checked={employmentTypes.includes(t)}
                        onChange={() => toggle(employmentTypes, setEmploymentTypes, t)}
                      />
                      <span className="dash-checkbox-item__label">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="dash-prof-panel__block">
                <div className="dash-prof-section__title">Giorni disponibili</div>
                <div className="dash-days-grid">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`dash-day-pill${selectedDays.includes(d) ? ' dash-day-pill--selected' : ''}`}
                      onClick={() => toggle(selectedDays, setSelectedDays, d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dash-prof-panel__block">
                <div className="dash-prof-section__title">Fasce orarie</div>
                <div className="dash-checkbox-group">
                  {SHIFTS.map((s) => (
                    <label key={s} className="dash-checkbox-item">
                      <input
                        type="checkbox"
                        checked={shifts.includes(s)}
                        onChange={() => toggle(shifts, setShifts, s)}
                      />
                      <span className="dash-checkbox-item__label">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="dash-form-field" style={{ maxWidth: 280 }}>
                <label className="dash-form-label" htmlFor="prof-available-from">
                  Disponibile da
                </label>
                <input
                  id="prof-available-from"
                  className="dash-form-input"
                  type="date"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                />
              </div>
            </section>
          ) : null}

          {step === 'zone' ? (
            <section className="dash-prof-panel" id="prof-section-zone">
              <div className="dash-prof-panel__head">
                <h3>Tariffe & zone</h3>
                <p>Dove lavori e quanto chiedi: ricerca geo come in home, senza documenti.</p>
              </div>

              <div className="dash-prof-panel__block">
                <div className="dash-form-field">
                  <span className="dash-form-label">Zona di lavoro principale</span>
                  {primaryZone && !primaryPlace ? (
                    <div className="dash-chip-group" style={{ marginBottom: 8 }}>
                      <span className="dash-chip">
                        {primaryZone}
                        <button
                          type="button"
                          className="dash-chip__remove"
                          onClick={() => {
                            setPrimaryZone('')
                            setPrimaryPlace(null)
                            setRadiusKm(null)
                          }}
                          aria-label="Rimuovi zona principale"
                        >
                          <IconClose size={12} />
                        </button>
                      </span>
                    </div>
                  ) : null}
                  <div className="dash-prof-geo">
                    <ItaliaGeoSearchCombobox
                      selectedPlace={primaryPlace}
                      onSelectedPlaceChange={(place) => {
                        setPrimaryPlace(place)
                        setPrimaryZone(place ? formatCoverageLabel(place) : '')
                        if (place) {
                          setRadiusKm((prev) => prev ?? DEFAULT_PRIMARY_RADIUS_KM)
                        } else {
                          setRadiusKm(null)
                        }
                      }}
                    />
                  </div>
                  <p className="dash-form-hint">Cerca comune, CAP, provincia o regione</p>
                </div>

                {primaryZone ? (
                  <div className="dash-prof-panel__block dash-prof-panel__block--nested">
                    <div className="dash-prof-section__title">Raggio operativo</div>
                    <p className="dash-form-hint" style={{ marginTop: 0 }}>
                      Dopo la città, indica entro quanti km sei disponibile a lavorare.
                    </p>
                    <div className="dash-prof-radius__chips" role="group" aria-label="Raggio in chilometri">
                      {PRIMARY_RADIUS_KM.map((km) => {
                        const on = radiusKm === km
                        return (
                          <button
                            key={km}
                            type="button"
                            className={`dash-prof-lang__chip${on ? ' is-on' : ''}`}
                            aria-pressed={on}
                            onClick={() => setRadiusKm(km)}
                          >
                            {km} km
                          </button>
                        )
                      })}
                    </div>
                    {radiusKm ? (
                      <RadiusRingVisual km={radiusKm} placeLabel={primaryZone} />
                    ) : (
                      <p className="dash-form-hint">Seleziona un raggio per vedere l’area effettiva.</p>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="dash-prof-panel__block">
                <div className="dash-prof-section__title">Province / regioni coperte</div>
                <p className="dash-form-hint" style={{ marginTop: 0 }}>
                  Cerca come in home, poi scegli comune, provincia o regione.
                </p>
                <div className="dash-chip-group">
                  {zones.map((z) => (
                    <span key={z} className="dash-chip">
                      {z}
                      <button
                        type="button"
                        className="dash-chip__remove"
                        onClick={() => setZones(zones.filter((x) => x !== z))}
                        aria-label={`Rimuovi ${z}`}
                      >
                        <IconClose size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="dash-prof-geo">
                  <ItaliaGeoSearchCombobox
                    key={coverageSearchKey}
                    selectedPlace={null}
                    onSelectedPlaceChange={addCoveragePlace}
                  />
                </div>
                {coveragePick ? (
                  <div className="dash-prof-geo-pick" role="group" aria-label="Aggiungi area coperta">
                    <p className="dash-form-hint" style={{ marginTop: 0 }}>
                      Aggiungi da <strong>{coveragePick.comune}</strong>:
                    </p>
                    <div className="dash-prof-geo-pick__actions">
                      <button
                        type="button"
                        className="dash-btn dash-btn--ghost dash-btn--sm"
                        onClick={() => confirmCoverageScope('comune')}
                      >
                        {formatCoverageLabel(coveragePick)}
                      </button>
                      <button
                        type="button"
                        className="dash-btn dash-btn--ghost dash-btn--sm"
                        onClick={() => confirmCoverageScope('provincia')}
                      >
                        {formatProvinceLabel(coveragePick)}
                      </button>
                      <button
                        type="button"
                        className="dash-btn dash-btn--ghost dash-btn--sm"
                        onClick={() => confirmCoverageScope('regione')}
                      >
                        {formatRegionLabel(coveragePick)}
                      </button>
                      <button
                        type="button"
                        className="dash-btn dash-btn--ghost dash-btn--sm"
                        onClick={() => setCoveragePick(null)}
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <Toggle
                checked={availableToMove}
                onChange={setAvailableToMove}
                label="Disponibile a spostarsi"
                hint="Anche fuori dalla zona principale"
              />

              <div className="dash-prof-panel__block" id="prof-section-tariffe">
                <div className="dash-range-group">
                  <label className="dash-form-label">
                    Tariffa oraria
                    <span className="dash-range-value">€{hourlyRate}/h</span>
                  </label>
                  <input
                    type="range"
                    className="dash-range-input"
                    min={8}
                    max={25}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                  />
                  <div className="dash-range-limits">
                    <span>€8/h</span>
                    <span>€25/h</span>
                  </div>
                </div>
                <div className="dash-range-group" style={{ marginTop: 'var(--space-4)' }}>
                  <label className="dash-form-label">
                    Tariffa mensile convivente
                    <span className="dash-range-value">€{monthlyRate}/mese</span>
                  </label>
                  <input
                    type="range"
                    className="dash-range-input"
                    min={800}
                    max={2000}
                    step={50}
                    value={monthlyRate}
                    onChange={(e) => setMonthlyRate(Number(e.target.value))}
                  />
                  <div className="dash-range-limits">
                    <span>€800</span>
                    <span>€2.000</span>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <div className="dash-prof-panel__footer">
            {prevStep ? (
              <button type="button" className="dash-btn dash-btn--ghost" onClick={() => goStep(prevStep.id)}>
                Indietro
              </button>
            ) : (
              <span />
            )}
            {nextStep ? (
              <button type="button" className="dash-btn dash-btn--primary" onClick={() => goStep(nextStep.id)}>
                Prosegui: {nextStep.short}
                <IconChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="dash-btn dash-btn--primary"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? 'Salvataggio…' : 'Salva profilo'}
              </button>
            )}
          </div>
        </div>

        <div className="dash-prof-editor__aside-desktop">{previewPanel}</div>
      </div>

      {previewOpen ? (
        <div className="dash-prof-sheet" role="dialog" aria-modal="true" aria-label="Anteprima profilo">
          <button
            type="button"
            className="dash-prof-sheet__backdrop"
            aria-label="Chiudi anteprima"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="dash-prof-sheet__panel">
            <div className="dash-prof-sheet__bar">
              <strong>Anteprima</strong>
              <button type="button" className="dash-btn dash-btn--ghost dash-btn--sm" onClick={() => setPreviewOpen(false)}>
                Chiudi
              </button>
            </div>
            {previewPanel}
          </div>
        </div>
      ) : null}

      <div className="dash-prof-save-bar">
        <button
          type="button"
          className="dash-btn dash-btn--ghost"
          onClick={() => setPreviewOpen(true)}
        >
          Anteprima
        </button>
        <button
          type="button"
          className="dash-btn dash-btn--primary"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>

      <Toast message="Profilo aggiornato con successo!" visible={saved} />
    </div>
  )
}
