import { Link } from 'react-router-dom'
import { SiteShell } from '../../components/SiteShell'
import './legal-pages.css'

const LAST_UPDATE = '12 maggio 2026'

const sections = [
  { id: 'definizioni', label: 'Definizioni' },
  { id: 'natura-servizio', label: 'Natura del servizio' },
  { id: 'registrazione', label: 'Registrazione' },
  { id: 'obblighi-utente', label: 'Obblighi utenti' },
  { id: 'verifica-profili', label: 'Verifica profili' },
  { id: 'pagamenti', label: 'Pagamenti' },
  { id: 'responsabilita', label: 'Responsabilità' },
  { id: 'divieti', label: 'Divieti' },
  { id: 'proprieta-intellettuale', label: 'Proprietà intellettuale' },
  { id: 'modifiche', label: 'Modifiche T&C' },
  { id: 'legge-applicabile', label: 'Legge e foro' },
  { id: 'contatti', label: 'Contatti' },
]

export function TerminiPage() {
  return (
    <SiteShell>
      <main className="legal-page">
        <div className="legal-hero">
          <div className="legal-hero__inner">
            <span className="legal-hero__label">Documento legale</span>
            <h1 className="legal-hero__title">Termini e Condizioni d'uso</h1>
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
                I presenti Termini e Condizioni d'uso (<strong>«T&C»</strong>) regolano il rapporto tra{' '}
                <strong>BackSoftware</strong> (di seguito «Gestore» o «Piattaforma») e
                chiunque utilizzi il sito <strong>curaxe.it</strong> e i relativi
                servizi. La Piattaforma è un <strong>marketplace di intermediazione</strong>: non è
                un'agenzia di lavoro, non fornisce direttamente servizi di cura né assume i professionisti
                iscritti. Leggere attentamente prima di utilizzare il servizio.
              </p>
            </div>

            {/* 1. DEFINIZIONI */}
            <section id="definizioni" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">1</span>
                Definizioni
              </h2>
              <p>
                Ai fini dei presenti T&C, si intende per:
              </p>
              <ul>
                <li>
                  <strong>«Piattaforma»</strong>: il sito web e i servizi digitali raggiungibili
                  all'indirizzo curaxe.it, gestiti da BackSoftware.
                  Andreoli.
                </li>
                <li>
                  <strong>«Gestore»</strong>: BackSoftware, titolare e gestore
                  della Piattaforma.
                </li>
                <li>
                  <strong>«Utente»</strong>: qualsiasi persona fisica o giuridica che accede alla
                  Piattaforma, indipendentemente dalla creazione di un account.
                </li>
                <li>
                  <strong>«Committente»</strong>: l'Utente (famiglia, assistito, struttura) che tramite
                  la Piattaforma cerca figure professionali di assistenza socio-sanitaria.
                </li>
                <li>
                  <strong>«Professionista»</strong>: l'Utente (caregiver, badante, OSS, infermiere,
                  fisioterapista, agenzia di assistenza, struttura residenziale) che tramite la
                  Piattaforma offre i propri servizi o promuove la propria attività.
                </li>
                <li>
                  <strong>«Account»</strong>: il profilo personale o aziendale creato dall'Utente
                  dopo registrazione.
                </li>
                <li>
                  <strong>«Servizi»</strong>: tutte le funzionalità messe a disposizione dalla
                  Piattaforma, incluse ricerca, pubblicazione profili, gestione candidature e
                  strumenti di comunicazione.
                </li>
                <li>
                  <strong>«Contenuto»</strong>: qualsiasi testo, immagine, documento o dato
                  inserito dall'Utente sulla Piattaforma.
                </li>
              </ul>
            </section>

            {/* 2. NATURA DEL SERVIZIO */}
            <section id="natura-servizio" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">2</span>
                Natura del servizio
              </h2>
              <p>
                La Piattaforma ha natura di <strong>marketplace di intermediazione</strong>: mette in
                contatto Committenti e Professionisti del settore socio-sanitario, facilitando
                l'incontro tra domanda e offerta di assistenza. Il Gestore <strong>non è parte</strong>{' '}
                del rapporto contrattuale che si instaura tra Committente e Professionista, né agisce
                in qualità di agenzia per il lavoro ai sensi del D.Lgs. 276/2003, di fornitore diretto
                di prestazioni sanitarie o socio-assistenziali, né di datore di lavoro dei
                Professionisti iscritti.
              </p>
              <p>
                Qualsiasi accordo relativo a compensi, orari, mansioni, tipologia contrattuale e
                modalità di svolgimento del rapporto di lavoro o di prestazione è concluso
                direttamente e autonomamente tra Committente e Professionista, al di fuori della
                Piattaforma e sotto la responsabilità esclusiva delle parti coinvolte.
              </p>
              <div className="legal-callout--sage legal-callout">
                <p>
                  Il Gestore non garantisce la qualità, la sicurezza, la legalità né l'idoneità
                  professionale delle figure presenti sulla Piattaforma. I Committenti sono
                  responsabili della due diligence che ritengono opportuna prima di instaurare
                  qualsiasi rapporto con un Professionista.
                </p>
              </div>
            </section>

            {/* 3. REGISTRAZIONE */}
            <section id="registrazione" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">3</span>
                Registrazione e requisiti
              </h2>
              <p>
                La registrazione è aperta a persone fisiche che abbiano compiuto{' '}
                <strong>18 anni</strong> e a soggetti giuridici (associazioni, cooperative,
                strutture residenziali) debitamente costituiti e con sede in Italia, salvo diversa
                indicazione.
              </p>
              <p>All'atto della registrazione l'Utente si impegna a:</p>
              <ul>
                <li>
                  Fornire dati personali <strong>veritieri, aggiornati e completi</strong>, inclusi
                  nome, cognome, indirizzo e-mail valido, e ogni altro dato richiesto dal modulo di
                  iscrizione.
                </li>
                <li>
                  Mantenere le credenziali di accesso riservate e non condividerle con terzi;
                  notificare immediatamente al Gestore qualsiasi accesso non autorizzato al proprio
                  Account.
                </li>
                <li>
                  Aggiornare i propri dati in caso di variazioni significative (trasferimento, cambio
                  di qualifica professionale, aggiornamento di documenti in scadenza, ecc.).
                </li>
                <li>
                  Non creare più di un Account personale. Gli account multipli possono essere rimossi
                  dal Gestore senza preavviso.
                </li>
              </ul>
              <p>
                Il Gestore si riserva di sospendere o eliminare l'Account in caso di dati falsi,
                incompleti o in violazione dei presenti T&C.
              </p>
            </section>

            {/* 4. OBBLIGHI UTENTE */}
            <section id="obblighi-utente" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">4</span>
                Obblighi degli utenti
              </h2>
              <p>
                Ogni Utente è responsabile di tutti i Contenuti che pubblica o carica sulla
                Piattaforma e si impegna a:
              </p>
              <ul>
                <li>
                  Fornire esclusivamente informazioni veritiere e aggiornate nel proprio profilo,
                  incluse qualifiche, titoli di studio, esperienze lavorative e documenti
                  professionali.
                </li>
                <li>
                  Non pubblicare, condividere o trasmettere Contenuti che siano illeciti,
                  discriminatori, diffamatori, osceni, fraudolenti o lesivi di diritti di terzi.
                </li>
                <li>
                  Rispettare la normativa vigente in materia di privacy (GDPR – Reg. UE 2016/679 e
                  D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018) nel trattamento dei dati
                  personali di altri Utenti con cui entrano in contatto tramite la Piattaforma.
                </li>
                <li>
                  Non utilizzare la Piattaforma per attività di spam, phishing, raccolta massiva di
                  dati o scopi commerciali non autorizzati dal Gestore.
                </li>
                <li>
                  Rispettare le norme lavoristiche e fiscali applicabili ai rapporti instaurati
                  tramite la Piattaforma (es. contratti collettivi nazionali per il lavoro domestico,
                  obblighi previdenziali INPS, norme sull'iscrizione all'Albo professionale ove
                  richiesta).
                </li>
              </ul>
            </section>

            {/* 5. VERIFICA PROFILI */}
            <section id="verifica-profili" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">5</span>
                Verifica profili e documenti
              </h2>
              <p>
                Il Gestore può richiedere ai Professionisti la <strong>caricamento di documenti</strong>{' '}
                (es. diploma OSS, attestati di formazione, copia documento d'identità) al fine di
                arricchire il profilo e incrementarne la credibilità. Tali documenti sono trattati
                secondo la{' '}
                <Link to="/privacy">Informativa Privacy</Link>.
              </p>
              <p>
                Eventuali <strong>badge di verifica</strong> visibili sul profilo attestano che la
                Piattaforma ha ricevuto e controllato formalmente i documenti dichiarati; non
                costituiscono una certificazione di idoneità professionale né una garanzia di
                affidabilità della persona.
              </p>
              <p>
                La dichiarazione relativa all'assenza di condanne ostative
                (<strong>casellario giudiziale</strong>) è resa dall'Utente sotto la propria
                responsabilità ed è un dato di natura giudiziaria ai sensi dell'art. 10 GDPR.
                Il Gestore non effettua verifiche autonome presso il casellario giudiziale né dispone
                di poteri di accesso a tale banca dati.
              </p>
            </section>

            {/* 6. PAGAMENTI */}
            <section id="pagamenti" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">6</span>
                Pagamenti e commissioni
              </h2>
              <p>
                I pagamenti per l'acquisto di abbonamenti, pacchetti di visibilità o altri servizi
                a pagamento sono processati tramite <strong>Stripe Payments Europe, Ltd.</strong>,
                fornitore di servizi di pagamento certificato PCI-DSS. Il Gestore non memorizza né
                tratta direttamente dati delle carte di pagamento.
              </p>
              <p>
                Le condizioni economiche dei piani a pagamento (prezzi, durata, rinnovo automatico,
                politica di rimborso) sono indicate nella sezione dedicata della Piattaforma e
                possono essere aggiornate previo avviso con congruo anticipo.
              </p>
              <p>
                In caso di controversia relativa a un addebito, l'Utente deve contattare il Gestore
                via e-mail prima di avviare qualsiasi procedura di chargeback presso la propria
                banca o emittente della carta.
              </p>
            </section>

            {/* 7. RESPONSABILITÀ */}
            <section id="responsabilita" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">7</span>
                Limitazione di responsabilità
              </h2>
              <p>
                Nei limiti consentiti dalla legge applicabile, il Gestore non è responsabile per:
              </p>
              <ul>
                <li>
                  La veridicità, completezza, aggiornamento o idoneità dei Contenuti inseriti
                  dagli Utenti.
                </li>
                <li>
                  Danni diretti o indiretti derivanti dall'instaurazione, svolgimento o cessazione
                  di rapporti tra Committenti e Professionisti.
                </li>
                <li>
                  Interruzioni temporanee del servizio per manutenzione, aggiornamenti tecnici o
                  eventi di forza maggiore.
                </li>
                <li>
                  Perdite di dati o accessi non autorizzati derivanti da comportamenti dell'Utente
                  (es. condivisione delle credenziali, utilizzo su dispositivi non protetti).
                </li>
                <li>
                  Qualsiasi infortunio, danno alla salute o alla persona occorso nell'ambito di
                  rapporti instaurati tramite la Piattaforma.
                </li>
              </ul>
              <p>
                La responsabilità del Gestore, ove riconosciuta in sede giudiziale, è in ogni caso
                limitata al corrispettivo effettivamente pagato dall'Utente alla Piattaforma nei
                dodici mesi precedenti l'evento dannoso, o alla somma di 100 € se nessun pagamento
                è avvenuto.
              </p>
            </section>

            {/* 8. DIVIETI */}
            <section id="divieti" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">8</span>
                Divieti e utilizzi non consentiti
              </h2>
              <p>È espressamente vietato:</p>
              <ul>
                <li>
                  Inserire dati personali falsi o di terzi senza il loro consenso, o impersonare
                  un'altra persona o organizzazione.
                </li>
                <li>
                  Caricare documenti falsificati o alterati (es. diplomi contraffatti, attestati
                  falsi, documenti di identità di terzi).
                </li>
                <li>
                  Pubblicare annunci o profili aventi ad oggetto attività illecite, incluse
                  prestazioni sanitarie riservate a professionisti abilitati ma esercitate senza
                  titolo.
                </li>
                <li>
                  Effettuare scraping, crawling automatizzato o raccolta massiva di dati dalla
                  Piattaforma, inclusi dati personali di altri Utenti, senza preventiva
                  autorizzazione scritta del Gestore.
                </li>
                <li>
                  Utilizzare la Piattaforma per distribuire malware, virus o qualsiasi codice
                  malevolo, o per tentare accessi non autorizzati ai sistemi del Gestore.
                </li>
                <li>
                  Trasmettere messaggi non richiesti (spam) o comunicazioni commerciali a Utenti
                  che non abbiano prestato consenso.
                </li>
              </ul>
              <p>
                La violazione dei presenti divieti può comportare la sospensione immediata
                dell'Account, l'eventuale segnalazione alle autorità competenti e l'avvio di
                azioni legali per il risarcimento dei danni subiti.
              </p>
            </section>

            {/* 9. PROPRIETÀ INTELLETTUALE */}
            <section id="proprieta-intellettuale" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">9</span>
                Proprietà intellettuale
              </h2>
              <p>
                Tutti i contenuti della Piattaforma di proprietà del Gestore — inclusi marchi,
                loghi, design, testi, grafica, codice sorgente, layout e architettura
                dell'informazione — sono tutelati dalle norme sul diritto d'autore (L. 633/1941 e
                successive modifiche), sui marchi e sulla proprietà intellettuale in genere.
                È vietata qualsiasi riproduzione, distribuzione o utilizzo non autorizzato.
              </p>
              <p>
                Caricando Contenuti sulla Piattaforma, l'Utente concede al Gestore una licenza
                non esclusiva, mondiale, gratuita e sublicenziabile per utilizzare, riprodurre,
                adattare e distribuire tali Contenuti nella misura necessaria all'erogazione dei
                Servizi (es. visualizzazione del profilo, miniatura della foto, indicizzazione
                interna). Tale licenza cessa automaticamente alla cancellazione del Contenuto o
                dell'Account, fatti salvi gli obblighi di conservazione previsti dalla legge.
              </p>
            </section>

            {/* 10. MODIFICHE T&C */}
            <section id="modifiche" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">10</span>
                Modifiche ai Termini e Condizioni
              </h2>
              <p>
                Il Gestore si riserva il diritto di modificare i presenti T&C in qualsiasi momento,
                a propria discrezione. Le modifiche saranno comunicate agli Utenti registrati via
                e-mail e/o tramite avviso visibile sulla Piattaforma, con un preavviso di almeno{' '}
                <strong>15 giorni</strong> prima dell'entrata in vigore, salvo modifiche urgenti
                richieste da disposizioni normative o da ragioni di sicurezza, che entreranno in
                vigore immediatamente.
              </p>
              <p>
                Continuando a utilizzare la Piattaforma dopo la data di entrata in vigore delle
                modifiche, l'Utente accetta i T&C aggiornati. In caso di disaccordo, l'Utente ha
                il diritto di recedere cancellando il proprio Account prima della data di entrata
                in vigore.
              </p>
            </section>

            {/* 11. LEGGE APPLICABILE */}
            <section id="legge-applicabile" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">11</span>
                Legge applicabile e foro competente
              </h2>
              <p>
                I presenti T&C sono disciplinati dalla <strong>legge italiana</strong>. Per qualsiasi
                controversia relativa all'interpretazione, validità, esecuzione o risoluzione dei
                presenti T&C, le parti si impegnano a ricercare in buona fede una soluzione
                amichevole.
              </p>
              <p>
                In caso di mancato accordo, le controversie saranno devolute in via esclusiva
                alla <strong>competenza del Tribunale del luogo di residenza o domicilio
                dell'Utente-consumatore</strong>, ai sensi dell'art. 66-bis del D.Lgs. 206/2005
                (Codice del Consumo). Nei rapporti tra soggetti professionali/imprenditoriali,
                il foro esclusivo è quello di <strong>Milano</strong>, salvo diverso accordo scritto.
              </p>
              <p>
                Per la risoluzione alternativa delle controversie (ODR), l'Utente consumatore
                residente nell'UE può accedere alla piattaforma europea ODR disponibile all'indirizzo{' '}
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
                  ec.europa.eu/consumers/odr
                </a>.
              </p>
            </section>

            {/* 12. CONTATTI */}
            <section id="contatti" className="legal-section">
              <h2 className="legal-section__title">
                <span className="legal-section__num">12</span>
                Contatti
              </h2>
              <p>
                Per qualsiasi richiesta relativa ai presenti T&C, è possibile contattare il Gestore
                ai seguenti recapiti:
              </p>
              <ul>
                <li>
                  <strong>Titolare:</strong> BackSoftware
                </li>
                <li>
                  <strong>E-mail:</strong>{' '}
                  <a href="mailto:privacy@backsoftware.it">privacy@backsoftware.it</a>
                </li>
                <li>
                  <strong>Sito:</strong>{' '}
                  <a href="https://curaxe.it" target="_blank" rel="noopener noreferrer">
                    curaxe.it
                  </a>
                </li>
              </ul>
              <div className="legal-callout">
                <p>
                  Consulta anche la nostra{' '}
                  <Link to="/privacy">Informativa Privacy</Link> e la{' '}
                  <Link to="/cookie">Cookie Policy</Link> per informazioni complete sul
                  trattamento dei tuoi dati personali.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
