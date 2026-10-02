/**
 * Tassonomia competenze profilo professionista.
 * Specializzazioni = ambiti di cura / pazienti.
 * Certificazioni = titoli e corsi formali (niente patente: resta nel toggle «Patente B»).
 */

export type CompetenceOption = {
  label: string
  /** Testo extra per ricerca (sinonimi, abbreviazioni). */
  search?: string
}

export const SPECIALIZATION_OPTIONS: CompetenceOption[] = [
  { label: 'Anziani autosufficienti', search: 'terza età autonomia compagnia' },
  { label: 'Anziani non autosufficienti', search: 'non autosufficienza dipendenza' },
  { label: 'Alzheimer e demenze', search: 'demenza cognitiva memoria' },
  { label: 'Parkinson e malattie neurodegenerative', search: 'neuro' },
  { label: 'Disabilità fisica', search: 'motoria carrozzina' },
  { label: 'Disabilità cognitiva e intellettiva', search: 'ritardo cognitivo' },
  { label: 'Assistenza post-operatoria', search: 'chirurgia convalescenza' },
  { label: 'Patologie croniche e gravi', search: 'cronico oncologia' },
  { label: 'Cure palliative e fine vita', search: 'hospice' },
  { label: 'Igiene e mobilizzazione', search: 'igiene personale sollevamento' },
  { label: 'Somministrazione farmaci', search: 'terapia farmacologica' },
  { label: 'Preparazione pasti e nutrizione', search: 'cucina alimentazione' },
  { label: 'Assistenza notturna', search: 'notte vigilanza' },
  { label: 'Accompagnamento e uscite', search: 'passeggiate visite' },
  { label: 'Supporto pediatrico e minori', search: 'bambini adolescenti' },
]

export const CERTIFICATION_OPTIONS: CompetenceOption[] = [
  { label: 'Qualifica OSS', search: 'operatore socio sanitario oss certificato' },
  { label: 'Corso assistente familiare', search: 'badante regionale asa' },
  { label: 'Corso badante professionale', search: 'formazione badante' },
  { label: 'Diploma o laurea in Infermieristica', search: 'infermiere ipasvi ordine' },
  { label: 'Corso Alzheimer e demenze', search: 'demenza formazione' },
  { label: 'Primo soccorso (BLS / BLSD)', search: 'primo soccorso bls blsd rcp' },
  { label: 'Movimentazione manuale dei carichi', search: 'mmc sollevamento ergonomia' },
  { label: 'HACCP / igiene alimentare', search: 'cucina sicurezza alimentare' },
  { label: 'Corso sostegno disabilità', search: 'ada inclusione' },
  { label: 'Formazione privacy operatori (GDPR)', search: 'privacy dati' },
]

/** Valori legacy → nuova etichetta (o null = rimuovere / gestire altrove). */
const SPECIALIZATION_ALIASES: Record<string, string | null> = {
  'Anziani autosufficienti': 'Anziani autosufficienti',
  'Alzheimer/Demenze': 'Alzheimer e demenze',
  'Alzheimer e demenze': 'Alzheimer e demenze',
  'Patologie gravi': 'Patologie croniche e gravi',
  'Patologie croniche e gravi': 'Patologie croniche e gravi',
  'Post-operatorio': 'Assistenza post-operatoria',
  'Assistenza post-operatoria': 'Assistenza post-operatoria',
  Disabilità: 'Disabilità fisica',
  'Disabilità fisica': 'Disabilità fisica',
  Pediatrico: 'Supporto pediatrico e minori',
  'Supporto pediatrico e minori': 'Supporto pediatrico e minori',
}

const CERTIFICATION_ALIASES: Record<string, string | null> = {
  'OSS certificato': 'Qualifica OSS',
  'Qualifica OSS': 'Qualifica OSS',
  'Assistente familiare': 'Corso assistente familiare',
  'Corso assistente familiare': 'Corso assistente familiare',
  'Primo soccorso': 'Primo soccorso (BLS / BLSD)',
  'Primo soccorso (BLS / BLSD)': 'Primo soccorso (BLS / BLSD)',
  'Patente di guida': null,
  'Patente B': null,
  'Diploma infermieristico': 'Diploma o laurea in Infermieristica',
  'Diploma o laurea in Infermieristica': 'Diploma o laurea in Infermieristica',
  'Corso Alzheimer': 'Corso Alzheimer e demenze',
  'Corso Alzheimer e demenze': 'Corso Alzheimer e demenze',
  'Corso badante professionale': 'Corso badante professionale',
}

function normalizeList(
  values: string[],
  aliases: Record<string, string | null>,
  allowed: Set<string>,
): { labels: string[]; hadDriverLicense: boolean } {
  const out: string[] = []
  let hadDriverLicense = false
  for (const raw of values) {
    const key = raw.trim()
    if (!key) continue
    if (key === 'Patente di guida' || key === 'Patente B') {
      hadDriverLicense = true
      continue
    }
    const mapped = Object.prototype.hasOwnProperty.call(aliases, key) ? aliases[key] : key
    if (mapped === null) {
      if (key.toLowerCase().includes('patente')) hadDriverLicense = true
      continue
    }
    if (!allowed.has(mapped)) continue
    if (!out.includes(mapped)) out.push(mapped)
  }
  return { labels: out, hadDriverLicense }
}

export function normalizeSpecializations(values: string[]): string[] {
  const allowed = new Set(SPECIALIZATION_OPTIONS.map((o) => o.label))
  return normalizeList(values, SPECIALIZATION_ALIASES, allowed).labels
}

export function normalizeCertifications(values: string[]): {
  certifications: string[]
  hadDriverLicense: boolean
} {
  const allowed = new Set(CERTIFICATION_OPTIONS.map((o) => o.label))
  const { labels, hadDriverLicense } = normalizeList(values, CERTIFICATION_ALIASES, allowed)
  return { certifications: labels, hadDriverLicense }
}

export function filterCompetenceOptions(
  options: CompetenceOption[],
  query: string,
): CompetenceOption[] {
  const q = query.trim().toLowerCase()
  if (!q) return options
  return options.filter((o) => {
    const hay = `${o.label} ${o.search ?? ''}`.toLowerCase()
    return hay.includes(q) || q.split(/\s+/).every((part) => hay.includes(part))
  })
}
