import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useApplications } from '../hooks/useApplications'
import { hasAppliedToOpenPosition } from '../services/applicationService'
import { IconCheckMark } from '../components/icons/DashboardIcons'
import { SiteShell } from '../components/SiteShell'
import {
  ASSISTENZA_HERO_PARAM,
  HERO_CITY_PARAM,
} from '../lib/assistenzaHeroMode'
import { useDirectoryOpenPosition } from '../hooks/useDirectoryOpenPosition'
import {
  locationMatchesCity,
  OPEN_POSITION_CONTRACT_FILTER_LABELS,
  OPEN_POSITION_ROLE_LABELS,
  posterLabel,
  type MockOpenPosition,
  type OpenPositionMobility,
  type OpenPositionMobilityLevel,
} from '../lib/mockOpenPositions'
import { registerWorkerProfileHref } from './auth/registerQuery'
import './open-position-detail.css'

function buildHomeOffroListLink(searchParams: URLSearchParams) {
  const next = new URLSearchParams()
  next.set(ASSISTENZA_HERO_PARAM, 'offro')
  const citta = searchParams.get(HERO_CITY_PARAM)?.trim()
  if (citta) next.set(HERO_CITY_PARAM, citta)
  return { pathname: '/' as const, search: `?${next.toString()}`, hash: 'professionisti' }
}

function buildPositionHref(id: string, searchParams: URLSearchParams) {
  const q = searchParams.toString()
  return q ? `/posizioni/${id}?${q}` : `/posizioni/${id}`
}

const TRUST_CUES = [
  'Ambiente dimostrativo: nessun dato reale né pagamenti sulla piattaforma.',
  'In produzione potrai segnalare annunci sospetti e ricevere conferme dal datore.',
  'Coerenza annuncio–profilo: dopo l’accesso potremo suggerirti solo opportunità compatibili.',
] as const

const POSITION_PAGE_FAQ = [
  {
    q: 'La candidatura su questo annuncio ha un costo?',
    a: 'No. Consultare le schede e preparare il profilo è gratuito in questa anteprima; in produzione le condizioni commerciali eventuali saranno sempre esplicite prima di ogni addebito.',
  },
  {
    q: 'Come funziona il «Candidati» in questa demo?',
    a: 'Qui simuliamo solo l’invio: non viene inoltrato alcun messaggio reale al datore. In produzione la richiesta passerà attraverso la piattaforma con tracciabilità e stato della candidatura.',
  },
  {
    q: 'I dati del datore di lavoro sono verificati?',
    a: 'In anteprima gli annunci sono dimostrativi e non sottoposti a verifica KYC. In produzione potremo mostrare badge di verifica e documentazione coerente con il tipo di datore (famiglia, agenzia, struttura).',
  },
  {
    q: 'Contratti, pagamenti e turni dove si definiscono?',
    a: 'Su Curaxe si arriva al primo contatto in modo ordinato: contratto, retribuzione effettiva e adempimenti restano tra te e il datore, come da prassi del settore socio-sanitario.',
  },
] as const

/** Contatti di riferimento brand (demo: link mailto esemplificativo). */
const PLATFORM_SUPPORT_EMAIL = 'info@curaxe.it'

function mobilityLevelIt(level: OpenPositionMobilityLevel): string {
  switch (level) {
    case 'required':
      return 'Richiesto'
    case 'preferred':
      return 'Preferibile'
    case 'not_required':
      return 'Non richiesto'
    default: {
      const _exhaustive: never = level
      return _exhaustive
    }
  }
}

function posterInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0]?.[0]
    const b = parts[1]?.[0]
    if (a && b) return (a + b).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function IconChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconEuro() {
  return (
    <span className="open-pos-detail__kpi-euro" aria-hidden>
      €
    </span>
  )
}

function IconPin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MobilityBlock({ mobility, locationLabel }: { mobility: OpenPositionMobility; locationLabel: string }) {
  return (
    <section
      className="open-pos-detail__section open-pos-detail__section--mobility"
      aria-labelledby="open-pos-mobility"
    >
      <h2 id="open-pos-mobility" className="open-pos-detail__h2">
        Mobilità e spostamenti
      </h2>
      <p className="open-pos-detail__section-lead">
        Indicazioni del datore su patente, mezzi propri e distanza dalla base indicata ({locationLabel}).
      </p>
      <ul className="open-pos-detail__mobility-grid">
        <li>
          <span className="open-pos-detail__mob-key">Patente</span>
          <span className="open-pos-detail__mob-val">{mobilityLevelIt(mobility.driverLicense)}</span>
        </li>
        <li>
          <span className="open-pos-detail__mob-key">Automobile</span>
          <span className="open-pos-detail__mob-val">{mobilityLevelIt(mobility.ownCar)}</span>
        </li>
      </ul>
      {mobility.maxCommuteKm != null ? (
        <p className="open-pos-detail__mob-distance">
          Distanza massima indicativa dalla zona dell’annuncio:{' '}
          <strong>
            fino a circa {mobility.maxCommuteKm} km
          </strong>
          .
        </p>
      ) : null}
      {mobility.note ? <p className="open-pos-detail__mob-note">{mobility.note}</p> : null}
    </section>
  )
}

function NearbyCard({
  row,
  searchParams,
}: {
  row: MockOpenPosition
  searchParams: URLSearchParams
}) {
  const roleLabel = OPEN_POSITION_ROLE_LABELS[row.category]
  const href = buildPositionHref(row.id, searchParams)
  return (
    <li className="open-pos-detail__nearby-item">
      <Link className="open-pos-detail__nearby-link" to={href}>
        <span className="open-pos-detail__nearby-pill">{roleLabel}</span>
        <span className={`home-open-pos__poster-badge home-open-pos__poster-badge--${row.posterType}`}>
          {posterLabel(row.posterType)}
        </span>
        <span className="open-pos-detail__nearby-title">{row.title}</span>
        <span className="open-pos-detail__nearby-meta">{row.locationLabel}</span>
        <span className="open-pos-detail__nearby-rate">{row.rateLabel}</span>
      </Link>
    </li>
  )
}

export function OpenPositionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, user } = useAuth()
  const { applyToPosting, submitting, submitError, clearSubmitFeedback } = useApplications()
  const [candidacySent, setCandidacySent] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)

  const cittaQuery = (searchParams.get(HERO_CITY_PARAM) ?? '').trim()
  const { position: job, nearby, loading, error, reload } = useDirectoryOpenPosition(id, cittaQuery)

  const homeListLink = useMemo(() => buildHomeOffroListLink(searchParams), [searchParams])

  const returnTo = useMemo(() => {
    const path = id ? `/posizioni/${id}` : '/'
    const q = searchParams.toString()
    return q ? `${path}?${q}` : path
  }, [id, searchParams])

  const loginHref = `/accedi?redirect=${encodeURIComponent(returnTo)}`

  const cityMatchesJob = Boolean(job && cittaQuery && locationMatchesCity(cittaQuery, job.locationLabel))

  useEffect(() => {
    if (job) {
      document.title = `${job.title} | Posizioni aperte | Curaxe`
    } else {
      document.title = 'Posizione aperta | Curaxe'
    }
    return () => {
      document.title = 'Curaxe'
    }
  }, [job])

  useEffect(() => {
    if (!id || !user?.id) {
      setCandidacySent(false)
      return
    }
    setCandidacySent(hasAppliedToOpenPosition(user.id, id))
  }, [id, user?.id])

  if (loading) {
    return (
      <SiteShell>
        <main className="open-pos-detail open-pos-detail--loading" aria-busy="true">
          <div className="open-pos-detail__viewport">
            <div className="open-pos-detail__inner">
              <div className="open-pos-detail__hero-skeleton polish-shimmer" aria-label="Caricamento annuncio" />
            </div>
          </div>
        </main>
      </SiteShell>
    )
  }

  if (!id || error || !job) {
    return (
      <SiteShell>
        <main className="open-pos-detail open-pos-detail--empty">
          <div className="open-pos-detail__viewport">
            <div className="open-pos-detail__inner polish-state-panel">
              <span className="polish-state-panel__icon" aria-hidden />
              <h1 className="open-pos-detail__title--empty">Annuncio non trovato</h1>
              <p className="open-pos-detail__lead">
                {error ?? 'L’identificativo non corrisponde a una posizione dimostrativa.'}
              </p>
              <div className="open-pos-detail__aside-actions">
                <button type="button" className="open-pos-detail__cta-secondary" onClick={() => void reload()}>
                  Riprova
                </button>
                <Link className="open-pos-detail__back" to={homeListLink}>
                  Torna alle posizioni in home
                </Link>
              </div>
            </div>
          </div>
        </main>
      </SiteShell>
    )
  }

  const roleLabel = OPEN_POSITION_ROLE_LABELS[job.category]
  const contractLabel = OPEN_POSITION_CONTRACT_FILTER_LABELS[job.contractBucket]

  async function handleCandidati() {
    if (!isAuthenticated || !id) return
    const created = await applyToPosting(id)
    if (created) {
      setCandidacySent(true)
      setApplySuccess(true)
    }
  }

  return (
    <SiteShell>
      <main className="open-pos-detail">
        <div className="open-pos-detail__viewport">
          <div className="open-pos-detail__inner">
            <div className="open-pos-detail__toolbar">
              <Link className="open-pos-detail__pill-back" to={homeListLink}>
                <IconChevronLeft />
                Posizioni aperte
              </Link>
              <nav className="open-pos-detail__crumb polish-crumb" aria-label="Percorso">
                <Link to={homeListLink}>Home</Link>
                <span aria-hidden> · </span>
                <span className="open-pos-detail__crumb-current">{roleLabel}</span>
              </nav>
            </div>

            {cittaQuery ? (
              <p
                className={`open-pos-detail__city-banner${cityMatchesJob ? ' open-pos-detail__city-banner--match' : ''}`}
                role="status"
              >
                {cityMatchesJob ? (
                  <>
                    Ricerca attiva: <strong>{cittaQuery}</strong> — allineata alla sede dell’annuncio (dati demo).
                  </>
                ) : (
                  <>
                    Ricerca attiva: <strong>{cittaQuery}</strong> — sede diversa; in basso trovi altre schede demo per
                    zona quando disponibili.
                  </>
                )}
              </p>
            ) : null}

            <header className="open-pos-detail__hero-card">
              <div className="open-pos-detail__badges">
                {job.urgency === 'urgente' || job.badge === 'Urgente' ? (
                  <span className="home-open-pos__badge">Urgente</span>
                ) : job.badge ? (
                  <span className="home-open-pos__badge">{job.badge}</span>
                ) : null}
                <span className="home-open-pos__pill">{roleLabel}</span>
                <span className={`home-open-pos__poster-badge home-open-pos__poster-badge--${job.posterType}`}>
                  {posterLabel(job.posterType)}
                </span>
              </div>
              <h1 className="open-pos-detail__title">{job.title}</h1>
              <p className="open-pos-detail__hero-lead">{job.excerpt}</p>
              <div className="open-pos-detail__org-row">
                <span className="open-pos-detail__org-name">{job.posterDisplayName}</span>
                <span className="open-pos-detail__org-dot" aria-hidden>
                  ·
                </span>
                <span>{job.locationLabel}</span>
              </div>

              <div className="open-pos-detail__kpi-grid" aria-label="Sintesi annuncio">
                <article className="open-pos-detail__kpi">
                  <span className="open-pos-detail__kpi-icon" aria-hidden>
                    <IconEuro />
                  </span>
                  <div className="open-pos-detail__kpi-body">
                    <span className="open-pos-detail__kpi-label">Retribuzione</span>
                    <span className="open-pos-detail__kpi-value">{job.rateLabel}</span>
                  </div>
                </article>
                <article className="open-pos-detail__kpi">
                  <span className="open-pos-detail__kpi-icon open-pos-detail__kpi-icon--muted" aria-hidden>
                    <IconPin />
                  </span>
                  <div className="open-pos-detail__kpi-body">
                    <span className="open-pos-detail__kpi-label">Luogo</span>
                    <span className="open-pos-detail__kpi-value">{job.locationLabel}</span>
                  </div>
                </article>
                <article className="open-pos-detail__kpi">
                  <span className="open-pos-detail__kpi-icon open-pos-detail__kpi-icon--muted" aria-hidden>
                    <IconClock />
                  </span>
                  <div className="open-pos-detail__kpi-body">
                    <span className="open-pos-detail__kpi-label">Turni</span>
                    <span className="open-pos-detail__kpi-value">{job.scheduleLabel}</span>
                  </div>
                </article>
              </div>
            </header>

            <div className="open-pos-detail__grid">
              <div className="open-pos-detail__main">
                <section
                  className="open-pos-detail__section open-pos-detail__section--publisher"
                  aria-labelledby="open-pos-publisher"
                >
                  <div className="open-pos-detail__publisher-card">
                    <div className="open-pos-detail__publisher-avatar" aria-hidden>
                      {posterInitials(job.posterDisplayName)}
                    </div>
                    <div className="open-pos-detail__publisher-body">
                      <h2 id="open-pos-publisher" className="open-pos-detail__h2">
                        Chi pubblica
                      </h2>
                      <p className="open-pos-detail__publisher-line">
                        <span className="open-pos-detail__publisher-type">{posterLabel(job.posterType)}</span>
                        <span aria-hidden> — </span>
                        <span>{job.posterDisplayName}</span>
                      </p>
                      <p className="open-pos-detail__p open-pos-detail__p--muted">
                        In anteprima non verifichiamo i dati: in produzione il datore potrà completare profilo e
                        documenti.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="open-pos-detail__section" aria-labelledby="open-pos-desc">
                  <h2 id="open-pos-desc" className="open-pos-detail__h2">
                    Descrizione
                  </h2>
                  <p className="open-pos-detail__p">{job.descriptionIntro}</p>
                </section>

                <section className="open-pos-detail__section" aria-labelledby="open-pos-duties">
                  <h2 id="open-pos-duties" className="open-pos-detail__h2">
                    Attività principali
                  </h2>
                  <ul className="open-pos-detail__checklist">
                    {job.duties.map((line) => (
                      <li key={line}>
                        <span className="open-pos-detail__li-mark" aria-hidden>
                          <IconCheckMark size={14} />
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="open-pos-detail__section" aria-labelledby="open-pos-req">
                  <h2 id="open-pos-req" className="open-pos-detail__h2">
                    Requisiti richiesti
                  </h2>
                  <ul className="open-pos-detail__checklist">
                    {job.requirements.map((line) => (
                      <li key={line}>
                        <span className="open-pos-detail__li-mark" aria-hidden>
                          <IconCheckMark size={14} />
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {job.mobility ? <MobilityBlock mobility={job.mobility} locationLabel={job.locationLabel} /> : null}

                <section
                  className="open-pos-detail__section open-pos-detail__section--trust"
                  aria-labelledby="open-pos-trust"
                >
                  <h2 id="open-pos-trust" className="open-pos-detail__h2">
                    Sicurezza e trasparenza
                  </h2>
                  <ul className="open-pos-detail__trust-list">
                    {TRUST_CUES.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>

                {nearby.length ? (
                  <section className="open-pos-detail__nearby" aria-labelledby="open-pos-nearby-title">
                    <h2 id="open-pos-nearby-title" className="open-pos-detail__h2">
                      {cittaQuery ? `Altre posizioni demo vicino a «${cittaQuery}»` : 'Altre posizioni demo correlate'}
                    </h2>
                    <p className="open-pos-detail__p open-pos-detail__p--muted open-pos-detail__nearby-lead">
                      {cittaQuery
                        ? 'Elenco basato sul parametro città nell’URL; stessi ID delle card in home per deep link coerenti.'
                        : 'Selezione per stessa figura professionale; imposta la città nel hero per restringere la zona.'}
                    </p>
                    <ul className="open-pos-detail__nearby-list">
                      {nearby.map((row) => (
                        <NearbyCard key={row.id} row={row} searchParams={searchParams} />
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>

              <aside className="open-pos-detail__aside" aria-labelledby="open-pos-facts-title">
                <div className="open-pos-detail__aside-card">
                  <h2 id="open-pos-facts-title" className="visually-hidden">
                    Sintesi annuncio e candidatura
                  </h2>
                  <p className="open-pos-detail__aside-eyebrow">In sintesi</p>
                  <dl className="open-pos-detail__facts">
                    <div>
                      <dt>Retribuzione indicativa</dt>
                      <dd>{job.rateLabel}</dd>
                    </div>
                    <div>
                      <dt>Turni / orari</dt>
                      <dd>{job.scheduleLabel}</dd>
                    </div>
                    <div>
                      <dt>Luogo</dt>
                      <dd>{job.locationLabel}</dd>
                    </div>
                    <div>
                      <dt>Contratto (tipologia)</dt>
                      <dd>{contractLabel}</dd>
                    </div>
                  </dl>

                  {isAuthenticated ? (
                    <>
                      {submitError ? (
                        <p className="open-pos-detail__auth-text" role="alert" style={{ color: 'var(--color-accent)' }}>
                          {submitError}
                          <button
                            type="button"
                            className="open-pos-detail__auth-secondary"
                            style={{ marginLeft: 8 }}
                            onClick={clearSubmitFeedback}
                          >
                            OK
                          </button>
                        </p>
                      ) : null}
                      {applySuccess || candidacySent ? (
                        <p className="open-pos-detail__success" role="status">
                          Candidatura registrata. Il datore di lavoro potrà visualizzarla dalla propria dashboard.
                        </p>
                      ) : null}
                      <button
                        type="button"
                        className="open-pos-detail__cta"
                        onClick={() => void handleCandidati()}
                        disabled={candidacySent || submitting}
                      >
                        {candidacySent ? 'Candidatura registrata' : submitting ? 'Invio…' : 'Candidati ora'}
                      </button>
                    </>
                  ) : (
                    <div className="open-pos-detail__auth-gate" aria-labelledby="open-pos-auth-title">
                      <h3 id="open-pos-auth-title" className="open-pos-detail__auth-title">
                        Candidati con il tuo account
                      </h3>
                      <p className="open-pos-detail__auth-text">
                        Per inviare la candidatura serve accedere. Se non hai ancora un profilo professionista, la
                        registrazione richiede pochi minuti.
                      </p>
                      <div className="open-pos-detail__auth-actions">
                        <Link className="open-pos-detail__cta open-pos-detail__cta--link" to={loginHref}>
                          Accedi
                        </Link>
                        <Link className="open-pos-detail__auth-secondary" to={registerWorkerProfileHref}>
                          Registrati
                        </Link>
                      </div>
                      <p className="open-pos-detail__auth-note">
                        Dopo «Accedi» tornerai a questa scheda grazie al parametro <code>redirect</code> nell’URL.
                      </p>
                    </div>
                  )}

                  <Link className="open-pos-detail__back-btn open-pos-detail__back-btn--link" to={homeListLink}>
                    Torna alla lista in home
                  </Link>
                </div>
              </aside>
            </div>

            <section className="open-pos-detail__help-band" aria-labelledby="open-pos-help-faq">
              <div className="open-pos-detail__help-inner">
                <div className="open-pos-detail__help-grid">
                  <div className="open-pos-detail__help-faq">
                    <h2 id="open-pos-help-faq" className="open-pos-detail__help-title">
                      Domande frequenti
                    </h2>
                    <p className="open-pos-detail__help-lead">
                      Chiarimenti rapidi su candidature e ruolo della piattaforma. Per approfondire:{' '}
                      <Link className="open-pos-detail__help-inline-link" to="/come-funziona">
                        Come funziona
                      </Link>{' '}
                      e la{' '}
                      <Link className="open-pos-detail__help-inline-link" to="/#faq">
                        FAQ generale in homepage
                      </Link>
                      .
                    </p>
                    <div className="open-pos-detail__faq-list">
                      {POSITION_PAGE_FAQ.map((item) => (
                        <details key={item.q} className="open-pos-detail__faq-item">
                          <summary className="open-pos-detail__faq-summary">{item.q}</summary>
                          <p className="open-pos-detail__faq-answer">{item.a}</p>
                        </details>
                      ))}
                    </div>
                  </div>

                  <aside className="open-pos-detail__contact-card" aria-labelledby="open-pos-contact-title">
                    <h2 id="open-pos-contact-title" className="open-pos-detail__help-title">
                      Contatti e riferimenti
                    </h2>
                    <p className="open-pos-detail__help-lead">
                      Piattaforma <strong>Curaxe</strong> — punto d’accesso digitale per domanda e offerta di
                      assistenza socio-sanitaria.
                    </p>
                    <dl className="open-pos-detail__contact-dl">
                      <div>
                        <dt>Riferimento annuncio</dt>
                        <dd>
                          <code className="open-pos-detail__contact-code">{job.id}</code>
                          <span className="open-pos-detail__contact-hint"> Utile per assistenza o segnalazioni.</span>
                        </dd>
                      </div>
                      <div>
                        <dt>Email piattaforma (anteprima)</dt>
                        <dd>
                          <a className="open-pos-detail__contact-link" href={`mailto:${PLATFORM_SUPPORT_EMAIL}`}>
                            {PLATFORM_SUPPORT_EMAIL}
                          </a>
                        </dd>
                      </div>
                    </dl>
                    <p className="open-pos-detail__contact-foot">
                      Per segnalare contenuti inappropriati o richieste commerciali sull’ecosistema, in produzione
                      saranno disponibili canali dedicati nel{' '}
                      <Link className="open-pos-detail__help-inline-link" to="/come-funziona">
                        centro informazioni
                      </Link>
                      .
                    </p>
                  </aside>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
