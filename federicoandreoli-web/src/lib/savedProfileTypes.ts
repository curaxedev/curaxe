export type SavedProfile = {
  id: string
  professionalId: string
  name: string
  category: string
  zone: string
  stars: number
  note: string
  savedAt: string
}

export type SavedProfileCreateInput = {
  professionalId: string
  name: string
  category: string
  zone: string
  stars?: number
  note?: string
}

export type SavedProfileErrorCode = 'validation' | 'not_found' | 'server'

export class SavedProfileError extends Error {
  readonly code: SavedProfileErrorCode

  constructor(code: SavedProfileErrorCode, message: string) {
    super(message)
    this.name = 'SavedProfileError'
    this.code = code
  }
}
