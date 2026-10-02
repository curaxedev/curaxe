import type { AuthSession } from './types'

const STORAGE_KEY = 'fa-auth-session'

const listeners = new Set<() => void>()

function emit() {
  for (const cb of [...listeners]) cb()
}

function readRaw(): string | null {
  try {
    const fromLocal = localStorage.getItem(STORAGE_KEY)
    if (fromLocal) return fromLocal

    // Migrazione one-shot: le sessioni vivevano in sessionStorage (perse a ogni tab).
    const fromSession = sessionStorage.getItem(STORAGE_KEY)
    if (fromSession) {
      localStorage.setItem(STORAGE_KEY, fromSession)
      sessionStorage.removeItem(STORAGE_KEY)
      return fromSession
    }
    return null
  } catch {
    return null
  }
}

function writeRaw(value: string | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value)
    else localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* quota / private mode */
  }
}

export function parseAuthSession(raw: string | null): AuthSession | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.user?.id || !parsed.user.role || !parsed.expiresAt) return null
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

/** Cached snapshot — useSyncExternalStore requires referential stability when data is unchanged. */
let cachedRaw: string | null | undefined
let cachedSession: AuthSession | null = null

function refreshCachedSession(raw: string | null): AuthSession | null {
  cachedRaw = raw
  cachedSession = parseAuthSession(raw)
  return cachedSession
}

export function getAuthSessionSnapshot(): AuthSession | null {
  const raw = readRaw()
  if (raw !== cachedRaw) {
    return refreshCachedSession(raw)
  }
  if (cachedSession && new Date(cachedSession.expiresAt).getTime() <= Date.now()) {
    cachedSession = null
  }
  return cachedSession
}

export function getAuthSessionServerSnapshot(): AuthSession | null {
  return null
}

export function setAuthSession(session: AuthSession | null) {
  const raw = session ? JSON.stringify(session) : null
  writeRaw(raw)
  cachedRaw = raw
  cachedSession = session
  emit()
}

export function subscribeAuthSession(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** Sincronizza login/logout tra tab (localStorage). */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    cachedRaw = undefined
    cachedSession = null
    emit()
  })
}
