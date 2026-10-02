import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getDashboardPathForRole } from '../auth/roleDashboard'
import type { AuthUser } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { ContactAuthDialog } from '../components/ContactAuthDialog'
import { HomeProfileCarousel } from '../components/HomeProfileCarousel'
import {
  IconCheckMark,
  IconChevronLeft,
  IconStar,
  IconStarFilled,
} from '../components/icons/DashboardIcons'
import { ProfileRatingCompact, formatRatingOutOfFiveIt } from '../components/ProfileRatingCompact'
import { SiteShell } from '../components/SiteShell'
import { useDirectoryProfile } from '../hooks/useDirectoryProfile'
import { listSimilarProfiles } from '../lib/directoryApi'
import {
  toCarouselCard,
  type CompetenceIconKey,
  type ExperienceIconKey,
  type HelpServiceIconKey,
  type MockProfile,
} from '../lib/mockProfiles'
import { MessagingError, getThreads, openDirectContactThread } from '../lib/messagingApi'
import { DEFAULT_FAMILY_CONTACT_MESSAGE } from '../lib/messageTemplates'
import {
  createSavedProfile,
  deleteSavedProfile,
  fetchIsProfileSaved,
} from '../lib/savedProfilesApi'
import { profilesDirectoryPath } from '../lib/siteRoutes'
import './profile-detail.css'

const DAY_SHORT: readonly string[] = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

const PROFILE_PAGE_FAQ = [
  {
    q: 'Come posso contattare questo professionista?',
    a: 'Dopo l’accesso potrai inviare una richiesta di contatto direttamente da questa scheda. In anteprima la richiesta resta una simulazione e nessun messaggio viene inoltrato.',
  },
  {
    q: 'I dati clinici dell’assistito sono trattati in piattaforma?',
    a: 'No. Le informazioni cliniche o i dati sensibili restano fuori dai messaggi pubblici e dalla scheda profilo. Vanno gestite direttamente tra famiglia e professionista, nel rispetto della normativa.',
  },
  {
    q: 'Curaxe verifica le qualifiche del professionista?',
    a: 'In anteprima i profili sono dimostrativi e non sottoposti a verifica documentale. In produzione potremo mostrare badge di qualifica per OSS, infermieri (OPI) e attestati di formazione.',
  },
  {
    q: 'Chi gestisce contratto e pagamenti?',
    a: 'La piattaforma facilita il primo contatto. Contratto, retribuzione effettiva, contributi e adempimenti restano tra le parti, come da prassi del settore socio-sanitario.',
  },
] as const

const TRUST_CUES = [
  'Ambiente dimostrativo: nessun dato reale né pagamenti sulla piattaforma.',
  'In produzione potrai segnalare profili sospetti e ricevere conferme dal professionista.',
  'Coerenza profilo–richiesta: dopo l’accesso suggeriremo solo profili compatibili con i tuoi bisogni.',
] as const

const PLATFORM_SUPPORT_EMAIL = 'info@curaxe.it'

function CategoryLabel({ category }: { category: MockProfile['category'] }) {
  switch (category) {
    case 'caregiver':
      return <>Badante</>
    case 'nurse':
      return <>Infermiere/a</>
    case 'oss':
      return <>OSS</>
    case 'assistant':
      return <>Assistente familiare</>
    case 'agency':
      return <>Agenzia</>
    case 'facility':
      return <>Struttura</>
    default: {
      const _exhaustive: never = category
      return <>{_exhaustive}</>
    }
  }
}

function categoryLabelText(category: MockProfile['category']): string {
  switch (category) {
    case 'caregiver':
      return 'Badante'
    case 'nurse':
      return 'Infermiere/a'
    case 'oss':
      return 'OSS'
    case 'assistant':
      return 'Assistente familiare'
    case 'agency':
      return 'Agenzia'
    case 'facility':
      return 'Struttura'
    default: {
      const _exhaustive: never = category
      return _exhaustive
    }
  }
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCross() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function IconOnlineDot() {
  return <span className="profile-detail__online-dot" aria-hidden />
}

function IconCompetence({ k }: { k: CompetenceIconKey }) {
  switch (k) {
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" strokeLinejoin="round" />
        </svg>
      )
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M20.8 8.6a5 5 0 0 0-8.8-3.2A5 5 0 0 0 3.2 8.6c0 6 8.8 10.5 8.8 10.5s8.8-4.5 8.8-10.5z" strokeLinejoin="round" />
        </svg>
      )
    case 'spark':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" strokeLinecap="round" />
        </svg>
      )
    case 'home':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9z" strokeLinejoin="round" />
        </svg>
      )
    case 'med':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 4v16M4 12h16" strokeLinecap="round" />
        </svg>
      )
    case 'book':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5z" strokeLinejoin="round" />
          <path d="M8 7h7M8 11h7M8 15h5" strokeLinecap="round" />
        </svg>
      )
    case 'hands':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M7 11V7a2 2 0 1 1 4 0v4M11 11V5a2 2 0 1 1 4 0v6M15 11V7a2 2 0 1 1 4 0v6c0 4-3 7-7 7s-7-3-7-7v-2a2 2 0 1 1 4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'pill':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="9" width="18" height="6" rx="3" />
          <path d="M12 9v6" />
        </svg>
      )
    default: {
      const _ex: never = k
      return <span>{_ex}</span>
    }
  }
}

function IconExperience({ k }: { k: ExperienceIconKey }) {
  switch (k) {
    case 'baby':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="9" r="4" />
          <path d="M9 9h.01M15 9h.01M9.5 11.5c.7 1 1.5 1.5 2.5 1.5s1.8-.5 2.5-1.5" strokeLinecap="round" />
          <path d="M5 21c1-4 4-6 7-6s6 2 7 6" strokeLinecap="round" />
        </svg>
      )
    case 'senior':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="6" r="3" />
          <path d="M9 21V11h6v10M16 21l-2-6M8 21l1-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'wheelchair':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="10" cy="6" r="2" />
          <path d="M10 8v6h5l3 5M10 14a5 5 0 1 0 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'alz':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M9 21c-2-1-3-3-3-6 0-1 0-2-1-3 0-2 1-3 2-4 0-2 2-4 4-4 1 0 2 .5 3 1 1-.5 2-1 3-1 2 0 4 2 4 4 1 1 2 2 2 4-1 1-1 2-1 3 0 3-1 5-3 6" strokeLinejoin="round" />
          <path d="M9 21h6" strokeLinecap="round" />
        </svg>
      )
    case 'oncology':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      )
    case 'recovery':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 12a8 8 0 1 0 8-8" strokeLinecap="round" />
          <path d="M4 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    default: {
      const _ex: never = k
      return <span>{_ex}</span>
    }
  }
}

function IconHelp({ k }: { k: HelpServiceIconKey }) {
  switch (k) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9z" strokeLinejoin="round" />
        </svg>
      )
    case 'cook':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M5 21h14M6 17h12l-1-7H7l-1 7zM8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'med':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          <rect x="3" y="3" width="18" height="18" rx="3" />
        </svg>
      )
    case 'shop':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M5 7h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7zM9 7V5a3 3 0 1 1 6 0v2" strokeLinejoin="round" />
        </svg>
      )
    case 'transport':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M5 17V9l2-4h10l2 4v8M5 17h14M8 17v2M16 17v2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="8" cy="13" r="1" fill="currentColor" />
          <circle cx="16" cy="13" r="1" fill="currentColor" />
        </svg>
      )
    case 'companion':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="10" r="2.5" />
          <path d="M3 20c1-3 3.5-5 6-5s5 2 6 5M14 20c.5-2 2-3.5 4-3.5s3.5 1.5 4 3.5" strokeLinecap="round" />
        </svg>
      )
    default: {
      const _ex: never = k
      return <span>{_ex}</span>
    }
  }
}

function StarBar({ value }: { value: number }) {
  const full = Math.round(Math.min(5, Math.max(0, value)))
  return (
    <span className="profile-detail__starbar" aria-label={`Valutazione ${full} su 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`profile-detail__starbar-icon${i < full ? ' is-on' : ''}`} aria-hidden>
          {i < full ? <IconStarFilled size={14} /> : <IconStar size={14} />}
        </span>
      ))}
    </span>
  )
}

function AvailabilityRow({ label, days }: { label: string; days: readonly boolean[] }) {
  return (
    <tr>
      <th scope="row" className="profile-detail__avail-th">
        {label}
      </th>
      {DAY_SHORT.map((d, i) => (
        <td key={d} className={`profile-detail__avail-cell${days[i] ? ' is-on' : ''}`}>
          <span className="visually-hidden">{days[i] ? 'Disponibile' : 'Non disponibile'}</span>
          <span className="profile-detail__avail-mark" aria-hidden>
            {days[i] ? <IconCheck /> : <IconCross />}
          </span>
        </td>
      ))}
    </tr>
  )
}

export function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { profile, loading, error, reload } = useDirectoryProfile(id)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [referencesExpanded, setReferencesExpanded] = useState(false)
  const [contactSent, setContactSent] = useState(false)
  const [contactThreadId, setContactThreadId] = useState<string | null>(null)
  const [contactLoading, setContactLoading] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)
  const [showContactAuth, setShowContactAuth] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)

  useEffect(() => {
    if (profile) {
      document.title = `${profile.name} — ${categoryLabelText(profile.category)} | Curaxe`
    } else {
      document.title = 'Profilo | Curaxe'
    }
    return () => {
      document.title = 'Curaxe'
    }
  }, [profile])

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'public_user' || !user.id || !id) {
      setSaved(false)
      return
    }
    let cancelled = false
    void fetchIsProfileSaved(user.id, id).then((ok) => {
      if (!cancelled) setSaved(ok)
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id, user?.role, id])

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'public_user' || !user?.id || !id) {
      setContactSent(false)
      setContactThreadId(null)
      return
    }
    let cancelled = false
    void getThreads(user.id)
      .then((threads) => {
        if (cancelled) return
        const existing = threads.find(
          (t) =>
            t.linkType === 'direct_contact' &&
            t.participantIds.map(String).includes(String(id)) &&
            t.participantIds.map(String).includes(String(user.id)),
        )
        if (existing) {
          setContactSent(true)
          setContactThreadId(existing.id)
        } else {
          setContactSent(false)
          setContactThreadId(null)
        }
      })
      .catch(() => {
        /* ignore — Contatta resta disponibile */
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id, user?.role, id])

  const messagingHref = contactThreadId
    ? `${getDashboardPathForRole('public_user')}?section=messaggi&thread=${encodeURIComponent(contactThreadId)}`
    : `${getDashboardPathForRole('public_user')}?section=messaggi`

  const returnTo = useMemo(() => {
    const path = id ? `/profili/${id}` : profilesDirectoryPath
    const q = searchParams.toString()
    return q ? `${path}?${q}` : path
  }, [id, searchParams])

  const loginHref = `/accedi?redirect=${encodeURIComponent(`${returnTo}${returnTo.includes('?') ? '&' : '?'}contact=1`)}`
  const wantsContact = searchParams.get('contact') === '1'

  const similar = useMemo(
    () => (profile ? listSimilarProfiles(profile, 8).map(toCarouselCard) : []),
    [profile],
  )

  useEffect(() => {
    if (!wantsContact || !isAuthenticated || !profile || !id || !user?.id || contactLoading) {
      return
    }
    if (user.role !== 'public_user') {
      setShowContactAuth(true)
      return
    }
    if (contactSent) {
      if (contactThreadId) {
        navigate(
          `${getDashboardPathForRole('public_user')}?section=messaggi&thread=${encodeURIComponent(contactThreadId)}`,
        )
      }
      return
    }

    let cancelled = false

    async function run() {
      setContactLoading(true)
      setContactError(null)
      try {
        const thread = await openDirectContactThread(user!.id, user!.name, {
          professionalId: id!,
          professionalName: profile!.name,
          initialMessage: DEFAULT_FAMILY_CONTACT_MESSAGE,
        })
        if (cancelled) return
        setContactSent(true)
        setContactThreadId(thread.id)
        navigate(
          `${getDashboardPathForRole('public_user')}?section=messaggi&thread=${encodeURIComponent(thread.id)}`,
        )
      } catch (err) {
        if (!cancelled) {
          setContactError(
            err instanceof MessagingError
              ? err.message
              : 'Impossibile avviare la conversazione. Riprova tra poco.',
          )
        }
      } finally {
        if (!cancelled) setContactLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [
    wantsContact,
    isAuthenticated,
    profile,
    id,
    user,
    contactSent,
    contactThreadId,
    contactLoading,
    navigate,
  ])

  if (loading) {
    return (
      <SiteShell>
        <main className="profile-detail profile-detail--loading" aria-busy="true">
          <div className="profile-detail__viewport">
            <div className="profile-detail__inner">
              <div className="profile-detail__hero-skeleton polish-shimmer" aria-label="Caricamento profilo" />
            </div>
          </div>
        </main>
      </SiteShell>
    )
  }

  if (!id || error || !profile) {
    return (
      <SiteShell>
        <main className="profile-detail profile-detail--empty">
          <div className="profile-detail__viewport">
            <div className="profile-detail__inner polish-state-panel">
              <span className="polish-state-panel__icon" aria-hidden />
              <h1 className="profile-detail__empty-title">Profilo non trovato</h1>
              <p className="profile-detail__empty-text">
                {error ??
                  'L’identificativo non corrisponde a un profilo disponibile, oppure la scheda non è ancora navigabile in anteprima.'}
              </p>
              <div className="profile-detail__auth-actions">
                <button type="button" className="profile-detail__cta-secondary" onClick={() => void reload()}>
                  Riprova
                </button>
                <Link className="profile-detail__back-link" to={profilesDirectoryPath}>
                  Torna ai profili
                </Link>
              </div>
            </div>
          </div>
        </main>
      </SiteShell>
    )
  }

  const intentLabel = profile.listingIntent === 'cerco' ? 'Cerco lavoro' : 'Offro lavoro'
  const ratingText = formatRatingOutOfFiveIt(profile.stars)
  const nameWithAge = profile.age != null ? `${profile.name} (${profile.age})` : profile.name
  const bioFull = profile.bio + (profile.bioMore ? ` ${profile.bioMore}` : '')
  const featuredReference = profile.references[0]
  const otherReferences = profile.references.slice(1)
  const cityShort = profile.match.comune

  async function startContactThread(actor?: AuthUser) {
    const who = actor ?? user
    if (!who?.id || !profile || !id) return
    if (who.role !== 'public_user') {
      setContactError('Per contattare un professionista accedi con un account famiglia.')
      setShowContactAuth(true)
      return
    }
    setContactLoading(true)
    setContactError(null)
    try {
      const thread = await openDirectContactThread(who.id, who.name, {
        professionalId: id,
        professionalName: profile.name,
        initialMessage: DEFAULT_FAMILY_CONTACT_MESSAGE,
      })
      setContactSent(true)
      setContactThreadId(thread.id)
      navigate(
        `${getDashboardPathForRole('public_user')}?section=messaggi&thread=${encodeURIComponent(thread.id)}`,
      )
    } catch (err) {
      setContactError(
        err instanceof MessagingError
          ? err.message
          : 'Impossibile avviare la conversazione. Riprova tra poco.',
      )
    } finally {
      setContactLoading(false)
    }
  }

  function handleContact() {
    if (!isAuthenticated) {
      setShowContactAuth(true)
      return
    }
    if (user?.role !== 'public_user') {
      setContactError('Per contattare un professionista accedi con un account famiglia.')
      setShowContactAuth(true)
      return
    }
    void startContactThread()
  }

  async function handleSave() {
    if (!isAuthenticated || user?.role !== 'public_user' || !user.id || !profile || !id) {
      setShowContactAuth(true)
      return
    }
    setSaveBusy(true)
    try {
      if (saved) {
        await deleteSavedProfile(user.id, id)
        setSaved(false)
      } else {
        await createSavedProfile(user.id, {
          professionalId: id,
          name: profile.name,
          category: categoryLabelText(profile.category),
          zone: profile.locationLabel || 'Italia',
          stars: profile.stars,
        })
        setSaved(true)
      }
    } catch {
      /* keep previous saved state */
    } finally {
      setSaveBusy(false)
    }
  }

  return (
    <SiteShell>
      <main className="profile-detail">
        <div className="profile-detail__viewport">
          <div className="profile-detail__inner">
            <div className="profile-detail__toolbar">
              <Link className="profile-detail__pill-back" to={profilesDirectoryPath}>
                <IconChevronLeft />
                Tutti i profili
              </Link>
              <nav className="profile-detail__crumb polish-crumb" aria-label="Percorso">
                <Link to="/">Home</Link>
                <span aria-hidden> · </span>
                <Link to={profilesDirectoryPath}>Profili</Link>
                <span aria-hidden> · </span>
                <span className="profile-detail__crumb-current">{profile.name}</span>
              </nav>
            </div>

            <header className="profile-detail__hero" aria-labelledby="profile-detail-name">
              <div className="profile-detail__hero-photo-wrap">
                <div className="profile-detail__hero-photo-ring" aria-hidden />
                <img
                  className="profile-detail__hero-photo"
                  src={profile.imageUrl}
                  alt=""
                  width={320}
                  height={320}
                  decoding="async"
                  fetchPriority="high"
                />
                {profile.online ? (
                  <span className="profile-detail__hero-online" title="Online ora">
                    <IconOnlineDot />
                    Online
                  </span>
                ) : null}
              </div>

              <div className="profile-detail__hero-body">
                <span className="profile-detail__intent-pill">{intentLabel}</span>
                <h1 id="profile-detail-name" className="profile-detail__hero-name">
                  {nameWithAge}
                </h1>
                <p className="profile-detail__hero-role">
                  <span className="profile-detail__hero-role-cat">
                    <CategoryLabel category={profile.category} />
                  </span>
                  <span aria-hidden> · </span>
                  <span>{profile.role}</span>
                </p>
                <p className="profile-detail__hero-place">{profile.locationLabel}</p>

                {profile.verified ? (
                  <p className="profile-detail__verified-badge" role="status">
                    <span className="profile-detail__verified-icon" aria-hidden>
                      <IconCheckMark size={12} />
                    </span>
                    Profilo verificato (KYC)
                  </p>
                ) : null}

                <div className="profile-detail__hero-rating">
                  <StarBar value={profile.stars} />
                  <span className="profile-detail__hero-rating-text">
                    {ratingText} {profile.reviewCount > 0 ? <span>· {profile.reviewCount} referenze</span> : null}
                  </span>
                </div>

                <ul className="profile-detail__hero-chips" aria-label="Caratteristiche principali">
                  {profile.rateLabel ? (
                    <li className="profile-detail__chip profile-detail__chip--accent">{profile.rateLabel}</li>
                  ) : null}
                  {profile.experienceLabel ? (
                    <li className="profile-detail__chip">{profile.experienceLabel}</li>
                  ) : null}
                  {profile.viaAgencyName ? (
                    <li className="profile-detail__chip profile-detail__chip--muted" title={profile.viaAgencyName}>
                      Tramite {profile.viaAgencyName}
                    </li>
                  ) : null}
                </ul>
              </div>
            </header>

            <div className="profile-detail__grid">
              <div className="profile-detail__main">
                <section className="profile-detail__section" aria-labelledby="profile-detail-bio">
                  <h2 id="profile-detail-bio" className="profile-detail__h2">
                    Su di me
                  </h2>
                  <p className="profile-detail__p">
                    {bioExpanded || !profile.bioMore ? bioFull : profile.bio}
                  </p>
                  {profile.bioMore ? (
                    <button
                      type="button"
                      className="profile-detail__read-more"
                      onClick={() => setBioExpanded((v) => !v)}
                      aria-expanded={bioExpanded}
                    >
                      {bioExpanded ? 'Mostra meno' : 'Leggi di più'}
                    </button>
                  ) : null}
                </section>

                {profile.traits.length > 0 ? (
                  <section className="profile-detail__section" aria-labelledby="profile-detail-traits">
                    <h2 id="profile-detail-traits" className="profile-detail__h2">
                      Sono
                    </h2>
                    <ul className="profile-detail__chip-list" aria-label="Caratteristiche personali">
                      {profile.traits.map((t) => (
                        <li key={t} className="profile-detail__chip profile-detail__chip--soft">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {profile.competences.length > 0 ? (
                  <section className="profile-detail__section" aria-labelledby="profile-detail-comp">
                    <h2 id="profile-detail-comp" className="profile-detail__h2">
                      Le mie competenze
                    </h2>
                    <ul className="profile-detail__icon-chip-list">
                      {profile.competences.map((c) => (
                        <li key={c.id} className="profile-detail__icon-chip">
                          <span className="profile-detail__icon-chip-icon" aria-hidden>
                            <IconCompetence k={c.iconKey} />
                          </span>
                          <span>{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {profile.experiences.length > 0 ? (
                  <section className="profile-detail__section" aria-labelledby="profile-detail-exp">
                    <h2 id="profile-detail-exp" className="profile-detail__h2">
                      La mia esperienza
                    </h2>
                    <p className="profile-detail__section-lead">
                      Tipologie di assistito con cui ho lavorato e per quanto tempo.
                    </p>
                    <ul className="profile-detail__exp-grid">
                      {profile.experiences.map((e) => (
                        <li key={e.ageOrPatient} className="profile-detail__exp-card">
                          <div className="profile-detail__exp-icon" aria-hidden>
                            <IconExperience k={e.iconKey} />
                          </div>
                          <div className="profile-detail__exp-body">
                            <p className="profile-detail__exp-title">{e.ageOrPatient}</p>
                            <p className="profile-detail__exp-years">{e.yearsLabel}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className="profile-detail__section" aria-labelledby="profile-detail-services">
                  <h2 id="profile-detail-services" className="profile-detail__h2">
                    I miei servizi
                  </h2>
                  {profile.servicesCanDo.length > 0 ? (
                    <div className="profile-detail__services-block">
                      <p className="profile-detail__services-key">Posso lavorare:</p>
                      <ul className="profile-detail__chip-list">
                        {profile.servicesCanDo.map((s) => (
                          <li key={s} className="profile-detail__chip">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {profile.servicesCanHelpWith.length > 0 ? (
                    <div className="profile-detail__services-block">
                      <p className="profile-detail__services-key">Posso aiutare per:</p>
                      <ul className="profile-detail__icon-chip-list">
                        {profile.servicesCanHelpWith.map((s) => (
                          <li key={s.label} className="profile-detail__icon-chip">
                            <span className="profile-detail__icon-chip-icon" aria-hidden>
                              <IconHelp k={s.iconKey} />
                            </span>
                            <span>{s.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>

                {profile.references.length > 0 ? (
                  <section className="profile-detail__section" aria-labelledby="profile-detail-refs">
                    <h2 id="profile-detail-refs" className="profile-detail__h2">
                      Referenze ({profile.reviewCount || profile.references.length})
                    </h2>
                    {featuredReference ? (
                      <article className="profile-detail__ref-card">
                        <div className="profile-detail__ref-head">
                          <StarBar value={featuredReference.stars} />
                          <span className="profile-detail__ref-author">{featuredReference.author}</span>
                          <span className="profile-detail__ref-date" aria-hidden>
                            ·
                          </span>
                          <span className="profile-detail__ref-date">{featuredReference.date}</span>
                        </div>
                        <p className="profile-detail__ref-text">{featuredReference.text}</p>
                      </article>
                    ) : null}

                    {referencesExpanded && otherReferences.length > 0 ? (
                      <div className="profile-detail__ref-extra">
                        {otherReferences.map((r) => (
                          <article key={`${r.author}-${r.date}`} className="profile-detail__ref-card">
                            <div className="profile-detail__ref-head">
                              <StarBar value={r.stars} />
                              <span className="profile-detail__ref-author">{r.author}</span>
                              <span className="profile-detail__ref-date" aria-hidden>
                                ·
                              </span>
                              <span className="profile-detail__ref-date">{r.date}</span>
                            </div>
                            <p className="profile-detail__ref-text">{r.text}</p>
                          </article>
                        ))}
                      </div>
                    ) : null}

                    {otherReferences.length > 0 ? (
                      <button
                        type="button"
                        className="profile-detail__ref-toggle"
                        onClick={() => setReferencesExpanded((v) => !v)}
                        aria-expanded={referencesExpanded}
                      >
                        {referencesExpanded
                          ? 'Mostra meno'
                          : `Mostra tutte le referenze (${otherReferences.length + 1})`}
                      </button>
                    ) : null}
                  </section>
                ) : null}

                <section className="profile-detail__section profile-detail__section--map" aria-labelledby="profile-detail-map">
                  <h2 id="profile-detail-map" className="profile-detail__h2">
                    Zona di copertura
                  </h2>
                  <p className="profile-detail__section-lead">{profile.coverageHint}</p>
                  <div className="profile-detail__map" role="img" aria-label={`Mappa stilizzata: ${profile.coverageHint}`}>
                    <div className="profile-detail__map-bg" aria-hidden />
                    <div className="profile-detail__map-pings" aria-hidden>
                      <span className="profile-detail__map-ping profile-detail__map-ping--a" />
                      <span className="profile-detail__map-ping profile-detail__map-ping--b" />
                      <span className="profile-detail__map-ping profile-detail__map-ping--c" />
                      <span className="profile-detail__map-ping profile-detail__map-ping--d" />
                    </div>
                    <div className="profile-detail__map-avatar">
                      <img src={profile.imageUrl} alt="" width={120} height={120} decoding="async" />
                    </div>
                  </div>
                  <p className="profile-detail__map-foot">
                    Anteprima dimostrativa: in produzione mostreremo una mappa interattiva centrata su {cityShort}.
                  </p>
                </section>

                <section
                  className="profile-detail__section profile-detail__section--trust"
                  aria-labelledby="profile-detail-trust"
                >
                  <h2 id="profile-detail-trust" className="profile-detail__h2">
                    Sicurezza e trasparenza
                  </h2>
                  <ul className="profile-detail__trust-list">
                    {TRUST_CUES.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <aside className="profile-detail__aside" aria-labelledby="profile-detail-aside-title">
                <div className="profile-detail__aside-card">
                  <h2 id="profile-detail-aside-title" className="visually-hidden">
                    Disponibilità e contatto
                  </h2>

                  <div className="profile-detail__aside-headline">
                    <span className="profile-detail__aside-eyebrow">Disponibile</span>
                    <ProfileRatingCompact value={profile.stars} className="profile-detail__aside-rating" />
                  </div>

                  <div className="profile-detail__avail-table-wrap">
                    <table className="profile-detail__avail-table" aria-label="Disponibilità settimanale per fascia oraria">
                      <thead>
                        <tr>
                          <th scope="col" className="profile-detail__avail-corner">
                            <span className="visually-hidden">Fascia oraria</span>
                          </th>
                          {DAY_SHORT.map((d) => (
                            <th key={d} scope="col" className="profile-detail__avail-day">
                              {d}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <AvailabilityRow label="Mattina" days={profile.availability.morning} />
                        <AvailabilityRow label="Pomeriggio" days={profile.availability.afternoon} />
                        <AvailabilityRow label="Sera" days={profile.availability.evening} />
                      </tbody>
                    </table>
                  </div>

                  <dl className="profile-detail__aside-facts">
                    {profile.rateLabel ? (
                      <div>
                        <dt>Tariffa indicativa</dt>
                        <dd>{profile.rateLabel}</dd>
                      </div>
                    ) : null}
                    {profile.shift ? (
                      <div>
                        <dt>Turni preferiti</dt>
                        <dd>{profile.shift}</dd>
                      </div>
                    ) : null}
                    {profile.viaAgencyName ? (
                      <div>
                        <dt>Gestione</dt>
                        <dd>Tramite {profile.viaAgencyName}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {profile.availableFor.length > 0 ? (
                    <div className="profile-detail__aside-list">
                      <p className="profile-detail__aside-list-key">Disponibile per:</p>
                      <ul>
                        {profile.availableFor.map((s) => (
                          <li key={s}>
                            <span className="profile-detail__aside-list-mark" aria-hidden>
                              <IconCheck />
                            </span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {isAuthenticated ? (
                    <>
                      {contactError ? (
                        <p className="profile-detail__success" role="alert" style={{ borderColor: 'var(--color-accent)' }}>
                          {contactError}
                        </p>
                      ) : null}
                      {contactSent ? (
                        <p className="profile-detail__success" role="status">
                          Hai già inviato una richiesta di contatto. Continua la conversazione in Messaggi.
                        </p>
                      ) : null}
                      <button
                        type="button"
                        className="profile-detail__cta"
                        onClick={() => {
                          if (contactSent) {
                            navigate(messagingHref)
                            return
                          }
                          handleContact()
                        }}
                        disabled={contactLoading}
                      >
                        {contactLoading
                          ? 'Apertura conversazione…'
                          : contactSent
                            ? 'Vai ai messaggi'
                            : `Contatta ${profile.name.split(' ')[0]}`}
                      </button>
                      {contactSent ? (
                        <Link
                          className="profile-detail__cta-secondary profile-detail__cta--link"
                          to={messagingHref}
                        >
                          Apri conversazione
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        className={`profile-detail__cta-secondary${saved ? ' is-active' : ''}`}
                        onClick={() => void handleSave()}
                        aria-pressed={saved}
                        disabled={saveBusy}
                      >
                        {saveBusy ? 'Attendere…' : saved ? 'Profilo salvato' : 'Salva profilo'}
                      </button>
                    </>
                  ) : (
                    <div className="profile-detail__auth-gate" aria-labelledby="profile-detail-auth-title">
                      <h3 id="profile-detail-auth-title" className="profile-detail__auth-title">
                        Contatta dopo l’accesso
                      </h3>
                      <p className="profile-detail__auth-text">
                        Per inviare un messaggio o salvare il profilo serve accedere come famiglia.
                      </p>
                      <div className="profile-detail__auth-actions">
                        <button type="button" className="profile-detail__cta" onClick={() => setShowContactAuth(true)}>
                          Contatta professionista
                        </button>
                        <Link className="profile-detail__cta-secondary" to={loginHref}>
                          Accedi
                        </Link>
                      </div>
                    </div>
                  )}

                  <Link className="profile-detail__back-bottom" to={profilesDirectoryPath}>
                    Torna a tutti i profili
                  </Link>
                </div>
              </aside>
            </div>

            {similar.length > 0 ? (
              <section className="profile-detail__similar" aria-labelledby="profile-detail-similar-title">
                <header className="profile-detail__similar-head">
                  <h2 id="profile-detail-similar-title" className="profile-detail__similar-title">
                    Profili simili disponibili ora
                  </h2>
                  <p className="profile-detail__similar-sub">
                    Stessa figura ({categoryLabelText(profile.category)}) e priorità a {profile.match.regione}.
                  </p>
                </header>
                <HomeProfileCarousel cards={similar} categoryLabel={categoryLabelText(profile.category)} />
              </section>
            ) : null}

            <section className="profile-detail__help-band" aria-labelledby="profile-detail-faq">
              <div className="profile-detail__help-inner">
                <div className="profile-detail__help-grid">
                  <div className="profile-detail__help-faq">
                    <h2 id="profile-detail-faq" className="profile-detail__help-title">
                      Tu chiedi, noi rispondiamo
                    </h2>
                    <p className="profile-detail__help-lead">
                      Risposte rapide su come funziona il contatto e cosa fa la piattaforma. Per approfondire visita la{' '}
                      <Link className="profile-detail__help-inline-link" to="/come-funziona">
                        pagina Come funziona
                      </Link>
                      .
                    </p>
                    <div className="profile-detail__faq-list">
                      {PROFILE_PAGE_FAQ.map((item) => (
                        <details key={item.q} className="profile-detail__faq-item">
                          <summary className="profile-detail__faq-summary">{item.q}</summary>
                          <p className="profile-detail__faq-answer">{item.a}</p>
                        </details>
                      ))}
                    </div>
                  </div>

                  <aside className="profile-detail__contact-card" aria-labelledby="profile-detail-contact-title">
                    <h2 id="profile-detail-contact-title" className="profile-detail__help-title">
                      Riferimenti
                    </h2>
                    <p className="profile-detail__help-lead">
                      Piattaforma <strong>Curaxe</strong> — punto d’accesso digitale per domanda e offerta di
                      assistenza socio-sanitaria.
                    </p>
                    <dl className="profile-detail__contact-dl">
                      <div>
                        <dt>Riferimento profilo</dt>
                        <dd>
                          <code className="profile-detail__contact-code">{profile.id}</code>
                          <span className="profile-detail__contact-hint"> Utile per assistenza o segnalazioni.</span>
                        </dd>
                      </div>
                      <div>
                        <dt>Email piattaforma (anteprima)</dt>
                        <dd>
                          <a className="profile-detail__contact-link" href={`mailto:${PLATFORM_SUPPORT_EMAIL}`}>
                            {PLATFORM_SUPPORT_EMAIL}
                          </a>
                        </dd>
                      </div>
                    </dl>
                  </aside>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <ContactAuthDialog
        open={showContactAuth}
        onClose={() => setShowContactAuth(false)}
        returnTo={`${returnTo}${returnTo.includes('?') ? '&' : '?'}contact=1`}
        professionalName={profile.name}
        onAuthenticated={(authedUser) => {
          void startContactThread(authedUser)
        }}
      />
    </SiteShell>
  )
}
