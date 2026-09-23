import type { HomeProfileCarouselCard, HomeProfileWeekAvailability } from '../components/HomeProfileCarousel'
import type { DirectoryGeoMatch, DirectoryProfileSummary, ListingIntent } from './directoryTypes'
import { resolvePublicProfileById } from './professionalProfilePublicSync'

/**
 * Stock headshots in `public/images/profile-mock/` (filenames contain spaces — encode in URL).
 * As of May 2026: 7 PNG screenshots in that folder.
 */
const PROFILE_MOCK_FILENAMES = [
  'Screenshot 2026-05-11 alle 23.37.47.png',
  'Screenshot 2026-05-11 alle 23.38.13.png',
  'Screenshot 2026-05-11 alle 23.38.33.png',
  'Screenshot 2026-05-11 alle 23.39.04.png',
  'Screenshot 2026-05-11 alle 23.39.24.png',
  'Screenshot 2026-05-11 alle 23.40.01.png',
  'Screenshot 2026-05-11 alle 23.40.30.png',
] as const

const AGENCY_GRAPHIC = '/images/profiles/profile-agency.svg'
const FACILITY_GRAPHIC = '/images/profiles/profile-facility.svg'

function profileMockImage(slot: number): string {
  const idx = (slot - 1) % PROFILE_MOCK_FILENAMES.length
  return `/images/profile-mock/${encodeURIComponent(PROFILE_MOCK_FILENAMES[idx])}`
}

export type ProfileCategory =
  | 'caregiver'
  | 'nurse'
  | 'oss'
  | 'assistant'
  | 'agency'
  | 'facility'

export type CompetenceIconKey =
  | 'shield'
  | 'heart'
  | 'spark'
  | 'home'
  | 'med'
  | 'book'
  | 'hands'
  | 'pill'

export type ExperienceIconKey =
  | 'baby'
  | 'senior'
  | 'wheelchair'
  | 'alz'
  | 'oncology'
  | 'recovery'

export type HelpServiceIconKey =
  | 'home'
  | 'cook'
  | 'med'
  | 'shop'
  | 'transport'
  | 'companion'

/** Disponibilità giornaliera in 3 fasce: Mattina/Pomeriggio/Sera × Lun-Dom. */
export type DayPartAvailability = {
  morning: HomeProfileWeekAvailability
  afternoon: HomeProfileWeekAvailability
  evening: HomeProfileWeekAvailability
}

export type ProfileReference = {
  author: string
  date: string
  stars: number
  text: string
}

export type ProfileExperienceBlock = {
  ageOrPatient: string
  yearsLabel: string
  iconKey: ExperienceIconKey
}

export type ProfileCompetence = {
  id: string
  label: string
  iconKey: CompetenceIconKey
}

export type ProfileHelpService = {
  label: string
  iconKey: HelpServiceIconKey
}

export type MockProfile = {
  // ── card fields (compatibili con HomeProfileCarouselCard + DirectoryProfileMock)
  id: string
  listingIntent: ListingIntent
  category: ProfileCategory
  type: 'professional' | 'facility'
  name: string
  age?: number
  role: string
  stars: number
  reviewCount: number
  locationLabel: string
  online: boolean
  imageUrl: string
  rateLabel?: string
  experienceLabel?: string
  weekAvailable?: HomeProfileWeekAvailability
  shift?: string
  viaAgencyName?: string
  match: DirectoryGeoMatch

  // ── detail-only fields (omessi per agency/facility che non hanno pagina dettaglio in v1)
  bio: string
  bioMore?: string
  traits: string[]
  competences: ProfileCompetence[]
  experiences: ProfileExperienceBlock[]
  servicesCanDo: string[]
  servicesCanHelpWith: ProfileHelpService[]
  availability: DayPartAvailability
  availableFor: string[]
  references: ProfileReference[]
  coverageHint: string
}

const FULL_WEEK: HomeProfileWeekAvailability = [true, true, true, true, true, true, true]
const WEEKDAYS: HomeProfileWeekAvailability = [true, true, true, true, true, false, false]
const WEEKENDS: HomeProfileWeekAvailability = [false, false, false, false, false, true, true]
const MOST_DAYS: HomeProfileWeekAvailability = [true, true, false, true, true, true, false]
const NO_DAYS: HomeProfileWeekAvailability = [false, false, false, false, false, false, false]

/** Default mock detail bundle used as base, then overridden per profile. */
function defaultDetail(): Pick<
  MockProfile,
  | 'bio'
  | 'bioMore'
  | 'traits'
  | 'competences'
  | 'experiences'
  | 'servicesCanDo'
  | 'servicesCanHelpWith'
  | 'availability'
  | 'availableFor'
  | 'references'
  | 'coverageHint'
> {
  return {
    bio: 'Professionista del settore socio-sanitario, attenta ai bisogni della persona e alla relazione con la famiglia.',
    bioMore:
      'Lavoro per costruire un rapporto di fiducia: ascolto, riservatezza e continuità sono per me la base di un buon supporto a domicilio.',
    traits: ['Affidabile', 'Empatica', 'Puntuale'],
    competences: [
      { id: 'igiene', label: 'Igiene e cura della persona', iconKey: 'heart' },
      { id: 'mobilita', label: 'Mobilizzazione e trasferimenti', iconKey: 'hands' },
      { id: 'compagnia', label: 'Compagnia e attività quotidiane', iconKey: 'spark' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani autosufficienti', yearsLabel: '3+ anni', iconKey: 'senior' },
      { ageOrPatient: 'Pazienti con mobilità ridotta', yearsLabel: '2+ anni', iconKey: 'wheelchair' },
    ],
    servicesCanDo: ['Max 1 assistito alla volta', 'Disponibile per emergenze'],
    servicesCanHelpWith: [
      { label: 'Faccende domestiche', iconKey: 'home' },
      { label: 'Preparazione pasti', iconKey: 'cook' },
      { label: 'Commissioni e spesa', iconKey: 'shop' },
    ],
    availability: { morning: WEEKDAYS, afternoon: WEEKDAYS, evening: NO_DAYS },
    availableFor: ['Turni fissi', 'A chiamata'],
    references: [
      {
        author: 'Famiglia M.',
        date: 'Aprile 2026',
        stars: 5,
        text:
          'Persona molto disponibile e attenta. Si è occupata di mio padre con discrezione e competenza, sentendoci sempre coinvolti nelle scelte.',
      },
    ],
    coverageHint: 'Zona di copertura su appuntamento',
  }
}

const profileSeed: Omit<MockProfile, 'imageUrl'>[] = [
  // ───────── BADANTI ─────────
  {
    id: 'cg-1',
    listingIntent: 'cerco',
    category: 'caregiver',
    type: 'professional',
    name: 'Giulia R.',
    age: 48,
    role: 'Badante convivente',
    stars: 5,
    reviewCount: 12,
    locationLabel: 'Milano',
    online: true,
    shift: '24h Convivente',
    rateLabel: '€12 – 14 / ora',
    experienceLabel: '6 anni di esperienza con anziani',
    weekAvailable: FULL_WEEK,
    match: { istat: '015146', comune: 'Milano', cap: '201xx', regione: 'Lombardia' },
    ...defaultDetail(),
    bio:
      'Sono Giulia, badante convivente con sei anni di esperienza nell’assistenza ad anziani fragili. Vivo a Milano e cerco una famiglia in cui inserirmi con rispetto e continuità.',
    bioMore:
      'Negli ultimi anni mi sono occupata di assistiti con limitazioni motorie e iniziale demenza. Mi piace creare una routine ordinata e tenere un diario condiviso con la famiglia per gli aggiornamenti.',
    traits: ['Paziente', 'Affidabile', 'Discreta', 'Empatica'],
    competences: [
      { id: 'igiene', label: 'Igiene e cura della persona', iconKey: 'heart' },
      { id: 'mobilita', label: 'Mobilizzazione e trasferimenti', iconKey: 'hands' },
      { id: 'farmaci', label: 'Somministrazione terapie orali', iconKey: 'pill' },
      { id: 'cucina', label: 'Cucina su esigenze cliniche', iconKey: 'home' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani non autosufficienti', yearsLabel: '4+ anni', iconKey: 'senior' },
      { ageOrPatient: 'Persone con mobilità ridotta', yearsLabel: '3+ anni', iconKey: 'wheelchair' },
      { ageOrPatient: 'Iniziale Alzheimer', yearsLabel: '2 anni', iconKey: 'alz' },
    ],
    servicesCanDo: ['Convivenza in famiglia', 'Max 1 assistito alla volta', 'Spostamenti brevi accompagnati'],
    servicesCanHelpWith: [
      { label: 'Faccende domestiche', iconKey: 'home' },
      { label: 'Preparazione pasti', iconKey: 'cook' },
      { label: 'Commissioni e spesa', iconKey: 'shop' },
      { label: 'Compagnia e socialità', iconKey: 'companion' },
    ],
    availability: { morning: FULL_WEEK, afternoon: FULL_WEEK, evening: FULL_WEEK },
    availableFor: ['Convivenza h24', 'Turni fissi', 'Sostituzioni weekend'],
    references: [
      {
        author: 'Famiglia B.',
        date: 'Marzo 2026',
        stars: 5,
        text:
          'Giulia è entrata in casa nostra con grande discrezione. Si è occupata di mia madre con dedizione, mantenendoci aggiornati ogni settimana. La consigliamo a chiunque cerchi una persona di fiducia per una convivenza serena.',
      },
      {
        author: 'Famiglia C.',
        date: 'Novembre 2025',
        stars: 5,
        text:
          'Ottima esperienza. Puntuale, ordinata e molto attenta alle terapie. Ha gestito anche piccole emergenze senza farsi prendere dal panico.',
      },
    ],
    coverageHint: 'Milano e hinterland (fino a 15 km)',
  },
  {
    id: 'cg-2',
    listingIntent: 'cerco',
    category: 'caregiver',
    type: 'professional',
    name: 'Anna S.',
    age: 52,
    role: 'Assistente familiare',
    viaAgencyName: 'HR Family Care Lombardia S.r.l.',
    stars: 4,
    reviewCount: 8,
    locationLabel: 'Monza e Brianza',
    online: true,
    shift: 'Diurna 8:00–18:00',
    rateLabel: '€11 – 13 / ora',
    experienceLabel: '5 anni nel domiciliare',
    weekAvailable: WEEKDAYS,
    match: { istat: '108033', comune: 'Monza', cap: '20900', regione: 'Lombardia' },
    ...defaultDetail(),
    bio:
      'Mi presento come assistente familiare con cinque anni di esperienza diurna. Lavoro tramite agenzia per garantire un rapporto contrattuale chiaro e una continuità organizzata.',
    bioMore:
      'Ho seguito anziani autosufficienti e in fase iniziale di demenza, sempre lavorando in coordinamento con la famiglia e il medico di base.',
    traits: ['Organizzata', 'Sorridente', 'Affidabile'],
    competences: [
      { id: 'igiene', label: 'Cura quotidiana della persona', iconKey: 'heart' },
      { id: 'menù', label: 'Preparazione menù equilibrati', iconKey: 'home' },
      { id: 'agenda', label: 'Gestione appuntamenti medici', iconKey: 'book' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani autosufficienti', yearsLabel: '5 anni', iconKey: 'senior' },
      { ageOrPatient: 'Post-ricovero', yearsLabel: '2 anni', iconKey: 'recovery' },
    ],
    servicesCanDo: ['Diurna 8:00–18:00', 'Max 1 assistito', 'Reperibile su sostituzioni'],
    servicesCanHelpWith: [
      { label: 'Faccende domestiche', iconKey: 'home' },
      { label: 'Preparazione pasti', iconKey: 'cook' },
      { label: 'Spesa e commissioni', iconKey: 'shop' },
    ],
    availability: { morning: WEEKDAYS, afternoon: WEEKDAYS, evening: NO_DAYS },
    availableFor: ['Turni fissi diurni', 'Tramite agenzia'],
    references: [
      {
        author: 'Famiglia P.',
        date: 'Febbraio 2026',
        stars: 4,
        text:
          'Anna è una persona seria e molto puntuale. La gestione tramite agenzia ci ha rassicurato fin da subito.',
      },
    ],
    coverageHint: 'Monza, Brianza e Milano Nord (fino a 12 km)',
  },
  {
    id: 'cg-3',
    listingIntent: 'cerco',
    category: 'caregiver',
    type: 'professional',
    name: 'Marta C.',
    age: 44,
    role: 'Badante non convivente',
    stars: 4,
    reviewCount: 6,
    locationLabel: 'Bologna',
    online: true,
    shift: 'Serale e weekend',
    rateLabel: 'Negoziabile',
    experienceLabel: '4 anni in turni serali e weekend',
    weekAvailable: [true, true, false, true, true, true, false],
    match: { istat: '037006', comune: 'Bologna', cap: '401xx', regione: 'Emilia-Romagna' },
    ...defaultDetail(),
    bio:
      'Sono Marta, lavoro come badante non convivente specializzata in turni serali e nel weekend. Aiuto le famiglie a coprire le ore più impegnative della giornata.',
    bioMore:
      'Ho scelto i turni serali e il weekend perché si adattano alle mie disponibilità familiari e mi permettono di garantire continuità su orari spesso difficili da coprire.',
    traits: ['Flessibile', 'Ordinata', 'Discreta'],
    competences: [
      { id: 'igiene', label: 'Cura serale e notturna', iconKey: 'heart' },
      { id: 'sicurezza', label: 'Prevenzione cadute notturne', iconKey: 'shield' },
      { id: 'menù', label: 'Cena e preparazione per la notte', iconKey: 'home' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani parzialmente autosufficienti', yearsLabel: '4 anni', iconKey: 'senior' },
    ],
    servicesCanDo: ['Serali fino alle 23', 'Weekend full', 'Reperibile per emergenze brevi'],
    servicesCanHelpWith: [
      { label: 'Preparazione cena', iconKey: 'cook' },
      { label: 'Riordino casa', iconKey: 'home' },
      { label: 'Compagnia serale', iconKey: 'companion' },
    ],
    availability: {
      morning: NO_DAYS,
      afternoon: [false, false, false, false, true, true, false],
      evening: [true, true, false, true, true, true, false],
    },
    availableFor: ['Turni serali', 'Weekend', 'Sostituzioni'],
    references: [
      {
        author: 'Famiglia G.',
        date: 'Gennaio 2026',
        stars: 4,
        text:
          'Marta ci ha aiutato in un periodo molto difficile coprendo le sere e i weekend. Persona affidabile e attenta.',
      },
    ],
    coverageHint: 'Bologna città e prima cintura',
  },
  {
    id: 'cg-4',
    listingIntent: 'cerco',
    category: 'caregiver',
    type: 'professional',
    name: 'Laura B.',
    age: 56,
    role: 'Badante h24 con esperienza Alzheimer',
    viaAgencyName: 'Cooperativa Sociale Auxilium ONLUS',
    stars: 5,
    reviewCount: 18,
    locationLabel: 'Roma',
    online: true,
    shift: 'Convivenza flessibile',
    rateLabel: '€14 – 18 / ora',
    experienceLabel: 'Oltre 8 anni con patologie neurodegenerative',
    weekAvailable: FULL_WEEK,
    match: { istat: '058091', comune: 'Roma', cap: '001xx', regione: 'Lazio' },
    ...defaultDetail(),
    bio:
      'Sono Laura, badante h24 con oltre otto anni di esperienza dedicata a persone con Alzheimer e altre patologie neurodegenerative. Lavoro tramite cooperativa.',
    bioMore:
      'Ho seguito un percorso formativo specifico sulla demenza e sulle tecniche di comunicazione non verbale. So gestire fasi di disorientamento e momenti di agitazione mantenendo un ambiente sereno.',
    traits: ['Specializzata', 'Calma', 'Empatica', 'Resiliente'],
    competences: [
      { id: 'alz', label: 'Gestione comportamentale Alzheimer', iconKey: 'shield' },
      { id: 'igiene', label: 'Cura completa della persona', iconKey: 'heart' },
      { id: 'farmaci', label: 'Somministrazione terapie', iconKey: 'pill' },
      { id: 'mobilita', label: 'Mobilizzazione assistita', iconKey: 'hands' },
    ],
    experiences: [
      { ageOrPatient: 'Alzheimer e demenze', yearsLabel: '8+ anni', iconKey: 'alz' },
      { ageOrPatient: 'Anziani non autosufficienti', yearsLabel: '8+ anni', iconKey: 'senior' },
      { ageOrPatient: 'Allettati', yearsLabel: '5 anni', iconKey: 'wheelchair' },
    ],
    servicesCanDo: ['Convivenza h24', 'Max 1 assistito', 'Riposo settimanale concordato'],
    servicesCanHelpWith: [
      { label: 'Igiene e cura', iconKey: 'med' },
      { label: 'Pasti su esigenze cliniche', iconKey: 'cook' },
      { label: 'Faccende domestiche', iconKey: 'home' },
      { label: 'Compagnia e stimolazione', iconKey: 'companion' },
    ],
    availability: { morning: FULL_WEEK, afternoon: FULL_WEEK, evening: FULL_WEEK },
    availableFor: ['Convivenza h24', 'Coordinata da cooperativa', 'Continuità lunga durata'],
    references: [
      {
        author: 'Famiglia D.',
        date: 'Aprile 2026',
        stars: 5,
        text:
          'Laura ha cambiato il nostro modo di affrontare la malattia di mamma. Calma, competente, sempre lucida nelle decisioni. Per noi è una presenza fondamentale.',
      },
      {
        author: 'Famiglia R.',
        date: 'Settembre 2025',
        stars: 5,
        text:
          'Esperienza professionale altissima con il decorso Alzheimer. Comunicazione costante con la famiglia e con il geriatra di riferimento.',
      },
    ],
    coverageHint: 'Roma città e municipi limitrofi',
  },
  {
    id: 'cg-5',
    listingIntent: 'cerco',
    category: 'caregiver',
    type: 'professional',
    name: 'Francesca D.',
    age: 39,
    role: 'Caregiver weekend',
    stars: 4,
    reviewCount: 5,
    locationLabel: 'Genova',
    online: false,
    shift: 'Sabato e domenica',
    rateLabel: '€13 – 16 / ora',
    experienceLabel: '3 anni in supporto weekend',
    weekAvailable: WEEKENDS,
    match: { istat: '010025', comune: 'Genova', cap: '161xx', regione: 'Liguria' },
    ...defaultDetail(),
    bio:
      'Mi chiamo Francesca, sono caregiver dedicata ai weekend. Aiuto le famiglie a dare continuità all’assistenza nelle giornate in cui le risorse abituali non sono disponibili.',
    bioMore:
      'Ho scelto questo ruolo perché credo molto nel valore del weekend come momento di sollievo per i familiari. Mi adatto velocemente a routine già consolidate.',
    traits: ['Flessibile', 'Solare', 'Affidabile'],
    competences: [
      { id: 'igiene', label: 'Cura quotidiana della persona', iconKey: 'heart' },
      { id: 'cucina', label: 'Pasti del weekend', iconKey: 'home' },
      { id: 'compagnia', label: 'Attività e socialità', iconKey: 'spark' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani parzialmente autosufficienti', yearsLabel: '3 anni', iconKey: 'senior' },
    ],
    servicesCanDo: ['Weekend full', 'Massimo 2 assistiti se conviventi', 'Festivi disponibili'],
    servicesCanHelpWith: [
      { label: 'Preparazione pasti', iconKey: 'cook' },
      { label: 'Riordino casa', iconKey: 'home' },
      { label: 'Passeggiate', iconKey: 'companion' },
    ],
    availability: {
      morning: WEEKENDS,
      afternoon: WEEKENDS,
      evening: [false, false, false, false, false, true, false],
    },
    availableFor: ['Weekend', 'Festività', 'Sostituzioni programmabili'],
    references: [
      {
        author: 'Famiglia L.',
        date: 'Dicembre 2025',
        stars: 4,
        text:
          'Francesca ci copre il weekend in modo affidabile. Comunica bene con la badante che lavora durante la settimana.',
      },
    ],
    coverageHint: 'Genova centro e Levante (fino a 10 km)',
  },
  {
    id: 'cg-6',
    listingIntent: 'cerco',
    category: 'caregiver',
    type: 'professional',
    name: 'Cristina N.',
    age: 47,
    role: 'Badante con patente',
    viaAgencyName: 'Gruppo Vita e Anziani S.p.A.',
    stars: 5,
    reviewCount: 9,
    locationLabel: 'Padova',
    online: true,
    shift: 'Turni su misura',
    rateLabel: '€12 – 15 / ora',
    experienceLabel: '5 anni con patente B e auto propria',
    weekAvailable: MOST_DAYS,
    match: { istat: '028060', comune: 'Padova', cap: '351xx', regione: 'Veneto' },
    ...defaultDetail(),
    bio:
      'Sono Cristina, badante con patente e auto propria. Posso accompagnare gli assistiti a visite mediche e brevi commissioni quotidiane senza dipendere dai mezzi pubblici.',
    bioMore:
      'L’auto è particolarmente utile per famiglie con anziani che vivono in zone con servizi limitati. Lavoro tramite agenzia per la parte contrattuale.',
    traits: ['Autonoma', 'Affidabile', 'Disponibile'],
    competences: [
      { id: 'mobilita', label: 'Accompagnamento visite mediche', iconKey: 'hands' },
      { id: 'igiene', label: 'Cura quotidiana', iconKey: 'heart' },
      { id: 'spesa', label: 'Spesa e commissioni', iconKey: 'home' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani autosufficienti', yearsLabel: '5 anni', iconKey: 'senior' },
      { ageOrPatient: 'Convalescenze post-ricovero', yearsLabel: '3 anni', iconKey: 'recovery' },
    ],
    servicesCanDo: ['Turni su misura', 'Auto propria disponibile', 'Trasferte fino a 30 km'],
    servicesCanHelpWith: [
      { label: 'Trasporto a visite', iconKey: 'transport' },
      { label: 'Spesa e commissioni', iconKey: 'shop' },
      { label: 'Faccende domestiche', iconKey: 'home' },
    ],
    availability: { morning: MOST_DAYS, afternoon: MOST_DAYS, evening: NO_DAYS },
    availableFor: ['Turni fissi', 'Tramite agenzia', 'Sostituzioni programmabili'],
    references: [
      {
        author: 'Famiglia T.',
        date: 'Marzo 2026',
        stars: 5,
        text:
          'L’auto di Cristina è stata fondamentale per le visite del papà. Sempre puntuale, sempre disponibile a piccoli aggiustamenti di orario.',
      },
    ],
    coverageHint: 'Padova e provincia (fino a 30 km con mezzo proprio)',
  },

  // ───────── ASSISTENTI ─────────
  {
    id: 'as-1',
    listingIntent: 'cerco',
    category: 'assistant',
    type: 'professional',
    name: 'Sara L.',
    age: 35,
    role: 'Assistente familiare qualificata',
    stars: 5,
    reviewCount: 7,
    locationLabel: 'Torino',
    online: true,
    shift: 'Part-time mattino',
    rateLabel: '€13 – 15 / ora',
    experienceLabel: '4 anni in part-time mattutino',
    weekAvailable: WEEKDAYS,
    match: { istat: '001272', comune: 'Torino', cap: '101xx', regione: 'Piemonte' },
    ...defaultDetail(),
    bio:
      'Sono Sara, assistente familiare qualificata. Lavoro su turni part-time del mattino: una soluzione utile per chi cerca aiuto strutturato senza copertura piena.',
    bioMore:
      'Ho seguito un corso regionale di 200 ore per assistente familiare e mantengo aggiornata la formazione su BLS-D e movimentazione carichi.',
    traits: ['Qualificata', 'Empatica', 'Puntuale'],
    competences: [
      { id: 'cura', label: 'Cura della persona', iconKey: 'heart' },
      { id: 'farmaci', label: 'Promemoria terapie', iconKey: 'pill' },
      { id: 'osservazione', label: 'Osservazione clinica di base', iconKey: 'med' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani parzialmente autosufficienti', yearsLabel: '4 anni', iconKey: 'senior' },
      { ageOrPatient: 'Post-intervento', yearsLabel: '2 anni', iconKey: 'recovery' },
    ],
    servicesCanDo: ['Part-time mattutino', 'Max 1 assistito', 'Inserimento graduale'],
    servicesCanHelpWith: [
      { label: 'Faccende domestiche', iconKey: 'home' },
      { label: 'Colazione e pranzo', iconKey: 'cook' },
      { label: 'Compagnia mattutina', iconKey: 'companion' },
    ],
    availability: { morning: WEEKDAYS, afternoon: NO_DAYS, evening: NO_DAYS },
    availableFor: ['Part-time mattino', 'Turni fissi', 'Inserimento graduale'],
    references: [
      {
        author: 'Famiglia A.',
        date: 'Febbraio 2026',
        stars: 5,
        text:
          'Sara è arrivata con curriculum chiaro e attestati in regola. Si è inserita in due settimane con grande naturalezza.',
      },
    ],
    coverageHint: 'Torino città e cintura sud',
  },
  {
    id: 'as-2',
    listingIntent: 'cerco',
    category: 'assistant',
    type: 'professional',
    name: 'Paola T.',
    age: 50,
    role: 'Assistente anziani',
    viaAgencyName: 'Domus Salute HR',
    stars: 4,
    reviewCount: 6,
    locationLabel: 'Firenze',
    online: false,
    shift: 'Diurna',
    rateLabel: '€11 – 13 / ora',
    experienceLabel: '6 anni in turni diurni',
    weekAvailable: WEEKDAYS,
    match: { istat: '048017', comune: 'Firenze', cap: '501xx', regione: 'Toscana' },
    ...defaultDetail(),
    bio:
      'Mi chiamo Paola e da sei anni lavoro come assistente per anziani in turni diurni. Tramite agenzia mantengo continuità su famiglie diverse.',
    bioMore:
      'Mi piace creare un piccolo rituale quotidiano: la colazione con calma, una passeggiata se possibile, un pomeriggio con musica o letture.',
    traits: ['Calma', 'Affettuosa', 'Affidabile'],
    competences: [
      { id: 'cura', label: 'Cura quotidiana', iconKey: 'heart' },
      { id: 'cucina', label: 'Pasti tradizionali toscani', iconKey: 'home' },
      { id: 'compagnia', label: 'Letture e musica', iconKey: 'spark' },
    ],
    experiences: [{ ageOrPatient: 'Anziani autosufficienti', yearsLabel: '6 anni', iconKey: 'senior' }],
    servicesCanDo: ['Turni diurni', 'Tramite agenzia', 'Inserimento concordato'],
    servicesCanHelpWith: [
      { label: 'Faccende domestiche', iconKey: 'home' },
      { label: 'Pasti tradizionali', iconKey: 'cook' },
      { label: 'Compagnia attiva', iconKey: 'companion' },
    ],
    availability: { morning: WEEKDAYS, afternoon: WEEKDAYS, evening: NO_DAYS },
    availableFor: ['Turni diurni fissi', 'Tramite agenzia'],
    references: [
      {
        author: 'Famiglia M.',
        date: 'Ottobre 2025',
        stars: 4,
        text:
          'Paola è una persona calma e dolce. Ha portato serenità in casa con la nonna.',
      },
    ],
    coverageHint: 'Firenze centro e quartieri vicini',
  },
  {
    id: 'as-3',
    listingIntent: 'cerco',
    category: 'assistant',
    type: 'professional',
    name: 'Silvia G.',
    age: 41,
    role: 'Assistente familiare notturna',
    stars: 5,
    reviewCount: 11,
    locationLabel: 'Verona',
    online: true,
    shift: 'Notturna in coppia',
    rateLabel: '€14 – 17 / ora',
    experienceLabel: '5 anni in turno notturno',
    weekAvailable: [false, true, true, true, false, true, true],
    match: { istat: '023091', comune: 'Verona', cap: '371xx', regione: 'Veneto' },
    ...defaultDetail(),
    bio:
      'Sono Silvia, assistente familiare specializzata nei turni notturni. Lavoro spesso in coppia con un’altra assistente diurna per coprire l’intera giornata.',
    bioMore:
      'Il mio focus notturno è la sicurezza: prevenzione cadute, gestione del sonno disturbato e pronta risposta in caso di malori. Mantengo riposo diurno per essere lucida la notte.',
    traits: ['Vigile', 'Discreta', 'Affidabile'],
    competences: [
      { id: 'sicurezza', label: 'Prevenzione cadute notturne', iconKey: 'shield' },
      { id: 'igiene', label: 'Cambio e igiene notte', iconKey: 'heart' },
      { id: 'farmaci', label: 'Terapie serali e notturne', iconKey: 'pill' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani non autosufficienti', yearsLabel: '5 anni', iconKey: 'senior' },
      { ageOrPatient: 'Post-ricovero', yearsLabel: '3 anni', iconKey: 'recovery' },
    ],
    servicesCanDo: ['Turno notte 22:00–07:00', 'Lavoro in coppia con diurna', 'Reperibilità su emergenze'],
    servicesCanHelpWith: [
      { label: 'Igiene notturna', iconKey: 'med' },
      { label: 'Compagnia in caso di insonnia', iconKey: 'companion' },
    ],
    availability: {
      morning: NO_DAYS,
      afternoon: NO_DAYS,
      evening: [false, true, true, true, false, true, true],
    },
    availableFor: ['Turni notturni', 'Sostituzioni weekend', 'Continuità lunga durata'],
    references: [
      {
        author: 'Famiglia S.',
        date: 'Febbraio 2026',
        stars: 5,
        text:
          'Silvia ha gestito le notti più difficili con grande serenità. Comunica al mattino sempre cosa è accaduto.',
      },
    ],
    coverageHint: 'Verona città e periferia ovest',
  },
  {
    id: 'as-4',
    listingIntent: 'cerco',
    category: 'assistant',
    type: 'professional',
    name: 'Gabriella F.',
    age: 38,
    role: 'Assistenza ADL e compagnia',
    stars: 4,
    reviewCount: 4,
    locationLabel: 'Brescia',
    online: true,
    shift: '4 ore al giorno',
    rateLabel: '€12 – 14 / ora',
    experienceLabel: '3 anni in supporto ADL',
    weekAvailable: WEEKDAYS,
    match: { istat: '017029', comune: 'Brescia', cap: '251xx', regione: 'Lombardia' },
    ...defaultDetail(),
    bio:
      'Sono Gabriella e propongo un’assistenza leggera ma costante: 4 ore al giorno per supportare le attività di vita quotidiana mantenendo autonomia.',
    bioMore:
      'Mi rivolgo soprattutto a famiglie che vogliono mantenere il proprio caro a casa il più a lungo possibile, anche con piccole limitazioni.',
    traits: ['Solare', 'Paziente', 'Affidabile'],
    competences: [
      { id: 'adl', label: 'Supporto ADL quotidiano', iconKey: 'hands' },
      { id: 'compagnia', label: 'Stimolazione cognitiva di base', iconKey: 'spark' },
      { id: 'cucina', label: 'Pasti semplici e bilanciati', iconKey: 'home' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani autosufficienti', yearsLabel: '3 anni', iconKey: 'senior' },
    ],
    servicesCanDo: ['4 ore al giorno', 'Inserimento graduale', 'Sostituzioni'],
    servicesCanHelpWith: [
      { label: 'Compagnia attiva', iconKey: 'companion' },
      { label: 'Faccende leggere', iconKey: 'home' },
      { label: 'Pranzo e merenda', iconKey: 'cook' },
    ],
    availability: { morning: WEEKDAYS, afternoon: WEEKDAYS, evening: NO_DAYS },
    availableFor: ['Part-time', 'Turni fissi', 'Sostituzioni'],
    references: [
      {
        author: 'Famiglia V.',
        date: 'Novembre 2025',
        stars: 4,
        text:
          'Gabriella è perfetta per chi cerca un supporto leggero. Mio padre la aspetta volentieri ogni giorno.',
      },
    ],
    coverageHint: 'Brescia città (fino a 8 km)',
  },

  // ───────── OSS ─────────
  {
    id: 'oss-1',
    listingIntent: 'cerco',
    category: 'oss',
    type: 'professional',
    name: 'Marco V.',
    age: 33,
    role: 'OSS domiciliare',
    stars: 5,
    reviewCount: 14,
    locationLabel: 'Torino',
    online: true,
    shift: 'Turni flessibili',
    rateLabel: '€15 – 18 / ora',
    experienceLabel: '6 anni come OSS domiciliare',
    weekAvailable: MOST_DAYS,
    match: { istat: '001272', comune: 'Torino', cap: '101xx', regione: 'Piemonte' },
    ...defaultDetail(),
    bio:
      'Sono Marco, Operatore Socio-Sanitario con esperienza domiciliare. Affianco la famiglia su pazienti con bisogni assistenziali complessi.',
    bioMore:
      'Lavoro in stretto coordinamento con il medico di medicina generale e, quando necessario, con l’infermiere domiciliare per la gestione di terapie e medicazioni.',
    traits: ['Qualificato', 'Determinato', 'Empatico'],
    competences: [
      { id: 'igiene', label: 'Igiene avanzata', iconKey: 'heart' },
      { id: 'mobilita', label: 'Mobilizzazione assistita', iconKey: 'hands' },
      { id: 'farmaci', label: 'Somministrazione terapie orali', iconKey: 'pill' },
      { id: 'osservazione', label: 'Osservazione parametri vitali', iconKey: 'med' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani non autosufficienti', yearsLabel: '6 anni', iconKey: 'senior' },
      { ageOrPatient: 'Allettati', yearsLabel: '4 anni', iconKey: 'wheelchair' },
      { ageOrPatient: 'Post-ictus e riabilitazione', yearsLabel: '3 anni', iconKey: 'recovery' },
    ],
    servicesCanDo: ['Turni flessibili', 'Coordinamento con infermiere', 'Reperibilità urgente'],
    servicesCanHelpWith: [
      { label: 'Igiene complessa', iconKey: 'med' },
      { label: 'Pasti su esigenze cliniche', iconKey: 'cook' },
      { label: 'Trasporto a visite', iconKey: 'transport' },
    ],
    availability: { morning: FULL_WEEK, afternoon: MOST_DAYS, evening: NO_DAYS },
    availableFor: ['Turni fissi', 'A chiamata', 'Reperibilità urgente'],
    references: [
      {
        author: 'Famiglia R.',
        date: 'Aprile 2026',
        stars: 5,
        text:
          'Marco è l’OSS che cercavamo. Competenza tecnica vera e calma in qualunque situazione.',
      },
      {
        author: 'Famiglia P.',
        date: 'Gennaio 2026',
        stars: 5,
        text:
          'Si è coordinato perfettamente con il nostro infermiere di fiducia. Massimo rispetto della persona.',
      },
    ],
    coverageHint: 'Torino città e prima cintura',
  },
  {
    id: 'oss-2',
    listingIntent: 'cerco',
    category: 'oss',
    type: 'professional',
    name: 'Luca P.',
    age: 36,
    role: 'OSS RSA e domicilio',
    stars: 4,
    reviewCount: 10,
    locationLabel: 'Venezia',
    online: true,
    shift: 'Full time',
    rateLabel: '€14 – 17 / ora',
    experienceLabel: '7 anni tra RSA e domicilio',
    weekAvailable: MOST_DAYS,
    match: { istat: '027042', comune: 'Venezia', cap: '301xx', regione: 'Veneto' },
    ...defaultDetail(),
    bio:
      'Sono Luca, OSS con esperienza maturata sia in RSA che a domicilio. Conosco bene i protocolli assistenziali strutturati e li riporto, semplificati, a casa dell’assistito.',
    bioMore:
      'L’esperienza in RSA mi ha insegnato la disciplina e la tracciabilità degli interventi: la trasporto a casa con un piccolo registro condiviso con la famiglia.',
    traits: ['Metodico', 'Affidabile', 'Determinato'],
    competences: [
      { id: 'protocolli', label: 'Protocolli assistenziali RSA', iconKey: 'shield' },
      { id: 'igiene', label: 'Igiene avanzata', iconKey: 'heart' },
      { id: 'mobilita', label: 'Mobilizzazione e trasferimenti', iconKey: 'hands' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani non autosufficienti', yearsLabel: '7 anni', iconKey: 'senior' },
      { ageOrPatient: 'Post-ricovero', yearsLabel: '5 anni', iconKey: 'recovery' },
    ],
    servicesCanDo: ['Full time', 'Trasferte concordate', 'Reperibilità per emergenze'],
    servicesCanHelpWith: [
      { label: 'Igiene complessa', iconKey: 'med' },
      { label: 'Pasti su esigenze cliniche', iconKey: 'cook' },
      { label: 'Trasporto a visite', iconKey: 'transport' },
    ],
    availability: { morning: MOST_DAYS, afternoon: MOST_DAYS, evening: NO_DAYS },
    availableFor: ['Full time', 'A chiamata', 'Continuità lunga durata'],
    references: [
      {
        author: 'Famiglia C.',
        date: 'Marzo 2026',
        stars: 4,
        text:
          'Luca è molto preciso e ordinato. Apprezziamo molto il piccolo diario che lascia ogni settimana.',
      },
    ],
    coverageHint: 'Venezia, Mestre e dintorni (fino a 20 km)',
  },
  {
    id: 'oss-3',
    listingIntent: 'cerco',
    category: 'oss',
    type: 'professional',
    name: 'Simone R.',
    age: 29,
    role: 'OSS notturno',
    stars: 5,
    reviewCount: 6,
    locationLabel: 'Trieste',
    online: false,
    shift: 'Notte in struttura',
    rateLabel: '€15 – 18 / ora',
    experienceLabel: '4 anni in turno notte',
    weekAvailable: [false, true, true, true, false, true, true],
    match: { istat: '032006', comune: 'Trieste', cap: '341xx', regione: 'Friuli-Venezia Giulia' },
    ...defaultDetail(),
    bio:
      'Sono Simone, OSS dedicato ai turni notturni in struttura e a domicilio. Specializzato in osservazione clinica notturna e gestione della terapia serale.',
    bioMore:
      'Mantengo aggiornata la formazione su BLS-D e protocolli di emergenza. Comunico in modo chiaro con la famiglia al mattino su quanto avvenuto durante la notte.',
    traits: ['Vigile', 'Calmo', 'Qualificato'],
    competences: [
      { id: 'osservazione', label: 'Osservazione clinica notturna', iconKey: 'med' },
      { id: 'sicurezza', label: 'Prevenzione cadute', iconKey: 'shield' },
      { id: 'farmaci', label: 'Terapie serali e notturne', iconKey: 'pill' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani non autosufficienti', yearsLabel: '4 anni', iconKey: 'senior' },
      { ageOrPatient: 'Post-intervento', yearsLabel: '2 anni', iconKey: 'recovery' },
    ],
    servicesCanDo: ['Turno notte 22:00–07:00', 'Reperibilità in struttura', 'Sostituzioni weekend'],
    servicesCanHelpWith: [
      { label: 'Igiene notturna', iconKey: 'med' },
      { label: 'Compagnia in caso di insonnia', iconKey: 'companion' },
    ],
    availability: {
      morning: NO_DAYS,
      afternoon: NO_DAYS,
      evening: [false, true, true, true, false, true, true],
    },
    availableFor: ['Turni notturni', 'Sostituzioni in struttura'],
    references: [
      {
        author: 'Struttura Aurora',
        date: 'Gennaio 2026',
        stars: 5,
        text:
          'Simone è un riferimento nei turni notturni. Massima affidabilità e zero criticità in oltre un anno di collaborazione.',
      },
    ],
    coverageHint: 'Trieste e provincia',
  },
  {
    id: 'oss-4',
    listingIntent: 'cerco',
    category: 'oss',
    type: 'professional',
    name: 'Chiara V.',
    age: 31,
    role: 'OSS con esperienza BPCO',
    stars: 5,
    reviewCount: 8,
    locationLabel: 'Perugia',
    online: true,
    shift: '12h giorno / notte',
    rateLabel: '€15 – 18 / ora',
    experienceLabel: '5 anni con pazienti respiratori',
    weekAvailable: MOST_DAYS,
    match: { istat: '054039', comune: 'Perugia', cap: '061xx', regione: 'Umbria' },
    ...defaultDetail(),
    bio:
      'Sono Chiara, OSS con esperienza specifica su pazienti con BPCO e bisogni respiratori. So gestire ossigeno-terapia domiciliare e aerosol con presidi prescritti.',
    bioMore:
      'La mia formazione include corsi su pneumologia di base e gestione presidi (concentratore, bombole, NIV). Resto sempre coordinata con lo pneumologo curante.',
    traits: ['Specializzata', 'Calma', 'Empatica'],
    competences: [
      { id: 'respiro', label: 'Gestione presidi respiratori', iconKey: 'med' },
      { id: 'farmaci', label: 'Aerosol e terapia inalatoria', iconKey: 'pill' },
      { id: 'mobilita', label: 'Mobilizzazione con saturazione monitorata', iconKey: 'hands' },
    ],
    experiences: [
      { ageOrPatient: 'Pazienti BPCO / respiratori', yearsLabel: '5 anni', iconKey: 'oncology' },
      { ageOrPatient: 'Post-ricovero', yearsLabel: '3 anni', iconKey: 'recovery' },
    ],
    servicesCanDo: ['Turni 12h giorno o notte', 'Coordinamento con pneumologo', 'Trasferte concordate'],
    servicesCanHelpWith: [
      { label: 'Igiene su pazienti dispnoici', iconKey: 'med' },
      { label: 'Pasti leggeri su esigenze cliniche', iconKey: 'cook' },
    ],
    availability: { morning: MOST_DAYS, afternoon: MOST_DAYS, evening: MOST_DAYS },
    availableFor: ['Turni 12h', 'Continuità lunga durata', 'Reperibilità urgente'],
    references: [
      {
        author: 'Famiglia D.',
        date: 'Aprile 2026',
        stars: 5,
        text:
          'Chiara è preparatissima sui presidi respiratori. Per noi è stata una rivelazione, ci ha tolto un’enorme ansia.',
      },
    ],
    coverageHint: 'Perugia città e comuni limitrofi',
  },

  // ───────── INFERMIERI ─────────
  {
    id: 'nu-1',
    listingIntent: 'cerco',
    category: 'nurse',
    type: 'professional',
    name: 'Elena M.',
    age: 37,
    role: 'Infermiera professionale',
    stars: 5,
    reviewCount: 22,
    locationLabel: 'Milano e hinterland',
    online: true,
    shift: 'Prestazioni domiciliari',
    rateLabel: '€25 – 35 / prestazione',
    experienceLabel: '8 anni in domiciliare e RSA',
    weekAvailable: WEEKDAYS,
    match: { istat: '015146', comune: 'Milano', cap: '201xx', regione: 'Lombardia' },
    ...defaultDetail(),
    bio:
      'Sono Elena, infermiera professionale iscritta all’OPI di Milano. Effettuo prestazioni domiciliari su prescrizione medica.',
    bioMore:
      'Tra le prestazioni più richieste: medicazioni complesse, terapie iniettive, gestione cateteri vescicali, prelievi venosi a domicilio.',
    traits: ['Qualificata', 'Riservata', 'Disponibile'],
    competences: [
      { id: 'med', label: 'Medicazioni semplici e avanzate', iconKey: 'med' },
      { id: 'iniezioni', label: 'Terapie iniettive sc / im', iconKey: 'pill' },
      { id: 'prelievi', label: 'Prelievi venosi a domicilio', iconKey: 'shield' },
      { id: 'cateteri', label: 'Gestione cateteri vescicali', iconKey: 'med' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani in domiciliare', yearsLabel: '8 anni', iconKey: 'senior' },
      { ageOrPatient: 'Post-chirurgico', yearsLabel: '5 anni', iconKey: 'recovery' },
      { ageOrPatient: 'Pazienti oncologici', yearsLabel: '3 anni', iconKey: 'oncology' },
    ],
    servicesCanDo: ['Prestazioni su prescrizione', 'Coordinamento con medico curante', 'Reperibilità diurna'],
    servicesCanHelpWith: [
      { label: 'Medicazioni domiciliari', iconKey: 'med' },
      { label: 'Educazione caregiver', iconKey: 'companion' },
    ],
    availability: { morning: WEEKDAYS, afternoon: WEEKDAYS, evening: NO_DAYS },
    availableFor: ['Prestazioni singole', 'Cicli programmati', 'Reperibilità diurna'],
    references: [
      {
        author: 'Famiglia G.',
        date: 'Aprile 2026',
        stars: 5,
        text:
          'Elena ha gestito le medicazioni post-intervento con grande professionalità. Sempre puntuale, sempre disponibile.',
      },
      {
        author: 'Famiglia P.',
        date: 'Marzo 2026',
        stars: 5,
        text:
          'Bravissima infermiera. Spiega bene anche al paziente cosa sta facendo.',
      },
    ],
    coverageHint: 'Milano e hinterland (fino a 15 km)',
  },
  {
    id: 'nu-2',
    listingIntent: 'cerco',
    category: 'nurse',
    type: 'professional',
    name: 'Chiara I.',
    age: 34,
    role: 'IPeCoAS e medicazioni',
    viaAgencyName: 'Assistenza Familiare Italia S.r.l.',
    stars: 5,
    reviewCount: 17,
    locationLabel: 'Napoli',
    online: true,
    shift: 'Su appuntamento',
    rateLabel: '€28 – 38 / prestazione',
    experienceLabel: '7 anni in coordinamento care team',
    weekAvailable: WEEKDAYS,
    match: { istat: '063049', comune: 'Napoli', cap: '801xx', regione: 'Campania' },
    ...defaultDetail(),
    bio:
      'Mi chiamo Chiara, infermiera con focus su medicazioni complesse e coordinamento del care team intorno al paziente fragile.',
    bioMore:
      'Lavoro tramite agenzia per offrire una continuità organizzata. Il mio approccio si basa sul piano assistenziale individualizzato.',
    traits: ['Coordinatrice', 'Qualificata', 'Empatica'],
    competences: [
      { id: 'med', label: 'Medicazioni complesse', iconKey: 'med' },
      { id: 'piano', label: 'Piano assistenziale individuale', iconKey: 'book' },
      { id: 'coord', label: 'Coordinamento care team', iconKey: 'hands' },
    ],
    experiences: [
      { ageOrPatient: 'Pazienti fragili', yearsLabel: '7 anni', iconKey: 'senior' },
      { ageOrPatient: 'Lesioni da decubito', yearsLabel: '4 anni', iconKey: 'recovery' },
      { ageOrPatient: 'Pazienti oncologici', yearsLabel: '3 anni', iconKey: 'oncology' },
    ],
    servicesCanDo: ['Su appuntamento', 'Tramite agenzia', 'Cicli programmati'],
    servicesCanHelpWith: [
      { label: 'Educazione caregiver', iconKey: 'companion' },
      { label: 'Coordinamento medico', iconKey: 'med' },
    ],
    availability: { morning: WEEKDAYS, afternoon: WEEKDAYS, evening: NO_DAYS },
    availableFor: ['Su appuntamento', 'Cicli programmati', 'Coordinamento care team'],
    references: [
      {
        author: 'Famiglia F.',
        date: 'Marzo 2026',
        stars: 5,
        text:
          'Chiara ha messo ordine in una situazione complicata. Ha coordinato OSS, fisioterapista e medico curante in pochissimo tempo.',
      },
    ],
    coverageHint: 'Napoli città e comuni limitrofi',
  },
  {
    id: 'nu-3',
    listingIntent: 'cerco',
    category: 'nurse',
    type: 'professional',
    name: 'Francesca A.',
    age: 40,
    role: 'Infermiera di famiglia',
    stars: 4,
    reviewCount: 9,
    locationLabel: 'Palermo',
    online: false,
    shift: 'Coordinamento care team',
    rateLabel: '€26 – 34 / prestazione',
    experienceLabel: '9 anni come infermiera di famiglia',
    weekAvailable: WEEKDAYS,
    match: { istat: '082053', comune: 'Palermo', cap: '901xx', regione: 'Sicilia' },
    ...defaultDetail(),
    bio:
      'Sono Francesca, infermiera di famiglia. Faccio da ponte tra il medico di medicina generale, lo specialista e il caregiver familiare.',
    bioMore:
      'Mi occupo soprattutto di prevenzione, monitoraggio dei parametri e supporto al caregiver. Credo molto nell’infermiere di prossimità.',
    traits: ['Coordinatrice', 'Empatica', 'Esperta'],
    competences: [
      { id: 'monitoraggio', label: 'Monitoraggio parametri vitali', iconKey: 'shield' },
      { id: 'educazione', label: 'Educazione del caregiver', iconKey: 'book' },
      { id: 'med', label: 'Medicazioni semplici', iconKey: 'med' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani fragili', yearsLabel: '9 anni', iconKey: 'senior' },
      { ageOrPatient: 'Pazienti cronici', yearsLabel: '7 anni', iconKey: 'recovery' },
    ],
    servicesCanDo: ['Coordinamento care team', 'Su appuntamento', 'Visite di monitoraggio'],
    servicesCanHelpWith: [
      { label: 'Educazione famiglia', iconKey: 'companion' },
      { label: 'Coordinamento medico', iconKey: 'med' },
    ],
    availability: { morning: WEEKDAYS, afternoon: WEEKDAYS, evening: NO_DAYS },
    availableFor: ['Visite di monitoraggio', 'Cicli programmati'],
    references: [
      {
        author: 'Famiglia I.',
        date: 'Settembre 2025',
        stars: 4,
        text:
          'Francesca ha aiutato moltissimo mia mamma a capire i farmaci di mio padre. Persona disponibile e competente.',
      },
    ],
    coverageHint: 'Palermo e prima cintura',
  },
  {
    id: 'nu-4',
    listingIntent: 'cerco',
    category: 'nurse',
    type: 'professional',
    name: 'Laura P.',
    age: 32,
    role: 'Infermiera pediatrica',
    stars: 5,
    reviewCount: 12,
    locationLabel: 'Bari',
    online: true,
    shift: 'Visite domiciliari',
    rateLabel: '€30 – 40 / prestazione',
    experienceLabel: '6 anni in pediatria di comunità',
    weekAvailable: WEEKDAYS,
    match: { istat: '072006', comune: 'Bari', cap: '701xx', regione: 'Puglia' },
    ...defaultDetail(),
    bio:
      'Sono Laura, infermiera pediatrica con esperienza in domiciliare. Mi occupo di bambini con bisogni speciali e di supporto post-dimissione.',
    bioMore:
      'Lavoro spesso a fianco del pediatra di libera scelta su piani assistenziali pediatrici complessi.',
    traits: ['Pediatrica', 'Empatica', 'Solare'],
    competences: [
      { id: 'med', label: 'Medicazioni pediatriche', iconKey: 'med' },
      { id: 'educazione', label: 'Educazione genitori', iconKey: 'book' },
      { id: 'monitoraggio', label: 'Monitoraggio bambino', iconKey: 'shield' },
    ],
    experiences: [
      { ageOrPatient: 'Bambini con bisogni speciali', yearsLabel: '6 anni', iconKey: 'baby' },
      { ageOrPatient: 'Post-dimissione pediatrica', yearsLabel: '4 anni', iconKey: 'recovery' },
    ],
    servicesCanDo: ['Visite domiciliari', 'Cicli programmati', 'Coordinamento con pediatra'],
    servicesCanHelpWith: [
      { label: 'Educazione famiglia', iconKey: 'companion' },
      { label: 'Coordinamento pediatra', iconKey: 'med' },
    ],
    availability: { morning: WEEKDAYS, afternoon: WEEKDAYS, evening: NO_DAYS },
    availableFor: ['Visite domiciliari', 'Cicli programmati'],
    references: [
      {
        author: 'Famiglia M.',
        date: 'Aprile 2026',
        stars: 5,
        text:
          'Con Laura ci siamo sentiti accompagnati nella gestione domiciliare del bambino. Persona straordinaria.',
      },
    ],
    coverageHint: 'Bari città e comuni vicini',
  },
  {
    id: 'nu-5',
    listingIntent: 'cerco',
    category: 'nurse',
    type: 'professional',
    name: 'Giorgia N.',
    age: 41,
    role: 'Infermiera geriatrica',
    viaAgencyName: 'Serenità Casa — Agenzia per la famiglia',
    stars: 4,
    reviewCount: 11,
    locationLabel: "Reggio nell'Emilia",
    online: false,
    shift: 'Coordinamento famiglia',
    rateLabel: '€27 – 35 / prestazione',
    experienceLabel: '10 anni in geriatria',
    weekAvailable: WEEKDAYS,
    match: { istat: '035033', comune: 'Reggio Emilia', cap: '4212x', regione: 'Emilia-Romagna' },
    ...defaultDetail(),
    bio:
      'Sono Giorgia, infermiera con dieci anni di esperienza in geriatria. Lavoro tramite agenzia per offrire continuità su pazienti complessi.',
    bioMore:
      'Sono il punto di riferimento sanitario per la famiglia: aiuto a leggere referti, organizzare la posologia e mantenere ordine sui controlli.',
    traits: ['Esperta', 'Coordinatrice', 'Discreta'],
    competences: [
      { id: 'piano', label: 'Piano assistenziale geriatrico', iconKey: 'book' },
      { id: 'educazione', label: 'Educazione caregiver', iconKey: 'hands' },
      { id: 'med', label: 'Medicazioni e prelievi', iconKey: 'med' },
    ],
    experiences: [
      { ageOrPatient: 'Anziani fragili', yearsLabel: '10 anni', iconKey: 'senior' },
      { ageOrPatient: 'Demenze e Alzheimer', yearsLabel: '6 anni', iconKey: 'alz' },
    ],
    servicesCanDo: ['Tramite agenzia', 'Coordinamento famiglia', 'Cicli programmati'],
    servicesCanHelpWith: [
      { label: 'Lettura referti', iconKey: 'med' },
      { label: 'Educazione caregiver', iconKey: 'companion' },
    ],
    availability: { morning: WEEKDAYS, afternoon: WEEKDAYS, evening: NO_DAYS },
    availableFor: ['Coordinamento famiglia', 'Cicli programmati', 'Tramite agenzia'],
    references: [
      {
        author: 'Famiglia B.',
        date: 'Gennaio 2026',
        stars: 4,
        text:
          'Giorgia è una professionista di lungo corso: ci ha guidato nella scelta dei controlli senza farci sentire soli.',
      },
    ],
    coverageHint: 'Reggio Emilia e comuni della pianura',
  },

  // ───────── AGENZIE (no detail page in v1) ─────────
  {
    id: 'ag-1',
    listingIntent: 'offro',
    category: 'agency',
    type: 'professional',
    name: 'Serena Care Milano',
    role: 'Ricerca badanti e caregiver',
    stars: 4,
    reviewCount: 0,
    locationLabel: 'Roma',
    online: false,
    shift: 'Assunzioni rapide',
    match: { istat: '058091', comune: 'Roma', cap: '001xx', regione: 'Lazio' },
    ...defaultDetail(),
    bio: 'Agenzia di ricerca e selezione per famiglie e strutture.',
    coverageHint: 'Lazio',
  },
  {
    id: 'ag-2',
    listingIntent: 'offro',
    category: 'agency',
    type: 'professional',
    name: 'Vita Domus HR',
    role: 'Selezione OSS e infermieri',
    stars: 5,
    reviewCount: 0,
    locationLabel: 'Milano',
    online: true,
    shift: 'Copertura Lombardia',
    match: { istat: '015146', comune: 'Milano', cap: '201xx', regione: 'Lombardia' },
    ...defaultDetail(),
    bio: 'Agenzia HR specializzata in OSS e infermieri domiciliari.',
    coverageHint: 'Lombardia',
  },
  {
    id: 'ag-3',
    listingIntent: 'offro',
    category: 'agency',
    type: 'professional',
    name: 'Cooperativa Sociale Aurora ONLUS',
    role: 'Staff per strutture e domicilio',
    stars: 4,
    reviewCount: 0,
    locationLabel: 'Torino',
    online: false,
    shift: 'Contratti a progetto',
    match: { istat: '001272', comune: 'Torino', cap: '101xx', regione: 'Piemonte' },
    ...defaultDetail(),
    bio: 'Cooperativa sociale che fornisce personale qualificato a strutture e domicilio.',
    coverageHint: 'Piemonte',
  },
  {
    id: 'ag-4',
    listingIntent: 'offro',
    category: 'agency',
    type: 'professional',
    name: 'Domus Salute HR',
    role: 'Badanti e assistenti familiari',
    stars: 5,
    reviewCount: 0,
    locationLabel: 'Bologna',
    online: true,
    shift: 'Selezione in 48h',
    match: { istat: '037006', comune: 'Bologna', cap: '401xx', regione: 'Emilia-Romagna' },
    ...defaultDetail(),
    bio: 'Agenzia con focus sul matching rapido tra famiglia e assistente familiare.',
    coverageHint: 'Emilia-Romagna',
  },

  // ───────── STRUTTURE (no detail page in v1) ─────────
  {
    id: 'fc-1',
    listingIntent: 'offro',
    category: 'facility',
    type: 'facility',
    name: 'RSA Villa Rosa',
    role: 'Struttura residenziale',
    stars: 4,
    reviewCount: 0,
    locationLabel: 'Bologna',
    online: false,
    shift: 'Ricerca assistenti familiari',
    match: { istat: '037006', comune: 'Bologna', cap: '401xx', regione: 'Emilia-Romagna' },
    ...defaultDetail(),
    bio: 'Residenza Sanitaria Assistenziale.',
    coverageHint: 'Bologna',
  },
  {
    id: 'fc-2',
    listingIntent: 'offro',
    category: 'facility',
    type: 'facility',
    name: 'Casa Serena',
    role: 'Comunità alloggio',
    stars: 5,
    reviewCount: 0,
    locationLabel: 'Vicenza',
    online: false,
    shift: 'Turni 24h',
    match: { istat: '024116', comune: 'Vicenza', cap: '36100', regione: 'Veneto' },
    ...defaultDetail(),
    bio: 'Comunità alloggio per anziani autosufficienti.',
    coverageHint: 'Vicenza',
  },
  {
    id: 'fc-3',
    listingIntent: 'offro',
    category: 'facility',
    type: 'facility',
    name: 'Residenza Parco',
    role: 'RSA con hospice',
    stars: 4,
    reviewCount: 0,
    locationLabel: 'Udine',
    online: true,
    shift: 'OSS e infermieri',
    match: { istat: '030129', comune: 'Udine', cap: '33100', regione: 'Friuli-Venezia Giulia' },
    ...defaultDetail(),
    bio: 'RSA con sezione hospice.',
    coverageHint: 'Udine',
  },
  {
    id: 'fc-4',
    listingIntent: 'offro',
    category: 'facility',
    type: 'facility',
    name: 'Villa dei Tigli',
    role: 'RSA e centro diurno',
    stars: 5,
    reviewCount: 0,
    locationLabel: 'Treviso',
    online: false,
    shift: 'Cerca OSS e badanti',
    match: { istat: '026086', comune: 'Treviso', cap: '31100', regione: 'Veneto' },
    ...defaultDetail(),
    bio: 'RSA e centro diurno per anziani.',
    coverageHint: 'Treviso',
  },
]

let personSlot = 0
function nextPersonImage(): string {
  personSlot += 1
  return profileMockImage(personSlot)
}

export const MOCK_PROFILES: MockProfile[] = profileSeed.map((row) => {
  if (row.category === 'agency') {
    return { ...row, imageUrl: AGENCY_GRAPHIC }
  }
  if (row.type === 'facility') {
    return { ...row, imageUrl: FACILITY_GRAPHIC }
  }
  return { ...row, imageUrl: nextPersonImage() }
})

export function getMockProfileById(id: string): MockProfile | undefined {
  const synced = resolvePublicProfileById(id)
  if (synced) return synced
  return MOCK_PROFILES.find((p) => p.id === id)
}

/** Returns true if the profile has a dedicated detail page in v1 (only individual professionals). */
export function profileHasDetailPage(p: Pick<MockProfile, 'type' | 'category'>): boolean {
  return p.type === 'professional' && p.category !== 'agency'
}

/**
 * Profili simili: stessa intent + stessa categoria, priorità a stessa regione e poi stesso comune ISTAT.
 * Esclude il profilo corrente. Limit default 8 per il carosello.
 */
export function listSimilarProfiles(p: MockProfile, limit = 8): MockProfile[] {
  const candidates = MOCK_PROFILES.filter(
    (other) =>
      other.id !== p.id &&
      other.listingIntent === p.listingIntent &&
      other.category === p.category &&
      profileHasDetailPage(other),
  )

  const sameIstat = candidates.filter((c) => c.match.istat === p.match.istat)
  const sameRegion = candidates.filter(
    (c) => c.match.istat !== p.match.istat && c.match.regione === p.match.regione,
  )
  const others = candidates.filter(
    (c) => c.match.istat !== p.match.istat && c.match.regione !== p.match.regione,
  )

  return [...sameIstat, ...sameRegion, ...others].slice(0, limit)
}

// ── Adapter di compatibilità verso i tipi card esistenti ──
export function toCarouselCard(p: MockProfile): HomeProfileCarouselCard {
  return {
    id: p.id,
    category: p.category,
    type: p.type,
    name: p.name,
    role: p.role,
    stars: p.stars,
    location: true,
    online: p.online,
    shift: p.shift,
    imageUrl: p.imageUrl,
    locationLabel: p.locationLabel,
    viaAgencyName: p.viaAgencyName,
    age: p.age,
    rateLabel: p.rateLabel,
    experienceLabel: p.experienceLabel,
    weekAvailable: p.weekAvailable,
  }
}

export function toDirectoryCard(p: MockProfile): DirectoryProfileSummary {
  return {
    id: p.id,
    listingIntent: p.listingIntent,
    category: p.category,
    type: p.type,
    name: p.name,
    role: p.role,
    stars: p.stars,
    locationLabel: p.locationLabel,
    location: true,
    online: p.online,
    shift: p.shift,
    viaAgencyName: p.viaAgencyName,
    imageUrl: p.imageUrl,
    match: p.match,
  }
}
