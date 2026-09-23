import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDirectoryOpenPositionsList } from '../hooks/useDirectoryOpenPositionsList'
import { registerWorkerProfileHref } from '../pages/auth/registerQuery'
import {
  OPEN_POSITION_ROLE_IDS,
  OPEN_POSITION_ROLE_LABELS,
  type MockOpenPosition,
  type OpenPositionPoster,
  type OpenPositionRoleId,
} from '../lib/mockOpenPositions'

type HomeOpenPositionsSectionProps = {
  cityQuery: string
}

function buildDetailHref(id: string, searchParams: URLSearchParams): string {
  const q = searchParams.toString()
  return q ? `/posizioni/${id}?${q}` : `/posizioni/${id}`
}

function posterKindShort(type: OpenPositionPoster): string {
  switch (type) {
    case 'famiglia':
      return 'Famiglia'
    case 'agenzia':
      return 'Agenzia'
    case 'struttura':
      return 'Struttura'
    default: {
      const _x: never = type
      return _x
    }
  }
}

function CardContent({ row, roleLabel }: { row: MockOpenPosition; roleLabel: string }) {
  const showEntityBesideKind = row.posterType === 'agenzia' || row.posterType === 'struttura'

  return (
    <>
      <div className="home-open-pos__card-top">
        {row.urgency === 'urgente' ? <span className="home-open-pos__badge">Urgente</span> : null}
        {!row.urgency && row.badge ? <span className="home-open-pos__badge">{row.badge}</span> : null}
        <span className="home-open-pos__pill">{roleLabel}</span>
      </div>
      <div className="home-open-pos__publisher-block">
        <span className={`home-open-pos__kind-pill home-open-pos__kind-pill--${row.posterType}`}>
          {posterKindShort(row.posterType)}
        </span>
        {showEntityBesideKind ? (
          <span className="home-open-pos__entity-name">{row.posterDisplayName}</span>
        ) : null}
      </div>
      <h3 className="home-open-pos__card-title">{row.title}</h3>
      {row.posterType === 'famiglia' ? <p className="home-open-pos__org">{row.posterDisplayName}</p> : null}
      <p className="home-open-pos__excerpt">{row.excerpt}</p>
      <dl className="home-open-pos__facts">
        <div className="home-open-pos__fact">
          <dt className="visually-hidden">Retribuzione indicativa</dt>
          <dd>{row.rateLabel}</dd>
        </div>
        <div className="home-open-pos__fact">
          <dt className="visually-hidden">Luogo</dt>
          <dd>{row.locationLabel}</dd>
        </div>
        <div className="home-open-pos__fact home-open-pos__fact--full">
          <dt className="visually-hidden">Turni</dt>
          <dd>{row.scheduleLabel}</dd>
        </div>
      </dl>
    </>
  )
}

export function HomeOpenPositionsSection({ cityQuery }: HomeOpenPositionsSectionProps) {
  const [searchParams] = useSearchParams()
  const [activeRole, setActiveRole] = useState<OpenPositionRoleId | 'all'>('all')
  const trimmedCity = cityQuery.trim()

  const { items: visible, loading, error, reload } = useDirectoryOpenPositionsList({
    cityQuery: trimmedCity,
    roleId: activeRole,
    poster: 'all',
    contract: 'all',
  })

  const activeRoleLabel =
    activeRole === 'all' ? 'Tutte le figure' : (OPEN_POSITION_ROLE_LABELS[activeRole] ?? activeRole)

  return (
    <section
      className="home-results home-reveal home-open-pos"
      id="professionisti"
      aria-labelledby="home-open-pos-title"
    >
      <div className="home-results__inner home-open-pos__shell">
        <h2 id="home-open-pos-title" className="home-results__title home-open-pos__title type-title">
          {trimmedCity ? 'Posizioni aperte nella tua zona' : 'Posizioni aperte in evidenza'}
        </h2>
        <p className="home-open-pos__sub">
          Famiglie, agenzie e strutture pubblicano annunci: consulta le schede, apri il dettaglio e candidati dopo
          l’accesso. I dati sono dimostrativi.
        </p>

        <div className="home-results__toolbar home-open-pos__toolbar">
          <div className="home-open-pos__filter-row" role="search" aria-label="Filtra posizioni aperte">
            <span className="home-open-pos__filter-label" id="home-open-pos-role-label">
              Figura ricercata
            </span>
            <div className="home-results__filters" aria-labelledby="home-open-pos-role-label">
              <button
                type="button"
                className={`home-filter-chip ${activeRole === 'all' ? 'is-active' : ''}`}
                onClick={() => setActiveRole('all')}
              >
                Tutte
              </button>
              {OPEN_POSITION_ROLE_IDS.map((rid) => (
                <button
                  key={rid}
                  type="button"
                  className={`home-filter-chip ${activeRole === rid ? 'is-active' : ''}`}
                  onClick={() => setActiveRole(rid)}
                >
                  {OPEN_POSITION_ROLE_LABELS[rid]}
                </button>
              ))}
            </div>
          </div>
          {trimmedCity ? (
            <span className="home-results__count home-open-pos__meta">
              {visible.length} opportunità demo vicino a <strong className="home-open-pos__city-strong">{trimmedCity}</strong>
              {' · '}
              {activeRoleLabel}
            </span>
          ) : null}
        </div>

        <div className="home-open-pos__demo-ribbon" role="status">
          <span className="home-open-pos__demo-ribbon__dot" aria-hidden />
          <span>
            <strong>Anteprima dimostrativa</strong>
            {trimmedCity ? ' · annunci di esempio' : ' · esempi da più città finché non restringi la zona nel hero'}.
            In produzione collegheremo annunci reali.
          </span>
        </div>

        {loading ? (
          <p className="home-open-pos__empty-text" aria-busy="true">
            Caricamento posizioni aperte…
          </p>
        ) : error ? (
          <div className="home-open-pos__empty home-open-pos__empty--soft">
            <p className="home-open-pos__empty-title">{error}</p>
            <button type="button" className="home-filter-chip" onClick={() => void reload()}>
              Riprova
            </button>
          </div>
        ) : trimmedCity && visible.length === 0 ? (
          <div className="home-open-pos__empty home-open-pos__empty--soft">
            <p className="home-open-pos__empty-title">Nessuna posizione demo per questa combinazione</p>
            <p className="home-open-pos__empty-text">
              Prova un&apos;altra figura professionale o modifica la città nella ricerca in alto. Dopo l&apos;iscrizione
              potrai ricevere opportunità reali in zona.
            </p>
            <a href="#search" className="home-open-pos__empty-link">
              Modifica città nel hero
            </a>
          </div>
        ) : !trimmedCity && visible.length === 0 ? (
          <div className="home-open-pos__empty home-open-pos__empty--soft">
            <p className="home-open-pos__empty-title">Nessun annuncio con questi filtri</p>
            <p className="home-open-pos__empty-text">Ripristina «Tutte» le figure.</p>
          </div>
        ) : (
          <ul className="home-open-pos__list" aria-label="Posizioni aperte in evidenza">
            {visible.map((row) => {
              const roleLabel = OPEN_POSITION_ROLE_LABELS[row.category]
              const href = buildDetailHref(row.id, searchParams)
              return (
                <li key={row.id} className="home-open-pos__card-wrap">
                  <Link className="home-open-pos__card-link" to={href}>
                    <article className="home-open-pos__card">
                      <CardContent row={row} roleLabel={roleLabel} />
                      <span className="home-open-pos__card-more">Apri scheda completa</span>
                    </article>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        <div className="home-open-pos__cta-row">
          <Link to={registerWorkerProfileHref} className="home-open-pos__btn home-open-pos__btn--primary">
            Iscriviti e candidati
          </Link>
          <Link to="/iscriviti" className="home-open-pos__btn home-open-pos__btn--ghost">
            Guida per professionisti
          </Link>
        </div>

        <div className="home-results__foot">
          <a href="#search" className="home-results__link">
            {trimmedCity ? 'Modifica città nella ricerca' : 'Imposta città nel hero per filtrare per zona'}
          </a>
        </div>
      </div>
    </section>
  )
}
