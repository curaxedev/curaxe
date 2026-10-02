import type {
  AdminKycDecision,
  AdminKycDocument,
  AdminKycHistoryEntry,
  AdminKycQueueItem,
  AdminKycQueueStore,
  AdminKycRejectInput,
} from '../lib/adminKycTypes'
import { AdminKycError } from '../lib/adminKycTypes'

const MOCK_DELAY_MS = 500
const QUEUE_STORAGE_KEY = 'fa:admin-kyc-queue'
const VERIFIED_STORAGE_KEY = 'fa:kyc-verified-professional-ids'

const MOCK_IMAGE_URL =
  '/images/profile-mock/Screenshot%202026-05-11%20alle%2023.37.47.png'

export const KYC_DOCUMENT_TYPE_LABELS: Record<AdminKycDocument['type'], string> = {
  id_card: 'Carta identità',
  diploma: 'Diploma / attestato',
  license: 'Patente',
  criminal_record: 'Certificato penale',
  other: 'Altro documento',
}

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readVerifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(VERIFIED_STORAGE_KEY)
    if (!raw) return new Set()
    const ids = JSON.parse(raw) as string[]
    return new Set(ids)
  } catch {
    return new Set()
  }
}

function writeVerifiedIds(ids: Set<string>): void {
  localStorage.setItem(VERIFIED_STORAGE_KEY, JSON.stringify([...ids]))
}

export function isProfessionalKycVerified(professionalId: string): boolean {
  return readVerifiedIds().has(professionalId)
}

function readStore(): AdminKycQueueStore | null {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AdminKycQueueStore
  } catch {
    return null
  }
}

function writeStore(store: AdminKycQueueStore): void {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(store))
}

function createSeedStore(): AdminKycQueueStore {
  const pending: AdminKycQueueItem[] = [
    {
      id: 'ver-1',
      professionalId: 'prof-6',
      name: 'Giuseppina Sarti',
      initials: 'GS',
      email: 'g.sarti@email.it',
      category: 'Badante',
      submittedAt: '2026-04-01T09:15:00.000Z',
      documents: [
        {
          id: 'doc-1-1',
          type: 'id_card',
          label: 'Carta identità',
          url: MOCK_IMAGE_URL,
          mimeType: 'image',
          status: 'pending',
        },
        {
          id: 'doc-1-2',
          type: 'diploma',
          label: 'Attestato OSS',
          url: '/docs/mock/oss-certificate.pdf',
          mimeType: 'pdf',
          status: 'pending',
        },
      ],
    },
    {
      id: 'ver-2',
      professionalId: 'prof-8',
      name: 'Luciana Toma',
      initials: 'LT',
      email: 'l.toma@email.it',
      category: 'Infermiere',
      submittedAt: '2026-05-08T10:00:00.000Z',
      documents: [
        {
          id: 'doc-2-1',
          type: 'id_card',
          label: 'Carta identità',
          url: MOCK_IMAGE_URL,
          mimeType: 'image',
          status: 'pending',
        },
        {
          id: 'doc-2-2',
          type: 'diploma',
          label: 'Laurea in Infermieristica',
          url: '/docs/mock/nursing-degree.pdf',
          mimeType: 'pdf',
          status: 'pending',
        },
        {
          id: 'doc-2-3',
          type: 'license',
          label: 'Iscrizione CRNI',
          url: '/docs/mock/crni-registration.pdf',
          mimeType: 'pdf',
          status: 'pending',
        },
      ],
    },
    {
      id: 'ver-3',
      professionalId: 'prof-9',
      name: 'Dimitri Popa',
      initials: 'DP',
      email: 'd.popa@email.it',
      category: 'OSS',
      submittedAt: '2026-05-06T14:30:00.000Z',
      documents: [
        {
          id: 'doc-3-1',
          type: 'id_card',
          label: 'Carta identità',
          url: MOCK_IMAGE_URL,
          mimeType: 'image',
          status: 'pending',
        },
        {
          id: 'doc-3-2',
          type: 'diploma',
          label: 'Attestato OSS',
          url: '/docs/mock/oss-certificate.pdf',
          mimeType: 'pdf',
          status: 'pending',
        },
        {
          id: 'doc-3-3',
          type: 'license',
          label: 'Patente B',
          url: MOCK_IMAGE_URL,
          mimeType: 'image',
          status: 'pending',
        },
      ],
    },
  ]

  return { pending, history: [] }
}

export function loadAdminKycStore(): AdminKycQueueStore {
  const stored = readStore()
  if (stored) return stored
  const seed = createSeedStore()
  writeStore(seed)
  return seed
}

function shouldSimulateServerError(actorEmail?: string): boolean {
  return Boolean(actorEmail?.toLowerCase().includes('server-error'))
}

export async function fetchAdminKycQueue(actorEmail?: string): Promise<AdminKycQueueItem[]> {
  await delay()
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminKycError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }
  return loadAdminKycStore().pending
}

function markVerified(professionalId: string): void {
  const ids = readVerifiedIds()
  ids.add(professionalId)
  writeVerifiedIds(ids)
}

function appendHistory(
  item: AdminKycQueueItem,
  decision: AdminKycDecision,
  reason?: string,
): AdminKycHistoryEntry {
  const entry: AdminKycHistoryEntry = {
    id: `hist-${Date.now()}`,
    professionalId: item.professionalId,
    name: item.name,
    decision,
    reason,
    decidedAt: new Date().toISOString(),
  }
  return entry
}

export async function approveAdminKycItem(
  verificationId: string,
  actorEmail?: string,
): Promise<AdminKycQueueItem> {
  await delay(300)
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminKycError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const store = loadAdminKycStore()
  const index = store.pending.findIndex((p) => p.id === verificationId)
  if (index === -1) {
    throw new AdminKycError('not_found', 'Richiesta di verifica non trovata.')
  }

  const [item] = store.pending.splice(index, 1)
  markVerified(item.professionalId)
  const historyEntry = appendHistory(item, 'approved')
  writeStore({
    pending: store.pending,
    history: [historyEntry, ...store.history],
  })
  return item
}

export function validateAdminKycReject(input: AdminKycRejectInput): AdminKycError | null {
  const reason = (input.reason ?? '').trim()
  if (!reason) {
    return new AdminKycError('validation', 'Indica un motivo per il rifiuto.')
  }
  if (reason.length < 10) {
    return new AdminKycError('validation', 'Il motivo deve contenere almeno 10 caratteri.')
  }
  return null
}

export async function rejectAdminKycItem(
  verificationId: string,
  input: AdminKycRejectInput,
  actorEmail?: string,
): Promise<AdminKycQueueItem> {
  await delay(300)
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminKycError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const validationError = validateAdminKycReject(input)
  if (validationError) {
    throw validationError
  }

  const store = loadAdminKycStore()
  const index = store.pending.findIndex((p) => p.id === verificationId)
  if (index === -1) {
    throw new AdminKycError('not_found', 'Richiesta di verifica non trovata.')
  }

  const [item] = store.pending.splice(index, 1)
  const historyEntry = appendHistory(item, 'rejected', (input.reason ?? '').trim())
  writeStore({
    pending: store.pending,
    history: [historyEntry, ...store.history],
  })
  return item
}

export function formatAdminKycDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatAdminKycDocumentsSummary(documents: AdminKycDocument[]): string {
  return documents.map((d) => d.label).join(', ')
}
