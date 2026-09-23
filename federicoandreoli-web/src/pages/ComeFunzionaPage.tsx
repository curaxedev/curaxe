import { useEffect, useState, type ComponentType, type ReactElement, type SVGProps } from 'react'
import { Link } from 'react-router-dom'
import {
  IconBell,
  IconBuilding,
  IconCheck,
  IconEdit,
  IconInfo,
  IconList,
  IconLock,
  IconMessages,
  IconSearch,
  IconShield,
  IconStar,
  IconSupport,
  IconTrendUp,
  IconUsers,
} from '../components/icons/DashboardIcons'
import { SiteShell } from '../components/SiteShell'

type Audience = 'cerco' | 'offro' | 'agenzia'
type IconComponent = () => ReactElement

type DashIconProps = SVGProps<SVGSVGElement> & { size?: number }

function dashIcon(Icon: ComponentType<DashIconProps>, size: number): IconComponent {
  return function DashIcon() {
    return <Icon size={size} aria-hidden />
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons — step icons (28px canvas)
// ─────────────────────────────────────────────────────────────────────────────

function IcoHandshake() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M2 17c0 0 2.5-4 6-4l3 2 4-3 5 2c2 1 4-1 6-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 15l-2 4 4 4 2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 15l2 4-4 4-2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IcoMegaphone() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M5 12v4h4l9 5V7l-9 5H5z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M22 10l2-2M22 18l2 2M23 14h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 20l2-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IcoGift() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="3" y="12" width="26" height="6" rx="1.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="M5 18v10h22V18" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M16 12v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 12C10 8.686 12.686 6 16 6c0 0 0 6-6 6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M22 12C22 8.686 19.314 6 16 6c0 0 0 6 6 6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function IcoDirectContract() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M14 20a6 6 0 0 0 8 0l4-4a6 6 0 0 0-8.485-8.485l-2 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18 12a6 6 0 0 0-8 0l-4 4a6 6 0 0 0 8.485 8.485l2-2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const audienceTabs: { id: Audience; label: string; sub: string }[] = [
  { id: 'cerco', label: 'Cerco Assistenza', sub: 'Per famiglie e caregivers' },
  { id: 'offro', label: 'Offro Assistenza', sub: 'Badanti, OSS, infermieri' },
  { id: 'agenzia', label: 'Agenzie & Strutture', sub: 'Per organizzazioni' },
]

type StepItem = {
  num: number
  title: string
  text: string
  tip?: string
  Icon: IconComponent
}

const stepsByAudience: Record<Audience, StepItem[]> = {
  cerco: [
    {
      num: 1,
      title: 'Descrivi la tua necessità',
      text: 'Compila un breve form sulla persona da assistere: orari, tipo di assistenza, zona. Più dettagli fornisci, più pertinenti saranno i profili che troverai.',
      tip: 'Puoi aggiornare la ricerca in qualsiasi momento se le necessità cambiano.',
      Icon: dashIcon(IconEdit, 28),
    },
    {
      num: 2,
      title: 'Esplora i profili verificati',
      text: 'Cerca e filtra badanti, OSS e infermieri nella tua zona. Ogni scheda mostra disponibilità, certificazioni e segnali di fiducia per aiutarti a scegliere con calma.',
      Icon: dashIcon(IconSearch, 28),
    },
    {
      num: 3,
      title: 'Contatta direttamente',
      text: 'Scrivi al professionista scelto senza intermediari. Nessun call center, nessun filtro: parli direttamente con la persona che potrebbe prendersi cura del tuo caro.',
      tip: 'Puoi contattare più professionisti e confrontare le disponibilità prima di decidere.',
      Icon: dashIcon(IconMessages, 28),
    },
    {
      num: 4,
      title: 'Accordo diretto',
      text: "Definite insieme contratto, orari e condizioni. La piattaforma facilita l'incontro; il rapporto lavorativo è esclusivamente tra voi.",
      tip: 'Per i contratti di lavoro domestico ti consigliamo di consultare un consulente del lavoro.',
      Icon: IcoHandshake,
    },
  ],
  offro: [
    {
      num: 1,
      title: 'Crea il tuo profilo',
      text: 'Inserisci esperienze, certificazioni, disponibilità oraria e zona. Un profilo completo aumenta significativamente le probabilità di essere contattato da famiglie in target.',
      tip: 'Aggiungi foto profilo e documenti per aumentare la fiducia dei potenziali clienti.',
      Icon: dashIcon(IconUsers, 28),
    },
    {
      num: 2,
      title: 'Scegli il piano',
      text: 'Inizia gratuitamente con il piano Free. Passa a Premium quando vuoi per ottenere più visibilità nelle ricerche, contatti illimitati e il badge verificato.',
      Icon: dashIcon(IconStar, 28),
    },
    {
      num: 3,
      title: 'Ricevi richieste',
      text: 'Le famiglie ti contattano direttamente tramite la piattaforma. Ricevi notifiche in tempo reale e rispondi quando sei disponibile: zero intermediari, zero sprechi di tempo.',
      tip: 'Rispondi entro 24 ore per mantenere alta la tua valutazione di reattività.',
      Icon: dashIcon(IconBell, 28),
    },
    {
      num: 4,
      title: 'Lavora con serenità',
      text: 'Il supporto della piattaforma è sempre disponibile. Profilo sicuro, dati protetti secondo il GDPR, e una community di professionisti come te con cui confrontarti.',
      Icon: dashIcon(IconShield, 28),
    },
  ],
  agenzia: [
    {
      num: 1,
      title: 'Registra la tua organizzazione',
      text: 'Inserisci i dati aziendali, il team e i servizi offerti. Un profilo istituzionale credibile aumenta la fiducia di famiglie e professionisti.',
      Icon: dashIcon(IconBuilding, 28),
    },
    {
      num: 2,
      title: 'Pubblica i tuoi annunci',
      text: 'Crea posizioni lavorative con requisiti chiari: ruolo, orari, zona, retribuzione indicativa. Le offerte vengono indicizzate nella ricerca locale della piattaforma.',
      tip: 'Annunci dettagliati ricevono candidature più qualificate e riducono il tempo di selezione.',
      Icon: IcoMegaphone,
    },
    {
      num: 3,
      title: 'Gestisci le candidature',
      text: "Ricevi CV e profili qualificati in un'unica dashboard ordinata. Valuta i candidati, consulta le loro certificazioni e avvia il contatto direttamente dalla piattaforma.",
      Icon: dashIcon(IconList, 28),
    },
    {
      num: 4,
      title: 'Monitora il tuo profilo',
      text: 'Consulta le statistiche di visibilità: visite al profilo, contatti ricevuti, posizioni attive. Ottimizza la presenza della tua struttura nel mercato locale.',
      tip: 'Aggiorna regolarmente il profilo per mantenere alta la visibilità nella tua area.',
      Icon: dashIcon(IconTrendUp, 28),
    },
  ],
}

type TrustCard = {
  Icon: IconComponent
  title: string
  text: string
  variant: 'primary' | 'accent' | 'sage' | 'purple' | 'accent2' | 'sage2'
}

const trustCards: TrustCard[] = [
  {
    Icon: dashIcon(IconCheck, 32),
    title: 'Professionisti verificati',
    text: "Ogni profilo è controllato con processi di verifica per garantire la qualità e l'autenticità delle informazioni.",
    variant: 'primary',
  },
  {
    Icon: IcoGift,
    title: 'Gratuito per le famiglie',
    text: 'La ricerca e il contatto con i professionisti sono completamente gratuiti per le famiglie che cercano assistenza.',
    variant: 'accent',
  },
  {
    Icon: dashIcon(IconLock, 32),
    title: 'Privacy e GDPR',
    text: 'I tuoi dati sono protetti in conformità al Regolamento Europeo sulla Privacy. Nessun dato clinico nei campi pubblici.',
    variant: 'sage',
  },
  {
    Icon: dashIcon(IconSupport, 32),
    title: 'Supporto umano',
    text: 'Un team reale risponde alle tue domande. Non solo chatbot: assistenza personalizzata quando ne hai bisogno.',
    variant: 'purple',
  },
  {
    Icon: IcoDirectContract,
    title: 'Contratto diretto',
    text: 'Nessun intermediario tra famiglia e professionista. Accordate condizioni, orari e retribuzione in totale autonomia.',
    variant: 'accent2',
  },
  {
    Icon: dashIcon(IconUsers, 32),
    title: 'Community attiva',
    text: 'Oltre 3.000 professionisti verificati nella piattaforma. Un network in crescita su tutto il territorio nazionale.',
    variant: 'sage2',
  },
]

type PlanFeature = {
  label: string
  free: string | false
  premium: string | true
}

const planFeatures: PlanFeature[] = [
  { label: 'Profilo visibile in ricerca', free: 'Limitato', premium: 'Prioritario' },
  { label: 'Contatti ricevibili al mese', free: '3 / mese', premium: 'Illimitati' },
  { label: 'Posizione nei risultati', free: 'Standard', premium: 'Top' },
  { label: 'Badge profilo verificato', free: false, premium: true },
  { label: 'Statistiche profilo', free: false, premium: true },
  { label: 'Supporto prioritario', free: false, premium: true },
]

type FaqItem = { q: string; a: string }

const faqItems: FaqItem[] = [
  {
    q: 'Quanto costa per le famiglie che cercano assistenza?',
    a: 'La ricerca e il contatto con i professionisti sono completamente gratuiti per le famiglie. Non ci sono costi nascosti né abbonamenti richiesti.',
  },
  {
    q: 'Come vengono verificati i professionisti?',
    a: 'Ogni professionista che si registra passa attraverso un processo di verifica delle informazioni fornite. I badge di verifica indicano il livello di controllo completato sul profilo.',
  },
  {
    q: 'Posso passare dal piano Free al Premium in qualsiasi momento?',
    a: "Sì, puoi aggiornare o modificare il tuo piano in qualsiasi momento dalla sezione impostazioni del tuo account. L'upgrade è immediato e puoi anche tornare al piano Free se lo desideri.",
  },
  {
    q: 'Come vengono protetti i miei dati personali?',
    a: 'Tutti i dati sono trattati in conformità al GDPR. I dati clinici sensibili non vengono mai richiesti nei moduli pubblici della piattaforma.',
  },
  {
    q: 'Come funziona il contatto diretto tra famiglia e professionista?',
    a: "Una volta trovato il profilo di tuo interesse, puoi inviare una richiesta di contatto. Il professionista riceve una notifica e può risponderti direttamente. Tutta la comunicazione avviene senza intermediari.",
  },
  {
    q: 'Qual è la differenza concreta tra piano Free e Premium?',
    a: 'Con il piano Free puoi creare un profilo e ricevere fino a 3 contatti al mese. Il piano Premium ti offre visibilità prioritaria nei risultati di ricerca, contatti illimitati, badge verificato e statistiche dettagliate sul tuo profilo.',
  },
  {
    q: 'La piattaforma gestisce contratti o pagamenti?',
    a: "No. La piattaforma facilita l'incontro tra domanda e offerta, ma contratti, pagamenti e adempimenti burocratici restano esclusivamente tra le parti. Per i contratti di lavoro domestico, consigliamo di rivolgersi a un consulente del lavoro.",
  },
  {
    q: 'Chi può registrarsi come agenzia o struttura?',
    a: "Agenzie per il lavoro autorizzate, RSA, strutture socio-sanitarie e cooperative del settore possono registrarsi con un profilo istituzionale per pubblicare annunci e trovare professionisti qualificati.",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ComeFunzionaPage() {
  const [audience, setAudience] = useState<Audience>('cerco')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.home-reveal')
    if (els.length === 0) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-visible'))
      return
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            obs.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.07 }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const steps = stepsByAudience[audience]

  const heroConfig = {
    cerco: {
      title: 'Trova il professionista giusto, con calma e metodo',
      sub: 'Un percorso chiaro dalla ricerca locale al primo contatto: pensato per famiglie che vogliono ordine, non caos.',
    },
    offro: {
      title: 'Fatti trovare da chi cerca proprio il tuo profilo',
      sub: "Quattro passi per capire come valorizzare le tue competenze e connetterti con famiglie e strutture nella tua zona.",
    },
    agenzia: {
      title: 'Scala la rete socio-sanitaria con un profilo credibile',
      sub: "Per agenzie autorizzate e strutture: lead più ordinati, annunci leggibili e presenza stabile sul territorio.",
    },
  } as const

  return (
    <SiteShell>
      <main className="cf-page">

        {/* ── 1. Hero ────────────────────────────────────────────────── */}
        <section className="cf-hero" aria-labelledby="cf-hero-title">
          <div className="cf-hero__inner">
            <nav className="cf-breadcrumb" aria-label="Percorso">
              <Link to="/">Home</Link>
              <span aria-hidden> / </span>
              <span>Come funziona</span>
            </nav>

            <div className="cf-hero__content">
              <p className="cf-hero__eyebrow">Guida alla piattaforma</p>
              <h1 id="cf-hero-title" className="cf-hero__title">
                Come funziona{' '}
                <span className="cf-hero__title-accent">la piattaforma</span>
              </h1>
              <p className="cf-hero__sub">
                Un marketplace dedicato all'assistenza domiciliare che mette in contatto famiglie, professionisti e
                organizzazioni socio-sanitarie in modo semplice, trasparente e gratuito.
              </p>
              <div className="cf-hero__stats" role="list">
                <span className="cf-stat-pill" role="listitem">
                  <span className="cf-stat-pill__dot" aria-hidden />
                  3.000+ professionisti verificati
                </span>
                <span className="cf-stat-pill" role="listitem">
                  <span className="cf-stat-pill__dot cf-stat-pill__dot--accent" aria-hidden />
                  Gratuito per le famiglie
                </span>
                <span className="cf-stat-pill" role="listitem">
                  <span className="cf-stat-pill__dot cf-stat-pill__dot--primary" aria-hidden />
                  Risposta in 24h
                </span>
              </div>
            </div>

            <div className="cf-tabs" role="tablist" aria-label="Seleziona il tuo percorso">
              {audienceTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={audience === tab.id}
                  className={`cf-tab${audience === tab.id ? ' is-active' : ''}`}
                  onClick={() => setAudience(tab.id)}
                >
                  <span className="cf-tab__label">{tab.label}</span>
                  <span className="cf-tab__sub">{tab.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. Steps ───────────────────────────────────────────────── */}
        <section className="cf-steps home-reveal" aria-labelledby="cf-steps-title">
          <div className="cf-steps__inner">
            <p className="cf-steps__eyebrow">Il tuo percorso</p>
            <h2 id="cf-steps-title" className="cf-steps__title" key={`title-${audience}`}>
              {heroConfig[audience].title}
            </h2>
            <p className="cf-steps__sub" key={`sub-${audience}`}>
              {heroConfig[audience].sub}
            </p>

            <div className={`cf-steps__grid cf-steps__grid--${audience}`} key={audience}>
              {steps.map((step) => (
                <article key={step.num} className="cf-step-card">
                  <div className="cf-step-card__header">
                    <div className="cf-step-num" aria-hidden>
                      {step.num.toString().padStart(2, '0')}
                    </div>
                    <div className="cf-step-icon">
                      <step.Icon />
                    </div>
                  </div>
                  <h3 className="cf-step-card__title">{step.title}</h3>
                  <p className="cf-step-card__text">{step.text}</p>
                  {step.tip && (
                    <div className="cf-step-card__tip" role="note">
                      <span className="cf-step-card__tip-icon" aria-hidden>
                        <IconInfo size={14} />
                      </span>
                      {step.tip}
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="cf-steps__cta">
              {audience === 'cerco' && (
                <>
                  <Link to="/profili" className="cf-btn cf-btn--primary">
                    Cerca un professionista
                  </Link>
                  <Link to="/registrazione/intent" className="cf-btn cf-btn--ghost">
                    Registrati gratuitamente
                  </Link>
                </>
              )}
              {audience === 'offro' && (
                <>
                  <Link to="/iscriviti" className="cf-btn cf-btn--primary">
                    Crea il tuo profilo
                  </Link>
                  <Link to="/profili" className="cf-btn cf-btn--ghost">
                    Esplora la community
                  </Link>
                </>
              )}
              {audience === 'agenzia' && (
                <>
                  <Link to="/registrazione/intent" className="cf-btn cf-btn--primary">
                    Registra la tua organizzazione
                  </Link>
                  <Link to="/profili" className="cf-btn cf-btn--ghost">
                    Vedi i professionisti
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── 3. Perché sceglierci ────────────────────────────────────── */}
        <section className="cf-trust home-reveal" aria-labelledby="cf-trust-title">
          <div className="cf-trust__inner">
            <p className="cf-trust__eyebrow">Perché sceglierci</p>
            <h2 id="cf-trust-title" className="cf-trust__title">
              Una piattaforma costruita sulla fiducia
            </h2>
            <p className="cf-trust__sub">
              Ogni scelta di design e ogni funzionalità nascono da un unico obiettivo: rendere l'assistenza domiciliare
              più accessibile, sicura e umana.
            </p>
            <div className="cf-trust__grid">
              {trustCards.map((card) => (
                <div key={card.title} className={`cf-trust-card cf-trust-card--${card.variant}`}>
                  <div className="cf-trust-card__icon">
                    <card.Icon />
                  </div>
                  <h3 className="cf-trust-card__title">{card.title}</h3>
                  <p className="cf-trust-card__text">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. Piani Free / Premium ─────────────────────────────────── */}
        <section className="cf-plans home-reveal" aria-labelledby="cf-plans-title">
          <div className="cf-plans__inner">
            <p className="cf-plans__eyebrow">Per chi offre assistenza</p>
            <h2 id="cf-plans-title" className="cf-plans__title">
              Scegli il piano più adatto a te
            </h2>
            <p className="cf-plans__sub">
              Inizia gratuitamente. Passa a Premium quando vuoi per aumentare visibilità e opportunità di contatto.
            </p>

            <div className="cf-plans__grid">
              {/* Free */}
              <div className="cf-plan-card cf-plan-card--free">
                <div className="cf-plan-card__header">
                  <p className="cf-plan-card__name">Free</p>
                  <p className="cf-plan-card__price">
                    <span className="cf-plan-card__price-amount">0€</span>
                    <span className="cf-plan-card__price-period"> / sempre</span>
                  </p>
                  <p className="cf-plan-card__tagline">Per iniziare a farti trovare</p>
                </div>
                <ul className="cf-plan-card__features" role="list">
                  {planFeatures.map((f) => (
                    <li
                      key={f.label}
                      className={`cf-plan-card__feature${f.free === false ? ' cf-plan-card__feature--unavail' : ''}`}
                    >
                      <span className="cf-plan-card__feature-icon" aria-hidden>
                        {f.free === false ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="cf-plan-card__feature-label">{f.label}</span>
                      {typeof f.free === 'string' && (
                        <span className="cf-plan-card__feature-value">{f.free}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <Link to="/iscriviti" className="cf-plan-card__cta cf-plan-card__cta--free">
                  Inizia gratis
                </Link>
              </div>

              {/* Premium */}
              <div className="cf-plan-card cf-plan-card--premium">
                <div className="cf-plan-card__badge" aria-label="Piano consigliato">Più popolare</div>
                <div className="cf-plan-card__header">
                  <p className="cf-plan-card__name">Premium</p>
                  <p className="cf-plan-card__price">
                    <span className="cf-plan-card__price-amount">Da 9,90€</span>
                    <span className="cf-plan-card__price-period"> / mese</span>
                  </p>
                  <p className="cf-plan-card__tagline">Per massimizzare le opportunità</p>
                </div>
                <ul className="cf-plan-card__features" role="list">
                  {planFeatures.map((f) => (
                    <li key={f.label} className="cf-plan-card__feature">
                      <span className="cf-plan-card__feature-icon" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="cf-plan-card__feature-label">{f.label}</span>
                      {typeof f.premium === 'string' && (
                        <span className="cf-plan-card__feature-value">{f.premium}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <Link to="/iscriviti?piano=premium" className="cf-plan-card__cta cf-plan-card__cta--premium">
                  Inizia con Premium
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. FAQ ─────────────────────────────────────────────────── */}
        <section className="cf-faq home-reveal" aria-labelledby="cf-faq-title">
          <div className="cf-faq__inner">
            <div className="cf-faq__intro">
              <p className="cf-faq__eyebrow">Hai domande?</p>
              <h2 id="cf-faq-title" className="cf-faq__title">
                Domande frequenti
              </h2>
              <p className="cf-faq__sub">
                Tutto quello che devi sapere prima di iniziare. Se non trovi risposta, il nostro team è sempre
                disponibile.
              </p>
            </div>

            <div className="cf-faq__list">
              {faqItems.map((item, idx) => (
                <div key={idx} className={`cf-faq-item${openFaq === idx ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="cf-faq-item__summary"
                    aria-expanded={openFaq === idx}
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  >
                    <span>{item.q}</span>
                    <span className="cf-faq-item__chevron" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M4.5 7l4.5 4.5L13.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                  <div className="cf-faq-item__body" aria-hidden={openFaq !== idx}>
                    <p className="cf-faq-item__answer">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. CTA finale ──────────────────────────────────────────── */}
        <section className="cf-cta home-reveal" aria-labelledby="cf-cta-title">
          <div className="cf-cta__inner">
            <h2 id="cf-cta-title" className="cf-cta__title">
              Pronto a iniziare?
            </h2>
            <p className="cf-cta__sub">
              Unisciti a migliaia di famiglie e professionisti che hanno già trovato la loro soluzione di assistenza.
            </p>
            <div className="cf-cta__row">
              <Link to="/profili" className="cf-cta__btn cf-cta__btn--primary">
                Cerca un professionista
              </Link>
              <Link to="/registrazione/intent" className="cf-cta__btn cf-cta__btn--ghost">
                Registrati come professionista
              </Link>
            </div>
          </div>
        </section>

      </main>
    </SiteShell>
  )
}
