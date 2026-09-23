import { useNavigate } from 'react-router-dom'
import { BRAND_NAME } from '../../lib/brand'

function IconBriefcase() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12" />
    </svg>
  )
}

function IconHome() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

const ACCOUNT_TYPES = [
  {
    id: 'professional',
    path: '/dashboard/professionale',
    variant: 'professional' as const,
    icon: <IconBriefcase />,
    title: 'Badante / OSS / Infermiere',
    desc: 'Gestisci profilo, abbonamento, richieste ricevute e candidature inviate.',
    cta: 'Entra come Professionista',
  },
  {
    id: 'family',
    path: '/dashboard/famiglia',
    variant: 'family' as const,
    icon: <IconHome />,
    title: 'Famiglia / Chi cerca assistenza',
    desc: 'Pubblica richieste, visualizza candidature e trova il professionista giusto.',
    cta: 'Entra come Famiglia',
  },
  {
    id: 'agency',
    path: '/dashboard/agenzia',
    variant: 'agency' as const,
    icon: <IconBuilding />,
    title: 'Agenzia badanti',
    desc: 'Gestisci il profilo agenzia, pubblica posizioni domiciliari e il network.',
    cta: 'Entra come Agenzia',
  },
  {
    id: 'structure',
    path: '/dashboard/struttura',
    variant: 'structure' as const,
    icon: <IconHome />,
    title: 'Struttura RSA / Residenza',
    desc: 'Gestisci profilo struttura, turni per reparto e staff in organico.',
    cta: 'Entra come Struttura',
  },
  {
    id: 'admin',
    path: '/dashboard/admin',
    variant: 'admin' as const,
    icon: <IconShield />,
    title: 'Admin piattaforma',
    desc: 'Supervisiona utenti, richieste, abbonamenti, dispute e verifiche profili.',
    cta: 'Entra come Admin',
  },
]

export function DashboardGatePage() {
  const navigate = useNavigate()

  return (
    <div className="dash-gate">
      <div className="dash-gate__header">
        <div className="dash-gate__logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="var(--color-primary)" />
            <path d="M8 18c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <circle cx="14" cy="10" r="2.5" fill="#fff" />
          </svg>
          {BRAND_NAME}
        </div>
        <h1 className="dash-gate__title">Benvenuto nella Dashboard</h1>
        <p className="dash-gate__subtitle">Seleziona il tipo di account da visualizzare:</p>
      </div>

      <div className="dash-gate__grid">
        {ACCOUNT_TYPES.map((type) => (
          <div key={type.id} className={`dash-gate-card dash-gate-card--${type.variant}`}>
            <div className="dash-gate-card__icon">{type.icon}</div>
            <div className="dash-gate-card__title">{type.title}</div>
            <div className="dash-gate-card__desc">{type.desc}</div>
            <button className="dash-gate-card__cta" onClick={() => navigate(type.path)}>
              {type.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
