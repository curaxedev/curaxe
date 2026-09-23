import { MOCK_PASSWORD } from '../mocks/authFixtures'

const STORAGE_KEY = 'fa:password-overrides'

function readOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

function writeOverrides(map: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function getPasswordForEmail(email: string): string {
  const key = email.trim().toLowerCase()
  return readOverrides()[key] ?? MOCK_PASSWORD
}

export function setPasswordForEmail(email: string, password: string): void {
  const key = email.trim().toLowerCase()
  const map = readOverrides()
  map[key] = password
  writeOverrides(map)
}
