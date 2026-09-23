import type { SavedProfile, SavedProfileCreateInput } from './savedProfileTypes'
import {
  isProfileSaved,
  listSavedProfiles,
  removeSavedProfile,
  saveProfile,
} from '../services/savedProfilesService'

/** Thin API swap point for Laravel. */
export async function fetchSavedProfiles(userId: string): Promise<SavedProfile[]> {
  return listSavedProfiles(userId)
}

export async function fetchIsProfileSaved(userId: string, professionalId: string): Promise<boolean> {
  return isProfileSaved(userId, professionalId)
}

export async function createSavedProfile(
  userId: string,
  input: SavedProfileCreateInput,
): Promise<SavedProfile> {
  return saveProfile(userId, input)
}

export async function deleteSavedProfile(userId: string, professionalId: string): Promise<void> {
  return removeSavedProfile(userId, professionalId)
}
