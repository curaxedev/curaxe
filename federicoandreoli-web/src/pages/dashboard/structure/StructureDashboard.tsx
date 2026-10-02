import { useEffect, useState } from 'react'
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
import { useStaff } from '../../../hooks/useStaff'
import { STAFF_STATUS_LABELS, type StaffMemberStatus } from '../../../lib/staffTypes'
import {
  IconBell,
  IconBriefcase,
  IconBuilding,
  IconCheckMark,
  IconChevronRight,
  IconCreditCard,
  IconGrid,
  IconMessages,
  IconPlus,
  IconProfile,
  IconSettings,
  IconUpload,
  IconUsers,
  IconWave,
} from '../../../components/icons/DashboardIcons'

const STRUCTURE_DASHBOARD_PATH = '/dashboard/struttura'

type PostingStatus = 'active' | 'paused' | 'closed'

const CHART_DATA = [8, 12, 10, 14, 18, 16, 20, 22, 19, 24, 21, 26, 18, 15, 23, 20, 28, 25, 17, 22, 30, 27, 19, 16, 29, 24, 21, 26, 32, 28]

const MOCK_POSTINGS = [
  { id: '1', title: 'OSS turno mattina — Reparto Alzheimer', contract: 'Tempo pieno', zone: 'Monza', date: '08 mag 2026', applications: 9, status: 'active' as PostingStatus },
  { id: '2', title: 'Infermiere notturno RSA', contract: 'Turni 12h', zone: 'Monza', date: '02 mag 2026', applications: 5, status: 'active' as PostingStatus },
  { id: '3', title: 'OSS weekend — Reparto lungodegenti', contract: 'Part-time', zone: 'Monza', date: '20 apr 2026', applications: 11, status: 'paused' as PostingStatus },
  { id: '4', title: 'Ausiliario convivente estivo', contract: 'Stagionale', zone: 'Brianza', date: '05 apr 2026', applications: 6, status: 'closed' as PostingStatus },
]

const POSTING_STATUS_LABELS: Record<PostingStatus, string> = {
  active: 'Attivo',
  paused: 'In pausa',
  closed: 'Chiuso',
}

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
      aria-label="Candidature ultimi 30 giorni"
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
              fill={isLast ? 'var(--color-sage)' : 'var(--color-sage-softer)'}
            />
            <text className="polish-chart-tip" x={x + barW / 2} y={h - barH - 4} textAnchor="middle">
              {v}
            </text>
            <title>{`Giorno ${i + 1}: ${v} candidature`}</title>
          </g>
        )
      })}
    </svg>
  )
}

function SectionOverview() {
  return (
    <div>
      <div className="dash-welcome-banner dash-welcome-banner--structure">
        <div className="dash-welcome-banner__greeting">
          <span className="dash-welcome-banner__greeting-icon"><IconWave size={16} /></span>
          Benvenuti
        </div>
        <div className="dash-welcome-banner__name">RSA Villa Serena</div>
        <div className="dash-welcome-banner__sub">Monza · 120 posti letto · Accreditata 2015</div>
      </div>

      <div className="dash-stat-grid">
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-sage-softer)', color: 'var(--color-sage)' }}>
            <IconProfile size={20} />
          </div>
          <div className="dash-stat-card__value">86</div>
          <div className="dash-stat-card__label">Staff in organico</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-primary-softer)', color: 'var(--color-primary)' }}>
            <IconBriefcase size={20} />
          </div>
          <div className="dash-stat-card__value">3</div>
          <div className="dash-stat-card__label">Turni in recruiting</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'var(--color-accent-softer)', color: 'var(--color-accent)' }}>
            <IconUsers size={20} />
          </div>
          <div className="dash-stat-card__value">31</div>
          <div className="dash-stat-card__label">Candidature ricevute</div>
        </div>
      </div>

      <div className="dash-overview-row">
        <div className="dash-chart-wrap">
          <div className="dash-chart-title">Candidature — ultimi 30 giorni</div>
          <BarChart data={CHART_DATA} />
          <p className="dash-chart-footnote">
            Totale: {CHART_DATA.reduce((a, b) => a + b, 0)} candidature · Picco: {Math.max(...CHART_DATA)} in un giorno
          </p>
        </div>

        <div className="dash-chart-wrap dash-chart-wrap--turni">
          <div className="dash-chart-title">Ultimi turni pubblicati</div>
          {MOCK_POSTINGS.slice(0, 3).map((p) => (
            <div key={p.id} className="dash-revenue-row">
              <div>
                <div className="dash-revenue-row__title">{p.title}</div>
                <div className="dash-revenue-row__meta">{p.applications} candidature</div>
              </div>
              <span className={`dash-badge dash-badge--${p.status}`}>{POSTING_STATUS_LABELS[p.status]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionPostings({
  onContactCandidate,
  contactingId,
}: {
  onContactCandidate?: (applicationId: string) => void | Promise<void>
  contactingId?: string | null
}) {
  return (
    <B2BPostingsSection
      variant="structure"
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

function SectionStructureProfile() {
  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Profilo struttura</h2>
          <p className="dash-section__subtitle">Come appare la vostra RSA sulla piattaforma</p>
        </div>
        <button type="button" className="dash-btn dash-btn--primary">Salva modifiche</button>
      </div>
      <div className="dash-card">
        <div className="dash-card__title">Informazioni struttura</div>
        <div className="dash-profile-avatar-wrap">
          <div className="dash-profile-avatar" style={{ background: 'var(--color-sage-softer)', color: 'var(--color-sage)', fontSize: '1.4rem' }}>VS</div>
          <div>
            <button type="button" className="dash-btn dash-btn--ghost">
              <IconUpload size={16} />
              Carica logo
            </button>
            <p className="dash-form-hint">PNG o SVG. Min 200×200px.</p>
          </div>
        </div>
        <div className="dash-form-grid">
          <div className="dash-form-field">
            <label className="dash-form-label">Nome struttura</label>
            <input className="dash-form-input" defaultValue="RSA Villa Serena" />
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label">Posti letto</label>
            <input className="dash-form-input" type="number" defaultValue="120" />
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label">Reparti</label>
            <input className="dash-form-input" defaultValue="Alzheimer, Lungodegenti, Riabilitazione, Day hospital" />
          </div>
          <div className="dash-form-field">
            <label className="dash-form-label">Profili ricercati</label>
            <input className="dash-form-input" defaultValue="OSS, Infermieri, Ausiliari, Badanti interne" />
          </div>
          <div className="dash-form-field dash-form-field--full">
            <label className="dash-form-label">Descrizione struttura</label>
            <textarea className="dash-form-input dash-form-textarea" defaultValue="RSA Villa Serena è una residenza per anziani accreditata in provincia di Monza. Gestiamo reparti specializzati con personale interno e turni programmati H24." />
          </div>
          <div className="dash-form-field dash-form-field--full">
            <label className="dash-form-label">Accreditamenti</label>
            <input className="dash-form-input" defaultValue="Accreditata Regione Lombardia · Certificazione qualità RSA · Convenzione ASST Monza" />
          </div>
        </div>
      </div>
      <OrganizationLocationsSection />
    </div>
  )
}

function SectionStaff({ orgId }: { orgId: string }) {
  const staff = useStaff(orgId)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('OSS')
  const [department, setDepartment] = useState('')
  const [showForm, setShowForm] = useState(false)

  const statusBadge: Record<StaffMemberStatus, string> = {
    available: 'active',
    'on-shift': 'on-shift',
    leave: 'leave',
  }

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Staff e reparti</h2>
          <p className="dash-section__subtitle">
            Dipendenti in organico ({staff.members.length})
          </p>
        </div>
        <button type="button" className="dash-btn dash-btn--primary" onClick={() => setShowForm((v) => !v)}>
          <IconPlus size={16} />
          Aggiungi dipendente
        </button>
      </div>

      {staff.error ? (
        <div className="dash-card" role="alert" style={{ marginBottom: 16, borderColor: 'var(--color-accent)' }}>
          {staff.error}
        </div>
      ) : null}

      {showForm ? (
        <div className="dash-card" style={{ marginBottom: 16 }}>
          <div className="dash-form-grid">
            <div className="dash-form-field">
              <label className="dash-form-label" htmlFor="staff-name">Nome</label>
              <input id="staff-name" className="dash-form-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="dash-form-field">
              <label className="dash-form-label" htmlFor="staff-cat">Categoria</label>
              <input id="staff-cat" className="dash-form-input" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="dash-form-field">
              <label className="dash-form-label" htmlFor="staff-dept">Reparto</label>
              <input id="staff-dept" className="dash-form-input" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
          </div>
          <button
            type="button"
            className="dash-btn dash-btn--primary"
            style={{ marginTop: 12 }}
            disabled={staff.busyId === 'new'}
            onClick={() => {
              void staff.add({ name, category, department }).then((ok) => {
                if (ok) {
                  setName('')
                  setDepartment('')
                  setShowForm(false)
                }
              })
            }}
          >
            Salva dipendente
          </button>
        </div>
      ) : null}

      {staff.loading ? (
        <div className="dash-skeleton" style={{ width: '100%', height: 160 }} aria-busy="true" />
      ) : (
        <div className="dash-team-grid">
          {staff.members.map((m) => (
            <div key={m.id} className="dash-team-card dash-team-card--staff">
              <div className="dash-team-card__avatar">{m.initials}</div>
              <div>
                <div className="dash-team-card__name">{m.name}</div>
                <div className="dash-team-card__meta">{m.category} · {m.department}</div>
                <select
                  className="dash-form-select"
                  style={{ width: 'auto', marginTop: 8 }}
                  value={m.status}
                  disabled={staff.busyId === m.id}
                  onChange={(e) => void staff.setStatus(m.id, e.target.value as StaffMemberStatus)}
                  aria-label={`Stato di ${m.name}`}
                >
                  {(Object.keys(STAFF_STATUS_LABELS) as StaffMemberStatus[]).map((key) => (
                    <option key={key} value={key}>
                      {STAFF_STATUS_LABELS[key]}
                    </option>
                  ))}
                </select>
                <span className={`dash-badge dash-badge--${statusBadge[m.status]}`} style={{ marginTop: 4, marginLeft: 8 }}>
                  {STAFF_STATUS_LABELS[m.status]}
                </span>
                <button
                  type="button"
                  className="dash-btn dash-btn--ghost"
                  style={{ marginTop: 8 }}
                  disabled={staff.busyId === m.id}
                  onClick={() => {
                    if (window.confirm(`Rimuovere ${m.name} dallo staff?`)) {
                      void staff.remove(m.id)
                    }
                  }}
                >
                  Rimuovi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionBilling({
  isPremium,
  loading,
  onUpgrade,
  onCancel,
  cancelLoading,
  cancelAtPeriodEnd,
  periodEndLabel,
}: {
  isPremium: boolean
  loading: boolean
  onUpgrade: () => void
  onCancel: () => void
  cancelLoading: boolean
  cancelAtPeriodEnd: boolean
  periodEndLabel: string | null
}) {
  const product = BILLING_PRODUCTS.structure_premium_monthly
  const amountLabel = formatBillingAmount(product.key)

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">Abbonamento Premium RSA</h2>
          <p className="dash-section__subtitle">
            {loading
              ? 'Caricamento…'
              : isPremium
                ? cancelAtPeriodEnd && periodEndLabel
                  ? `Piano Premium RSA attivo fino al ${periodEndLabel}`
                  : 'Piano Premium RSA attivo'
                : 'Piano gratuito — funzionalità base per strutture RSA'}
          </p>
        </div>
      </div>

      <div className="dash-plans dash-plans--structure">
        <div className="dash-plan-card">
          {!isPremium && <div className="dash-plan__current-badge">Piano attuale</div>}
          <div className="dash-plan__name">Gratuito</div>
          <div className="dash-plan__price-free">Gratis</div>
          <ul className="dash-plan__features">
            <li className="dash-plan__feature">
              <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
              <span>Turni e candidature base</span>
            </li>
            <li className="dash-plan__feature">
              <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
              <span>Profilo struttura</span>
            </li>
          </ul>
          <button type="button" className="dash-btn dash-btn--ghost dash-btn--lg" style={{ width: '100%' }} disabled={!isPremium}>
            {isPremium ? '—' : 'Piano attuale'}
          </button>
        </div>

        <div className="dash-plan-card dash-plan-card--featured dash-plan-card--structure">
          {isPremium && <div className="dash-plan__current-badge">Piano attuale</div>}
          <div className="dash-plan__name">Premium RSA</div>
          <div className="dash-plan__price">{amountLabel}</div>
          <div className="dash-plan__price-note">al mese · annullabile</div>
          <ul className="dash-plan__features">
            <li className="dash-plan__feature">
              <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
              <span>Annunci illimitati e priorità in directory</span>
            </li>
            <li className="dash-plan__feature">
              <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
              <span>Analytics avanzate per reparto e sede</span>
            </li>
            <li className="dash-plan__feature">
              <span className="dash-plan__feature-icon--check"><IconCheckMark size={14} /></span>
              <span>Team collaboratori e supporto dedicato RSA</span>
            </li>
          </ul>
          {isPremium ? (
            <button
              type="button"
              className="dash-btn dash-btn--ghost dash-btn--lg"
              style={{ width: '100%' }}
              disabled={cancelLoading || cancelAtPeriodEnd}
              onClick={onCancel}
            >
              {cancelAtPeriodEnd ? 'Disdetta programmata' : 'Annulla abbonamento'}
            </button>
          ) : (
            <button type="button" className="dash-btn dash-btn--primary dash-btn--lg" style={{ width: '100%' }} onClick={onUpgrade}>
              Attiva Premium RSA
              <IconChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {showBillingDemoCopy() && (
        <p className="dash-form-hint" style={{ marginTop: 'var(--space-4)' }}>
          Pagamenti in modalità demo fino all&apos;integrazione Stripe in produzione.
        </p>
      )}
    </div>
  )
}

function buildNavItems(unreadNotifications: number, unreadMessages: number) {
  return [
    { id: 'overview', label: 'Overview', icon: <IconGrid size={18} /> },
    { id: 'turni', label: 'Turni aperti', tabLabel: 'Turni', icon: <IconBriefcase size={18} /> },
    { id: 'candidature', label: 'Candidature ricevute', tabLabel: 'Candidati', icon: <IconUsers size={18} /> },
    { id: 'messaggi', label: 'Messaggi', tabLabel: 'Messaggi', icon: <IconMessages size={18} />, badge: unreadMessages },
    { id: 'notifiche', label: 'Notifiche', tabLabel: 'Notifiche', icon: <IconBell size={18} />, badge: unreadNotifications },
    { id: 'profilo-struttura', label: 'Profilo struttura', tabLabel: 'Profilo', icon: <IconBuilding size={18} /> },
    { id: 'staff', label: 'Staff e reparti', tabLabel: 'Staff', icon: <IconProfile size={18} /> },
    { id: 'team', label: 'Team collaboratori', tabLabel: 'Team', icon: <IconUsers size={18} /> },
    { id: 'abbonamento', label: 'Premium RSA', tabLabel: 'Piano', icon: <IconCreditCard size={18} /> },
    { id: 'impostazioni', label: 'Impostazioni', tabLabel: 'Impostaz.', icon: <IconSettings size={18} /> },
  ]
}

export function StructureDashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const billing = useBillingSubscription('structure', { dashboardPath: STRUCTURE_DASHBOARD_PATH })
  const notifications = useNotifications()
  const sectionParam = searchParams.get('section')
  const threadParam = searchParams.get('thread')
  const messaging = useMessaging({ initialThreadId: threadParam })
  const applications = useApplications()
  const [activeSection, setActiveSection] = useState(sectionParam === 'messaggi' ? 'messaggi' : 'overview')
  const [contactingId, setContactingId] = useState<string | null>(null)

  const STRUCTURE_SECTIONS = new Set([
    'overview',
    'turni',
    'candidature',
    'messaggi',
    'notifiche',
    'profilo-struttura',
    'staff',
    'team',
    'abbonamento',
    'impostazioni',
  ])

  useEffect(() => {
    if (sectionParam && STRUCTURE_SECTIONS.has(sectionParam)) {
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
      const thread = await openApplicationContactThread(user.id, user.name, 'structure', { applicationId })
      await messaging.reloadThreads({ silent: true })
      await applications.reload()
      openMessaging(thread.id)
    } catch {
      openMessaging()
    } finally {
      setContactingId(null)
    }
  }

  const periodEndLabel = billing.subscription?.currentPeriodEnd
    ? formatBillingDate(billing.subscription.currentPeriodEnd)
    : null

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <SectionOverview />
      case 'turni':
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
            subtitle="Conversazioni con i professionisti candidati ai tuoi turni"
            userId={user?.id ?? ''}
            templateRole="structure"
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
            title="Notifiche struttura"
            subtitle="Candidature, messaggi e aggiornamenti account"
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
      case 'profilo-struttura':
        return <SectionStructureProfile />
      case 'staff':
        return <SectionStaff orgId={user?.id ?? 'struct-1'} />
      case 'team':
        return <TeamMembersSection variant="structure" />
      case 'abbonamento':
        return (
          <SectionBilling
            isPremium={billing.isPremium}
            loading={billing.loading}
            onUpgrade={() => void billing.startCheckout()}
            onCancel={() => void billing.cancel()}
            cancelLoading={billing.cancelLoading}
            cancelAtPeriodEnd={billing.subscription?.cancelAtPeriodEnd ?? false}
            periodEndLabel={periodEndLabel}
          />
        )
      case 'impostazioni':
        return <AccountSettingsSection />
      default:
        return null
    }
  }

  return (
    <DashboardLayout
      accountType="structure"
      userName={user?.name ?? 'Struttura'}
      userRole="Struttura RSA"
      navItems={buildNavItems(notifications.unreadCount, messaging.unreadCount)}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      planType={billing.planType}
    >
      {renderSection()}
    </DashboardLayout>
  )
}
