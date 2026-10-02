import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../auth/useAuth'
import { useApplications } from '../../../hooks/useApplications'
import { useBillingSubscription } from '../../../hooks/useBillingSubscription'
import { useMessaging } from '../../../hooks/useMessaging'
import { useNotifications } from '../../../hooks/useNotifications'
import { useProfessionalProfile } from '../../../hooks/useProfessionalProfile'
import { AccountSettingsSection } from '../AccountSettingsSection'
import { DashboardMessagingSection } from '../DashboardMessagingSection'
import { DashboardNotificationsSection } from '../DashboardNotificationsSection'
import {
  SectionApplications,
  SectionOpenPositions,
} from './ProfessionalApplicationsSections'
import { ProfileCompletionGuide } from './ProfileCompletionGuide'
import {
  getProfileCompletionChecklist,
  type ProfileCompletionSectionId,
} from '../../../services/professionalProfileService'
import type { MessageThread, MessagingParticipantRole } from '../../../lib/messagingTypes'
import { showBillingDemoCopy } from '../../../lib/billingFeatures'
import { BILLING_PRODUCTS, formatBillingAmount, formatBillingDate } from '../../../lib/billingApi'
import type { PlanType } from '../../../lib/billingTypes'
import {
  fetchProfessionalHomeStats,
  type ProfessionalHomeStats,
} from '../../../lib/professionalStatsApi'
import type {
  ProfessionalDocument,
  ProfessionalDocumentSlot,
} from '../../../lib/professionalProfileApi'
import type { ProfessionalProfile, ProfessionalProfilePatch } from '../../../lib/professionalProfileTypes'
import {
  IconBell,
  IconBriefcase,
  IconCheck,
  IconCheckMark,
  IconChevronRight,
  IconClose,
  IconCreditCard,
  IconEye,
  IconHome,
  IconInbox,
  IconMail,
  IconMessages,
  IconProfile,
  IconSend,
  IconSettings,
  IconStar,
  IconTrendUp,
  IconUpload,
  IconWave,
} from '../../../components/icons/DashboardIcons'
import { DashboardLayout } from '../DashboardLayout'

/* ── Toast ──────────────────────────────────────────────────── */
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={`dash-toast polish-toast${visible ? ' dash-toast--visible' : ''}`}>
      <span className="dash-toast__icon"><IconCheck size={20} /></span>
      {message}
    </div>
  )
}

/* ── Toggle ─────────────────────────────────────────────────── */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="dash-toggle-row">
      {label && <span className="dash-toggle-label">{label}</span>}
      <label className="dash-toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="dash-toggle__slider" />
      </label>
    </div>
  )
}

const PROFILE_COMPLETION_FALLBACK = 0

const ROLE_TYPE_LABEL: Record<MessagingParticipantRole, string> = {
  family: 'Famiglia',
  structure: 'Struttura',
  agency: 'Agenzia',
  professional: 'Professionista',
}

const AVATAR_COLORS = ['#2A5C82', '#81B29A', '#E07A5F', '#5B4BCC']

function otherParticipant(thread: MessageThread, userId: string) {
  const otherId = thread.participantIds.find((id) => id !== userId) ?? thread.participantIds[0] ?? ''
  const name = thread.participantNames[otherId] ?? 'Contatto'
  const role = thread.participantRoles[otherId] ?? 'family'
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
  const color = AVATAR_COLORS[otherId.length % AVATAR_COLORS.length] ?? '#2A5C82'
  return { otherId, name, role, initials, color }
}

function formatThreadDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function ProfileSectionSkeleton() {
  return (
    <div className="dash-prof-wrap" aria-busy="true" aria-label="Caricamento profilo">
      <div className="dash-section-header">
        <div>
          <div className="dash-skeleton dash-skeleton--title" style={{ width: 180, height: 28 }} />
          <div className="dash-skeleton" style={{ width: 260, height: 16, marginTop: 8 }} />
        </div>
      </div>
      <div className="dash-prof-cols">
        {[0, 1].map((key) => (
          <div key={key} className="dash-card dash-prof-col">
            <div className="dash-skeleton dash-skeleton--title" style={{ width: 120, height: 20, marginBottom: 16 }} />
            <div className="dash-skeleton" style={{ width: '100%', height: 120, marginBottom: 12 }} />
            <div className="dash-skeleton" style={{ width: '100%', height: 120 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileSectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="dash-empty-state" role="alert">
      <div className="dash-empty-state__title">Impossibile caricare il profilo</div>
      <div className="dash-empty-state__sub">{message}</div>
      <button type="button" className="dash-btn dash-btn--primary" onClick={onRetry}>
        Riprova
      </button>
    </div>
  )
}

function initialsFromName(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

/* ── Section A: Home ────────────────────────────────────────── */
function SectionHome({
  onUpgrade,
  onGoTo,
  profile,
  completionPercent,
  firstName,
  loading,
  isPremium,
  unreadNotifications,
  contactThreads,
  userId,
  applicationsSent,
  applicationsViewed,
  profileViewStats,
}: {
  onUpgrade: () => void
  onGoTo: (s: string) => void
  profile: ProfessionalProfile | null
  completionPercent: number
  firstName: string
  loading: boolean
  isPremium: boolean
  unreadNotifications: number
  contactThreads: MessageThread[]
  userId: string
  applicationsSent: number
  applicationsViewed: number
  profileViewStats: ProfessionalHomeStats
}) {
  const [barWidth, setBarWidth] = useState(0)

  useEffect(() => {
    const target = loading ? 0 : completionPercent
    const t = setTimeout(() => setBarWidth(target), 300)
    return () => clearTimeout(t)
  }, [completionPercent, loading])

  const latestRequests = contactThreads.slice(0, 2)
  const unreadMessages = contactThreads.reduce(
    (sum, t) => sum + (t.unreadByUserId[userId] ?? 0),
    0,
  )
  const checklist = getProfileCompletionChecklist(profile)
  const pendingItems = checklist.filter((item) => !item.done)
  const profileComplete = completionPercent >= 100

  const viewsTrend =
    profileViewStats.weekChangePercent === null
      ? profileViewStats.profileViewsLast7Days > 0
        ? `${profileViewStats.profileViewsLast7Days} questa settimana`
        : 'Nessuna questa settimana'
      : profileViewStats.weekChangePercent >= 0
        ? `+${profileViewStats.weekChangePercent}% questa settimana`
        : `${profileViewStats.weekChangePercent}% questa settimana`

  const applicationsTrend =
    applicationsSent === 0
      ? 'Nessuna candidatura ancora'
      : applicationsViewed === 1
        ? '1 visualizzata'
        : applicationsViewed > 1
          ? `${applicationsViewed} visualizzate`
          : 'In attesa di risposta'

  return (
    <div className="dash-home">
      <section
        className={`dash-home-hero${profileComplete ? ' dash-home-hero--complete' : ''}`}
        aria-label={profileComplete ? 'Profilo completo' : 'Completamento profilo'}
      >
        <div className="dash-home-hero__content">
          <div className="dash-home-hero__pills">
            <span className="dash-home-hero__pill">
              <IconWave size={14} aria-hidden />
              Bentornat{firstName.toLowerCase().endsWith('a') ? 'a' : 'o'}
            </span>
            {profileComplete ? (
              <span className="dash-home-hero__pill dash-home-hero__pill--ok">Profilo completo</span>
            ) : (
              <span className="dash-home-hero__pill dash-home-hero__pill--warn">
                {pendingItems.length} {pendingItems.length === 1 ? 'voce mancante' : 'voci mancanti'}
              </span>
            )}
          </div>

          <h1 className="dash-home-hero__title">
            Ciao {firstName}
            {profileComplete ? '' : ', completa il tuo profilo'}
          </h1>
          <p className="dash-home-hero__sub">
            {profileComplete
              ? 'Il profilo è pronto. Controlla le statistiche e gestisci disponibilità o tariffe quando vuoi.'
              : 'Iscriviti in 2 passi è fatto: completa le voci sotto per comparire meglio nelle ricerche.'}
          </p>

          {!profileComplete ? (
            <>
              <div className="dash-home-hero__progress-row">
                <div className="dash-home-hero__progress-meta">
                  <span>Completamento</span>
                  <strong>{barWidth}%</strong>
                </div>
                <div className="dash-home-hero__progress-track" aria-hidden>
                  <div className="dash-home-hero__progress-fill" style={{ width: `${barWidth}%` }} />
                </div>
              </div>

              <ul className="dash-home-hero__tasks">
                {checklist.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`dash-home-hero__task${item.done ? ' is-done' : ''}`}
                      onClick={() => onGoTo('profilo')}
                      disabled={item.done}
                    >
                      <span className="dash-home-hero__task-mark" aria-hidden>
                        {item.done ? <IconCheckMark size={12} /> : null}
                      </span>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="dash-home-hero__actions">
                <button type="button" className="dash-home-hero__cta" onClick={() => onGoTo('profilo')}>
                  Completa profilo
                  <IconChevronRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="dash-home-hero__mini-stats" role="list">
                <button type="button" className="dash-home-hero__mini-stat" role="listitem" onClick={() => onGoTo('profilo')}>
                  <strong>{profileViewStats.profileViewsTotal}</strong>
                  <span>Visualizzazioni</span>
                </button>
                <button type="button" className="dash-home-hero__mini-stat" role="listitem" onClick={() => onGoTo('messaggi')}>
                  <strong>{contactThreads.length}</strong>
                  <span>Conversazioni</span>
                </button>
                <button type="button" className="dash-home-hero__mini-stat" role="listitem" onClick={() => onGoTo('candidature')}>
                  <strong>{applicationsSent}</strong>
                  <span>Candidature</span>
                </button>
              </div>
              <div className="dash-home-hero__actions">
                <button type="button" className="dash-home-hero__cta" onClick={() => onGoTo('profilo')}>
                  Gestisci profilo
                  <IconChevronRight size={16} />
                </button>
                <button type="button" className="dash-home-hero__cta dash-home-hero__cta--ghost" onClick={() => onGoTo('messaggi')}>
                  Messaggi
                  {unreadMessages > 0 ? ` (${unreadMessages})` : ''}
                </button>
              </div>
            </>
          )}
        </div>

        <div
          className="dash-home-hero__ring"
          style={{ '--dash-completion': barWidth } as CSSProperties}
          aria-hidden
        >
          <div className="dash-home-hero__ring-inner">
            <span className="dash-home-hero__ring-pct">{barWidth}%</span>
            <span className="dash-home-hero__ring-label">{profileComplete ? 'Pronto' : 'Profilo'}</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="dash-stat-grid dash-stat-grid--home">
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-primary-softer)', color: 'var(--color-primary)' }}>
            <IconEye size={18} />
          </div>
          <div className="dash-stat-card__value">{profileViewStats.profileViewsTotal}</div>
          <div className="dash-stat-card__label">Visualizzazioni profilo</div>
          <div className="dash-stat-card__trend">
            {profileViewStats.weekChangePercent !== null && profileViewStats.weekChangePercent > 0 ? (
              <IconTrendUp size={14} />
            ) : null}{' '}
            {viewsTrend}
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-sage-softer)', color: 'var(--color-sage)' }}>
            <IconMail size={18} />
          </div>
          <div className="dash-stat-card__value">{contactThreads.length}</div>
          <div className="dash-stat-card__label">Conversazioni aperte</div>
          <div
            className="dash-stat-card__trend"
            style={{ color: unreadMessages > 0 ? 'var(--color-accent)' : undefined }}
          >
            {unreadMessages > 0
              ? `${unreadMessages} non lett${unreadMessages === 1 ? 'o' : 'i'}`
              : contactThreads.length === 0
                ? 'Nessun messaggio ancora'
                : 'Tutto letto'}
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-accent-softer)', color: 'var(--color-accent)' }}>
            <IconSend size={18} />
          </div>
          <div className="dash-stat-card__value">{applicationsSent}</div>
          <div className="dash-stat-card__label">Candidature inviate</div>
          <div className="dash-stat-card__trend">{applicationsTrend}</div>
        </div>
      </div>

      {/* Two column cards */}
      <div className="dash-home-bottom">
        {/* Plan card */}
        <div className="dash-card">
          <div className="dash-card__title">
            Piano attuale
            <span className={`dash-badge dash-badge--${isPremium ? 'premium' : 'free'}`}>
              {isPremium ? 'PREMIUM' : 'FREE'}
            </span>
          </div>
          {isPremium ? (
            <ul className="dash-home-plan-list">
              <li className="dash-home-plan-list__item">
                <span className="dash-home-plan-list__icon dash-home-plan-list__icon--ok"><IconCheckMark size={14} /></span>
                Visibilità prioritaria nelle ricerche
              </li>
              <li className="dash-home-plan-list__item">
                <span className="dash-home-plan-list__icon dash-home-plan-list__icon--ok"><IconCheckMark size={14} /></span>
                Richieste illimitate e badge verificato
              </li>
            </ul>
          ) : (
            <>
              <ul className="dash-home-plan-list">
                <li className="dash-home-plan-list__item dash-home-plan-list__item--limited">
                  <span className="dash-home-plan-list__icon"><IconClose size={14} /></span>
                  Solo 3 richieste/mese
                </li>
                <li className="dash-home-plan-list__item dash-home-plan-list__item--limited">
                  <span className="dash-home-plan-list__icon"><IconClose size={14} /></span>
                  Profilo non prioritario
                </li>
                <li className="dash-home-plan-list__item dash-home-plan-list__item--limited">
                  <span className="dash-home-plan-list__icon"><IconClose size={14} /></span>
                  Badge "Verificato" non attivo
                </li>
                <li className="dash-home-plan-list__item">
                  <span className="dash-home-plan-list__icon dash-home-plan-list__icon--ok"><IconCheckMark size={14} /></span>
                  Profilo visibile
                </li>
              </ul>
              <button className="dash-btn dash-btn--accent dash-btn--lg" style={{ width: '100%' }} onClick={onUpgrade}>
                Passa a Premium — €19,90/mese
              </button>
            </>
          )}
        </div>

        {/* Latest contact threads (messaging) */}
        <div className="dash-card">
          <div className="dash-card__title">
            Ultime conversazioni
            <button className="dash-card__link" onClick={() => onGoTo('messaggi')}>
              Vai ai messaggi
              <IconChevronRight size={14} />
            </button>
          </div>
          {latestRequests.length === 0 ? (
            <div className="dash-empty-mini">Nessuna conversazione recente.</div>
          ) : (
            <div className="dash-home-req-list">
              {latestRequests.map((thread) => {
                const other = otherParticipant(thread, userId)
                const unread = thread.unreadByUserId[userId] ?? 0
                return (
                  <div key={thread.id} className="dash-home-req-item">
                    <div
                      className="dash-home-req-avatar"
                      style={{ background: other.color + '22', color: other.color }}
                    >
                      {other.initials}
                    </div>
                    <div className="dash-home-req-info">
                      <div className="dash-home-req-name">{other.name}</div>
                      <div className="dash-home-req-meta">
                        {ROLE_TYPE_LABEL[other.role]} · {formatThreadDate(thread.lastMessageAt)}
                      </div>
                      <div className="dash-home-req-preview">{thread.lastMessagePreview}</div>
                    </div>
                    <span className={`dash-badge dash-badge--${unread > 0 ? 'new' : 'ongoing'}`}>
                      {unread > 0 ? 'Nuova' : 'In corso'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="dash-card" style={{ marginTop: 'var(--space-4)' }}>
        <div className="dash-card__title">Azioni rapide</div>
        <div className="dash-quick-grid">
          <button className="dash-quick-btn" onClick={() => onGoTo('profilo')}>
            <IconProfile size={22} />
            <span>Modifica profilo</span>
          </button>
          <button className="dash-quick-btn" onClick={() => onGoTo('messaggi')}>
            <IconMessages size={18} />
            <span>Messaggi</span>
          </button>
          <button className="dash-quick-btn" onClick={() => onGoTo('notifiche')}>
            {unreadNotifications > 0 && (
              <span className="dash-quick-btn__badge">{unreadNotifications}</span>
            )}
            <IconBell size={22} />
            <span>Notifiche</span>
          </button>
          {!isPremium && (
            <button className="dash-quick-btn dash-quick-btn--accent" onClick={onUpgrade}>
              <IconStar size={22} />
              <span>Passa a Premium</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Section B: Profile ─────────────────────────────────────── */
const DOC_SLOTS: { slot: ProfessionalDocumentSlot; label: string }[] = [
  { slot: 'identita', label: 'Documento di identità' },
  { slot: 'attestati', label: 'Attestati / Diplomi' },
  { slot: 'referenze', label: 'Referenze' },
]

function SectionProfile({
  profile,
  documents,
  loading,
  error,
  saving,
  saveError,
  uploadBusy,
  onReload,
  onSave,
  onUploadPhoto,
  onUploadDocument,
  onRemoveDocument,
}: {
  profile: ProfessionalProfile | null
  documents: ProfessionalDocument[]
  loading: boolean
  error: string | null
  saving: boolean
  saveError: string | null
  uploadBusy: boolean
  onReload: () => void
  onSave: (patch: ProfessionalProfilePatch) => Promise<boolean>
  onUploadPhoto: (file: File) => Promise<boolean>
  onUploadDocument: (slot: ProfessionalDocumentSlot, file: File) => Promise<boolean>
  onRemoveDocument: (id: string) => Promise<boolean>
}) {
  const [saved, setSaved] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const docInputRefs = useRef<Partial<Record<ProfessionalDocumentSlot, HTMLInputElement | null>>>({})
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
  const [availableFrom, setAvailableFrom] = useState('')
  const [zoneInput, setZoneInput] = useState('')
  const [formReady, setFormReady] = useState(false)
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
  const SPECIALIZATIONS = ['Anziani autosufficienti', 'Alzheimer/Demenze', 'Patologie gravi', 'Post-operatorio', 'Disabilità', 'Pediatrico']
  const LANGUAGES = ['Italiano', 'Inglese', 'Francese', 'Spagnolo', 'Rumeno', 'Ucraino', 'Filippino']
  const EMPLOYMENT_TYPES = ['Convivente', 'A ore', 'Part-time', 'Weekend', 'Notte']
  const SHIFTS = ['Mattina 7–13', 'Pomeriggio 13–19', 'Sera 19–23', 'Notte 23–7']
  const CERTIFICATIONS_LIST = ['OSS certificato', 'Assistente familiare', 'Primo soccorso', 'Patente di guida', 'Diploma infermieristico', 'Corso Alzheimer', 'Corso badante professionale']
  const NATIONALITIES = ['Italiana', 'Rumena', 'Ucraina', 'Filippina', 'Altra']
  const CATEGORIES = ['Badante', 'OSS', 'Infermiere', 'Assistente familiare', 'Fisioterapista']
  const EXPERIENCE_OPTIONS = ['Meno di 1 anno', '1-2 anni', '3-5 anni', '6-9 anni', '10+ anni']

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
    setSpecializations(profile.professional.specializations)
    setLanguages(profile.professional.languages)
    setHasLicense(profile.professional.hasLicense)
    setHasCar(profile.professional.hasCar)
    setEmploymentTypes(profile.availability.employmentTypes)
    setSelectedDays(profile.availability.days)
    setShifts(profile.availability.shifts)
    setAvailableFrom(profile.availability.availableFrom)
    setHourlyRate(profile.rates.hourly)
    setMonthlyRate(profile.rates.monthlyLiveIn)
    setZones(profile.zones)
    setPrimaryZone(profile.primaryZone)
    setAvailableToMove(profile.availableToMove)
    setCertifications(profile.certifications)
    setFormReady(true)
  }, [profile])

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

  const addZone = () => {
    const z = zoneInput.trim()
    if (z && !zones.includes(z)) setZones([...zones, z])
    setZoneInput('')
  }

  if (loading) {
    return <ProfileSectionSkeleton />
  }

  if (error) {
    return <ProfileSectionError message={error} onRetry={onReload} />
  }

  if (!profile || !formReady) {
    return null
  }

  const scrollToSection = (sectionId?: ProfileCompletionSectionId) => {
    if (!sectionId) return
    const el = document.getElementById(`prof-section-${sectionId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="dash-prof-wrap">
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Il mio profilo</h2>
          <p className="dash-section__subtitle">Come appare a famiglie, strutture e agenzie</p>
        </div>
        <button
          type="button"
          className="dash-btn dash-btn--primary dash-btn--lg"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
      </div>

      <ProfileCompletionGuide
        profile={profile}
        completionPercent={profile.completionPercent}
        variant="card"
        onGoToProfile={scrollToSection}
      />

      {saveError ? (
        <div className="dash-card" role="alert" style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-accent)' }}>
          {saveError}
        </div>
      ) : null}

      {/* Identity + Professional — two columns */}
      <div className="dash-prof-cols">
        {/* Left: Identity */}
        <div className="dash-card dash-prof-col" id="prof-section-foto">
          <div className="dash-card__title" id="prof-section-titolo">
            Identità
          </div>
          <div className="dash-profile-avatar-wrap">
            {profile.identity.photoUrl ? (
              <img
                className="dash-profile-avatar dash-profile-avatar--photo"
                src={profile.identity.photoUrl}
                alt={`Foto di ${firstName} ${lastName}`}
                width={72}
                height={72}
              />
            ) : (
              <div className="dash-profile-avatar">{initialsFromName(firstName, lastName)}</div>
            )}
            <div>
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
                <IconUpload size={16} /> {uploadBusy ? 'Caricamento…' : 'Carica foto'}
              </button>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 6, marginBottom: 0 }}>
                JPG o PNG, max 2 MB · 400×400 px consigliato
              </p>
            </div>
          </div>

          <div className="dash-form-grid">
            <div className="dash-form-field">
              <label className="dash-form-label" htmlFor="prof-first-name">Nome</label>
              <input
                id="prof-first-name"
                className="dash-form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="dash-form-field">
              <label className="dash-form-label" htmlFor="prof-last-name">Cognome</label>
              <input
                id="prof-last-name"
                className="dash-form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="dash-form-field dash-form-field--full">
              <label className="dash-form-label" htmlFor="prof-title">Titolo professionale</label>
              <input
                id="prof-title"
                className="dash-form-input"
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
              />
            </div>
            <div className="dash-form-field">
              <label className="dash-form-label" htmlFor="prof-birth-year">Anno di nascita</label>
              <select
                id="prof-birth-year"
                className="dash-form-select"
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
              >
                {Array.from({ length: 50 }, (_, i) => 1955 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="dash-form-field">
              <label className="dash-form-label" htmlFor="prof-nationality">Nazionalità</label>
              <select
                id="prof-nationality"
                className="dash-form-select"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              >
                {NATIONALITIES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="dash-form-field dash-form-field--full">
              <label className="dash-form-label" htmlFor="prof-bio">
                <span id="prof-section-bio">Bio / Presentazione</span>
                <span className="dash-form-label__counter">{bio.length}/500</span>
              </label>
              <textarea
                id="prof-bio"
                className="dash-form-input dash-form-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Right: Professional */}
        <div className="dash-card dash-prof-col">
          <div className="dash-card__title" id="prof-section-categoria">
            Dati professionali
          </div>
          <div className="dash-form-grid">
            <div className="dash-form-field dash-form-field--full">
              <label className="dash-form-label" htmlFor="prof-category">Categoria principale</label>
              <select
                id="prof-category"
                className="dash-form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="dash-form-field dash-form-field--full">
              <label className="dash-form-label" htmlFor="prof-experience">Anni di esperienza</label>
              <select
                id="prof-experience"
                className="dash-form-select"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              >
                {EXPERIENCE_OPTIONS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="dash-prof-section">
            <div className="dash-prof-section__title" id="prof-section-specializzazioni">
              Specializzazioni
            </div>
            <div className="dash-checkbox-group">
              {SPECIALIZATIONS.map((s) => (
                <label key={s} className="dash-checkbox-item">
                  <input
                    type="checkbox"
                    checked={specializations.includes(s)}
                    onChange={() => toggle(specializations, setSpecializations, s)}
                  />
                  <span className="dash-checkbox-item__label">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="dash-prof-section">
            <div className="dash-prof-section__title" id="prof-section-lingue">
              Lingue parlate
            </div>
            <div className="dash-checkbox-group">
              {LANGUAGES.map((l) => (
                <label key={l} className="dash-checkbox-item">
                  <input
                    type="checkbox"
                    checked={languages.includes(l)}
                    onChange={() => toggle(languages, setLanguages, l)}
                  />
                  <span className="dash-checkbox-item__label">{l}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="dash-prof-section">
            <Toggle checked={hasLicense} onChange={setHasLicense} label="Patente di guida" />
            <Toggle checked={hasCar} onChange={setHasCar} label="Auto propria" />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="dash-card" style={{ marginTop: 'var(--space-4)' }} id="prof-section-disponibilita">
        <div className="dash-card__title">Disponibilità</div>
        <div className="dash-prof-section">
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

        <div className="dash-prof-section">
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

        <div className="dash-prof-section">
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
          <label className="dash-form-label" htmlFor="prof-available-from">Disponibile da</label>
          <input
            id="prof-available-from"
            className="dash-form-input"
            type="date"
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
          />
        </div>
      </div>

      {/* Zone & Rates */}
      <div className="dash-card" style={{ marginTop: 'var(--space-4)' }} id="prof-section-zone">
        <div className="dash-card__title" id="prof-section-tariffe">
          Zona e tariffe
        </div>
        <div className="dash-prof-cols">
          <div>
            <div className="dash-prof-section">
              <div className="dash-form-field">
                <label className="dash-form-label" htmlFor="prof-primary-zone">Zona di lavoro principale</label>
                <input
                  id="prof-primary-zone"
                  className="dash-form-input"
                  value={primaryZone}
                  onChange={(e) => setPrimaryZone(e.target.value)}
                />
              </div>
            </div>
            <div className="dash-prof-section">
              <div className="dash-prof-section__title">Province / Regioni coperte</div>
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
              <div className="dash-chip-input-wrap">
                <input
                  className="dash-form-input"
                  placeholder="Aggiungi zona…"
                  value={zoneInput}
                  onChange={(e) => setZoneInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addZone()}
                />
                <button type="button" className="dash-btn dash-btn--ghost" onClick={addZone}>+ Aggiungi</button>
              </div>
            </div>
            <Toggle checked={availableToMove} onChange={setAvailableToMove} label="Disponibile a spostarsi" />
          </div>
          <div>
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
              <div className="dash-range-limits"><span>€8/h</span><span>€25/h</span></div>
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
              <div className="dash-range-limits"><span>€800</span><span>€2.000</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="dash-card" style={{ marginTop: 'var(--space-4)' }}>
        <div className="dash-card__title">Certificazioni e documenti</div>
        <div className="dash-prof-section">
          <div className="dash-prof-section__title">Certificazioni possedute</div>
          <div className="dash-checkbox-group">
            {CERTIFICATIONS_LIST.map((c) => (
              <label key={c} className="dash-checkbox-item">
                <input
                  type="checkbox"
                  checked={certifications.includes(c)}
                  onChange={() => toggle(certifications, setCertifications, c)}
                />
                <span className="dash-checkbox-item__label">{c}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="dash-prof-section">
          <div className="dash-prof-section__title">Carica documenti</div>
          <div className="dash-doc-slots">
            {DOC_SLOTS.map(({ slot, label }) => {
              const existing = documents.find((d) => d.slot === slot)
              return (
                <div key={slot} className="dash-doc-slot">
                  <input
                    ref={(el) => {
                      docInputRefs.current[slot] = el
                    }}
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (file) void onUploadDocument(slot, file)
                    }}
                  />
                  <IconUpload size={20} />
                  <span className="dash-doc-slot__label">{label}</span>
                  {existing ? (
                    <>
                      <span className="dash-doc-slot__name" title={existing.name}>
                        {existing.name}
                      </span>
                      <button
                        type="button"
                        className="dash-doc-slot__cta"
                        disabled={uploadBusy}
                        onClick={() => void onRemoveDocument(existing.id)}
                      >
                        Rimuovi
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="dash-doc-slot__cta"
                      disabled={uploadBusy}
                      onClick={() => docInputRefs.current[slot]?.click()}
                    >
                      Carica
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="dash-btn dash-btn--primary dash-btn--lg"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
      </div>

      <Toast message="Profilo aggiornato con successo!" visible={saved} />
    </div>
  )
}

/* ── Section C: Contact inbox (messaging threads) ───────────── */
function SectionRequests({
  threads,
  userId,
  onOpenThread,
}: {
  threads: MessageThread[]
  userId: string
  onOpenThread: (threadId: string) => void
}) {
  const unreadCount = threads.reduce((sum, t) => sum + (t.unreadByUserId[userId] ?? 0), 0)

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Richieste e contatti</h2>
          <p className="dash-section__subtitle">
            Stessa inbox dei messaggi · {threads.length} conversazioni
            {unreadCount > 0 ? ` · ${unreadCount} non lette` : ''}
          </p>
        </div>
        <button type="button" className="dash-btn dash-btn--ghost" onClick={() => onOpenThread('')}>
          Apri messaggi
        </button>
      </div>

      {threads.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state__icon">
            <IconInbox size={28} />
          </div>
          <div className="dash-empty-state__title">Nessuna richiesta</div>
          <div className="dash-empty-state__sub">
            Quando una famiglia o una struttura ti contatta, la conversazione compare qui e in Messaggi.
          </div>
        </div>
      ) : (
        <div className="dash-req-list">
          {threads.map((thread) => {
            const other = otherParticipant(thread, userId)
            const unread = thread.unreadByUserId[userId] ?? 0
            return (
              <div key={thread.id} className="dash-req-card">
                <div className="dash-req-card__header">
                  <div
                    className="dash-req-avatar"
                    style={{ background: other.color + '22', color: other.color }}
                  >
                    {other.initials}
                  </div>
                  <div className="dash-req-info">
                    <div className="dash-req-name">{other.name}</div>
                    <div className="dash-req-meta">
                      {ROLE_TYPE_LABEL[other.role]} · {formatThreadDate(thread.lastMessageAt)}
                      {thread.linkLabel ? ` · ${thread.linkLabel}` : ''}
                    </div>
                  </div>
                  <span
                    className={`dash-badge dash-badge--${unread > 0 ? 'new' : 'ongoing'}${unread > 0 ? ' dash-badge--pulse' : ''}`}
                  >
                    {unread > 0 ? 'Nuova' : 'In corso'}
                  </span>
                </div>
                <p className="dash-req-msg">{thread.lastMessagePreview || thread.subject}</p>
                <div className="dash-req-footer">
                  <button
                    type="button"
                    className="dash-btn dash-btn--primary"
                    onClick={() => onOpenThread(thread.id)}
                  >
                    Apri conversazione
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Section E: Plan ────────────────────────────────────────── */
function SectionPlan({
  onUpgrade,
  planType,
  isPremium,
  loading,
  history,
  cancelAtPeriodEnd,
  periodEndLabel,
  onCancel,
  cancelLoading,
}: {
  onUpgrade: () => void
  planType: PlanType
  isPremium: boolean
  loading: boolean
  history: { id: string; planLabel: string; amountLabel: string; startedAt: string; status: string }[]
  cancelAtPeriodEnd: boolean
  periodEndLabel: string | null
  onCancel: () => void
  cancelLoading: boolean
}) {
  const features = [
    { label: 'Profilo visibile nelle ricerche', free: 'Limitato', premium: 'Prioritario' },
    { label: 'Richieste ricevibili / mese', free: '3', premium: 'Illimitate' },
    { label: 'Badge "Verificato"', free: false, premium: true },
    { label: 'Statistiche avanzate profilo', free: false, premium: true },
    { label: 'Supporto prioritario', free: false, premium: true },
    { label: 'Candidature attive', free: '5', premium: 'Illimitate' },
    { label: 'Apparire in cima ai risultati', free: false, premium: true },
  ]

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Piano e abbonamento</h2>
          <p className="dash-section__subtitle">
            {loading
              ? 'Caricamento piano…'
              : isPremium
                ? cancelAtPeriodEnd && periodEndLabel
                  ? `Premium attivo fino al ${periodEndLabel}`
                  : 'Piano Premium attivo'
                : 'Attualmente sei nel Piano FREE'}
          </p>
        </div>
      </div>

      <div className="dash-plans">
        {/* FREE */}
        <div className="dash-plan-card">
          {planType === 'free' && <div className="dash-plan__current-badge">Piano attuale</div>}
          <div className="dash-plan__name">Piano FREE</div>
          <div className="dash-plan__price-free">Gratis</div>
          <div className="dash-plan__price-note">Per sempre</div>
          <ul className="dash-plan__features">
            {features.map((f) => (
              <li key={f.label} className="dash-plan__feature">
                {f.free === false ? (
                  <span className="dash-plan__feature-icon--cross"><IconClose size={14} /></span>
                ) : (
                  <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
                )}
                <span>
                  {f.label}
                  {f.free !== false && f.free !== true && (
                    <strong style={{ color: 'var(--color-text-muted)', marginLeft: 4 }}>({f.free})</strong>
                  )}
                  {f.free === false && (
                    <span style={{ color: '#D95F5F', marginLeft: 4 }}>Non disponibile</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <button className="dash-btn dash-btn--ghost dash-btn--lg" style={{ width: '100%' }} disabled>
            Piano attuale
          </button>
        </div>

        {/* PREMIUM */}
        <div className="dash-plan-card dash-plan-card--featured">
          {isPremium && <div className="dash-plan__current-badge">Piano attuale</div>}
          <div className="dash-plan__name">Piano PREMIUM</div>
          <div className="dash-plan__price">€19,90</div>
          <div className="dash-plan__price-note">al mese · annullabile in qualsiasi momento</div>
          <ul className="dash-plan__features">
            {features.map((f) => (
              <li key={f.label} className="dash-plan__feature">
                <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
                <span>
                  {f.label}
                  {f.premium !== true && (
                    <strong style={{ color: 'var(--color-primary)', marginLeft: 4 }}>({f.premium as string})</strong>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {isPremium ? (
            <button
              className="dash-btn dash-btn--ghost dash-btn--lg"
              style={{ width: '100%' }}
              disabled={cancelLoading || cancelAtPeriodEnd}
              onClick={onCancel}
            >
              {cancelAtPeriodEnd ? 'Disdetta programmata' : 'Annulla abbonamento'}
            </button>
          ) : (
            <button className="dash-btn dash-btn--primary dash-btn--lg" style={{ width: '100%' }} onClick={onUpgrade}>
              Attiva Premium
              <IconChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* History */}
      <div className="dash-card">
        <div className="dash-card__title">Storico abbonamenti</div>
        {history.length === 0 ? (
          <div className="dash-empty-mini" style={{ padding: 'var(--space-4) 0' }}>
            Nessun abbonamento precedente.
          </div>
        ) : (
          <ul className="dash-plan__features" style={{ marginTop: 'var(--space-3)' }}>
            {history.map((h) => (
              <li key={h.id} className="dash-plan__feature">
                <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
                <span>
                  {h.planLabel} — {h.amountLabel} · {formatBillingDate(h.startedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ── Upgrade / Payment Modal (embedded mock — Stripe Elements-ready) ── */
function UpgradeModal({
  onClose,
  onPay,
  checkoutLoading,
  error,
}: {
  onClose: () => void
  onPay: () => Promise<boolean>
  checkoutLoading: boolean
  error: string | null
}) {
  const [activated, setActivated] = useState(false)
  const product = BILLING_PRODUCTS.professional_premium_monthly
  const amountLabel = formatBillingAmount(product.key)

  const handleActivate = async () => {
    const ok = await onPay()
    if (!ok) return
    setActivated(true)
    setTimeout(onClose, 2000)
  }

  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
        {activated ? (
          <div className="dash-modal-success">
            <div className="dash-modal-success__icon"><IconCheck size={40} /></div>
            <div className="dash-modal-success__title">Abbonamento attivato!</div>
            <div className="dash-modal-success__sub">Benvenuta nel Piano Premium.</div>
          </div>
        ) : (
          <>
            <div className="dash-modal__header">
              <span className="dash-modal__title">Attiva Piano Premium</span>
              <button className="dash-modal__close" onClick={onClose} aria-label="Chiudi"><IconClose size={18} /></button>
            </div>
            <div className="dash-modal__body">
              <div className="dash-modal-plan-recap">
                <div className="dash-modal-plan-recap__name">Piano PREMIUM</div>
                <div className="dash-modal-plan-recap__price">{amountLabel} <span>/mese</span></div>
                <div className="dash-modal-plan-recap__note">Annullabile in qualsiasi momento · Nessun vincolo</div>
              </div>
              {showBillingDemoCopy() && (
                <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', margin: '0 0 var(--space-5)' }}>
                  Inserisci i dati della carta per attivare l&apos;abbonamento.{' '}
                  <strong>Demo: nessun addebito reale.</strong> Carta test: 4242 4242 4242 4242.
                </p>
              )}
              {!showBillingDemoCopy() && (
                <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', margin: '0 0 var(--space-5)' }}>
                  Inserisci i dati della carta per attivare l&apos;abbonamento in modo sicuro.
                </p>
              )}
              <div className="dash-form-grid" data-stripe-elements-mount>
                <div className="dash-form-field dash-form-field--full">
                  <label className="dash-form-label">Intestatario carta</label>
                  <input className="dash-form-input" placeholder="Mario Rossi" autoComplete="cc-name" />
                </div>
                <div className="dash-form-field dash-form-field--full">
                  <label className="dash-form-label">
                    <IconCreditCard size={16} /> Numero carta
                  </label>
                  <input className="dash-form-input" placeholder="4242 4242 4242 4242" maxLength={19} autoComplete="cc-number" />
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label">Scadenza</label>
                  <input className="dash-form-input" placeholder="MM/AA" maxLength={5} autoComplete="cc-exp" />
                </div>
                <div className="dash-form-field">
                  <label className="dash-form-label">CVV</label>
                  <input className="dash-form-input" placeholder="123" maxLength={4} type="password" autoComplete="cc-csc" />
                </div>
              </div>
              {error && (
                <p style={{ color: '#D95F5F', fontSize: 'var(--text-small)', marginTop: 'var(--space-3)' }}>{error}</p>
              )}
            </div>
            <div className="dash-modal__footer">
              <button className="dash-btn dash-btn--ghost" onClick={onClose} disabled={checkoutLoading}>
                Annulla
              </button>
              <button
                className="dash-btn dash-btn--primary dash-btn--lg"
                disabled={checkoutLoading}
                onClick={() => void handleActivate()}
              >
                {checkoutLoading ? 'Elaborazione…' : `Attiva ora — ${amountLabel}/mese`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────────── */
export function ProfessionalDashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const billing = useBillingSubscription('professional')
  const notifications = useNotifications()
  const applications = useApplications()
  const threadParam = searchParams.get('thread')
  const messaging = useMessaging({ initialThreadId: threadParam })
  const [billingToast, setBillingToast] = useState<string | null>(null)
  const [profileViewStats, setProfileViewStats] = useState<ProfessionalHomeStats>({
    profileViewsTotal: 0,
    profileViewsLast7Days: 0,
    profileViewsPrevious7Days: 0,
    weekChangePercent: null,
  })
  const {
    profile,
    documents: profileDocuments,
    loading: profileLoading,
    error: profileError,
    saving: profileSaving,
    saveError: profileSaveError,
    uploadBusy: profileUploadBusy,
    reload: reloadProfile,
    save: saveProfile,
    uploadPhoto: uploadProfilePhoto,
    uploadDocument: uploadProfileDocument,
    removeDocument: removeProfileDocument,
    completionPercent,
  } = useProfessionalProfile()
  const [activeSection, setActiveSection] = useState('home')
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchProfessionalHomeStats().then((stats) => {
      if (!cancelled) setProfileViewStats(stats)
    })
    return () => {
      cancelled = true
    }
  }, [activeSection, user?.id])

  const billingParam = searchParams.get('billing')
  const billingSectionParam = searchParams.get('section')
  const sectionParam = searchParams.get('section')

  useEffect(() => {
    if (sectionParam === 'messaggi') {
      setActiveSection('messaggi')
    }
    if (threadParam) {
      messaging.selectThread(threadParam)
    }
  }, [sectionParam, threadParam, messaging.selectThread])

  useEffect(() => {
    if (!billingParam) return

    if (billingParam === 'success') {
      setBillingToast('Piano Premium attivato con successo.')
      setActiveSection(billingSectionParam === 'piano' ? 'piano' : 'home')
      void billing.reload()
    } else if (billingParam === 'cancel') {
      setBillingToast('Pagamento annullato.')
      setActiveSection('piano')
    } else if (billingParam === 'error') {
      setBillingToast('Impossibile confermare il pagamento.')
    }

    const next = new URLSearchParams(searchParams)
    next.delete('billing')
    if (next.get('section') !== 'messaggi') {
      next.delete('section')
    }
    setSearchParams(next, { replace: true })
  }, [billing.reload, billingParam, billingSectionParam, searchParams, setSearchParams])

  const openMessaging = (threadId?: string) => {
    setActiveSection('messaggi')
    if (threadId) {
      messaging.selectThread(threadId)
      setSearchParams({ section: 'messaggi', thread: threadId }, { replace: true })
    } else {
      setSearchParams({ section: 'messaggi' }, { replace: true })
    }
  }

  const contactThreads = messaging.threads
  const unreadContactThreads = contactThreads.reduce(
    (sum, t) => sum + (user?.id ? (t.unreadByUserId[user.id] ?? 0) : 0),
    0,
  )

  useEffect(() => {
    if (!billingToast) return
    const t = window.setTimeout(() => setBillingToast(null), 4000)
    return () => window.clearTimeout(t)
  }, [billingToast])

  const handleUpgrade = async () => {
    const session = await billing.startCheckout()
    if (session?.mode === 'redirect') return
    setShowUpgrade(true)
  }

  const handlePayInModal = async (): Promise<boolean> => {
    const session = billing.pendingSession ?? (await billing.startCheckout())
    if (!session) return false
    return billing.completeCheckout(session.sessionId)
  }

  const handleCancelSubscription = () => {
    void billing.cancel()
  }

  const periodEndLabel = billing.subscription?.currentPeriodEnd
    ? formatBillingDate(billing.subscription.currentPeriodEnd)
    : null

  const firstName = profile?.identity.firstName ?? user?.name.split(' ')[0] ?? 'Professionista'

  const navItems = [
    { id: 'home', label: 'Home', icon: <IconHome size={18} /> },
    { id: 'profilo', label: 'Il mio profilo', tabLabel: 'Profilo', icon: <IconProfile size={18} /> },
    {
      id: 'richieste',
      label: 'Richieste e contatti',
      tabLabel: 'Richieste',
      icon: <IconMail size={18} />,
      badge: unreadContactThreads,
    },
    {
      id: 'messaggi',
      label: 'Messaggi',
      tabLabel: 'Messaggi',
      icon: <IconMessages size={18} />,
      badge: messaging.unreadCount,
    },
    { id: 'posizioni', label: 'Posizioni aperte', tabLabel: 'Posizioni', icon: <IconBriefcase size={18} /> },
    { id: 'candidature', label: 'Le mie candidature', tabLabel: 'Candidature', icon: <IconSend size={18} /> },
    { id: 'piano', label: 'Piano e abbonamento', tabLabel: 'Piano', icon: <IconStar size={18} /> },
    { id: 'notifiche', label: 'Notifiche', icon: <IconBell size={18} />, badge: notifications.unreadCount },
    { id: 'impostazioni', label: 'Impostazioni', tabLabel: 'Impostaz.', icon: <IconSettings size={18} /> },
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <SectionHome
            onUpgrade={() => void handleUpgrade()}
            onGoTo={setActiveSection}
            profile={profile}
            completionPercent={completionPercent}
            firstName={firstName}
            loading={profileLoading}
            isPremium={billing.isPremium}
            unreadNotifications={notifications.unreadCount}
            contactThreads={contactThreads}
            userId={user?.id ?? ''}
            applicationsSent={applications.stats.sentCount ?? 0}
            applicationsViewed={applications.stats.viewedCount ?? 0}
            profileViewStats={profileViewStats}
          />
        )
      case 'profilo':
        return (
          <SectionProfile
            profile={profile}
            documents={profileDocuments}
            loading={profileLoading}
            error={profileError}
            saving={profileSaving}
            saveError={profileSaveError}
            uploadBusy={profileUploadBusy}
            onReload={() => void reloadProfile()}
            onSave={saveProfile}
            onUploadPhoto={uploadProfilePhoto}
            onUploadDocument={uploadProfileDocument}
            onRemoveDocument={removeProfileDocument}
          />
        )
      case 'richieste':
        return (
          <SectionRequests
            threads={contactThreads}
            userId={user?.id ?? ''}
            onOpenThread={(threadId) => openMessaging(threadId || undefined)}
          />
        )
      case 'messaggi':
        return (
          <DashboardMessagingSection
            title="Messaggi"
            subtitle="Rispondi a famiglie, strutture e agenzie"
            userId={user?.id ?? ''}
            threads={messaging.threads}
            messages={messaging.messages}
            selectedThread={messaging.selectedThread}
            selectedThreadId={messaging.selectedThreadId}
            loading={messaging.loading}
            messagesLoading={messaging.messagesLoading}
            error={messaging.error}
            messagesError={messaging.messagesError}
            sending={messaging.sending}
            onReload={() => void messaging.reloadThreads()}
            onSelectThread={(id) => {
              messaging.selectThread(id)
              if (id) {
                setSearchParams({ section: 'messaggi', thread: id }, { replace: true })
              } else {
                setSearchParams({ section: 'messaggi' }, { replace: true })
              }
            }}
            onSendMessage={messaging.sendMessage}
          />
        )
      case 'posizioni':   return <SectionOpenPositions />
      case 'candidature': return <SectionApplications />
      case 'piano':
        return (
          <SectionPlan
            onUpgrade={() => void handleUpgrade()}
            planType={billing.planType}
            isPremium={billing.isPremium}
            loading={billing.loading}
            history={billing.subscription?.history ?? []}
            cancelAtPeriodEnd={billing.subscription?.cancelAtPeriodEnd ?? false}
            periodEndLabel={periodEndLabel}
            onCancel={handleCancelSubscription}
            cancelLoading={billing.cancelLoading}
          />
        )
      case 'notifiche':
        return (
          <DashboardNotificationsSection
            notifications={notifications.notifications}
            unreadCount={notifications.unreadCount}
            loading={notifications.loading}
            error={notifications.error}
            markingAll={notifications.markingAll}
            onReload={() => void notifications.reload()}
            onMarkAllRead={() => void notifications.markAllRead()}
            onMarkRead={(id) => void notifications.markRead(id)}
          />
        )
      case 'impostazioni':
        return (
          <div className="dash-pro-settings">
            <AccountSettingsSection />
          </div>
        )
      default:            return null
    }
  }

  return (
    <>
      <DashboardLayout
        accountType="professional"
        userName={user?.name ?? 'Professionista'}
        userRole={profile ? `${profile.professional.category} · ${profile.primaryZone.split(',')[0]?.trim() ?? 'Italia'}` : 'Badante · Milano'}
        navItems={navItems}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        profileCompletion={profileLoading ? PROFILE_COMPLETION_FALLBACK : completionPercent}
        planType={billing.planType}
      >
        {renderSection()}
      </DashboardLayout>
      <Toast message={billingToast ?? ''} visible={Boolean(billingToast)} />
      {showUpgrade && (
        <UpgradeModal
          onClose={() => {
            billing.clearPendingSession()
            setShowUpgrade(false)
          }}
          onPay={handlePayInModal}
          checkoutLoading={billing.checkoutLoading}
          error={billing.error}
        />
      )}
    </>
  )
}
