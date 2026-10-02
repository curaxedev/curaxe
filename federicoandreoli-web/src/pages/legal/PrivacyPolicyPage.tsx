import { Link } from 'react-router-dom'
import { SiteShell } from '../../components/SiteShell'
import './legal-pages.css'

const LAST_UPDATE = '12 maggio 2026'

const sections = [
  { id: 'titolare', label: 'Titolare del trattamento' },
  { id: 'categorie-dati', label: 'Categorie di dati' },
  { id: 'finalita-basi', label: 'Finalità e basi giuridiche' },
  { id: 'retention', label: 'Conservazione dati' },
  { id: 'destinatari', label: 'Destinatari e responsabili' },
  { id: 'trasferimenti', label: 'Trasferimenti extra-UE' },
  { id: 'diritti', label: 'Diritti degli interessati' },
  { id: 'reclamo', label: 'Reclamo al Garante' },
  { id: 'cookie', label: 'Cookie' },
  { id: 'minori', label: 'Minori' },
  { id: 'aggiornamenti', label: 'Aggiornamenti' },
]

export function PrivacyPolicyPage() {
  return (
    <SiteShell>
      <main className="legal-page">
        <div className="legal-hero">
          <div className="legal-hero__inner">
            <span className="legal-hero__label">GDPR – Art. 13-14</span>
            <h1 className="legal-hero__title">Informativa sul trattamento dei dati personali</h1>
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
                La presente informativa è resa ai sensi degli artt. 13 e 14 del Regolamento (UE)
                2016/679 (<strong>GDPR</strong>) e del D.Lgs. 196/2003 (Codice Privacy) come
                modificato dal D.Lgs. 101/2018, agli Utenti che interagiscono con la piattaforma{' '}
                <strong>curaxe.it</strong>.
              </p>
            </div>

            {/* 1. TITOLARE */}
            <section id="titolare" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">1</span>
                Titolare del trattamento
              </h2>
              <p>
                Il <strong>Titolare del trattamento</strong> dei dati personali è:
              </p>
              <ul>
                <li>
                  <strong>Denominazione:</strong> BackSoftware
                </li>
                <li>
                  <strong>Indirizzo e-mail:</strong>{' '}
                  <a href="mailto:privacy@backsoftware.it">privacy@backsoftware.it</a>
                </li>
                <li>
                  <strong>Sito web:</strong>{' '}
                  <a href="https://curaxe.it" target="_blank" rel="noopener noreferrer">
                    curaxe.it
                  </a>
                </li>
              </ul>
              <p>
                <strong>Responsabile della Protezione dei Dati (DPO):</strong> Alla data di
                pubblicazione del presente documento, il Titolare sta valutando la designazione
                formale di un DPO ai sensi dell'art. 37 GDPR. Per richieste relative alla
                protezione dei dati personali è possibile contattare il Titolare all'indirizzo
                e-mail indicato sopra, specificando nell'oggetto «GDPR – Protezione dati».
              </p>
            </section>

            {/* 2. CATEGORIE DI DATI */}
            <section id="categorie-dati" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">2</span>
                Categorie di dati trattati
              </h2>
              <p>
                In funzione dell'utilizzo della Piattaforma, il Titolare tratta le seguenti
                categorie di dati personali:
              </p>

              <p><strong>Dati identificativi e di contatto</strong></p>
              <ul>
                <li>Nome e cognome</li>
                <li>Indirizzo e-mail</li>
                <li>Data di nascita e genere</li>
                <li>Zona/comune di residenza o di ricerca (indirizzo approssimato)</li>
                <li>Foto profilo (caricamento facoltativo)</li>
              </ul>

              <p><strong>Dati professionali</strong></p>
              <ul>
                <li>Titoli di studio e qualifiche professionali</li>
                <li>Documenti professionali in formato PDF (diplomi, attestati, certificazioni)</li>
                <li>Esperienze lavorative dichiarate</li>
                <li>Disponibilità oraria e geografica</li>
              </ul>

              <p><strong>Dati di natura giudiziaria (art. 10 GDPR)</strong></p>
              <div className="legal-callout--accent legal-callout">
                <p>
                  I Professionisti possono dichiarare volontariamente l'assenza di condanne ostative
                  risultanti dal <strong>casellario giudiziale</strong>. Tale dichiarazione costituisce
                  un dato di natura giudiziaria ai sensi dell'art. 10 GDPR. Il trattamento è
                  effettuato sulla base del <strong>consenso esplicito</strong> dell'interessato
                  (art. 9, par. 2, lett. a GDPR) e con le garanzie previste dall'art. 2-octies
                  D.Lgs. 196/2003. Il Titolare non accede autonomamente al casellario giudiziale.
                </p>
              </div>

              <p><strong>Potenziali dati relativi alla salute</strong></p>
              <p>
                Il campo «Note libere» del profilo potrebbe contenere informazioni indirettamente
                riferibili allo stato di salute (es. patologie assistite, esigenze specifiche di
                cura). Tali dati, qualificabili come <strong>dati particolari ai sensi dell'art. 9
                GDPR</strong>, sono inseriti esclusivamente su iniziativa e sotto responsabilità
                dell'Utente. Il Titolare tratta tali dati sulla base del consenso esplicito
                (art. 9, par. 2, lett. a GDPR). Si raccomanda agli Utenti di evitare l'inserimento
                di dati sanitari di terzi (es. dati del paziente assistito) nelle note del profilo.
              </p>

              <p><strong>Dati tecnici e di navigazione</strong></p>
              <ul>
                <li>Indirizzo IP e identificativi del dispositivo/browser</li>
                <li>Token di sessione e cookie di autenticazione (Laravel Sanctum)</li>
                <li>Codici OTP per l'autenticazione via e-mail</li>
                <li>Log di accesso e attività sulla Piattaforma</li>
              </ul>

              <p><strong>Dati di pagamento</strong></p>
              <p>
                I dati relativi alle carte di pagamento non transitano né vengono conservati sui
                sistemi del Titolare, ma sono trattati direttamente da Stripe. Il Titolare riceve
                da Stripe i dati strettamente necessari alla gestione dell'abbonamento (es. stato
                dell'abbonamento, identificativo cliente Stripe, notifiche webhook).
              </p>
            </section>

            {/* 3. FINALITÀ E BASI */}
            <section id="finalita-basi" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">3</span>
                Finalità del trattamento e basi giuridiche
              </h2>

              <p><strong>3.1 Erogazione dei Servizi e gestione del contratto</strong></p>
              <p>
                <em>Base giuridica:</em> art. 6, par. 1, lett. b GDPR (esecuzione del contratto).
              </p>
              <p>
                I dati identificativi, di contatto e professionali sono trattati per consentire
                la registrazione, la creazione e la gestione del profilo, la ricerca e il
                matching tra Committenti e Professionisti, la gestione delle candidature e le
                comunicazioni operative relative all'Account.
              </p>

              <p><strong>3.2 Adempimento di obblighi legali</strong></p>
              <p>
                <em>Base giuridica:</em> art. 6, par. 1, lett. c GDPR (obbligo legale).
              </p>
              <p>
                I dati possono essere trattati per adempiere a obblighi fiscali, contabili,
                amministrativi e di sicurezza informatica previsti dalla legge italiana e dall'UE
                (es. conservazione delle fatture, risposta a richieste dell'Autorità Giudiziaria
                o del Garante Privacy).
              </p>

              <p><strong>3.3 Comunicazioni di servizio e notifiche</strong></p>
              <p>
                <em>Base giuridica:</em> art. 6, par. 1, lett. b GDPR.
              </p>
              <p>
                L'indirizzo e-mail è utilizzato per inviare OTP di autenticazione, notifiche
                relative all'Account (es. nuove candidature ricevute, aggiornamenti del profilo),
                avvisi di sicurezza e comunicazioni obbligatorie relative al servizio.
              </p>

              <p><strong>3.4 Marketing e comunicazioni promozionali</strong></p>
              <p>
                <em>Base giuridica:</em> art. 6, par. 1, lett. a GDPR (consenso); art. 130 D.Lgs.
                196/2003 per comunicazioni via e-mail a clienti esistenti (soft opt-in).
              </p>
              <p>
                Previo consenso esplicito o nei limiti del soft opt-in, l'e-mail dell'Utente può
                essere utilizzata per inviare newsletter, aggiornamenti della piattaforma e offerte
                commerciali. Il consenso è revocabile in qualsiasi momento tramite il link di
                disiscrizione presente in ogni comunicazione o contattando il Titolare.
              </p>

              <p><strong>3.5 Trattamento di dati particolari (casellario e dati sanitari)</strong></p>
              <p>
                <em>Base giuridica:</em> art. 9, par. 2, lett. a GDPR (consenso esplicito).
              </p>
              <p>
                La dichiarazione sul casellario giudiziale e l'eventuale inserimento di
                informazioni sanitarie nelle note libere sono trattati esclusivamente sulla base del
                consenso esplicito dell'interessato, raccolto al momento dell'inserimento dei dati.
              </p>

              <p><strong>3.6 Legittimo interesse</strong></p>
              <p>
                <em>Base giuridica:</em> art. 6, par. 1, lett. f GDPR (legittimo interesse).
              </p>
              <p>
                Il Titolare tratta i log di accesso e i dati tecnici per garantire la sicurezza
                della Piattaforma, prevenire frodi e abusi, e per finalità di debug e miglioramento
                del servizio. Il legittimo interesse è stato bilanciato con i diritti degli
                interessati, prevalendo in quanto i dati tecnici sono trattati in modo pseudonimo
                e per finalità di sicurezza non suscettibili di impatto significativo sulla
                sfera personale degli Utenti.
              </p>
            </section>

            {/* 4. RETENTION */}
            <section id="retention" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">4</span>
                Conservazione dei dati (retention policy)
              </h2>
              <div className="legal-table-wrap">
                <table className="legal-table">
                  <thead>
                    <tr>
                      <th>Categoria di dati</th>
                      <th>Periodo di conservazione</th>
                      <th>Motivazione</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Dati Account attivo (profilo, credenziali)</td>
                      <td>Per tutta la durata dell'Account</td>
                      <td>Esecuzione del contratto</td>
                    </tr>
                    <tr>
                      <td>Dati Account dopo cancellazione</td>
                      <td>30 giorni (anonimizzazione), poi eliminazione</td>
                      <td>Periodo di grazia e sicurezza</td>
                    </tr>
                    <tr>
                      <td>Dati di fatturazione e pagamento</td>
                      <td>10 anni dalla registrazione</td>
                      <td>Obblighi fiscali (art. 2220 c.c., DPR 633/72)</td>
                    </tr>
                    <tr>
                      <td>Log di accesso e sicurezza</td>
                      <td>12 mesi</td>
                      <td>Sicurezza informatica e prevenzione frodi</td>
                    </tr>
                    <tr>
                      <td>Token OTP (one-time password)</td>
                      <td>15 minuti dalla generazione</td>
                      <td>Sicurezza autenticazione</td>
                    </tr>
                    <tr>
                      <td>Documenti professionali (PDF)</td>
                      <td>Durata Account + 30 giorni</td>
                      <td>Servizio e verifica profilo</td>
                    </tr>
                    <tr>
                      <td>Dati particolari (casellario / note sanitarie)</td>
                      <td>Durata Account o revoca consenso</td>
                      <td>Consenso esplicito</td>
                    </tr>
                    <tr>
                      <td>Cookie di sessione</td>
                      <td>Fine sessione di navigazione</td>
                      <td>Tecnico</td>
                    </tr>
                    <tr>
                      <td>Dati per marketing (con consenso)</td>
                      <td>Fino a revoca consenso</td>
                      <td>Consenso</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Allo scadere dei termini di conservazione, i dati sono cancellati o anonimizzati
                in modo irreversibile, salvo che siano necessari per la difesa in giudizio o per
                adempiere a obblighi di legge sopravvenuti.
              </p>
            </section>

            {/* 5. DESTINATARI */}
            <section id="destinatari" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">5</span>
                Destinatari e responsabili del trattamento
              </h2>
              <p>
                I dati personali possono essere comunicati alle seguenti categorie di soggetti,
                designati Responsabili del trattamento ai sensi dell'art. 28 GDPR ove applicabile:
              </p>
              <div className="legal-table-wrap">
                <table className="legal-table">
                  <thead>
                    <tr>
                      <th>Fornitore / Categoria</th>
                      <th>Dati condivisi</th>
                      <th>Finalità</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Provider hosting / cloud</strong></td>
                      <td>Tutti i dati dell'Account</td>
                      <td>Infrastruttura e archiviazione</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Stripe Payments Europe, Ltd.</strong>
                      </td>
                      <td>E-mail, dati abbonamento, webhook</td>
                      <td>Processamento pagamenti</td>
                    </tr>
                    <tr>
                      <td><strong>Provider e-mail transazionale</strong></td>
                      <td>E-mail, contenuto notifica</td>
                      <td>Invio OTP, notifiche, comunicazioni</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Google LLC</strong> (Google Fonts)
                      </td>
                      <td>IP del visitatore (richieste font)</td>
                      <td>Caricamento font tipografici</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Google LLC</strong> (Places API, se attivo)
                      </td>
                      <td>Stringa di ricerca geografica</td>
                      <td>Autocompletamento indirizzi</td>
                    </tr>
                    <tr>
                      <td><strong>Autorità pubbliche</strong></td>
                      <td>Dati richiesti su ordine</td>
                      <td>Adempimento obblighi legali</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Il Titolare non vende né cede a titolo commerciale i dati personali degli Utenti
                a terze parti a fini di marketing di questi ultimi. L'elenco aggiornato dei
                Responsabili del trattamento è disponibile su richiesta all'indirizzo{' '}
                <a href="mailto:privacy@backsoftware.it">privacy@backsoftware.it</a>.
              </p>
            </section>

            {/* 6. TRASFERIMENTI EXTRA-UE */}
            <section id="trasferimenti" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">6</span>
                Trasferimenti extra-UE
              </h2>
              <p>
                Alcuni fornitori del Titolare, in particolare <strong>Google LLC</strong> e{' '}
                <strong>Stripe, Inc.</strong> (con sede negli Stati Uniti), possono trattare dati
                in paesi terzi al di fuori dello Spazio Economico Europeo (SEE). Tali trasferimenti
                sono effettuati nel rispetto del Capitolo V del GDPR, in particolare mediante:
              </p>
              <ul>
                <li>
                  <strong>Clausole Contrattuali Standard (SCC)</strong> adottate dalla Commissione
                  europea con decisione 2021/914/UE, che garantiscono un livello di protezione
                  equivalente a quello del SEE.
                </li>
                <li>
                  Per Google LLC: adesione al{' '}
                  <strong>EU-U.S. Data Privacy Framework</strong> (DPF), riconosciuto adeguato
                  dalla Commissione europea con decisione del luglio 2023.
                </li>
                <li>
                  Per Stripe: utilizzo dell'entità europea Stripe Payments Europe, Ltd. con sede
                  a Dublino (Irlanda, SEE) per il processamento dei pagamenti; i sub-processor
                  extraeuropei sono coperti da SCC.
                </li>
              </ul>
              <p>
                Maggiori informazioni sulle garanzie adottate sono disponibili nelle rispettive
                informative privacy di{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                  Google
                </a>{' '}
                e{' '}
                <a href="https://stripe.com/it/privacy" target="_blank" rel="noopener noreferrer">
                  Stripe
                </a>.
              </p>
            </section>

            {/* 7. DIRITTI */}
            <section id="diritti" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">7</span>
                Diritti degli interessati
              </h2>
              <p>
                In qualità di interessato, l'Utente ha il diritto di esercitare, in qualsiasi
                momento e gratuitamente, i seguenti diritti nei confronti del Titolare:
              </p>
              <ul>
                <li>
                  <strong>Diritto di accesso (art. 15 GDPR):</strong> ottenere conferma che sia in
                  corso un trattamento di dati che lo riguardano e riceverne copia.
                </li>
                <li>
                  <strong>Diritto di rettifica (art. 16 GDPR):</strong> ottenere la correzione di
                  dati inesatti o il completamento di dati incompleti.
                </li>
                <li>
                  <strong>Diritto alla cancellazione («diritto all'oblio», art. 17 GDPR):</strong>{' '}
                  ottenere la cancellazione dei propri dati quando non siano più necessari alle
                  finalità per cui sono stati raccolti, o quando l'interessato revochi il consenso,
                  o si opponga al trattamento, salvo che sussistano motivi legittimi prevalenti o
                  obblighi legali di conservazione.
                </li>
                <li>
                  <strong>Diritto di limitazione del trattamento (art. 18 GDPR):</strong> ottenere
                  la sospensione del trattamento nei casi previsti dalla norma.
                </li>
                <li>
                  <strong>Diritto alla portabilità dei dati (art. 20 GDPR):</strong> ricevere in
                  formato strutturato, di uso comune e leggibile da dispositivo automatico i dati
                  trattati sulla base del contratto o del consenso, e trasmetterli a un altro
                  titolare.
                </li>
                <li>
                  <strong>Diritto di opposizione (art. 21 GDPR):</strong> opporsi in qualsiasi
                  momento al trattamento dei propri dati effettuato sulla base del legittimo
                  interesse del Titolare, nonché al trattamento per finalità di marketing diretto.
                </li>
                <li>
                  <strong>Diritto di revoca del consenso:</strong> revocare in qualsiasi momento il
                  consenso prestato per il trattamento di dati particolari o per finalità di
                  marketing, senza pregiudicare la liceità del trattamento anteriore alla revoca.
                </li>
                <li>
                  <strong>Diritto di non essere sottoposto a decisioni automatizzate (art. 22 GDPR):</strong>{' '}
                  non essere sottoposto a decisioni basate esclusivamente sul trattamento automatizzato
                  che producano effetti giuridici o che incidano significativamente sull'interessato.
                </li>
              </ul>
              <p>
                Per esercitare i propri diritti, l&apos;interessato può inviare una richiesta scritta
                all&apos;indirizzo <a href="mailto:privacy@backsoftware.it">privacy@backsoftware.it</a>,
                indicando il diritto che intende esercitare e allegando copia di un documento di
                identità valido. Il Titolare risponde entro <strong>30 giorni</strong> dal ricevimento,
                prorogabili di ulteriori 60 giorni in caso di complessità o elevato numero di
                richieste.
              </p>
              <div className="legal-callout">
                <p>
                  <strong>Strumenti self-service in piattaforma:</strong> gli utenti autenticati possono
                  dalla sezione <em>Impostazioni account</em> della dashboard (1) esportare i propri dati
                  in formato JSON (portabilità, art. 20), (2) revocare i consensi facoltativi
                  (comunicazioni e profilazione), (3) gestire le preferenze cookie e (4) richiedere la
                  cancellazione dell&apos;account (art. 17).
                </p>
              </div>
            </section>

            {/* 8. RECLAMO */}
            <section id="reclamo" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">8</span>
                Diritto di reclamo al Garante
              </h2>
              <p>
                L'interessato ha il diritto di proporre reclamo all'<strong>Autorità Garante per la
                Protezione dei Dati Personali</strong> (Garante Privacy), qualora ritenga che il
                trattamento dei propri dati personali violi il GDPR o la normativa nazionale
                applicabile.
              </p>
              <div className="legal-callout--sage legal-callout">
                <p>
                  <strong>Garante per la Protezione dei Dati Personali</strong><br />
                  Piazza Venezia, 11 – 00187 Roma<br />
                  Tel. +39 06 696771<br />
                  E-mail: <a href="mailto:garante@gpdp.it">garante@gpdp.it</a><br />
                  Sito web:{' '}
                  <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">
                    www.garanteprivacy.it
                  </a>
                </p>
              </div>
              <p>
                In alternativa al reclamo, l'interessato può proporre ricorso all'autorità
                di controllo dello Stato membro dell'UE in cui risiede o lavora, ovvero del luogo
                in cui si è verificata la violazione.
              </p>
            </section>

            {/* 9. COOKIE */}
            <section id="cookie" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">9</span>
                Cookie e tecnologie di tracciamento
              </h2>
              <p>
                La Piattaforma utilizza cookie e tecnologie di tracciamento per il funzionamento
                tecnico e, previo consenso, per finalità analitiche. Per informazioni complete
                sui cookie utilizzati, sulle relative finalità, sulla durata e su come gestire le
                proprie preferenze, si rinvia alla{' '}
                <Link to="/cookie">Cookie Policy</Link>.
              </p>
            </section>

            {/* 10. MINORI */}
            <section id="minori" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">10</span>
                Minori
              </h2>
              <p>
                La Piattaforma è destinata a utenti maggiorenni (18 anni compiuti). Il Titolare
                non raccoglie consapevolmente dati personali di minori di 18 anni. Qualora venisse
                a conoscenza di aver trattato dati di minori senza il necessario consenso parentale,
                provvederà alla loro immediata cancellazione. I genitori o tutori legali possono
                contattare il Titolare all'indirizzo{' '}
                <a href="mailto:privacy@backsoftware.it">privacy@backsoftware.it</a> per segnalare
                tali situazioni.
              </p>
            </section>

            {/* 11. AGGIORNAMENTI */}
            <section id="aggiornamenti" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">11</span>
                Aggiornamenti dell'informativa
              </h2>
              <p>
                Il Titolare si riserva di aggiornare la presente informativa per riflettere
                modifiche normative, tecnologiche o organizzative. La versione aggiornata sarà
                pubblicata sulla Piattaforma con l'indicazione della data di ultimo aggiornamento.
                Per modifiche sostanziali che interessino i diritti degli interessati, il Titolare
                invierà una comunicazione preventiva via e-mail agli Utenti registrati.
              </p>
              <p>
                Si invita a consultare periodicamente questa pagina. L'ultima versione è sempre
                disponibile all'indirizzo{' '}
                <Link to="/privacy">curaxe.it/privacy</Link>.
              </p>
              <div className="legal-callout">
                <p>
                  Consulta anche i{' '}
                  <Link to="/termini">Termini e Condizioni d'uso</Link> e la{' '}
                  <Link to="/cookie">Cookie Policy</Link>.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
