/**
 * Admin WebAuthn passkey API (platform_admin).
 */
import { getAuthSessionSnapshot, setAuthSession } from '../auth/authSessionStore'
import type { AuthSession, AuthUser } from '../auth/types'
import { AuthError } from '../auth/types'
import { HttpError, httpDelete, httpGet, httpPatch, httpPost } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type AdminPasskey = {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string | null
  transports?: string[]
  aaguid?: string | null
}

export const PASSKEY_LABEL_PRESETS = [
  'Mac / iCloud',
  'iPhone / iCloud',
  'Telefono Google',
  'Chiavetta YubiKey',
  'Questo dispositivo',
] as const

type PublicKeyCredentialJSON = Record<string, unknown>

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  bytes.forEach((b) => {
    str += String.fromCharCode(b)
  })
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Decodifica base64 / base64url tollerante (niente spazi, niente "undefined"). */
function base64UrlToBuffer(value: unknown, label: string): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AuthError(
      'network',
      `Passkey: campo ${label} mancante o non valido. Ricarica la pagina e riprova.`,
    )
  }
  // Rimuovi whitespace / wrapping accidentali
  let cleaned = value.trim().replace(/\s+/g, '')
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1)
  }
  // Alcuni proxy trasformano + in spazio: ripristina se sembra base64 standard
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(cleaned) && /^[A-Za-z0-9+/ -]+={0,2}$/.test(value)) {
    cleaned = value.replace(/ /g, '+').replace(/\s+/g, '')
  }
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(cleaned)) {
    throw new AuthError(
      'network',
      `Passkey: ${label} non è Base64 valido. Contatta il supporto se persiste.`,
    )
  }
  const pad = '='.repeat((4 - (cleaned.length % 4)) % 4)
  const b64 = (cleaned + pad).replace(/-/g, '+').replace(/_/g, '/')
  try {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
  } catch {
    throw new AuthError(
      'network',
      `Passkey: impossibile decodificare ${label}. Ricarica e riprova.`,
    )
  }
}

function stripNullDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripNullDeep(v)) as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null || v === undefined) continue
      out[k] = stripNullDeep(v)
    }
    return out as T
  }
  return value
}

type CredDescJson = { id?: unknown; type?: string; transports?: string[] }

/** Converte options JSON (base64url) in PublicKeyCredentialCreationOptions nativo. */
export function parseCreationOptions(
  options: PublicKeyCredentialJSON,
): PublicKeyCredentialCreationOptions {
  if (!options || typeof options !== 'object') {
    throw new AuthError('network', 'Risposta passkey non valida dal server.')
  }
  const cleaned = stripNullDeep(options)

  // Preferisci parser nativo WebAuthn L3 quando disponibile (Chrome/Safari recenti).
  const PK = window.PublicKeyCredential as typeof PublicKeyCredential & {
    parseCreationOptionsFromJSON?: (o: PublicKeyCredentialJSON) => PublicKeyCredentialCreationOptions
  }
  if (typeof PK.parseCreationOptionsFromJSON === 'function') {
    try {
      return PK.parseCreationOptionsFromJSON(cleaned)
    } catch {
      // fallback manuale sotto
    }
  }

  const user = cleaned.user as { id?: unknown; name?: string; displayName?: string } | undefined
  if (!user || user.id == null) {
    throw new AuthError('network', 'Passkey: manca user.id nella challenge. Verifica WEBAUTHN_RP_ID/ORIGINS.')
  }
  const exclude = (cleaned.excludeCredentials as CredDescJson[] | undefined) ?? []
  const excludeCredentials: PublicKeyCredentialDescriptor[] = []
  for (const [i, c] of exclude.entries()) {
    if (!c || c.id == null) continue
    try {
      excludeCredentials.push({
        type: (c.type as PublicKeyCredentialKind) || 'public-key',
        id: base64UrlToBuffer(c.id, `excludeCredentials[${i}].id`),
        transports: c.transports as AuthenticatorTransport[] | undefined,
      })
    } catch {
      // ID corrotto in DB: non bloccare la registrazione della nuova passkey.
    }
  }

  const { challenge: _c, user: _u, excludeCredentials: _e, ...rest } = cleaned
  return {
    ...rest,
    challenge: base64UrlToBuffer(cleaned.challenge, 'challenge'),
    user: {
      name: user.name || 'admin',
      displayName: user.displayName || user.name || 'admin',
      id: base64UrlToBuffer(user.id, 'user.id'),
    },
    excludeCredentials,
  } as PublicKeyCredentialCreationOptions
}

export function parseRequestOptions(
  options: PublicKeyCredentialJSON,
): PublicKeyCredentialRequestOptions {
  if (!options || typeof options !== 'object') {
    throw new AuthError('network', 'Risposta passkey non valida dal server.')
  }
  const cleaned = stripNullDeep(options)

  const PK = window.PublicKeyCredential as typeof PublicKeyCredential & {
    parseRequestOptionsFromJSON?: (o: PublicKeyCredentialJSON) => PublicKeyCredentialRequestOptions
  }
  if (typeof PK.parseRequestOptionsFromJSON === 'function') {
    try {
      return PK.parseRequestOptionsFromJSON(cleaned)
    } catch {
      // fallback
    }
  }

  const allow = (cleaned.allowCredentials as CredDescJson[] | undefined) ?? []
  const allowCredentials: PublicKeyCredentialDescriptor[] = []
  for (const [i, c] of allow.entries()) {
    if (!c || c.id == null) continue
    try {
      allowCredentials.push({
        type: (c.type as PublicKeyCredentialKind) || 'public-key',
        id: base64UrlToBuffer(c.id, `allowCredentials[${i}].id`),
        transports: c.transports as AuthenticatorTransport[] | undefined,
      })
    } catch {
      // skip corrupt
    }
  }

  const { challenge: _c, allowCredentials: _a, ...rest } = cleaned
  return {
    ...rest,
    challenge: base64UrlToBuffer(cleaned.challenge, 'challenge'),
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  } as PublicKeyCredentialRequestOptions
}

function credentialToJSON(cred: PublicKeyCredential): PublicKeyCredentialJSON {
  const anyCred = cred as PublicKeyCredential & {
    response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse
  }
  const response = anyCred.response
  const base: PublicKeyCredentialJSON = {
    id: cred.id,
    rawId: bufferToBase64Url(cred.rawId),
    type: cred.type,
    clientExtensionResults: cred.getClientExtensionResults(),
  }

  if ('attestationObject' in response) {
    base.response = {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
      transports:
        typeof (response as AuthenticatorAttestationResponse).getTransports === 'function'
          ? (response as AuthenticatorAttestationResponse).getTransports()
          : [],
    }
  } else {
    const assertion = response as AuthenticatorAssertionResponse
    base.response = {
      clientDataJSON: bufferToBase64Url(assertion.clientDataJSON),
      authenticatorData: bufferToBase64Url(assertion.authenticatorData),
      signature: bufferToBase64Url(assertion.signature),
      userHandle: assertion.userHandle ? bufferToBase64Url(assertion.userHandle) : null,
    }
  }

  return base
}

export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential
}

export async function listAdminPasskeys(): Promise<AdminPasskey[]> {
  if (isMockApiEnabled()) return []
  const raw = await httpGet<{ passkeys: AdminPasskey[] }>('/api/v1/admin/passkeys')
  return raw.passkeys
}

export async function sendPasskeyEnrollOtp(): Promise<{ emailCount: number; expiresInMinutes: number }> {
  if (isMockApiEnabled()) return { emailCount: 1, expiresInMinutes: 10 }
  return httpPost('/api/v1/admin/passkeys/enroll/otp/send')
}

export async function verifyPasskeyEnrollOtp(code: string): Promise<{ token: string; expiresAt: string }> {
  if (isMockApiEnabled()) return { token: 'mock-enroll', expiresAt: new Date().toISOString() }
  return httpPost('/api/v1/admin/passkeys/enroll/otp/verify', { body: { code } })
}

export async function registerAdminPasskey(
  name: string,
  opts?: {
    stepUpToken?: string
    enrollToken?: string
    password?: string
  },
): Promise<AdminPasskey> {
  if (isMockApiEnabled()) {
    throw new AuthError('network', 'Passkey non disponibili in modalità mock.')
  }
  if (!passkeysSupported()) {
    throw new AuthError('network', 'Questo dispositivo non supporta le passkey.')
  }

  const headers: Record<string, string> = {}
  if (opts?.stepUpToken) headers['X-Step-Up-Token'] = opts.stepUpToken
  if (opts?.enrollToken) headers['X-Passkey-Enroll-Token'] = opts.enrollToken

  const begin = await httpPost<{ challengeId: string; options: PublicKeyCredentialJSON | string }>(
    '/api/v1/admin/passkeys/register/options',
    {
      body: { name, ...(opts?.password ? { password: opts.password } : {}) },
      headers: Object.keys(headers).length ? headers : undefined,
    },
  )
  let rawOptions: unknown = begin?.options
  if (typeof rawOptions === 'string') {
    try {
      rawOptions = JSON.parse(rawOptions) as PublicKeyCredentialJSON
    } catch {
      throw new AuthError('network', 'Options passkey non leggibili dal server.')
    }
  }
  if (!rawOptions || typeof rawOptions !== 'object' || !('challenge' in (rawOptions as object))) {
    throw new AuthError(
      'network',
      'Il server non ha inviato una challenge passkey valida. Verifica WEBAUTHN_RP_ID / ORIGINS e riprova.',
    )
  }
  const publicKey = parseCreationOptions(rawOptions as PublicKeyCredentialJSON)
  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null
  if (!credential) throw new AuthError('network', 'Registrazione passkey annullata.')

  return httpPost<AdminPasskey>('/api/v1/admin/passkeys/register/verify', {
    body: {
      challengeId: begin.challengeId,
      credential: credentialToJSON(credential),
    },
    headers: opts?.enrollToken
      ? { 'X-Passkey-Enroll-Token': opts.enrollToken }
      : undefined,
  })
}

export async function renameAdminPasskey(
  id: string,
  name: string,
  stepUpToken?: string,
): Promise<void> {
  if (isMockApiEnabled()) return
  await httpPatch(`/api/v1/admin/passkeys/${id}`, {
    body: { name },
    headers: stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : undefined,
  })
}

export async function deleteAdminPasskey(id: string, stepUpToken?: string): Promise<void> {
  if (isMockApiEnabled()) return
  await httpDelete(`/api/v1/admin/passkeys/${id}`, {
    headers: stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : undefined,
  })
}

export async function loginWithPasskey(email: string): Promise<AuthUser> {
  if (isMockApiEnabled()) {
    throw new AuthError('network', 'Passkey non disponibili in modalità mock.')
  }
  if (!passkeysSupported()) {
    throw new AuthError('network', 'Questo dispositivo non supporta le passkey.')
  }

  try {
    const begin = await httpPost<{ challengeId: string; options: PublicKeyCredentialJSON | string }>(
      '/api/v1/auth/passkey/login/options',
      { body: { email }, anonymous: true },
    )
    let loginOptions: unknown = begin?.options
    if (typeof loginOptions === 'string') {
      loginOptions = JSON.parse(loginOptions) as PublicKeyCredentialJSON
    }
    if (!loginOptions || typeof loginOptions !== 'object' || !('challenge' in (loginOptions as object))) {
      throw new AuthError('network', 'Challenge passkey assente. Verifica configurazione WebAuthn.')
    }
    const publicKey = parseRequestOptions(loginOptions as PublicKeyCredentialJSON)
    const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null
    if (!credential) throw new AuthError('network', 'Accesso passkey annullato.')

    const response = await httpPost<{ token: string; user: AuthUser }>(
      '/api/v1/auth/passkey/login/verify',
      {
        body: {
          email,
          challengeId: begin.challengeId,
          credential: credentialToJSON(credential),
        },
        anonymous: true,
      },
    )

    const session: AuthSession = {
      user: response.user,
      token: response.token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }
    setAuthSession(session)
    return response.user
  } catch (err) {
    if (err instanceof AuthError) throw err
    if (err instanceof HttpError) throw new AuthError('network', err.message)
    throw new AuthError('network', 'Accesso con passkey non riuscito.')
  }
}

export function hasStoredPasskeyHint(): boolean {
  return Boolean(getAuthSessionSnapshot()?.user)
}
