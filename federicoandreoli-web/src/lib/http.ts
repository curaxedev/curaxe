/**
 * Client HTTP centrale verso l'API Laravel (`/api/v1/...`).
 *
 * - Base URL da `VITE_API_URL` (vuota in dev: passa dal proxy Vite).
 * - Cookie + CSRF Sanctum (stateful SPA su curaxe.it → api.curaxe.it).
 * - Bearer token Sanctum letto dalla sessione auth corrente.
 * - Errori normalizzati nel formato Laravel `{ message, errors }` -> `HttpError`.
 * - Timeout con AbortController; 401 invalida la sessione locale.
 */
import { getAuthSessionSnapshot, setAuthSession } from '../auth/authSessionStore'
import { getApiBaseUrl } from './runtimeConfig'

const DEFAULT_TIMEOUT_MS = 20_000

/** Evita di battere /sanctum/csrf-cookie a ogni richiesta. */
let csrfReady: Promise<void> | null = null

export type HttpErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'rate_limited'
  | 'server'

export class HttpError extends Error {
  readonly status: number
  readonly kind: HttpErrorKind
  /** Codice macchina di dominio (`error_code` nella risposta Laravel), se presente. */
  readonly code?: string
  /** Errori di validazione Laravel: campo -> messaggi. */
  readonly errors: Record<string, string[]>

  constructor(
    kind: HttpErrorKind,
    status: number,
    message: string,
    errors?: Record<string, string[]>,
    code?: string
  ) {
    super(message)
    this.name = 'HttpError'
    this.kind = kind
    this.status = status
    this.errors = errors ?? {}
    this.code = code
  }

  /** Primo messaggio di validazione per un campo, se presente. */
  firstError(field: string): string | undefined {
    return this.errors[field]?.[0]
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>

export type HttpRequestOptions = {
  query?: QueryParams
  body?: unknown
  /** FormData per upload multipart (ha precedenza su `body`). */
  formData?: FormData
  timeoutMs?: number
  signal?: AbortSignal
  /** Non allegare il Bearer token (endpoint pubblici, default: allegalo se presente). */
  anonymous?: boolean
}

function buildUrl(path: string, query?: QueryParams): string {
  const base = getApiBaseUrl()
  const url = base ? `${base}${path}` : path
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

function kindForStatus(status: number): HttpErrorKind {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 419) return 'unauthorized' // CSRF / sessione scaduta (Sanctum cookie)
  if (status === 422) return 'validation'
  if (status === 429) return 'rate_limited'
  return 'server'
}

function readXsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

function isMutatingMethod(method: string): boolean {
  const m = method.toUpperCase()
  return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS'
}

/** Prime Sanctum CSRF cookie (necessario con `statefulApi` + Origin frontend). */
async function ensureCsrfCookie(): Promise<void> {
  if (typeof document === 'undefined') return
  if (readXsrfToken()) return
  if (!csrfReady) {
    csrfReady = fetch(buildUrl('/sanctum/csrf-cookie'), {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then(() => undefined)
      .catch(() => {
        csrfReady = null
      })
  }
  await csrfReady
}

async function parseErrorBody(
  res: Response
): Promise<{ message: string; errors?: Record<string, string[]>; code?: string }> {
  try {
    const data = (await res.json()) as {
      message?: string
      errors?: Record<string, string[]>
      error_code?: string
    }
    return {
      message: data.message || `Errore ${res.status}`,
      errors: data.errors,
      code: data.error_code,
    }
  } catch {
    return { message: `Errore ${res.status}` }
  }
}

export async function httpRequest<T>(method: string, path: string, options: HttpRequestOptions = {}): Promise<T> {
  const { query, body, formData, timeoutMs = DEFAULT_TIMEOUT_MS, signal, anonymous = false } = options

  if (isMutatingMethod(method)) {
    await ensureCsrfCookie()
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  const xsrf = readXsrfToken()
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf

  if (!anonymous) {
    const token = getAuthSessionSnapshot()?.token
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let requestBody: BodyInit | undefined
  if (formData) {
    requestBody = formData
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    requestBody = JSON.stringify(body)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const onOuterAbort = () => controller.abort()
  signal?.addEventListener('abort', onOuterAbort)

  let res: Response
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: requestBody,
      credentials: 'include',
      signal: controller.signal,
    })
  } catch (err) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new HttpError('timeout', 0, 'La richiesta ha impiegato troppo tempo. Riprova.')
    }
    if (signal?.aborted) throw err
    throw new HttpError('network', 0, 'Impossibile contattare il server. Verifica la connessione.')
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', onOuterAbort)
  }

  // CSRF scaduto: rinnova cookie e riprova una volta.
  if (res.status === 419 && isMutatingMethod(method)) {
    csrfReady = null
    await fetch(buildUrl('/sanctum/csrf-cookie'), {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    }).catch(() => undefined)
    const retryHeaders = { ...headers }
    const retryXsrf = readXsrfToken()
    if (retryXsrf) retryHeaders['X-XSRF-TOKEN'] = retryXsrf
    else delete retryHeaders['X-XSRF-TOKEN']
    res = await fetch(buildUrl(path, query), {
      method,
      headers: retryHeaders,
      body: requestBody,
      credentials: 'include',
      signal: controller.signal,
    })
  }

  if ((res.status === 401 || res.status === 419) && !anonymous) {
    // Token scaduto/revocato o CSRF: invalida la sessione locale.
    setAuthSession(null)
  }

  if (!res.ok) {
    const { message, errors, code } = await parseErrorBody(res)
    throw new HttpError(kindForStatus(res.status), res.status, message, errors, code)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function httpGet<T>(path: string, options?: HttpRequestOptions): Promise<T> {
  return httpRequest<T>('GET', path, options)
}

export function httpPost<T>(path: string, options?: HttpRequestOptions): Promise<T> {
  return httpRequest<T>('POST', path, options)
}

export function httpPatch<T>(path: string, options?: HttpRequestOptions): Promise<T> {
  return httpRequest<T>('PATCH', path, options)
}

export function httpPut<T>(path: string, options?: HttpRequestOptions): Promise<T> {
  return httpRequest<T>('PUT', path, options)
}

export function httpDelete<T = void>(path: string, options?: HttpRequestOptions): Promise<T> {
  return httpRequest<T>('DELETE', path, options)
}
