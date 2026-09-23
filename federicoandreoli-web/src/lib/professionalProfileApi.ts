/**
 * Professional profile API — doppio binario mock / Laravel.
 *
 * Endpoint reali (ruolo professional):
 *   GET    /api/v1/professionals/me/profile
 *   PATCH  /api/v1/professionals/me/profile
 *   POST   /api/v1/professionals/me/photo
 *   GET    /api/v1/professionals/me/documents
 *   POST   /api/v1/professionals/me/documents
 *   DELETE /api/v1/professionals/me/documents/:id
 */
import type { ProfessionalProfile, ProfessionalProfilePatch } from './professionalProfileTypes'
import { ProfessionalProfileError } from './professionalProfileTypes'
import {
  fetchProfessionalProfile,
  patchProfessionalProfile,
} from '../services/professionalProfileService'
import { HttpError, httpDelete, httpGet, httpPatch, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type { ProfessionalProfile, ProfessionalProfilePatch } from './professionalProfileTypes'
export { ProfessionalProfileError } from './professionalProfileTypes'

export type ProfessionalDocumentSlot = 'identita' | 'attestati' | 'referenze'

export type ProfessionalDocument = {
  id: string
  slot: ProfessionalDocumentSlot
  name: string
  mime: string
  sizeBytes: number
  uploadedAt: string
}

function toProfileError(err: unknown, fallback: string): ProfessionalProfileError {
  if (err instanceof HttpError) {
    if (err.kind === 'not_found') return new ProfessionalProfileError('not_found', err.message)
    return new ProfessionalProfileError('server', err.message || fallback)
  }
  return new ProfessionalProfileError('server', fallback)
}

export async function getProfessionalProfile(userId: string): Promise<ProfessionalProfile> {
  if (isMockApiEnabled()) return fetchProfessionalProfile(userId)
  try {
    return await httpGet<ProfessionalProfile>('/api/v1/professionals/me/profile')
  } catch (err) {
    throw toProfileError(err, 'Impossibile caricare il profilo.')
  }
}

export async function updateProfessionalProfile(
  userId: string,
  patch: ProfessionalProfilePatch,
): Promise<ProfessionalProfile> {
  if (isMockApiEnabled()) return patchProfessionalProfile(userId, patch)
  try {
    return await httpPatch<ProfessionalProfile>('/api/v1/professionals/me/profile', { body: patch })
  } catch (err) {
    throw toProfileError(err, 'Salvataggio profilo non riuscito.')
  }
}

export async function uploadProfessionalPhoto(
  userId: string,
  file: File,
): Promise<ProfessionalProfile> {
  if (isMockApiEnabled()) {
    // Mock: data-URL locale per anteprima e % completamento.
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Lettura file fallita'))
      reader.readAsDataURL(file)
    })
    return patchProfessionalProfile(userId, {
      identity: { photoUrl: dataUrl },
    })
  }
  try {
    const formData = new FormData()
    formData.append('photo', file)
    return await httpPost<ProfessionalProfile>('/api/v1/professionals/me/photo', { formData })
  } catch (err) {
    throw toProfileError(err, 'Caricamento foto non riuscito.')
  }
}

export async function listProfessionalDocuments(): Promise<ProfessionalDocument[]> {
  if (isMockApiEnabled()) {
    try {
      const raw = localStorage.getItem('fa:professional-documents')
      return raw ? (JSON.parse(raw) as ProfessionalDocument[]) : []
    } catch {
      return []
    }
  }
  try {
    return await httpGet<ProfessionalDocument[]>('/api/v1/professionals/me/documents')
  } catch (err) {
    throw toProfileError(err, 'Impossibile caricare i documenti.')
  }
}

export async function uploadProfessionalDocument(
  slot: ProfessionalDocumentSlot,
  file: File,
): Promise<ProfessionalDocument> {
  if (isMockApiEnabled()) {
    const doc: ProfessionalDocument = {
      id: `doc-${Date.now()}`,
      slot,
      name: file.name,
      mime: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    }
    const existing = await listProfessionalDocuments()
    const next = [...existing.filter((d) => d.slot !== slot), doc]
    localStorage.setItem('fa:professional-documents', JSON.stringify(next))
    return doc
  }
  try {
    const formData = new FormData()
    formData.append('slot', slot)
    formData.append('file', file)
    return await httpPost<ProfessionalDocument>('/api/v1/professionals/me/documents', { formData })
  } catch (err) {
    throw toProfileError(err, 'Caricamento documento non riuscito.')
  }
}

export async function deleteProfessionalDocument(id: string): Promise<void> {
  if (isMockApiEnabled()) {
    const existing = await listProfessionalDocuments()
    localStorage.setItem(
      'fa:professional-documents',
      JSON.stringify(existing.filter((d) => d.id !== id)),
    )
    return
  }
  try {
    await httpDelete(`/api/v1/professionals/me/documents/${id}`)
  } catch (err) {
    throw toProfileError(err, 'Eliminazione documento non riuscita.')
  }
}
