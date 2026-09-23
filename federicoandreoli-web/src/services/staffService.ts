import type { StaffMember, StaffMemberInput, StaffMemberStatus } from '../lib/staffTypes'
import { StaffError } from '../lib/staffTypes'

const MOCK_DELAY_MS = 350
const STORAGE_PREFIX = 'fa:staff:'

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function storageKey(orgId: string): string {
  return `${STORAGE_PREFIX}${orgId}`
}

function initialsFromName(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
}

function readStore(orgId: string): StaffMember[] {
  try {
    const raw = localStorage.getItem(storageKey(orgId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as StaffMember[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStore(orgId: string, items: StaffMember[]): void {
  localStorage.setItem(storageKey(orgId), JSON.stringify(items))
}

function seed(orgId: string): StaffMember[] {
  const existing = readStore(orgId)
  if (existing.length > 0) return existing
  if (orgId !== 'struct-1') return existing

  const seedItems: StaffMember[] = [
    {
      id: 'staff-1',
      orgId,
      name: 'Giuseppe Pieri',
      initials: 'GP',
      category: 'OSS',
      department: 'Alzheimer',
      status: 'on-shift',
    },
    {
      id: 'staff-2',
      orgId,
      name: 'Antonella Toni',
      initials: 'AT',
      category: 'Infermiere',
      department: 'Lungodegenti',
      status: 'available',
    },
    {
      id: 'staff-3',
      orgId,
      name: 'Fabio Caruso',
      initials: 'FC',
      category: 'OSS',
      department: 'Alzheimer',
      status: 'on-shift',
    },
    {
      id: 'staff-4',
      orgId,
      name: 'Laura Bernini',
      initials: 'LB',
      category: 'Ausiliario',
      department: 'Riabilitazione',
      status: 'available',
    },
    {
      id: 'staff-5',
      orgId,
      name: 'Rosa Manno',
      initials: 'RM',
      category: 'OSS',
      department: 'Lungodegenti',
      status: 'leave',
    },
  ]
  writeStore(orgId, seedItems)
  return seedItems
}

export async function listStaff(orgId: string): Promise<StaffMember[]> {
  await delay()
  if (!orgId) throw new StaffError('validation', 'Organizzazione non valida.')
  return seed(orgId)
}

export async function createStaffMember(orgId: string, input: StaffMemberInput): Promise<StaffMember> {
  await delay()
  if (!orgId || !input.name.trim() || !input.category.trim() || !input.department.trim()) {
    throw new StaffError('validation', 'Compila nome, categoria e reparto.')
  }
  const store = seed(orgId)
  const member: StaffMember = {
    id: `staff-${Date.now().toString(36)}`,
    orgId,
    name: input.name.trim(),
    initials: initialsFromName(input.name.trim()),
    category: input.category.trim(),
    department: input.department.trim(),
    status: input.status ?? 'available',
  }
  writeStore(orgId, [member, ...store])
  return member
}

export async function updateStaffStatus(
  orgId: string,
  memberId: string,
  status: StaffMemberStatus,
): Promise<StaffMember> {
  await delay()
  const store = seed(orgId)
  const idx = store.findIndex((m) => m.id === memberId)
  if (idx < 0) throw new StaffError('not_found', 'Membro staff non trovato.')
  const updated = { ...store[idx]!, status }
  const next = [...store]
  next[idx] = updated
  writeStore(orgId, next)
  return updated
}

export async function removeStaffMember(orgId: string, memberId: string): Promise<void> {
  await delay()
  const store = seed(orgId)
  const next = store.filter((m) => m.id !== memberId)
  if (next.length === store.length) throw new StaffError('not_found', 'Membro staff non trovato.')
  writeStore(orgId, next)
}
