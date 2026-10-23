import type { PrimaryRole, RegisterIntent, SeekerOrgKind } from '../auth/registerDraft'

export type SignupLandingId = 'assistente-familiare' | 'agenzia'

export type SignupLandingConfig = {
  id: SignupLandingId
  path: string
  intent: RegisterIntent
  /** Prefill offer role */
  primaryRole?: PrimaryRole
  seekerOrgKind?: SeekerOrgKind
  seekerCareType?: string
  eyebrow: string
  title: string
  lead: string
  nameLabel: string
  namePlaceholder: string
  placeLabel: string
  submitLabel: string
  steps: { title: string; text: string }[]
  bullets: string[]
}

export const SIGNUP_LANDINGS: Record<SignupLandingId, SignupLandingConfig> = {
  'assistente-familiare': {
    id: 'assistente-familiare',
    path: '/iscrizione-assistente-familiare',
    intent: 'offer',
    primaryRole: 'caregiver',
    eyebrow: 'Assistenti familiari e caregiver',
    title: 'Iscriviti e fatti trovare dalle famiglie vicino a te',
    lead: 'Tre passi essenziali: i tuoi dati, la privacy, la zona in cui lavori. Il resto del profilo lo completi dopo l’accesso.',
    nameLabel: 'Nome e cognome',
    namePlaceholder: 'Es. Maria Rossi',
    placeLabel: 'Dove operi principalmente?',
    submitLabel: 'Crea account e continua',
    steps: [
      { title: 'Account in un minuto', text: 'Nome, email e conferma privacy: niente dati sensibili in fase di iscrizione.' },
      { title: 'Zona di lavoro chiara', text: 'Scegli il comune dai suggerimenti: così appari correttamente nelle ricerche locali.' },
      { title: 'Profilo dopo l’accesso', text: 'Esperienza, disponibilità e documenti si completano dall’area riservata.' },
    ],
    bullets: ['Iscrizione gratuita', 'Visibilità locale', 'Niente dati clinici richiesti'],
  },
  agenzia: {
    id: 'agenzia',
    path: '/iscrizione-agenzia',
    intent: 'seeker',
    seekerOrgKind: 'agency',
    seekerCareType: 'agenzia',
    eyebrow: 'Agenzie per il lavoro',
    title: 'Iscrivi la tua agenzia su Curaxe',
    lead: 'Crea l’account con i dati essenziali del referente, accetta la privacy e indica la zona operativa. Poi completi l’area riservata.',
    nameLabel: 'Nome referente',
    namePlaceholder: 'Es. Luca Bianchi',
    placeLabel: 'Dove opera la tua agenzia?',
    submitLabel: 'Crea account agenzia',
    steps: [
      { title: 'Account referente', text: 'Solo nome ed email: partiamo dal minimo necessario per attivarti.' },
      { title: 'Privacy e zona', text: 'Accetti l’informativa e selezioni il comune operativo dai suggerimenti geo.' },
      { title: 'Area riservata', text: 'Dopo la verifica email gestisci richieste e profilo dalla dashboard.' },
    ],
    bullets: ['Onboarding rapido', 'Zona operativa coerente', 'Contatti qualificati'],
  },
}
