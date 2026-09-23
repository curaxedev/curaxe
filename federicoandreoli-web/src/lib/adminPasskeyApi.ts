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
}

type PublicKeyCredentialJSON = Record<string, unknown>

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  bytes.forEach((b) => {
    str += String.fromCharCode(b)
  })
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const pad = '='.repeat((4 - (value.length % 4)) % 4)
  const b64 = (value + pad).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/** Converte options JSON (base64url) in PublicKeyCredentialCreationOptions nativo. */
export function parseCreationOptions(
  options: PublicKeyCredentialJSON,
): PublicKeyCredentialCreationOptions {
  const challenge = base64UrlToBuffer(String(options.challenge))
  const user = options.user as { id: string; name: string; displayName: string }
  const exclude = (options.excludeCredentials as Array<{ id: string; type: string; transports?: string[] }> | undefined) ?? []
  return {
    ...options,
    challenge,
    user: {
      ...user,
      id: base64UrlToBuffer(user.id),
    },
    excludeCredentials: exclude.map((c) => ({
      type: 'public-key' as const,
      id: base64UrlToBuffer(c.id),
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  } as PublicKeyCredentialCreationOptions
}

export function parseRequestOptions(
  options: PublicKeyCredentialJSON,
): PublicKeyCredentialRequestOptions {
  const challenge = base64UrlToBuffer(String(options.challenge))
  const allow =
    (options.allowCredentials as Array<{ id: string; type: string; transports?: string[] }> | undefined) ??
    []
  return {
    ...options,
    challenge,
    allowCredentials: allow.map((c) => ({
      type: 'public-key' as const,
      id: base64UrlToBuffer(c.id),
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
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

export async function registerAdminPasskey(name: string): Promise<AdminPasskey> {
  if (isMockApiEnabled()) {
    throw new AuthError('network', 'Passkey non disponibili in modalità mock.')
  }
  if (!passkeysSupported()) {
    throw new AuthError('network', 'Questo dispositivo non supporta le passkey.')
  }

  const begin = await httpPost<{ challengeId: string; options: PublicKeyCredentialJSON }>(
    '/api/v1/admin/passkeys/register/options',
    { body: { name } },
  )
  const publicKey = parseCreationOptions(begin.options)
  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null
  if (!credential) throw new AuthError('network', 'Registrazione passkey annullata.')

  return httpPost<AdminPasskey>('/api/v1/admin/passkeys/register/verify', {
    body: {
      challengeId: begin.challengeId,
      credential: credentialToJSON(credential),
    },
  })
}

export async function renameAdminPasskey(id: string, name: string): Promise<void> {
  if (isMockApiEnabled()) return
  await httpPatch(`/api/v1/admin/passkeys/${id}`, { body: { name } })
}

export async function deleteAdminPasskey(id: string): Promise<void> {
  if (isMockApiEnabled()) return
  await httpDelete(`/api/v1/admin/passkeys/${id}`)
}

export async function loginWithPasskey(email: string): Promise<AuthUser> {
  if (isMockApiEnabled()) {
    throw new AuthError('network', 'Passkey non disponibili in modalità mock.')
  }
  if (!passkeysSupported()) {
    throw new AuthError('network', 'Questo dispositivo non supporta le passkey.')
  }

  try {
    const begin = await httpPost<{ challengeId: string; options: PublicKeyCredentialJSON }>(
      '/api/v1/auth/passkey/login/options',
      { body: { email }, anonymous: true },
    )
    const publicKey = parseRequestOptions(begin.options)
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
