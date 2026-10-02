import type { AdminKycDocument } from '../lib/adminKycTypes'
import type {
  AdminUserActivityEntry,
  AdminUserDetail,
  AdminUserListFilters,
  AdminUserListItem,
  AdminUserRecord,
  AdminUserRole,
  AdminUserStatus,
  AdminUserStore,
} from '../lib/adminUserTypes'
import { AdminUserError } from '../lib/adminUserTypes'
import { isProfessionalKycVerified, loadAdminKycStore } from './adminKycService'

const MOCK_DELAY_MS = 500
const USERS_STORAGE_KEY = 'fa:admin-users'

export const ADMIN_USER_ROLE_LABELS: Record<AdminUserRole, string> = {
  professional: 'Professionista',
  family: 'Famiglia',
  agency: 'Agenzia',
  structure: 'Struttura RSA',
  admin: 'Admin',
}

export const ADMIN_USER_STATUS_LABELS: Record<AdminUserStatus, string> = {
  active: 'Attivo',
  suspended: 'Sospeso',
  verify: 'Da verificare',
}

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readStore(): AdminUserStore | null {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AdminUserStore
  } catch {
    return null
  }
}

function writeStore(store: AdminUserStore): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(store))
}

function createSeedStore(): AdminUserStore {
  const users: AdminUserRecord[] = [
    {
      id: 'usr-1',
      name: 'Maria Rossi',
      email: 'maria.rossi@email.it',
      initials: 'MR',
      role: 'professional',
      status: 'active',
      registeredAt: '2026-03-15T09:00:00.000Z',
      professionalId: 'prof-1',
      phone: '+39 333 1234567',
      city: 'Milano',
      subscriptionPlan: 'Premium',
    },
    {
      id: 'usr-2',
      name: 'Famiglia Bianchi',
      email: 'bianchi@email.it',
      initials: 'FB',
      role: 'family',
      status: 'active',
      registeredAt: '2026-03-20T14:30:00.000Z',
      city: 'Milano',
    },
    {
      id: 'usr-3',
      name: 'AuraCare Srl',
      email: 'info@auracare.it',
      initials: 'AC',
      role: 'agency',
      status: 'active',
      registeredAt: '2026-02-10T11:00:00.000Z',
      city: 'Monza',
      subscriptionPlan: 'B2B Premium',
    },
    {
      id: 'usr-4',
      name: 'Giuseppina Sarti',
      email: 'g.sarti@email.it',
      initials: 'GS',
      role: 'professional',
      status: 'verify',
      registeredAt: '2026-04-01T09:15:00.000Z',
      professionalId: 'prof-6',
      phone: '+39 340 9876543',
      city: 'Sesto San Giovanni',
    },
    {
      id: 'usr-5',
      name: 'Famiglia Ferrari',
      email: 'ferrari@email.it',
      initials: 'FF',
      role: 'family',
      status: 'active',
      registeredAt: '2026-04-05T16:00:00.000Z',
      city: 'Legnano',
    },
    {
      id: 'usr-6',
      name: 'Florentina Pop',
      email: 'fpop@email.it',
      initials: 'FP',
      role: 'professional',
      status: 'suspended',
      registeredAt: '2026-04-12T08:45:00.000Z',
      professionalId: 'prof-5',
      phone: '+39 347 5551234',
      city: 'Rho',
    },
    {
      id: 'usr-7',
      name: 'RSA Villa Serena',
      email: 'info@villaserena.it',
      initials: 'RV',
      role: 'structure',
      status: 'active',
      registeredAt: '2026-03-01T10:00:00.000Z',
      city: 'Sesto San Giovanni',
      subscriptionPlan: 'B2B Premium',
    },
    {
      id: 'usr-8',
      name: 'Luciana Toma',
      email: 'l.toma@email.it',
      initials: 'LT',
      role: 'professional',
      status: 'verify',
      registeredAt: '2026-05-08T10:00:00.000Z',
      professionalId: 'prof-8',
      phone: '+39 338 2223344',
      city: 'Monza',
    },
    {
      id: 'usr-9',
      name: 'Famiglia Ricci',
      email: 'ricci@email.it',
      initials: 'FR',
      role: 'family',
      status: 'active',
      registeredAt: '2026-04-25T12:00:00.000Z',
      city: 'Milano',
    },
    {
      id: 'usr-10',
      name: 'Carmen Ionescu',
      email: 'c.ionescu@email.it',
      initials: 'CI',
      role: 'professional',
      status: 'active',
      registeredAt: '2026-05-03T15:30:00.000Z',
      professionalId: 'prof-10',
      phone: '+39 320 7788990',
      city: 'Milano',
      subscriptionPlan: 'Premium',
    },
  ]

  return { users }
}

export function loadAdminUserStore(): AdminUserStore {
  const stored = readStore()
  if (stored) return stored
  const seed = createSeedStore()
  writeStore(seed)
  return seed
}

function shouldSimulateServerError(actorEmail?: string): boolean {
  return Boolean(actorEmail?.toLowerCase().includes('server-error'))
}

function toListItem(user: AdminUserRecord): AdminUserListItem {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    initials: user.initials,
    role: user.role,
    status: user.status,
    registeredAt: user.registeredAt,
    professionalId: user.professionalId,
  }
}

export function filterAdminUsers(
  users: AdminUserListItem[],
  filters: AdminUserListFilters,
): AdminUserListItem[] {
  const role = filters.role ?? 'all'
  const status = filters.status ?? 'all'
  const search = filters.search?.trim().toLowerCase() ?? ''

  return users.filter((user) => {
    if (role !== 'all' && user.role !== role) return false
    if (status !== 'all' && user.status !== status) return false
    if (search) {
      const haystack = `${user.name} ${user.email}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })
}

function resolveKycDocuments(user: AdminUserRecord): AdminKycDocument[] {
  if (!user.professionalId) return []

  const kycStore = loadAdminKycStore()
  const pending = kycStore.pending.find((p) => p.professionalId === user.professionalId)
  if (pending) return pending.documents

  const historyEntry = kycStore.history.find((h) => h.professionalId === user.professionalId)
  if (historyEntry && isProfessionalKycVerified(user.professionalId)) {
    return [
      {
        id: `kyc-approved-${user.professionalId}`,
        type: 'id_card',
        label: 'Carta identità',
        url: '/images/profile-mock/Screenshot%202026-05-11%20alle%2023.37.47.png',
        mimeType: 'image',
        status: 'approved',
      },
      {
        id: `kyc-approved-diploma-${user.professionalId}`,
        type: 'diploma',
        label: 'Attestato professionale',
        url: '/docs/mock/oss-certificate.pdf',
        mimeType: 'pdf',
        status: 'approved',
      },
    ]
  }

  if (historyEntry?.decision === 'rejected') {
    return [
      {
        id: `kyc-rejected-${user.professionalId}`,
        type: 'id_card',
        label: 'Carta identità',
        url: '/images/profile-mock/Screenshot%202026-05-11%20alle%2023.37.47.png',
        mimeType: 'image',
        status: 'rejected',
      },
    ]
  }

  return []
}

function buildActivityHistory(user: AdminUserRecord): AdminUserActivityEntry[] {
  const entries: AdminUserActivityEntry[] = [
    {
      id: `${user.id}-reg`,
      type: 'registration',
      label: 'Registrazione completata',
      occurredAt: user.registeredAt,
    },
  ]

  if (user.role === 'professional') {
    entries.push({
      id: `${user.id}-profile`,
      type: 'profile_update',
      label: 'Profilo professionista aggiornato',
      occurredAt: new Date(new Date(user.registeredAt).getTime() + 86400000).toISOString(),
    })
  }

  if (user.subscriptionPlan) {
    entries.push({
      id: `${user.id}-sub`,
      type: 'subscription',
      label: `Abbonamento ${user.subscriptionPlan} attivato`,
      occurredAt: new Date(new Date(user.registeredAt).getTime() + 172800000).toISOString(),
    })
  }

  if (user.status === 'verify' && user.professionalId) {
    entries.push({
      id: `${user.id}-kyc`,
      type: 'kyc_submit',
      label: 'Documenti KYC inviati in verifica',
      occurredAt: new Date(new Date(user.registeredAt).getTime() + 259200000).toISOString(),
    })
  }

  if (user.professionalId && isProfessionalKycVerified(user.professionalId)) {
    entries.push({
      id: `${user.id}-kyc-ok`,
      type: 'kyc_approved',
      label: 'Verifica identità approvata',
      occurredAt: new Date(new Date(user.registeredAt).getTime() + 432000000).toISOString(),
    })
  }

  const kycStore = loadAdminKycStore()
  const rejected = kycStore.history.find(
    (h) => h.professionalId === user.professionalId && h.decision === 'rejected',
  )
  if (rejected) {
    entries.push({
      id: `${user.id}-kyc-no`,
      type: 'kyc_rejected',
      label: rejected.reason ? `Verifica rifiutata: ${rejected.reason}` : 'Verifica identità rifiutata',
      occurredAt: rejected.decidedAt,
    })
  }

  if (user.status === 'suspended') {
    entries.push({
      id: `${user.id}-susp`,
      type: 'suspended',
      label: 'Account sospeso dall\'amministratore',
      occurredAt: new Date(new Date(user.registeredAt).getTime() + 604800000).toISOString(),
    })
  }

  entries.push({
    id: `${user.id}-login`,
    type: 'login',
    label: 'Ultimo accesso',
    occurredAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  })

  return entries.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )
}

export async function fetchAdminUsers(actorEmail?: string): Promise<AdminUserListItem[]> {
  await delay()
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminUserError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }
  return loadAdminUserStore().users.map(toListItem)
}

export async function fetchAdminUserDetail(
  userId: string,
  actorEmail?: string,
): Promise<AdminUserDetail> {
  await delay(300)
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminUserError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const store = loadAdminUserStore()
  const user = store.users.find((u) => u.id === userId)
  if (!user) {
    throw new AdminUserError('not_found', 'Utente non trovato.')
  }

  return {
    ...user,
    activity: buildActivityHistory(user),
    kycDocuments: resolveKycDocuments(user),
  }
}

export async function suspendAdminUser(
  userId: string,
  actorEmail?: string,
): Promise<AdminUserListItem> {
  await delay(300)
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminUserError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const store = loadAdminUserStore()
  const user = store.users.find((u) => u.id === userId)
  if (!user) {
    throw new AdminUserError('not_found', 'Utente non trovato.')
  }
  if (user.status === 'suspended') {
    throw new AdminUserError('validation', 'L\'account è già sospeso.')
  }

  user.status = 'suspended'
  writeStore(store)
  return toListItem(user)
}

export async function reactivateAdminUser(
  userId: string,
  actorEmail?: string,
): Promise<AdminUserListItem> {
  await delay(300)
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminUserError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const store = loadAdminUserStore()
  const user = store.users.find((u) => u.id === userId)
  if (!user) {
    throw new AdminUserError('not_found', 'Utente non trovato.')
  }
  if (user.status !== 'suspended') {
    throw new AdminUserError('validation', 'Solo gli account sospesi possono essere riattivati.')
  }

  user.status = 'active'
  writeStore(store)
  return toListItem(user)
}

export async function deleteAdminUser(userId: string, actorEmail?: string): Promise<void> {
  await delay(300)
  if (shouldSimulateServerError(actorEmail)) {
    throw new AdminUserError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }

  const store = loadAdminUserStore()
  const user = store.users.find((u) => u.id === userId)
  if (!user) {
    throw new AdminUserError('not_found', 'Utente non trovato.')
  }
  if (user.role === 'admin') {
    throw new AdminUserError('validation', 'Non puoi eliminare un admin della piattaforma.')
  }

  store.users = store.users.filter((u) => u.id !== userId)
  writeStore(store)
}

export function formatAdminUserDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatAdminUserDateTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
