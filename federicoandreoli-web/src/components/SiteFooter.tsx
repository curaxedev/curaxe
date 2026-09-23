import { Link, useLocation } from 'react-router-dom'
import { IconHeart, IconStar } from './icons/DashboardIcons'
import { useCookieConsent } from '../context/CookieConsentContext'
import { BRAND_NAME } from '../lib/brand'
import { contattiPath } from '../lib/siteRoutes'
import { registerWorkerProfileHref } from '../pages/auth/registerQuery'

function SocialLinkedIn() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function SocialInstagram() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function SocialFacebook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

type FooterLink = { label: string; href: string; external?: boolean }

export function SiteFooter() {
  const { openPanel } = useCookieConsent()
  const { pathname } = useLocation()
  const onHome = pathname === '/'
  const onIscriviti = pathname === '/iscriviti'
  const registerStartHref = onIscriviti ? registerWorkerProfileHref : '/registrazione/intent'
  const searchHref = onHome ? '#search' : '/#search'
  const ecosistemaHref = onHome ? '#ecosistema' : '/#ecosistema'
  const faqHref = onHome ? '#faq' : '/#faq'

  const colSeeker: FooterLink[] = [
    { label: 'Cerca nella tua zona', href: searchHref },
    { label: 'Come funziona', href: ecosistemaHref },
    { label: 'Domande frequenti', href: faqHref },
    { label: 'Profili di esempio', href: onHome ? '#professionisti' : '/#professionisti' },
  ]

  const colOffer: FooterLink[] = [
    { label: 'Iscrizione professionisti', href: '/iscriviti' },
    { label: 'Apri un account gratuito', href: registerStartHref },
    { label: 'Accedi al profilo', href: '/accedi' },
    { label: 'Visibilità e lead', href: ecosistemaHref },
  ]

  const colPlatform: FooterLink[] = [
    { label: `Perché ${BRAND_NAME}`, href: ecosistemaHref },
    { label: 'Famiglie e strutture', href: searchHref },
    { label: 'Centro assistenza', href: contattiPath },
    { label: 'Sicurezza e privacy', href: '/privacy' },
  ]

  const colLegal: FooterLink[] = [
    { label: 'Termini di servizio', href: '/termini' },
    { label: 'Privacy policy', href: '/privacy' },
    { label: 'Cookie policy', href: '/cookie' },
    { label: 'Contatti', href: contattiPath },
  ]

  const renderLink = (item: FooterLink) => {
    const { label, href, external } = item
    if (href.startsWith('#') || href.startsWith('/#')) {
      return (
        <a key={label} className="site-footer__link" href={href}>
          {label}
        </a>
      )
    }
    if (!external && href.startsWith('/') && !href.startsWith('//')) {
      return (
        <Link key={label} className="site-footer__link" to={href}>
          {label}
        </Link>
      )
    }
    return (
      <a key={label} className="site-footer__link" href={href}>
        {label}
      </a>
    )
  }

  const year = new Date().getFullYear()

  return (
    <footer className="site-footer" aria-labelledby="site-footer-heading">
      <div className="site-footer__deco" aria-hidden>
        <IconHeart size={18} className="site-footer__deco-icon site-footer__deco-icon--heart" aria-hidden />
        <IconStar size={18} className="site-footer__deco-icon site-footer__deco-icon--star" aria-hidden />
      </div>
      <div className="site-footer__main">
        <div className="site-footer__inner">
          <div className="site-footer__brand">
            <p id="site-footer-heading" className="visually-hidden">
              Piè di pagina e link utili
            </p>
            <Link className="site-footer__logo" to="/">
              {BRAND_NAME}
            </Link>
            <p className="site-footer__tagline">
              Il punto d’incontro tra chi cerca assistenza socio-sanitaria e chi la offre, con percorsi chiari e profili
              documentati.
            </p>
            <ul className="site-footer__pills" aria-label="In sintesi">
              <li className="site-footer__pill">Profili verificati</li>
              <li className="site-footer__pill">Lead qualificati</li>
              <li className="site-footer__pill">Due percorsi: cerco / offro</li>
            </ul>
            <div className="site-footer__social" aria-label="Social">
              <a className="site-footer__social-btn" href="#" aria-label="LinkedIn">
                <SocialLinkedIn />
              </a>
              <a className="site-footer__social-btn" href="#" aria-label="Instagram">
                <SocialInstagram />
              </a>
              <a className="site-footer__social-btn" href="#" aria-label="Facebook">
                <SocialFacebook />
              </a>
            </div>
          </div>

          <nav className="site-footer__cols" aria-label="Collegamenti del sito">
            <div className="site-footer__col">
              <h2 className="site-footer__col-title">Per chi cerca assistenza</h2>
              <div className="site-footer__links">{colSeeker.map(renderLink)}</div>
            </div>
            <div className="site-footer__col">
              <h2 className="site-footer__col-title">Per chi offre assistenza</h2>
              <div className="site-footer__links">{colOffer.map(renderLink)}</div>
            </div>
            <div className="site-footer__col">
              <h2 className="site-footer__col-title">Piattaforma</h2>
              <div className="site-footer__links">{colPlatform.map(renderLink)}</div>
            </div>
            <div className="site-footer__col">
              <h2 className="site-footer__col-title">Legale</h2>
              <div className="site-footer__links">
                {colLegal.map(renderLink)}
                <button
                  type="button"
                  className="site-footer__link"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  onClick={openPanel}
                >
                  Gestisci preferenze cookie
                </button>
              </div>
            </div>
          </nav>
        </div>
      </div>

      <div className="site-footer__cta">
        <div className="site-footer__cta-inner">
          <p className="site-footer__cta-text">
            <strong>Pronto a iniziare?</strong> Crea un account in pochi minuti — nessun costo per partire.
          </p>
          <div className="site-footer__cta-actions">
            <Link to={registerStartHref} className="site-footer__cta-btn site-footer__cta-btn--primary">
              Inizia gratis
            </Link>
            <Link to="/accedi" className="site-footer__cta-btn site-footer__cta-btn--ghost">
              Accedi
            </Link>
          </div>
        </div>
      </div>

      <div className="site-footer__bar">
        <div className="site-footer__bar-inner">
          <p className="site-footer__copyright">
            © {year} {BRAND_NAME}. Tutti i diritti riservati.
          </p>
          <p className="site-footer__locale" lang="it">
            Italia · Italiano
          </p>
        </div>
      </div>
    </footer>
  )
}
