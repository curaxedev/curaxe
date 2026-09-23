/** Demo annunci «Offro assistenza»: allineati al parametro URL `citta` (hero). */

export const OPEN_POSITION_ROLE_IDS = ['nurse', 'oss', 'caregiver', 'assistant', 'facility'] as const
export type OpenPositionRoleId = (typeof OPEN_POSITION_ROLE_IDS)[number]

export type OpenPositionPoster = 'famiglia' | 'agenzia' | 'struttura'

/** Sintesi contrattuale per filtri home (modalità offro). */
export type OpenPositionContractBucket = 'hourly' | 'ccnl' | 'other'

/** Aspettative su spostamenti (opzionale, es. da annuncio datore). */
export type OpenPositionMobilityLevel = 'required' | 'preferred' | 'not_required'

export type OpenPositionMobility = {
  driverLicense: OpenPositionMobilityLevel
  ownCar: OpenPositionMobilityLevel
  maxCommuteKm?: number
  note?: string
}

export type MockOpenPosition = {
  id: string
  category: OpenPositionRoleId
  posterType: OpenPositionPoster
  posterDisplayName: string
  contractBucket: OpenPositionContractBucket
  title: string
  excerpt: string
  locationLabel: string
  rateLabel: string
  scheduleLabel: string
  urgency?: 'urgente'
  badge?: string
  descriptionIntro: string
  duties: string[]
  requirements: string[]
  mobility?: OpenPositionMobility
}

export const OPEN_POSITION_ROLE_LABELS: Record<OpenPositionRoleId, string> = {
  nurse: 'Infermieri',
  oss: 'OSS',
  caregiver: 'Badanti',
  assistant: 'Assistenti familiari',
  facility: 'Strutture',
}

export const MOCK_OPEN_POSITIONS: MockOpenPosition[] = [
  {
    id: 'op-cg-1',
    category: 'caregiver',
    posterType: 'famiglia',
    posterDisplayName: 'Famiglia M. · Milano',
    contractBucket: 'other',
    title: 'Badante convivente — signora con Alzheimer lieve',
    excerpt:
      'Cerchiamo figura empatica per convivenza lun–sab, gestione farmaci e accompagnamento alle visite. Casa ampia, zona servita dai mezzi.',
    locationLabel: 'Milano, zona Bicocca',
    rateLabel: '€1.480 – 1.720 / mese',
    scheduleLabel: 'Convivenza, preferenza lun–sab',
    urgency: 'urgente',
    badge: 'Urgente',
    descriptionIntro:
      'La signora è autosufficiente nelle ADL base ma beneficia di supervisione costante e stimoli cognitivi. Ambiente familiare, due adulti in casa oltre alla persona assistita.',
    duties: [
      'Assistenza nella giornata e compagnia serale',
      'Somministrazione farmaci secondo schema concordato con il medico curante',
      'Accompagnamento a visite e passeggiate',
      'Collaborazione con badante uscente per passaggio di consegne',
    ],
    requirements: [
      'Esperienza documentabile con demenze lievi',
      'Italiano fluente e referenze verificabili',
      'Disponibilità a convivenza con giorno di riposo concordato',
    ],
  },
  {
    id: 'op-cg-2',
    category: 'caregiver',
    posterType: 'famiglia',
    posterDisplayName: 'Famiglia R. · Monza',
    contractBucket: 'hourly',
    title: 'Assistenza notturna (3 notti / settimana)',
    excerpt:
      'Serve presenza notturna per signore con deambulazione ridotta: supporto ai risvegli, sicurezza in bagno, nessuna medicazione invasiva.',
    locationLabel: 'Monza e Brianza, Cesano Maderno',
    rateLabel: '€14 – 16 / ora',
    scheduleLabel: 'Mar, gio, dom 22:00–07:00',
    descriptionIntro:
      'Il familiare principale è in casa di giorno; la notte serve continuità e rapidità di intervento in caso di caduta o disagio.',
    duties: [
      'Vigilanza notturna e supporto ai risvegli',
      'Aiuto ai trasferimenti letto–bagno con ausili già presenti',
      'Annotazione di eventi rilevanti per il medico',
    ],
    requirements: [
      'Patience e capacità di lavorare in team con la famiglia',
      'Esperienza con anziani a mobilità ridotta',
    ],
  },
  {
    id: 'op-cg-3',
    category: 'caregiver',
    posterType: 'famiglia',
    posterDisplayName: 'Famiglia V. · Bologna',
    contractBucket: 'hourly',
    title: 'Badante non convivente — weekend',
    excerpt:
      'Weekend ricco di visite parentali: serve continuità per pasti, igiene e uscite brevi nel quartiere. Automunita preferita.',
    locationLabel: 'Bologna, Corticella',
    rateLabel: '€13 – 15 / ora',
    scheduleLabel: 'Sabato e domenica 09:00–19:00',
    badge: 'Weekend',
    descriptionIntro:
      'Coppia di anziani in appartamento al secondo piano senza ascensore; gradita attenzione alla sicurezza in cucina.',
    duties: [
      'Preparazione pasti e piccole faccende domestiche legate alla persona',
      'Accompagnamento a messa o passeggiate brevi',
      'Coordinamento con figli che arrivano nel pomeriggio',
    ],
    requirements: [
      'Disponibilità stabile al weekend per almeno 3 mesi',
      'Automunita o domicilio in zona Corticella / Bologna nord',
    ],
    mobility: {
      driverLicense: 'not_required',
      ownCar: 'preferred',
      note: 'Secondo piano senza ascensore: valutiamo anche profili senza auto se residenti in zona.',
    },
  },
  {
    id: 'op-as-1',
    category: 'assistant',
    posterType: 'famiglia',
    posterDisplayName: 'Famiglia L. · Torino',
    contractBucket: 'hourly',
    title: 'Assistente familiare part-time mattino',
    excerpt:
      'Quattro ore al mattino per supporto ADL, spesa e compagnia. Contratto regolare con INPS / contributi secondo normativa vigente.',
    locationLabel: 'Torino, Lingotto',
    rateLabel: '€12 – 14 / ora',
    scheduleLabel: 'Lun–ven 08:00–14:00',
    descriptionIntro:
      'Persona sola in buone condizioni generali ma con lenta ripresa post intervento; obiettivo è mantenere autonomia e socialità.',
    duties: [
      'Supporto nelle ADL del mattino e preparazione colazione',
      'Spesa leggera e piccole commissioni nel quartiere',
      'Segnalazione tempestiva a parenti in caso di malesseri',
    ],
    requirements: [
      'Titolo o corso assistente familiare preferito',
      'Referenze da precedenti impieghi domestici',
    ],
  },
  {
    id: 'op-as-2',
    category: 'assistant',
    posterType: 'famiglia',
    posterDisplayName: 'Famiglia C. · Firenze',
    contractBucket: 'other',
    title: 'Figura di sostegno per coppia anziana',
    excerpt:
      'Coppia in appartamento: compito principale compagnia, piccoli aiuti domestici e monitoraggio pressione / glicemia (no iniezioni).',
    locationLabel: 'Firenze, Campo di Marte',
    rateLabel: 'Negoziabile',
    scheduleLabel: '4 giorni / settimana diurna',
    descriptionIntro:
      'I coniugi sono autosufficienti ma apprezzano presenza fissa per sicurezza e qualità della vita. Ambiente calmo, no animali.',
    duties: [
      'Compagnia e stimoli sociali (lettura, passeggiate)',
      'Aiuto leggero in cucina e riordino',
      'Supporto nella gestione di appuntamenti e promemoria terapeutici',
    ],
    requirements: [
      'Empatia e ottime capacità relazionali con due persone contemporaneamente',
      'Disponibilità a orario diurno flessibile tra lun e ven',
    ],
  },
  {
    id: 'op-nurse-1',
    category: 'nurse',
    posterType: 'agenzia',
    posterDisplayName: 'Cooperativa Domus Salute ONLUS',
    contractBucket: 'hourly',
    title: 'Infermiere / a — medicazioni e monitoraggio domiciliare',
    excerpt:
      'Cooperativa seleziona IP per ADI: medicazioni semplici, educazione alla terapia, coordinamento con MMG. Flusso turni su app.',
    locationLabel: 'Roma, Prati',
    rateLabel: '€22 – 26 / ora',
    scheduleLabel: 'Turni da concordare',
    badge: 'Cooperativa',
    descriptionIntro:
      'Il servizio copre nuclei familiari in zona Prati / Mazzini; strumentazione aziendale e DPI forniti.',
    duties: [
      'Esecuzione delle prestazioni infermieristiche previste dal piano assistenziale',
      'Registrazione su cartella digitale e handover con OSS',
      'Supporto educativo ai caregiver familiari',
    ],
    requirements: [
      'Laurea in infermieristica e iscrizione OPI',
      'Patente B e disponibilità a turni spezzati',
      'Esperienza domiciliare di almeno 12 mesi',
    ],
  },
  {
    id: 'op-oss-1',
    category: 'oss',
    posterType: 'struttura',
    posterDisplayName: 'RSA San Giuseppe',
    contractBucket: 'ccnl',
    title: 'OSS — RSA turno centrale',
    excerpt:
      'Struttura accreditata cerca OSS per reparto geriatrico: team multidisciplinare, formazione interna su ausili e movimentazione.',
    locationLabel: 'Genova, Foce',
    rateLabel: 'CCNL cooperativa',
    scheduleLabel: 'Turno 14:00–22:00',
    badge: 'RSA',
    descriptionIntro:
      'RSA medio–grande con hospice interno; forte attenzione ergonomia e sicurezza degli spostamenti.',
    duties: [
      'Assistenza igienico–personale e nutrizionale secondo piani individualizzati',
      'Supporto alla degenza in hospice su turnazione condivisa',
      'Collaborazione con infermieri e animazione',
    ],
    requirements: [
      'Qualifica OSS valida e corso aggiornamento BLSD',
      'Esperienza RSA o struttura equivalente preferita',
    ],
  },
  {
    id: 'op-oss-2',
    category: 'oss',
    posterType: 'agenzia',
    posterDisplayName: 'ADI Nord Milano S.r.l.',
    contractBucket: 'hourly',
    title: 'OSS — supporto ADI notte',
    excerpt:
      'Agenzia partner di enti pubblici ricerca OSS per notti in équipe: interventi domiciliari brevi, continuità assistenziale.',
    locationLabel: 'Milano, zona Niguarda',
    rateLabel: '€15 – 18 / ora',
    scheduleLabel: '2 notti / settimana',
    descriptionIntro:
      'Turnazione con infermiere di riferimento; mezzi aziendali per spostamenti intra-quartiere.',
    duties: [
      'Interventi notturni programmati e urgenze leggere',
      'Supporto familiari in assenza del coordinatore',
      'Compilazione verbali di visita',
    ],
    requirements: [
      'Qualifica OSS e disponibilità notturna documentata',
      'Residenza in area Nord Milano o raggiungibilità rapida',
    ],
  },
  {
    id: 'op-ag-1',
    category: 'caregiver',
    posterType: 'agenzia',
    posterDisplayName: 'HR Family Care Lombardia',
    contractBucket: 'ccnl',
    title: 'Selezione badanti e caregiver — Nord Italia',
    excerpt:
      'Agenzia autorizzata: inserimenti continuativi presso famiglie e strutture partner. Percorsi di formazione e tutoraggio sul campo.',
    locationLabel: 'Milano e hinterland',
    rateLabel: 'Secondo CCNL / contratto',
    scheduleLabel: 'Inserimento continuo',
    badge: 'Agenzia',
    descriptionIntro:
      'Selezione per profili con esperienza domiciliare; priorità a chi accetta trasferte brevi in Brianza e Bergamo.',
    duties: [
      'Valutazione bisogni insieme al coordinatore di zona',
      'Inserimento presso famiglia o struttura con periodo di affiancamento',
      'Report bisettimanale al referente HR',
    ],
    requirements: [
      'Esperienza nel socio–sanitario domiciliare',
      'Disponibilità a contratti a tempo determinato con proroghe',
      'Automunita preferita',
    ],
  },
  {
    id: 'op-fac-1',
    category: 'facility',
    posterType: 'struttura',
    posterDisplayName: 'Clinica privata convenzionata',
    contractBucket: 'ccnl',
    title: 'Turni OSS — reparto geriatrico',
    excerpt:
      'Clinica di medie dimensioni: reparto degenza breve con alto turnover; richiesta rapidità nelle procedure di accettazione dimissioni.',
    locationLabel: 'Padova, sud città',
    rateLabel: 'CCNL sanità privata',
    scheduleLabel: 'Turni spezzati / full-time',
    badge: 'Struttura',
    descriptionIntro:
      'Ambiente dinamico con forte integrazione tra OSS, infermieri e amministrativo.',
    duties: [
      'Assistenza ai pazienti nelle degenze di media e lunga durata',
      'Supporto logistica letti e rifornimento materiali',
      'Collaborazione con RSA convenzionata per passaggi di pazienti',
    ],
    requirements: [
      'Qualifica OSS e esperienza in struttura accreditata',
      'Disponibilità a turni spezzati e festivi su rotazione',
    ],
  },
  {
    id: 'op-cg-4',
    category: 'caregiver',
    posterType: 'famiglia',
    posterDisplayName: 'Famiglia D. · Roma',
    contractBucket: 'hourly',
    title: 'Caregiver pomeriggio — ragazzo con disabilità',
    excerpt:
      'Ragazzo adulto in carrozzina: accompagnamento a laboratori, supporto pasto serale e gioco. Genitori lavorano fuori casa.',
    locationLabel: 'Roma, Monteverde',
    rateLabel: '€11 – 13 / ora',
    scheduleLabel: 'Lun–ven 15:00–20:00',
    descriptionIntro:
      'Cercasi figura stabile con esperienza disability care; casa accessibile e mezzi adattati.',
    duties: [
      'Accompagnamento a attività esterne e trasporto in auto adattata',
      'Supporto pasto e igiene con ausili',
      'Comunicazione con genitori tramite diario condiviso',
    ],
    requirements: [
      'Esperienza con disabilità motorie',
      'Patente e uso sicuro di ausili per sollevamento',
    ],
  },
  {
    id: 'op-nurse-2',
    category: 'nurse',
    posterType: 'struttura',
    posterDisplayName: 'Hospice comunità Colli',
    contractBucket: 'ccnl',
    title: 'Infermiere notturno — hospice',
    excerpt:
      'Piccola struttura: turni notte con équipe ridotta; focus sintomi, comfort e supporto ai familiari presenti.',
    locationLabel: 'Bologna, Colli',
    rateLabel: 'Inquadramento CCNL',
    scheduleLabel: 'Turni notte',
    badge: 'Hospice',
    descriptionIntro:
      'Hospice accreditato con approccio multidisciplinare; formazione specifica offerta in ingresso.',
    duties: [
      'Gestione terapia sintomatica secondo protocolli',
      'Supporto emotivo a pazienti e familiari',
      'Coordinamento con medici e psicologi',
    ],
    requirements: [
      'Esperienza in cure palliative o forte motivazione documentata',
      'Disponibilità a notti e weekend su turnazione',
    ],
  },
  {
    id: 'op-oss-3',
    category: 'oss',
    posterType: 'agenzia',
    posterDisplayName: 'Human Care Solutions Italia',
    contractBucket: 'other',
    title: 'OSS — sostituzioni estive in struttura',
    excerpt:
      'Pool estivo per coperture ferie in RSA e CDI partner in Veneto. Contratti a settimane con possibilità di proroga.',
    locationLabel: 'Venezia Mestre',
    rateLabel: '€14 – 17 / ora',
    scheduleLabel: 'Turni centrali / mattina',
    descriptionIntro:
      'Agenzia interinale specializzata socio–sanitario; onboarding rapido e uniforme aziendale.',
    duties: [
      'Copertura turni standard RSA secondo planning',
      'Adempimento procedure interne di sicurezza',
      'Handover con personale di reparto',
    ],
    requirements: [
      'Qualifica OSS valida',
      'Disponibilità minima 4 settimane consecutive in estate',
    ],
    mobility: {
      driverLicense: 'preferred',
      ownCar: 'preferred',
      maxCommuteKm: 45,
      note: 'Pool su strutture in provincia di Venezia e Padova: spesso serve spostarsi in auto tra sedi.',
    },
  },
]

/** Filtro «datore» in home: famiglie vs agenzie e strutture (niente chip da modalità profilo). */
export type OpenPositionPosterFilter = 'all' | 'famiglia' | 'organizzazione'

const CURATED_DEMO_IDS = [
  'op-cg-1',
  'op-cg-2',
  'op-cg-3',
  'op-as-1',
  'op-as-2',
  'op-nurse-1',
  'op-nurse-2',
  'op-oss-1',
  'op-oss-2',
  'op-oss-3',
  'op-ag-1',
  'op-fac-1',
  'op-cg-4',
] as const

export const OPEN_POSITION_CONTRACT_FILTER_IDS = ['hourly', 'ccnl', 'other'] as const
export type OpenPositionContractFilterId = (typeof OPEN_POSITION_CONTRACT_FILTER_IDS)[number]

export const OPEN_POSITION_CONTRACT_FILTER_LABELS: Record<OpenPositionContractFilterId, string> = {
  hourly: 'Orario / part-time',
  ccnl: 'CCNL / dipendente',
  other: 'Convivenza, pool o negoziabile',
}

export function locationMatchesCity(cityQuery: string, locationLabel: string): boolean {
  const q = cityQuery.trim().toLowerCase()
  if (!q) return false
  const loc = locationLabel.toLowerCase()
  if (loc.includes(q)) return true
  const firstTok = q.split(/[\s,]+/)[0] ?? q
  return firstTok.length >= 2 && loc.includes(firstTok)
}

export function getOpenPositionById(id: string): MockOpenPosition | undefined {
  return MOCK_OPEN_POSITIONS.find((row) => row.id === id)
}

/** Schede correlate in fondo al dettaglio: con `citta` in query filtra la demo geografica, altrimenti stessa figura. */
export function listNearbyOpenPositions(job: MockOpenPosition, cityQuery: string, limit = 4): MockOpenPosition[] {
  const q = cityQuery.trim()
  const others = MOCK_OPEN_POSITIONS.filter((row) => row.id !== job.id)
  if (q) {
    const geo = others.filter((row) => locationMatchesCity(q, row.locationLabel))
    if (geo.length) return geo.slice(0, limit)
  }
  const sameCat = others.filter((row) => row.category === job.category)
  const rest = others.filter((row) => row.category !== job.category)
  const ordered = [...sameCat, ...rest]
  const seen = new Set<string>()
  const out: MockOpenPosition[] = []
  for (const row of ordered) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
    if (out.length >= limit) break
  }
  return out
}

export type OpenPositionFilters = {
  cityQuery: string
  roleId: OpenPositionRoleId | 'all'
  poster: OpenPositionPosterFilter
  contract: 'all' | OpenPositionContractBucket
}

function posterMatches(poster: OpenPositionFilters['poster'], row: MockOpenPosition): boolean {
  if (poster === 'all') return true
  if (poster === 'famiglia') return row.posterType === 'famiglia'
  return row.posterType === 'agenzia' || row.posterType === 'struttura'
}

function contractMatches(contract: OpenPositionFilters['contract'], row: MockOpenPosition): boolean {
  if (contract === 'all') return true
  return row.contractBucket === contract
}

function roleMatches(roleId: OpenPositionFilters['roleId'], row: MockOpenPosition): boolean {
  if (roleId === 'all') return true
  return row.category === roleId
}

/** Senza città: sottoinsieme curato multi-città. Con città: match geografico. */
export function listOpenPositionsForHome(filters: OpenPositionFilters): MockOpenPosition[] {
  const trimmed = filters.cityQuery.trim()
  let pool: MockOpenPosition[]
  if (!trimmed) {
    pool = MOCK_OPEN_POSITIONS.filter((row) => (CURATED_DEMO_IDS as readonly string[]).includes(row.id))
  } else {
    pool = MOCK_OPEN_POSITIONS.filter((row) => locationMatchesCity(trimmed, row.locationLabel))
  }
  return pool.filter(
    (row) => roleMatches(filters.roleId, row) && posterMatches(filters.poster, row) && contractMatches(filters.contract, row)
  )
}

export function posterLabel(type: OpenPositionPoster): string {
  switch (type) {
    case 'famiglia':
      return 'Famiglia'
    case 'agenzia':
      return 'Agenzia / cooperativa'
    case 'struttura':
      return 'Struttura'
    default: {
      const _x: never = type
      return _x
    }
  }
}
