import type { SavedProfile, SavedProfileCreateInput } from '../lib/savedProfileTypes'
import { SavedProfileError } from '../lib/savedProfileTypes'

const MOCK_DELAY_MS = 350
const STORAGE_PREFIX = 'fa:saved-profiles:'

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

function readStore(userId: string): SavedProfile[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedProfile[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStore(userId: string, items: SavedProfile[]): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(items))
}

function seedIfEmpty(userId: string): SavedProfile[] {
  const existing = readStore(userId)
  if (existing.length > 0) return existing
  if (userId !== 'fam-1') return existing

  const seed: SavedProfile[] = [
    {
      id: 'saved-1',
      professionalId: 'prof-1',
      name: 'Maria Rossi',
      category: 'Badante',
      zone: 'Milano',
      stars: 5,
      note: 'Profilo completo, zona Milano Nord.',
      savedAt: '2026-05-01T10:00:00.000Z',
    },
    {
      id: 'saved-2',
      professionalId: 'prof-2',
      name: 'Anna Neri',
      category: 'OSS',
      zone: 'Milano',
      stars: 5,
      note: 'Ottima con anziani con demenza.',
      savedAt: '2026-05-02T10:00:00.000Z',
    },
  ]
  writeStore(userId, seed)
  return seed
}

export async function listSavedProfiles(userId: string): Promise<SavedProfile[]> {
  await delay()
  if (!userId) throw new SavedProfileError('validation', 'Utente non valido.')
  return seedIfEmpty(userId).slice().sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function isProfileSaved(userId: string, professionalId: string): Promise<boolean> {
  await delay(120)
  if (!userId || !professionalId) return false
  return seedIfEmpty(userId).some((p) => p.professionalId === professionalId)
}

export async function saveProfile(
  userId: string,
  input: SavedProfileCreateInput,
): Promise<SavedProfile> {
  await delay()
  if (!userId) throw new SavedProfileError('validation', 'Utente non valido.')
  if (!input.professionalId || !input.name.trim()) {
    throw new SavedProfileError('validation', 'Dati profilo incompleti.')
  }

  const store = seedIfEmpty(userId)
  const existing = store.find((p) => p.professionalId === input.professionalId)
  if (existing) return existing

  const item: SavedProfile = {
    id: `saved-${Date.now().toString(36)}`,
    professionalId: input.professionalId,
    name: input.name.trim(),
    category: input.category.trim() || 'Professionista',
    zone: input.zone.trim() || 'Italia',
    stars: input.stars ?? 0,
    note: input.note?.trim() ?? '',
    savedAt: new Date().toISOString(),
  }
  writeStore(userId, [item, ...store])
  return item
}

export async function removeSavedProfile(userId: string, professionalId: string): Promise<void> {
  await delay()
  if (!userId || !professionalId) {
    throw new SavedProfileError('validation', 'Parametri non validi.')
  }
  const store = seedIfEmpty(userId)
  const next = store.filter((p) => p.professionalId !== professionalId)
  if (next.length === store.length) {
    throw new SavedProfileError('not_found', 'Profilo non presente nei salvati.')
  }
  writeStore(userId, next)
}

export function clearSavedProfilesForUser(userId: string): void {
  localStorage.removeItem(storageKey(userId))
}
