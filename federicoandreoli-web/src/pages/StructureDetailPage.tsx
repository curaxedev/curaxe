import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconChevronLeft } from '../components/icons/DashboardIcons'
import { ProfileRatingCompact } from '../components/ProfileRatingCompact'
import { SiteShell } from '../components/SiteShell'
import { useDirectoryStructure } from '../hooks/useDirectoryStructure'
import type { StructureKind } from '../lib/directoryTypes'
import { profilesDirectoryPath } from '../lib/siteRoutes'
import './profile-detail.css'

function kindLabel(kind: StructureKind): string {
  switch (kind) {
    case 'facility':
      return 'Struttura'
    case 'agency':
      return 'Agenzia'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function StructureDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { structure, loading, error, reload } = useDirectoryStructure(id)

  useEffect(() => {
    if (structure) {
      document.title = `${structure.name} — ${kindLabel(structure.kind)} | Curaxe`
    } else {
      document.title = 'Organizzazione | Curaxe'
    }
    return () => {
      document.title = 'Curaxe'
    }
  }, [structure])

  if (loading) {
    return (
      <SiteShell>
        <main className="profile-detail profile-detail--loading" aria-busy="true">
          <div className="profile-detail__viewport">
            <div className="profile-detail__inner">
              <div className="profile-detail__hero-skeleton polish-shimmer" aria-label="Caricamento scheda" />
            </div>
          </div>
        </main>
      </SiteShell>
    )
  }

  if (error || !structure) {
    return (
      <SiteShell>
        <main className="profile-detail profile-detail--empty">
          <div className="profile-detail__viewport">
            <div className="profile-detail__inner polish-state-panel">
              <span className="polish-state-panel__icon" aria-hidden />
              <h1 className="profile-detail__empty-title">Scheda non disponibile</h1>
              <p className="profile-detail__empty-text">
                {error ?? 'L’identificativo non corrisponde a una struttura o agenzia in anteprima.'}
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

  const intentLabel = structure.listingIntent === 'cerco' ? 'Cerco lavoro' : 'Offro lavoro'

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
                <span className="profile-detail__crumb-current">{structure.name}</span>
              </nav>
            </div>

            <header className="profile-detail__hero" aria-labelledby="structure-detail-name">
              <div className="profile-detail__hero-photo-wrap">
                <div className="profile-detail__hero-photo-ring" aria-hidden />
                <img
                  className="profile-detail__hero-photo home-profile-carousel__photo--brand"
                  src={structure.imageUrl}
                  alt=""
                  width={320}
                  height={320}
                  decoding="async"
                  fetchPriority="high"
                />
              </div>

              <div className="profile-detail__hero-body">
                <span className="profile-detail__intent-pill">{intentLabel}</span>
                <span className="home-profile-carousel__entity-pill">{kindLabel(structure.kind)}</span>
                <h1 id="structure-detail-name" className="profile-detail__hero-name">
                  {structure.name}
                </h1>
                <p className="profile-detail__hero-role">{structure.role}</p>
                <p className="profile-detail__hero-place">{structure.locationLabel}</p>
                <div className="profile-detail__hero-rating">
                  <ProfileRatingCompact value={structure.stars} />
                  {structure.reviewCount > 0 ? (
                    <span className="profile-detail__hero-rating-text">· {structure.reviewCount} referenze</span>
                  ) : null}
                </div>
                {structure.shift ? (
                  <ul className="profile-detail__hero-chips" aria-label="Attività principale">
                    <li className="profile-detail__chip">{structure.shift}</li>
                  </ul>
                ) : null}
              </div>
            </header>

            <div className="profile-detail__grid">
              <div className="profile-detail__main">
                <section className="profile-detail__section" aria-labelledby="structure-detail-about">
                  <h2 id="structure-detail-about" className="profile-detail__h2">
                    Presentazione
                  </h2>
                  <p className="profile-detail__p">{structure.bio}</p>
                </section>

                {structure.services.length > 0 ? (
                  <section className="profile-detail__section" aria-labelledby="structure-detail-services">
                    <h2 id="structure-detail-services" className="profile-detail__h2">
                      Servizi e ricerche attive
                    </h2>
                    <ul className="profile-detail__chip-list">
                      {structure.services.map((s) => (
                        <li key={s} className="profile-detail__chip">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className="profile-detail__section" aria-labelledby="structure-detail-branches">
                  <h2 id="structure-detail-branches" className="profile-detail__h2">
                    Sedi e filiali
                  </h2>
                  {structure.branches.length === 0 ? (
                    <p className="profile-detail__section-lead">
                      Nessuna sede pubblicata al momento.
                    </p>
                  ) : null}
                  <ul className="profile-detail__exp-grid">
                    {structure.branches.map((branch) => (
                      <li key={branch.id} className="profile-detail__exp-card">
                        <div className="profile-detail__exp-body">
                          <p className="profile-detail__exp-title">{branch.name}</p>
                          <p className="profile-detail__exp-years">
                            {branch.comune} · CAP {branch.cap}
                          </p>
                          {branch.addressHint ? (
                            <p className="profile-detail__section-lead">{branch.addressHint}</p>
                          ) : null}
                          {branch.phoneHint ? (
                            <p className="profile-detail__section-lead">{branch.phoneHint}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="profile-detail__section" aria-labelledby="structure-detail-zone">
                  <h2 id="structure-detail-zone" className="profile-detail__h2">
                    Zona di copertura
                  </h2>
                  <p className="profile-detail__section-lead">{structure.coverageHint}</p>
                </section>
              </div>

              <aside className="profile-detail__aside" aria-labelledby="structure-detail-aside">
                <div className="profile-detail__aside-card">
                  <h2 id="structure-detail-aside" className="visually-hidden">
                    Informazioni
                  </h2>
                  <p className="profile-detail__auth-text">
                    Per candidature o collaborazioni con questa organizzazione, accedi alla piattaforma o contatta il
                    supporto. In anteprima i dati sono dimostrativi.
                  </p>
                  <Link className="profile-detail__cta profile-detail__cta--link" to="/accedi">
                    Accedi
                  </Link>
                  <Link className="profile-detail__back-bottom" to={profilesDirectoryPath}>
                    Torna a tutti i profili
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
