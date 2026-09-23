import type {
  TeamMember,
  TeamMemberInviteInput,
  TeamMemberRole,
} from '../lib/teamMemberTypes'
import { TeamMemberError } from '../lib/teamMemberTypes'

const MOCK_DELAY_MS = 400
const STORAGE_PREFIX = 'fa:team-members:'

export const TEAM_MEMBER_ROLE_LABELS: Record<TeamMemberRole, string> = {
  admin: 'Amministratore',
  recruiter: 'Recruiter',
  viewer: 'Sola lettura',
}

export const TEAM_MEMBER_STATUS_LABELS: Record<TeamMember['status'], string> = {
  active: 'Attivo',
  invited: 'Invito inviato',
  removed: 'Rimosso',
}

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function storageKey(orgId: string): string {
  return `${STORAGE_PREFIX}${orgId}`
}

function readStore(orgId: string): TeamMember[] | null {
  try {
    const raw = localStorage.getItem(storageKey(orgId))
    if (!raw) return null
    return JSON.parse(raw) as TeamMember[]
  } catch {
    return null
  }
}

function writeStore(orgId: string, members: TeamMember[]): void {
  localStorage.setItem(storageKey(orgId), JSON.stringify(members))
}

function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }
  return local.slice(0, 2).toUpperCase() || '??'
}

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

function createSeedMembers(orgId: string): TeamMember[] {
  return [
    {
      id: `tm-${orgId}-1`,
      orgId,
      email: 'direzione@example.it',
      name: 'Direzione operativa',
      initials: 'DO',
      role: 'admin',
      status: 'active',
      invitedAt: '2026-01-15T09:00:00.000Z',
      joinedAt: '2026-01-16T11:00:00.000Z',
    },
    {
      id: `tm-${orgId}-2`,
      orgId,
      email: 'hr.recruiting@example.it',
      name: 'HR Recruiting',
      initials: 'HR',
      role: 'recruiter',
      status: 'active',
      invitedAt: '2026-02-01T08:00:00.000Z',
      joinedAt: '2026-02-02T14:00:00.000Z',
    },
  ]
}

export function loadTeamMembers(orgId: string): TeamMember[] {
  const stored = readStore(orgId)
  if (stored?.length) return stored.filter((m) => m.status !== 'removed')
  const seed = createSeedMembers(orgId)
  writeStore(orgId, seed)
  return seed
}

export function validateTeamMemberInvite(
  input: TeamMemberInviteInput,
  existing: TeamMember[],
): TeamMemberError | null {
  const fieldErrors: NonNullable<TeamMemberError['fieldErrors']> = {}
  const email = input.email.trim().toLowerCase()

  if (!email) {
    fieldErrors.email = 'Inserisci l\'email del collaboratore.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = 'Email non valida.'
  } else if (existing.some((m) => m.email.toLowerCase() === email && m.status !== 'removed')) {
    fieldErrors.email = 'Questo membro è già nel team o ha un invito pendente.'
  }

  if (!input.role) {
    fieldErrors.role = 'Seleziona un ruolo.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return new TeamMemberError('validation', 'Controlla i campi evidenziati.', fieldErrors)
  }
  return null
}

export async function fetchTeamMembers(orgId: string): Promise<TeamMember[]> {
  await delay()
  if (!orgId) throw new TeamMemberError('not_found', 'Sessione non valida.')
  if (orgId.toLowerCase().includes('server-error')) {
    throw new TeamMemberError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }
  return loadTeamMembers(orgId)
}

export async function inviteTeamMember(
  orgId: string,
  input: TeamMemberInviteInput,
): Promise<TeamMember> {
  await delay()
  if (!orgId) throw new TeamMemberError('not_found', 'Sessione non valida.')

  const store = loadTeamMembers(orgId)
  const validationError = validateTeamMemberInvite(input, store)
  if (validationError) throw validationError

  const email = input.email.trim().toLowerCase()
  const now = new Date().toISOString()
  const member: TeamMember = {
    id: `tm-${orgId}-${Date.now()}`,
    orgId,
    email,
    name: displayNameFromEmail(email),
    initials: initialsFromEmail(email),
    role: input.role,
    status: 'invited',
    invitedAt: now,
    joinedAt: null,
  }

  writeStore(orgId, [member, ...store])
  return member
}

export async function removeTeamMember(orgId: string, memberId: string): Promise<void> {
  await delay(200)
  if (!orgId) throw new TeamMemberError('not_found', 'Sessione non valida.')

  const store = loadTeamMembers(orgId)
  const index = store.findIndex((m) => m.id === memberId)
  if (index === -1) throw new TeamMemberError('not_found', 'Membro non trovato.')

  const next = store.map((m) =>
    m.id === memberId ? { ...m, status: 'removed' as const } : m,
  )
  writeStore(orgId, next)
}

export function formatTeamMemberDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
