import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronRight } from '../components/icons/DashboardIcons'
import { SiteShell } from '../components/SiteShell'
import { BRAND_NAME, pageTitle } from '../lib/brand'
import { ContactError, postContactMessage } from '../lib/contactApi'
import type { ContactFormFieldErrors } from '../lib/contactApi'
import './contatti-page.css'

const FAQ_HREF = '/#faq'

const CONTACT_INFO = {
  email: 'assistenza@federicoandreoli.it',
  phone: '+39 02 1234 5678',
  hours: 'Lunedì – Venerdì, 9:00 – 18:00',
  address: 'Milano, Italia',
} as const

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export function ContattiPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [fieldErrors, setFieldErrors] = useState<ContactFormFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    document.title = pageTitle('Contatti e supporto')
    return () => {
      document.title = pageTitle()
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (formState === 'submitting') return

    setFormState('submitting')
    setFieldErrors({})
    setFormError(null)

    try {
      await postContactMessage({ name, email, message })
      setFormState('success')
      setName('')
      setEmail('')
      setMessage('')
    } catch (err) {
      setFormState('error')
      if (err instanceof ContactError) {
        setFieldErrors(err.fieldErrors)
        if (!Object.keys(err.fieldErrors).length) {
          setFormError(err.message)
        }
      } else {
        setFormError('Invio non riuscito. Riprova tra qualche minuto.')
      }
    }
  }

  return (
    <SiteShell>
      <main className="contatti-page">
        <header className="contatti-hero">
          <div className="contatti-hero__inner">
            <nav className="contatti-breadcrumb" aria-label="Percorso">
              <Link to="/">Home</Link>
              <span aria-hidden> / </span>
              <span>Contatti</span>
            </nav>
            <span className="contatti-hero__label">Supporto</span>
            <h1 className="contatti-hero__title">Contatti e assistenza</h1>
            <p className="contatti-hero__sub">
              Hai domande su {BRAND_NAME}? Scrivici: il team risponde entro un giorno lavorativo su account,
              profili e richieste di assistenza.
            </p>
          </div>
        </header>

        <div className="contatti-layout">
          <section className="contatti-panel" aria-labelledby="contatti-form-title">
            <h2 id="contatti-form-title" className="contatti-panel__title">
              Invia un messaggio
            </h2>
            <p className="contatti-panel__lead">
              Compila il modulo con nome, email e una breve descrizione della richiesta. Per domande frequenti
              consulta anche la sezione FAQ in homepage.
            </p>

            {formState === 'success' && (
              <div className="contatti-alert contatti-alert--success" role="status">
                Messaggio inviato correttamente. Ti risponderemo all&apos;indirizzo indicato entro 24 ore
                lavorative.
              </div>
            )}

            {formError && (
              <div className="contatti-alert contatti-alert--error" role="alert">
                {formError}
              </div>
            )}

            <form className="contatti-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
              <div className={`contatti-field${fieldErrors.name ? ' contatti-field--error' : ''}`}>
                <label className="contatti-field__label" htmlFor="contatti-name">
                  Nome e cognome
                </label>
                <input
                  id="contatti-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'contatti-name-error' : undefined}
                />
                {fieldErrors.name && (
                  <p id="contatti-name-error" className="contatti-field__error">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className={`contatti-field${fieldErrors.email ? ' contatti-field--error' : ''}`}>
                <label className="contatti-field__label" htmlFor="contatti-email">
                  Email
                </label>
                <input
                  id="contatti-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'contatti-email-error' : undefined}
                />
                {fieldErrors.email && (
                  <p id="contatti-email-error" className="contatti-field__error">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className={`contatti-field${fieldErrors.message ? ' contatti-field--error' : ''}`}>
                <label className="contatti-field__label" htmlFor="contatti-message">
                  Messaggio
                </label>
                <textarea
                  id="contatti-message"
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={10}
                  aria-invalid={Boolean(fieldErrors.message)}
                  aria-describedby={fieldErrors.message ? 'contatti-message-error' : undefined}
                />
                {fieldErrors.message && (
                  <p id="contatti-message-error" className="contatti-field__error">
                    {fieldErrors.message}
                  </p>
                )}
              </div>

              <button type="submit" className="contatti-submit" disabled={formState === 'submitting'}>
                {formState === 'submitting' ? 'Invio in corso…' : 'Invia messaggio'}
              </button>
            </form>
          </section>

          <aside className="contatti-aside" aria-label="Informazioni di contatto">
            <div className="contatti-info-card">
              <h2 className="contatti-info-card__title">Recapiti</h2>
              <ul className="contatti-info-list">
                <li>
                  <strong>Email</strong>
                  <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>
                </li>
                <li>
                  <strong>Telefono</strong>
                  <a href={`tel:${CONTACT_INFO.phone.replace(/\s/g, '')}`}>{CONTACT_INFO.phone}</a>
                </li>
                <li>
                  <strong>Orari</strong>
                  {CONTACT_INFO.hours}
                </li>
                <li>
                  <strong>Sede</strong>
                  {CONTACT_INFO.address}
                </li>
              </ul>
            </div>

            <div className="contatti-info-card">
              <h2 className="contatti-info-card__title">Domande frequenti</h2>
              <p style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Registrazione, profili verificati, piani Premium e privacy: trovi risposte rapide nella FAQ
                della homepage.
              </p>
              <Link className="contatti-faq-link" to={FAQ_HREF}>
                Vai alle FAQ
                <IconChevronRight size={14} aria-hidden />
              </Link>
            </div>

            <div className="contatti-info-card">
              <h2 className="contatti-info-card__title">Percorso utente</h2>
              <p style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Sei già registrato? Accedi alla dashboard dal tuo account oppure torna alla{' '}
                <Link to="/">home</Link>.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </SiteShell>
  )
}
