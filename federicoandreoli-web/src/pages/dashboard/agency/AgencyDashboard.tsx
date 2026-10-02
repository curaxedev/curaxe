import { useEffect, useState } from 'react'
import {
  fetchB2BOverview,
  patchB2BOrganization,
  type B2BOverview,
} from '../../../lib/jobPostingApi'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../auth/useAuth'
import { useBillingSubscription } from '../../../hooks/useBillingSubscription'
import { useMessaging } from '../../../hooks/useMessaging'
import { showBillingDemoCopy } from '../../../lib/billingFeatures'
import { BILLING_PRODUCTS, formatBillingAmount, formatBillingDate } from '../../../lib/billingApi'
import { openApplicationContactThread } from '../../../lib/messagingApi'
import { B2BCandidatesSection } from '../b2b/B2BCandidatesSection'
import { B2BPostingsSection } from '../b2b/B2BPostingsSection'
import { useJobPostings } from '../../../hooks/useJobPostings'
import { useApplications } from '../../../hooks/useApplications'
import { useNotifications } from '../../../hooks/useNotifications'
import { AccountSettingsSection } from '../AccountSettingsSection'
import { DashboardLayout } from '../DashboardLayout'
import { DashboardMessagingSection } from '../DashboardMessagingSection'
import { DashboardNotificationsSection } from '../DashboardNotificationsSection'
import { OrganizationLocationsSection } from '../b2b/OrganizationLocationsSection'
import { TeamMembersSection } from '../b2b/TeamMembersSection'
import {
  IconBell,
  IconBriefcase,
  IconBuilding,
  IconCheckMark,
  IconChevronRight,
  IconCreditCard,
  IconGrid,
  IconMessages,
  IconProfile,
  IconSettings,
  IconUpload,
  IconUsers,
  IconWave,
} from '../../../components/icons/DashboardIcons'

/* ── Labels ─────────────────────────────────────────────────── */
const POSTING_STATUS_LABELS: Record<string, string> = {
  active: 'Attivo',
  paused: 'In pausa',
  closed: 'Chiuso',
  draft: 'Bozza',
  pending_review: 'In revisione',
  rejected: 'Rifiutato',
}

/* ── Bar Chart ──────────────────────────────────────────────── */
function BarChart({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const barW = 9
  const gap = 3
  const h = 70
  const totalW = data.length * (barW + gap)

  return (
    <svg
      className="dash-chart-svg"
      viewBox={`0 0 ${totalW} ${h}`}
      aria-label="Richieste ultimi 30 giorni"
    >
      {data.map((v, i) => {
        const barH = Math.max(4, (v / max) * h)
        const x = i * (barW + gap)
        const isLast = i === data.length - 1
        return (
          <g key={i} className="polish-chart-bar" tabIndex={0} role="graphics-symbol" aria-label={`Giorno ${i + 1}: ${v}`}>
            <rect
              className="polish-chart-bar__fill"
              x={x}
              y={h - barH}
              width={barW}
              height={barH}
              rx="3"
              fill={isLast ? 'var(--color-primary)' : 'var(--color-primary-soft)'}
            />
            <text className="polish-chart-tip" x={x + barW / 2} y={h - barH - 4} textAnchor="middle">
              {v}
            </text>
            <title>{`Giorno ${i + 1}: ${v} richieste`}</title>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Section: Overview ──────────────────────────────────────── */
function SectionOverview() {
  const [overview, setOverview] = useState<B2BOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void fetchB2BOverview()
      .then((data) => {
        if (!cancelled) setOverview(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !overview) {
    return <p className="dash-section__subtitle">Caricamento overview…</p>
  }

  const chart = overview.chartLast30Days.length > 0 ? overview.chartLast30Days : [0]
  const org = overview.organization

  return (
    <div>
      <div className="dash-welcome-banner">
        <div className="dash-welcome-banner__greeting">
          <span className="dash-welcome-banner__greeting-icon"><IconWave size={16} /></span>
          Benvenuti
        </div>
        <div className="dash-welcome-banner__name">{org.name}</div>
        <div className="dash-welcome-banner__sub">{org.comune} · {org.roleLabel}</div>
      </div>

      <div className="dash-stat-grid">
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-primary-softer)', color: 'var(--color-primary)' }}>
            <IconUsers size={20} />
          </div>
          <div className="dash-stat-card__value">{overview.stats.networkProfessionals}</div>
          <div className="dash-stat-card__label">Professionisti nel network</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-sage-softer)', color: 'var(--color-sage)' }}>
            <IconBriefcase size={20} />
          </div>
          <div className="dash-stat-card__value">{overview.stats.activePostings}</div>
          <div className="dash-stat-card__label">Annunci attivi</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-accent-softer)', color: 'var(--color-accent)' }}>
            <IconUsers size={20} />
          </div>
          <div className="dash-stat-card__value">{overview.stats.applicationsReceived}</div>
          <div className="dash-stat-card__label">Candidature ricevute</div>
        </div>
      </div>

      <div className="dash-overview-row">
        <div className="dash-chart-wrap">
          <div className="dash-chart-title">Richieste — ultimi 30 giorni</div>
          <BarChart data={chart} />
          <p className="dash-chart-footnote">
            Totale: {chart.reduce((a, b) => a + b, 0)} richieste · Picco: {Math.max(...chart)} in un giorno
          </p>
        </div>

        <div className="dash-chart-wrap">
          <div className="dash-chart-title">Ultimi annunci pubblicati</div>
          {overview.latestPostings.length === 0 ? (
            <p className="dash-section__subtitle">Nessun annuncio ancora. Pubblicane uno dalla sezione Annunci.</p>
          ) : (
            overview.latestPostings.map((p) => (
              <div key={p.id} className="dash-revenue-row">
                <div>
                  <div className="dash-revenue-row__title">{p.title}</div>
                  <div className="dash-revenue-row__meta">{p.applications} candidature</div>
                </div>
                <span className={`dash-badge dash-badge--${p.status}`}>
                  {POSTING_STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Section: Postings (SPRINT-11) ─────────────────────────── */
function SectionPostings({
  onContactCandidate,
  contactingId,
}: {
  onContactCandidate?: (applicationId: string) => void | Promise<void>
  contactingId?: string | null
}) {
  return (
    <B2BPostingsSection
      variant="agency"
      onContactCandidate={onContactCandidate}
      contactingId={contactingId}
    />
  )
}

function SectionCandidates({
  onContactCandidate,
  contactingId,
}: {
  onContactCandidate?: (applicationId: string) => void | Promise<void>
  contactingId?: string | null
}) {
  const { postings, loading } = useJobPostings()
  return (
    <B2BCandidatesSection
      postings={postings}
      postingsLoading={loading}
      onContactCandidate={onContactCandidate}
      contactingId={contactingId}
    />
  )
}

/* ── Section: Agency Profile ────────────────────────────────── */
function SectionAgencyProfile() {
  const [name, setName] = useState('')
  const [comune, setComune] = useState('')
  const [coverageHint, setCoverageHint] = useState('')
  const [servicesText, setServicesText] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchB2BOverview().then((data) => {
      if (cancelled) return
      setName(data.organization.name)
      setComune(data.organization.comune)
      setCoverageHint(data.organization.coverageHint)
      setServicesText(data.organization.services.join(', '))
      setBio(data.organization.bio ?? '')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await patchB2BOrganization({
        name,
        comune,
        coverageHint,
        bio,
        services: servicesText.split(',').map((s) => s.trim()).filter(Boolean),
      })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Salvataggio non riuscito. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'AG'

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Profilo agenzia</h2>
          <p className="dash-section__subtitle">Come appare la vostra agenzia sulla piattaforma</p>
        </div>
        <button
          type="button"
          className="dash-btn dash-btn--primary"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? 'Salvataggio…' : saved ? 'Salvato' : 'Salva modifiche'}
        </button>
      </div>
      {error ? (
        <div className="dash-card" role="alert" style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-accent)' }}>
          {error}
        </div>
      ) : null}
      <div className="dash-card">
        <div className="dash-card__title">Informazioni agenzia</div>
        <div className="dash-profile-avatar-wrap">
          <div className="dash-profile-avatar" style={{ background: 'var(--color-accent-softer)', color: 'var(--color-accent)', fontSize: '1.4rem' }}>{initials}</div>
          <div>
            <button type="button" className="dash-btn dash-btn--ghost" disabled>
              <IconUpload size={16} />
              Carica logo
            </button>
            <p className="dash-form-hint">PNG o SVG, su sfondo trasparente. Min 200×200px.</p>
          </div>
        </div>
        <div className="dash-form-grid">
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="agency-name">Nome agenzia</label>
            <input id="agency-name" className="dash-form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label" htmlFor="agency-comune">Comune sede</label>
            <input id="agency-comune" className="dash-form-input" value={comune} onChange={(e) => setComune(e.target.value)} />
          </div>
          <div className="dash-form-field dash-form-field--full">
            <label className="dash-form-label" htmlFor="agency-zones">Zone operative</label>
            <input id="agency-zones" className="dash-form-input" value={coverageHint} onChange={(e) => setCoverageHint(e.target.value)} />
          </div>
          <div className="dash-form-field dash-form-field--full">
            <label className="dash-form-label" htmlFor="agency-services">Settori</label>
            <input id="agency-services" className="dash-form-input" value={servicesText} onChange={(e) => setServicesText(e.target.value)} />
          </div>
          <div className="dash-form-field dash-form-field--full">
            <label className="dash-form-label" htmlFor="agency-bio">Descrizione agenzia</label>
            <textarea id="agency-bio" className="dash-form-input dash-form-textarea" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </div>
      </div>
      <OrganizationLocationsSection />
    </div>
  )
}

/* ── Section: Team (STR-011) ────────────────────────────────── */
function SectionTeam() {
  return <TeamMembersSection variant="agency" />
}

/* ── Section: B2B Billing ───────────────────────────────────── */
function SectionBilling({
  isPremium,
  isTrialing,
  loading,
  onUpgrade,
  onCancel,
  onPortal,
  cancelLoading,
  cancelAtPeriodEnd,
  periodEndLabel,
  trialEndsLabel,
}: {
  isPremium: boolean
  isTrialing?: boolean
  loading: boolean
  onUpgrade: () => void
  onCancel: () => void
  onPortal?: () => void
  cancelLoading: boolean
  cancelAtPeriodEnd: boolean
  periodEndLabel: string | null
  trialEndsLabel?: string | null
}) {
  const product = BILLING_PRODUCTS.agency_business_monthly
  const amountLabel = formatBillingAmount(product.key)

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Abbonamento B2B</h2>
          <p className="dash-section__subtitle">
            {loading
              ? 'Caricamento…'
              : isTrialing && trialEndsLabel
                ? `Periodo di prova fino al ${trialEndsLabel}`
                : isPremium
                  ? cancelAtPeriodEnd && periodEndLabel
                    ? `Piano Business attivo fino al ${periodEndLabel}`
                    : 'Piano Business attivo'
                  : 'Piano gratuito — funzionalità base per agenzie'}
          </p>
        </div>
      </div>

      <div className="dash-plans">
        <div className="dash-plan-card">
          {!isPremium && <div className="dash-plan__current-badge">Piano attuale</div>}
          <div className="dash-plan__name">Gratuito</div>
          <div className="dash-plan__price-free">Gratis</div>
          <ul className="dash-plan__features">
            <li className="dash-plan__feature">
              <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
              <span>Annunci e candidature base</span>
            </li>
            <li className="dash-plan__feature">
              <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
              <span>Profilo agenzia</span>
            </li>
          </ul>
          <button className="dash-btn dash-btn--ghost dash-btn--lg" style={{ width: '100%' }} disabled={!isPremium}>
            {isPremium ? '—' : 'Piano attuale'}
          </button>
        </div>

        <div className="dash-plan-card dash-plan-card--featured">
          {isPremium && <div className="dash-plan__current-badge">{isTrialing ? 'In prova' : 'Piano attuale'}</div>}
          <div className="dash-plan__name">Business</div>
          <div className="dash-plan__price">{amountLabel}</div>
          <div className="dash-plan__price-note">al mese · annullabile · prova con carta</div>
          <ul className="dash-plan__features">
            <li className="dash-plan__feature">
              <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
              <span>Annunci illimitati e visibilità prioritaria</span>
            </li>
            <li className="dash-plan__feature">
              <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
              <span>Team esteso e statistiche avanzate</span>
            </li>
            <li className="dash-plan__feature">
              <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
              <span>Supporto dedicato B2B</span>
            </li>
          </ul>
          {isPremium ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onPortal && (
                <button type="button" className="dash-btn dash-btn--primary dash-btn--lg" style={{ width: '100%' }} onClick={onPortal}>
                  Gestisci su Stripe
                </button>
              )}
              <button
                className="dash-btn dash-btn--ghost dash-btn--lg"
                style={{ width: '100%' }}
                disabled={cancelLoading || cancelAtPeriodEnd}
                onClick={onCancel}
              >
                {cancelAtPeriodEnd ? 'Disdetta programmata' : 'Annulla abbonamento'}
              </button>
            </div>
          ) : (
            <button type="button" className="dash-btn dash-btn--primary dash-btn--lg" style={{ width: '100%' }} onClick={onUpgrade}>
              Attiva Business
              <IconChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {showBillingDemoCopy() && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-4)' }}>
          Pagamenti in modalità demo fino all&apos;integrazione Stripe in produzione.
        </p>
      )}
    </div>
  )
}

/* ── Nav items ──────────────────────────────────────────────── */
function buildNavItems(unreadNotifications: number, unreadMessages: number) {
  return [
    { id: 'overview', label: 'Overview', icon: <IconGrid size={18} /> },
    { id: 'annunci', label: 'I miei annunci', tabLabel: 'Annunci', icon: <IconBriefcase size={18} /> },
    { id: 'candidature', label: 'Candidature ricevute', tabLabel: 'Candidati', icon: <IconUsers size={18} /> },
    { id: 'messaggi', label: 'Messaggi', tabLabel: 'Messaggi', icon: <IconMessages size={18} />, badge: unreadMessages },
    { id: 'notifiche', label: 'Notifiche', tabLabel: 'Notifiche', icon: <IconBell size={18} />, badge: unreadNotifications },
    { id: 'profilo-agenzia', label: 'Profilo agenzia', tabLabel: 'Profilo', icon: <IconBuilding size={18} /> },
    { id: 'team', label: 'Team', icon: <IconProfile size={18} /> },
    { id: 'abbonamento', label: 'Abbonamento B2B', tabLabel: 'Piano', icon: <IconCreditCard size={18} /> },
    { id: 'impostazioni', label: 'Impostazioni', tabLabel: 'Impostaz.', icon: <IconSettings size={18} /> },
  ]
}

/* ── Main component ─────────────────────────────────────────── */
export function AgencyDashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const billing = useBillingSubscription('agency')
  const notifications = useNotifications()
  const sectionParam = searchParams.get('section')
  const threadParam = searchParams.get('thread')
  const messaging = useMessaging({ initialThreadId: threadParam })
  const applications = useApplications()
  const [activeSection, setActiveSection] = useState(sectionParam === 'messaggi' ? 'messaggi' : 'overview')
  const [contactingId, setContactingId] = useState<string | null>(null)

  const AGENCY_SECTIONS = new Set([
    'overview',
    'annunci',
    'candidature',
    'messaggi',
    'notifiche',
    'profilo-agenzia',
    'team',
    'abbonamento',
    'impostazioni',
  ])

  useEffect(() => {
    if (sectionParam && AGENCY_SECTIONS.has(sectionParam)) {
      setActiveSection(sectionParam)
    }
    if (threadParam) {
      messaging.selectThread(threadParam)
    }
  }, [sectionParam, threadParam, messaging.selectThread])

  useEffect(() => {
    const billingResult = searchParams.get('billing')
    const section = searchParams.get('section')
    if (!billingResult) return

    if (billingResult === 'success') {
      setActiveSection(section === 'abbonamento' ? 'abbonamento' : 'overview')
      void billing.reload()
    } else if (billingResult === 'cancel') {
      setActiveSection('abbonamento')
    }

    searchParams.delete('billing')
    searchParams.delete('section')
    setSearchParams(searchParams, { replace: true })
  }, [billing, searchParams, setSearchParams])

  const openMessaging = (threadId?: string) => {
    setActiveSection('messaggi')
    if (threadId) {
      messaging.selectThread(threadId)
      setSearchParams({ section: 'messaggi', thread: threadId }, { replace: true })
    } else {
      setSearchParams({ section: 'messaggi' }, { replace: true })
    }
  }

  const contactCandidate = async (applicationId: string) => {
    if (!user?.id) return
    setContactingId(applicationId)
    try {
      const thread = await openApplicationContactThread(user.id, user.name, 'agency', { applicationId })
      await messaging.reloadThreads({ silent: true })
      await applications.reload()
      openMessaging(thread.id)
    } catch {
      openMessaging()
    } finally {
      setContactingId(null)
    }
  }

  const handleUpgrade = async () => {
    await billing.startCheckout()
  }

  const periodEndLabel = billing.subscription?.currentPeriodEnd
    ? formatBillingDate(billing.subscription.currentPeriodEnd)
    : null

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':         return <SectionOverview />
      case 'annunci':
        return (
          <SectionPostings
            onContactCandidate={contactCandidate}
            contactingId={contactingId}
          />
        )
      case 'candidature':
        return (
          <SectionCandidates
            onContactCandidate={contactCandidate}
            contactingId={contactingId}
          />
        )
      case 'messaggi':
        return (
          <DashboardMessagingSection
            title="Messaggi"
            subtitle="Conversazioni con i professionisti candidati ai tuoi annunci"
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
      case 'notifiche':
        return (
          <DashboardNotificationsSection
            title="Notifiche agenzia"
            subtitle="Nuove candidature, messaggi e aggiornamenti"
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
      case 'profilo-agenzia':  return <SectionAgencyProfile />
      case 'team':             return <SectionTeam />
      case 'abbonamento':
        return (
          <SectionBilling
            isPremium={billing.isPremium}
            isTrialing={billing.isTrialing}
            loading={billing.loading}
            onUpgrade={() => void handleUpgrade()}
            onCancel={() => void billing.cancel()}
            onPortal={() => void billing.openPortal()}
            cancelLoading={billing.cancelLoading}
            cancelAtPeriodEnd={billing.subscription?.cancelAtPeriodEnd ?? false}
            periodEndLabel={periodEndLabel}
            trialEndsLabel={
              billing.subscription?.trialEndsAt
                ? formatBillingDate(billing.subscription.trialEndsAt)
                : null
            }
          />
        )
      case 'impostazioni':
        return <AccountSettingsSection />
      default:                 return null
    }
  }

  return (
    <DashboardLayout
      accountType="agency"
      userName={user?.name ?? 'Agenzia'}
      userRole="Agenzia"
      navItems={buildNavItems(notifications.unreadCount, messaging.unreadCount)}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      planType={billing.planType}
    >
      {renderSection()}
    </DashboardLayout>
  )
}
