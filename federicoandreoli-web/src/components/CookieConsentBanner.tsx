import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCookieConsent, type CookieCategories } from '../context/CookieConsentContext'
import './cookie-consent.css'

type CategoryDef = {
  key: keyof Omit<CookieCategories, 'necessary'>
  label: string
  description: string
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'functional',
    label: 'Funzionali',
    description:
      "Abilitano funzionalità avanzate come Google Places per la ricerca geografica e l'autocompletamento degli indirizzi.",
  },
  {
    key: 'analytics',
    label: 'Analitici',
    description:
      "Misurano in forma aggregata l'utilizzo del sito (es. pagine visitate). Attivati solo con il tuo consenso.",
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description:
      "Utilizzati per mostrare annunci personalizzati e misurare l'efficacia delle campagne promozionali.",
  },
]

function ConsentPanel({ onClose }: { onClose: () => void }) {
  const { consent, acceptAll, rejectOptional, saveCustom } = useCookieConsent()

  const [prefs, setPrefs] = useState<Omit<CookieCategories, 'necessary'>>({
    functional: consent?.functional ?? false,
    analytics: consent?.analytics ?? false,
    marketing: consent?.marketing ?? false,
  })

  const toggle = (key: keyof typeof prefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
  }

  return (
    <>
      <div className="cookie-backdrop" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-panel-title"
        className="cookie-panel"
      >
        <div className="cookie-panel__header">
          <h2 id="cookie-panel-title" className="cookie-panel__title">
            Preferenze cookie
          </h2>
          <button
            type="button"
            className="cookie-panel__close"
            aria-label="Chiudi pannello preferenze"
            onClick={onClose}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p className="cookie-panel__intro">
          Puoi scegliere quali categorie di cookie attivare. I cookie necessari non possono essere
          disattivati perché indispensabili al funzionamento del sito.
        </p>

        <div className="cookie-categories">
          {/* Necessari — sempre attivi */}
          <div className="cookie-category cookie-category--active">
            <div className="cookie-category__info">
              <p className="cookie-category__name">Necessari</p>
              <p className="cookie-category__desc">
                Indispensabili per il corretto funzionamento del sito: sessione, sicurezza,
                navigazione. Non richiedono consenso.
              </p>
            </div>
            <label className="cookie-toggle cookie-toggle--disabled" aria-label="Necessari — sempre attivi">
              <input
                type="checkbox"
                className="cookie-toggle__input"
                checked
                disabled
                aria-checked="true"
                readOnly
              />
              <span className="cookie-toggle__track" />
            </label>
          </div>

          {/* Categorie opzionali */}
          {CATEGORIES.map((cat) => {
            const isActive = prefs[cat.key]
            return (
              <div
                key={cat.key}
                className={`cookie-category${isActive ? ' cookie-category--active' : ''}`}
              >
                <div className="cookie-category__info">
                  <p className="cookie-category__name">{cat.label}</p>
                  <p className="cookie-category__desc">{cat.description}</p>
                </div>
                <label
                  className="cookie-toggle"
                  aria-label={`${cat.label}: ${isActive ? 'attivi' : 'disattivi'}`}
                >
                  <input
                    type="checkbox"
                    className="cookie-toggle__input"
                    checked={isActive}
                    onChange={() => toggle(cat.key)}
                  />
                  <span className="cookie-toggle__track" />
                </label>
              </div>
            )
          })}
        </div>

        <div className="cookie-panel__footer">
          <button type="button" className="cookie-btn cookie-btn--secondary" onClick={rejectOptional}>
            Solo necessari
          </button>
          <button
            type="button"
            className="cookie-btn cookie-btn--secondary"
            onClick={() => saveCustom(prefs)}
          >
            Salva preferenze
          </button>
          <button type="button" className="cookie-btn cookie-btn--primary" onClick={acceptAll}>
            Accetta tutti
          </button>
        </div>
      </div>
    </>
  )
}

export function CookieConsentBanner() {
  const { hasDecided, isPanelOpen, acceptAll, rejectOptional, openPanel, closePanel } =
    useCookieConsent()

  if (hasDecided && !isPanelOpen) return null

  if (isPanelOpen) {
    return <ConsentPanel onClose={closePanel} />
  }

  return (
    <div
      role="region"
      aria-label="Informativa cookie"
      className="cookie-banner"
    >
      <div className="cookie-banner__inner">
        <p className="cookie-banner__text">
          Usiamo i cookie per migliorare l'esperienza. Alcuni cookie di terze parti (Google Fonts,
          Google Places) possono essere attivati.{' '}
          <Link to="/cookie">Leggi la Cookie Policy</Link>
        </p>
        <div className="cookie-banner__actions">
          <button type="button" className="cookie-btn cookie-btn--primary" onClick={acceptAll}>
            Accetta tutti
          </button>
          <button
            type="button"
            className="cookie-btn cookie-btn--secondary"
            onClick={rejectOptional}
          >
            Solo necessari
          </button>
          <button type="button" className="cookie-btn cookie-btn--ghost" onClick={openPanel}>
            Personalizza
          </button>
        </div>
      </div>
    </div>
  )
}
