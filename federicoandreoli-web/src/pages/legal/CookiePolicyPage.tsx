import { Link } from 'react-router-dom'
import { SiteShell } from '../../components/SiteShell'
import './legal-pages.css'

const LAST_UPDATE = '4 giugno 2026'

const sections = [
  { id: 'cosa-sono', label: 'Cosa sono i cookie' },
  { id: 'tecnici', label: 'Cookie tecnici' },
  { id: 'terze-parti', label: 'Cookie di terze parti' },
  { id: 'profilazione', label: 'Cookie di profilazione' },
  { id: 'tabella', label: 'Tabella cookie' },
  { id: 'gestione', label: 'Come gestire i cookie' },
  { id: 'aggiornamenti', label: 'Aggiornamenti' },
]

export function CookiePolicyPage() {
  return (
    <SiteShell>
      <main className="legal-page">
        <div className="legal-hero">
          <div className="legal-hero__inner">
            <span className="legal-hero__label">Provvedimento Garante 2021 · GDPR</span>
            <h1 className="legal-hero__title">Cookie Policy</h1>
            <p className="legal-hero__meta">
              Piattaforma Curaxe · gestita da BackSoftware · Ultimo aggiornamento: {LAST_UPDATE}
            </p>
          </div>
        </div>

        <div className="legal-layout">
          <aside className="legal-toc" aria-label="Indice sezioni">
            <p className="legal-toc__title">Indice</p>
            <ol className="legal-toc__list">
              {sections.map((s) => (
                <li key={s.id} className="legal-toc__item">
                  <a href={`#${s.id}`}>{s.label}</a>
                </li>
              ))}
            </ol>
          </aside>

          <div className="legal-body">
            <div className="legal-callout">
              <p>
                La presente Cookie Policy è redatta in conformità al{' '}
                <strong>Regolamento (UE) 2016/679 (GDPR)</strong>, al D.Lgs. 196/2003 (Codice
                Privacy) come modificato dal D.Lgs. 101/2018, all'art. 122 del Codice Privacy e al{' '}
                <strong>Provvedimento del Garante per la Protezione dei Dati Personali del
                10 giugno 2021</strong> («Linee guida cookie e altri strumenti di tracciamento»).
                Titolare del trattamento: BackSoftware.
              </p>
            </div>

            {/* 1. COSA SONO I COOKIE */}
            <section id="cosa-sono" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">1</span>
                Cosa sono i cookie e tecnologie simili
              </h2>
              <p>
                I <strong>cookie</strong> sono piccoli file di testo che i siti web salvano sul
                dispositivo dell'utente (computer, tablet, smartphone) durante la navigazione.
                Vengono rimandati al sito di origine a ogni visita successiva, permettendo al sito
                di riconoscere il browser e di ricordare determinate informazioni.
              </p>
              <p>
                Oltre ai cookie, esistono tecnologie di tracciamento simili (es. localStorage,
                sessionStorage, pixel di tracciamento, web beacon, fingerprinting) che possono
                essere utilizzate per scopi analoghi. Nella presente policy, il termine «cookie»
                è usato in modo generico per riferirsi a tutte queste tecnologie, salvo indicazioni
                specifiche.
              </p>
              <p>I cookie si distinguono in base a diverse caratteristiche:</p>
              <ul>
                <li>
                  <strong>Durata:</strong> cookie di sessione (eliminati alla chiusura del browser)
                  o cookie persistenti (rimangono per un periodo determinato).
                </li>
                <li>
                  <strong>Provenienza:</strong> cookie proprietari (impostati dal sito visitato) o
                  cookie di terze parti (impostati da domini diversi rispetto a quello del sito
                  visitato).
                </li>
                <li>
                  <strong>Finalità:</strong> tecnici, analitici, di profilazione/marketing.
                </li>
              </ul>
            </section>

            {/* 2. COOKIE TECNICI */}
            <section id="tecnici" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">2</span>
                Cookie tecnici strettamente necessari
              </h2>
              <p>
                I cookie tecnici sono <strong>strettamente necessari</strong> per il corretto
                funzionamento della Piattaforma e non richiedono il consenso dell'utente, ai sensi
                del Provvedimento Garante del 10 giugno 2021 e del considerando 25 della Direttiva
                ePrivacy (2002/58/CE).
              </p>
              <p>
                La Piattaforma utilizza i seguenti cookie tecnici:
              </p>

              <p><strong>Cookie di sessione e autenticazione (Laravel Sanctum)</strong></p>
              <p>
                La Piattaforma utilizza <strong>Laravel Sanctum</strong> per la gestione delle
                sessioni autenticate. Al momento del login, viene impostato un cookie di sessione
                crittografato che mantiene attiva la sessione dell'utente durante la navigazione.
                Questo cookie è eliminato automaticamente alla chiusura del browser o allo scadere
                della sessione. Senza questo cookie non è possibile accedere alle funzionalità che
                richiedono autenticazione.
              </p>

              <p><strong>Cookie CSRF (Cross-Site Request Forgery)</strong></p>
              <p>
                Un token CSRF è associato alla sessione per proteggere le operazioni di modifica
                dei dati da attacchi cross-site. Non contiene dati personali identificativi.
              </p>

              <p><strong>Cookie di preferenze</strong></p>
              <p>
                Possono essere impostati cookie tecnici per ricordare le preferenze dell'utente
                all'interno della Piattaforma (es. lingua, modalità di visualizzazione). Questi
                non profilano l'utente a fini commerciali.
              </p>
            </section>

            {/* 3. COOKIE DI TERZE PARTI */}
            <section id="terze-parti" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">3</span>
                Cookie e richieste di terze parti
              </h2>

              <p><strong>3.1 Google Fonts</strong></p>
              <p>
                La Piattaforma utilizza <strong>Google Fonts</strong> (fonts.googleapis.com) per
                il caricamento dei caratteri tipografici Syne e Manrope. Quando il browser
                dell'utente carica le pagine, effettua richieste ai server di Google per scaricare
                i file dei font. <strong>Google può raccogliere l'indirizzo IP</strong> e altre
                informazioni tecniche del dispositivo dell'utente (es. user-agent) anche senza
                impostare cookie sul dispositivo.
              </p>
              <div className="legal-callout--accent legal-callout">
                <p>
                  Ai sensi del Provvedimento Garante 2021, il trasferimento dell'IP a Google
                  tramite Google Fonts costituisce un trattamento di dati personali che richiede
                  idonea base giuridica. Il Titolare sta valutando l'adozione dell'auto-hosting
                  dei font per eliminare questa dipendenza. Nel frattempo, tale trasferimento è
                  coperto dalle Clausole Contrattuali Standard (SCC) e dall'adesione di Google
                  al EU-U.S. Data Privacy Framework. Per maggiori informazioni:{' '}
                  <a href="https://developers.google.com/fonts/faq/privacy" target="_blank" rel="noopener noreferrer">
                    Google Fonts Privacy FAQ
                  </a>.
                </p>
              </div>

              <p><strong>3.2 Google Places API (se attivo)</strong></p>
              <p>
                La funzionalità di autocompletamento degli indirizzi geografici può utilizzare
                le <strong>Google Places API</strong>. In tal caso, la stringa di ricerca inserita
                dall'utente è trasmessa ai server di Google per suggerire risultati. Anche in
                questo caso il trasferimento è coperto da SCC e DPF. L'utente può disattivare
                questa funzionalità disabilitando i cookie di terze parti nel proprio browser.
              </p>

              <p><strong>3.3 Stripe (widget di pagamento)</strong></p>
              <p>
                Le pagine relative ai pagamenti e all'abbonamento possono caricare script e
                cookie di <strong>Stripe</strong> per la gestione sicura dei pagamenti (es.
                rilevamento frodi, <em>Stripe.js</em>). Questi cookie sono classificati come
                tecnici nella misura in cui sono strettamente necessari all'elaborazione del
                pagamento. Per la policy di Stripe:{' '}
                <a href="https://stripe.com/it/privacy" target="_blank" rel="noopener noreferrer">
                  stripe.com/it/privacy
                </a>.
              </p>
            </section>

            {/* 4. PROFILAZIONE */}
            <section id="profilazione" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">4</span>
                Cookie di profilazione e marketing
              </h2>
              <div className="legal-callout--sage legal-callout">
                <p>
                  Alla data di pubblicazione della presente Cookie Policy, la Piattaforma{' '}
                  <strong>non utilizza cookie di profilazione o di marketing</strong> propri,
                  né pixel di tracciamento di social network (es. Meta Pixel, LinkedIn Insight Tag)
                  per la creazione di profili utente a fini pubblicitari.
                </p>
              </div>
              <p>
                Qualora in futuro venissero introdotti strumenti di profilazione o marketing,
                la presente Cookie Policy sarà aggiornata con congruo preavviso e sarà richiesto
                il consenso esplicito degli utenti tramite il banner/pannello di gestione dei
                cookie, conformemente al Provvedimento Garante del 10 giugno 2021.
              </p>
              <p>
                <strong>Cookie analytics:</strong> la Piattaforma può integrare strumenti di
                analisi statistica (es. Google Analytics 4) per comprendere in forma aggregata come
                viene utilizzato il sito. Tali strumenti utilizzano IP anonimizzato,{' '}
                <strong>non vengono caricati prima del consenso</strong> e possono essere attivati
                o disattivati in qualsiasi momento dal pannello «Preferenze cookie» (categoria
                «Analitici») o dal link «Gestisci cookie» nel footer. In assenza di consenso non
                viene effettuato alcun tracciamento analytics.
              </p>
            </section>

            {/* 5. TABELLA COOKIE */}
            <section id="tabella" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">5</span>
                Tabella riepilogativa dei cookie
              </h2>
              <div className="legal-table-wrap">
                <table className="legal-table">
                  <thead>
                    <tr>
                      <th>Nome / Pattern</th>
                      <th>Tipo</th>
                      <th>Durata</th>
                      <th>Finalità</th>
                      <th>Fornitore</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <code>laravel_session</code>
                      </td>
                      <td>
                        <span className="legal-badge legal-badge--tech">Tecnico</span>
                      </td>
                      <td>Sessione</td>
                      <td>Gestione sessione utente autenticato (Laravel Sanctum)</td>
                      <td>Proprietario</td>
                    </tr>
                    <tr>
                      <td>
                        <code>XSRF-TOKEN</code>
                      </td>
                      <td>
                        <span className="legal-badge legal-badge--tech">Tecnico</span>
                      </td>
                      <td>Sessione</td>
                      <td>Protezione CSRF per operazioni di modifica dati</td>
                      <td>Proprietario</td>
                    </tr>
                    <tr>
                      <td>
                        <code>remember_web_*</code>
                      </td>
                      <td>
                        <span className="legal-badge legal-badge--tech">Tecnico</span>
                      </td>
                      <td>30 giorni</td>
                      <td>Funzione «Ricordami» per sessioni persistenti (opzionale)</td>
                      <td>Proprietario</td>
                    </tr>
                    <tr>
                      <td>
                        Richieste a <code>fonts.googleapis.com</code>
                      </td>
                      <td>
                        <span className="legal-badge legal-badge--third">Terze parti</span>
                      </td>
                      <td>N/A (richiesta HTTP)</td>
                      <td>Caricamento font Syne e Manrope; Google può registrare IP</td>
                      <td>Google LLC</td>
                    </tr>
                    <tr>
                      <td>
                        <code>__stripe_mid</code>, <code>__stripe_sid</code>
                      </td>
                      <td>
                        <span className="legal-badge legal-badge--third">Terze parti</span>
                      </td>
                      <td>1 anno / Sessione</td>
                      <td>
                        Prevenzione frodi e sicurezza pagamenti (Stripe.js); presenti solo
                        nelle pagine di pagamento
                      </td>
                      <td>Stripe</td>
                    </tr>
                    <tr>
                      <td>
                        <code>cookie_consent_v1</code> (localStorage)
                      </td>
                      <td>
                        <span className="legal-badge legal-badge--tech">Tecnico</span>
                      </td>
                      <td>~12 mesi</td>
                      <td>
                        Memorizzazione preferenze consenso cookie (necessari, funzionali,
                        analitici, marketing)
                      </td>
                      <td>Proprietario</td>
                    </tr>
                    <tr>
                      <td>
                        <code>_ga</code>, <code>_gid</code> (se consenso analitici)
                      </td>
                      <td>
                        <span className="legal-badge legal-badge--session">Analitico</span>
                      </td>
                      <td>2 anni / 24 ore</td>
                      <td>
                        Statistiche aggregate di utilizzo (Google Analytics 4); impostati solo
                        dopo consenso esplicito alla categoria «Analitici»
                      </td>
                      <td>Google LLC</td>
                    </tr>
                    <tr>
                      <td>
                        Cookie preferenze (es. <code>fa_prefs</code>)
                      </td>
                      <td>
                        <span className="legal-badge legal-badge--session">Tecnico</span>
                      </td>
                      <td>6 mesi</td>
                      <td>
                        Memorizzazione preferenze UI dell'utente (lingua, visualizzazione)
                      </td>
                      <td>Proprietario</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                La tabella è aggiornata alla data indicata in cima a questa pagina. Il Titolare
                si impegna ad aggiornare la tabella tempestivamente in caso di introduzione di
                nuovi cookie o tecnologie di tracciamento.
              </p>
            </section>

            {/* 6. GESTIONE */}
            <section id="gestione" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">6</span>
                Come gestire e disabilitare i cookie
              </h2>

              <p><strong>6.1 Pannello delle preferenze cookie</strong></p>
              <p>
                Laddove siano presenti cookie che richiedono il consenso, la Piattaforma mette a
                disposizione un <strong>pannello di gestione delle preferenze</strong> accessibile
                tramite il banner visualizzato al primo accesso e richiamabile in qualsiasi momento
                tramite il link «Gestisci cookie» presente nel footer. Tramite questo pannello
                l'utente può accettare o rifiutare singole categorie di cookie non tecnici.
              </p>

              <p><strong>6.2 Impostazioni del browser</strong></p>
              <p>
                È possibile gestire, bloccare o eliminare i cookie anche tramite le impostazioni
                del browser utilizzato. Di seguito i link alle istruzioni dei principali browser:
              </p>
              <ul>
                <li>
                  <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">
                    Google Chrome
                  </a>
                </li>
                <li>
                  <a href="https://support.mozilla.org/it/kb/protezione-antitracciamento-avanzata-firefox" target="_blank" rel="noopener noreferrer">
                    Mozilla Firefox
                  </a>
                </li>
                <li>
                  <a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">
                    Apple Safari
                  </a>
                </li>
                <li>
                  <a href="https://support.microsoft.com/it-it/windows/gestire-i-cookie-in-microsoft-edge" target="_blank" rel="noopener noreferrer">
                    Microsoft Edge
                  </a>
                </li>
              </ul>
              <div className="legal-callout--accent legal-callout">
                <p>
                  <strong>Attenzione:</strong> la disabilitazione di tutti i cookie — inclusi quelli
                  tecnici — potrebbe compromettere il corretto funzionamento della Piattaforma,
                  incluso il mantenimento della sessione autenticata. Si raccomanda di bloccare
                  solo i cookie di terze parti non necessari, mantenendo attivi quelli tecnici
                  proprietari.
                </p>
              </div>

              <p><strong>6.3 Opt-out di Google Fonts</strong></p>
              <p>
                Per impedire il trasferimento dell'IP a Google tramite Google Fonts, è possibile
                utilizzare un'estensione browser che blocchi le richieste a{' '}
                <code>fonts.googleapis.com</code> (es. uBlock Origin, Privacy Badger). In tal
                caso i font di sistema sostitutivi saranno utilizzati automaticamente senza alcuna
                perdita di funzionalità.
              </p>

              <p><strong>6.4 Strumenti di opt-out di terze parti</strong></p>
              <ul>
                <li>
                  <strong>Google:</strong>{' '}
                  <a href="https://myaccount.google.com/data-and-privacy" target="_blank" rel="noopener noreferrer">
                    Google — Dati e privacy
                  </a>
                </li>
                <li>
                  <strong>Stripe:</strong>{' '}
                  <a href="https://stripe.com/it/privacy" target="_blank" rel="noopener noreferrer">
                    Stripe Privacy Policy
                  </a>
                </li>
                <li>
                  <strong>Network Advertising Initiative (NAI):</strong>{' '}
                  <a href="https://optout.networkadvertising.org" target="_blank" rel="noopener noreferrer">
                    optout.networkadvertising.org
                  </a>
                </li>
                <li>
                  <strong>Your Online Choices (UE):</strong>{' '}
                  <a href="https://www.youronlinechoices.com/it/" target="_blank" rel="noopener noreferrer">
                    youronlinechoices.com
                  </a>
                </li>
              </ul>
            </section>

            {/* 7. AGGIORNAMENTI */}
            <section id="aggiornamenti" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">7</span>
                Aggiornamenti della Cookie Policy
              </h2>
              <p>
                Il Titolare si riserva di aggiornare la presente Cookie Policy in qualsiasi
                momento per riflettere modifiche normative, tecnologiche o relative ai servizi
                utilizzati. In caso di modifiche sostanziali, l'utente sarà informato tramite
                avviso in evidenza sulla Piattaforma o via e-mail.
              </p>
              <p>
                La versione aggiornata è sempre disponibile all'indirizzo{' '}
                <Link to="/cookie">curaxe.it/cookie</Link>.
              </p>
              <div className="legal-callout">
                <p>
                  Per il trattamento completo dei dati personali, consulta la nostra{' '}
                  <Link to="/privacy">Informativa Privacy</Link> e i{' '}
                  <Link to="/termini">Termini e Condizioni d'uso</Link>.
                  Per qualsiasi domanda relativa ai cookie:{' '}
                  <a href="mailto:privacy@backsoftware.it">privacy@backsoftware.it</a>.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
