import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SiteShell } from '../components/SiteShell'
import { IconCheckMark, IconShield, IconStar, IconUsers } from '../components/icons/DashboardIcons'
import { registerWorkerProfileHref } from './auth/registerQuery'
import './iscrizione-landing.css'

const benefits = [
  {
    title: 'Profilo professionale credibile',
    text: 'Mostri competenze, area di lavoro e disponibilità in modo chiaro e verificabile.',
  },
  {
    title: 'Lead mirati, meno dispersione',
    text: 'Ricevi richieste pertinenti da famiglie e strutture che cercano proprio la tua figura.',
  },
  {
    title: 'Iscrizione gratuita',
    text: 'Nessun costo iniziale: i piani premium restano opzionali e attivabili solo quando vuoi.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Completa il tuo profilo',
    text: 'Inserisci dati professionali, zona di copertura e modalità di disponibilità.',
  },
  {
    n: '02',
    title: 'Verifica documenti',
    text: 'Convalidiamo titoli e informazioni KYC per aumentare la fiducia nel tuo profilo.',
  },
  {
    n: '03',
    title: 'Ricevi richieste',
    text: 'Appari nella ricerca locale e vieni contattato da utenti realmente interessati.',
  },
]

const faqs = [
  {
    q: 'L’iscrizione è davvero gratuita?',
    a: 'Sì. Puoi creare il profilo senza costi iniziali. Eventuali funzionalità extra sono opzionali.',
  },
  {
    q: 'La piattaforma gestisce contratti o pagamenti?',
    a: 'No. Curaxe facilita il contatto: contratti e pagamenti restano tra le parti.',
  },
  {
    q: 'Quali documenti servono?',
    a: 'Documentazione coerente con il tuo ruolo professionale. Dati incompleti possono rallentare l’approvazione.',
  },
  {
    q: 'Posso inserire dati clinici dei pazienti?',
    a: 'No. Nei campi pubblici non vanno mai inserite informazioni cliniche sensibili.',
  },
]

export function IscrizioneLandingPage() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.home-reveal')
    if (els.length === 0) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
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
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <SiteShell className="isl">
      <main className="isl-page">
        <section className="isl-hero" aria-labelledby="isl-hero-title">
          <div className="isl-hero__inner">
            <p className="isl-hero__eyebrow">Per OSS, infermieri, caregiver e professionisti socio-sanitari</p>
            <h1 id="isl-hero-title" className="isl-hero__title">
              Iscriviti e fatti trovare da chi cerca davvero assistenza.
            </h1>
            <p className="isl-hero__sub">
              Una pagina di iscrizione chiara, orientata alla conversione: profilo professionale, verifica rapida e visibilità locale.
            </p>
            <div className="isl-hero__cta">
              <Link to={registerWorkerProfileHref} className="isl-btn isl-btn--primary">
                Inizia gratis
              </Link>
              <a href="#isl-steps" className="isl-btn isl-btn--ghost">
                Come funziona
              </a>
            </div>
            <div className="isl-hero__trust" role="list" aria-label="Punti di fiducia">
              <span role="listitem">
                <IconCheckMark size={14} aria-hidden />
                Profilo verificato
              </span>
              <span role="listitem">
                <IconCheckMark size={14} aria-hidden />
                Copertura nazionale
              </span>
              <span role="listitem">
                <IconCheckMark size={14} aria-hidden />
                Nessun costo iniziale
              </span>
            </div>
          </div>
        </section>

        <section className="isl-benefits home-reveal" aria-labelledby="isl-benefits-title">
          <div className="isl-wrap">
            <h2 id="isl-benefits-title" className="isl-title">
              Perché conviene iscriverti adesso
            </h2>
            <div className="isl-benefits__grid">
              {benefits.map((item, idx) => (
                <article key={item.title} className="isl-benefit-card">
                  <div className="isl-benefit-card__icon" aria-hidden>
                    {idx === 0 ? <IconShield size={24} /> : idx === 1 ? <IconUsers size={24} /> : <IconStar size={24} />}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="isl-steps home-reveal" id="isl-steps" aria-labelledby="isl-steps-title">
          <div className="isl-wrap">
            <h2 id="isl-steps-title" className="isl-title">
              Dall’iscrizione al primo contatto in 3 passaggi
            </h2>
            <div className="isl-steps__grid">
              {steps.map((step) => (
                <article key={step.n} className="isl-step-card">
                  <span className="isl-step-card__num">{step.n}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="isl-proof home-reveal" aria-labelledby="isl-proof-title">
          <div className="isl-wrap isl-proof__wrap">
            <div>
              <h2 id="isl-proof-title" className="isl-title isl-title--left">
                Più chiarezza per te, più fiducia per chi cerca assistenza
              </h2>
              <p className="isl-proof__text">
                La pagina è stata ripensata per guidare il professionista in modo lineare, senza sezioni ridondanti e con CTA sempre visibili nei punti chiave.
              </p>
            </div>
            <div className="isl-proof__panel">
              <div className="isl-proof__metric">
                <strong>12.000+</strong>
                <span>Profili presenti in piattaforma</span>
              </div>
              <div className="isl-proof__metric">
                <strong>KYC</strong>
                <span>Verifica documentale prima della piena visibilità</span>
              </div>
              <div className="isl-proof__metric">
                <strong>0€</strong>
                <span>Ingresso gratuito per partire subito</span>
              </div>
            </div>
          </div>
        </section>

        <section className="isl-faq home-reveal" aria-labelledby="isl-faq-title">
          <div className="isl-wrap">
            <h2 id="isl-faq-title" className="isl-title">
              Domande frequenti
            </h2>
            <div className="isl-faq__list">
              {faqs.map((item) => (
                <details key={item.q} className="isl-faq__item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="isl-final home-reveal" aria-labelledby="isl-final-title">
          <div className="isl-wrap isl-final__inner">
            <h2 id="isl-final-title">Pronto ad attivare il tuo profilo professionale?</h2>
            <Link to={registerWorkerProfileHref} className="isl-btn isl-btn--primary">
              Vai alla registrazione
            </Link>
          </div>
        </section>
      </main>
    </SiteShell>
  )
}
