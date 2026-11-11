/**
 * Admin security: Sicurezza totale, step-up passkey, login alerts, password toggle, recovery.
 */
import { HttpError, httpGet, httpPost, httpPut } from './http'
import { isMockApiEnabled } from './runtimeConfig'
import {
  parseRequestOptions,
  passkeysSupported,
} from './adminPasskeyApi'

export type AdminSecuritySettings = {
  securityTotalEnabled: boolean
  securityTotalEnabledAt: string | null
  loginAlertsEnabled: boolean
  loginAlertEmails: string[]
  passwordLoginEnabled: boolean
  passkeyCount: number
  canEnableSecurityTotal: boolean
  canDisablePasswordLogin: boolean
  recoveryCodesRemaining: number
  recoveryCodesGeneratedAt: string | null
  sensitiveActions: Record<string, string>
  devices: AdminLoginDeviceRow[]
  webauthn?: {
    rpId: string
    allowedOrigins: string[]
    hint: string
  }
  /** Presente solo subito dopo disattivazione password / rigenerazione. */
  recoveryCodes?: string[]
}

export type AdminLoginDeviceRow = {
  id: string
  label: string | null
  lastIp: string | null
  firstSeenAt: string
  lastSeenAt: string
  trusted: boolean
}

export type AdminLoginOptions = {
  passkeyAvailable: boolean
  passwordAllowed: boolean
  recoveryAvailable: boolean
}

const MOCK_SETTINGS: AdminSecuritySettings = {
  securityTotalEnabled: false,
  securityTotalEnabledAt: null,
  loginAlertsEnabled: false,
  loginAlertEmails: [],
  passwordLoginEnabled: true,
  passkeyCount: 0,
  canEnableSecurityTotal: false,
  canDisablePasswordLogin: false,
  recoveryCodesRemaining: 0,
  recoveryCodesGeneratedAt: null,
  sensitiveActions: {
    'users.mutate': 'Modifica utenti',
    'billing.plans': 'Catalogo piani',
    'billing.refund': 'Rimborsi',
    'billing.subscription': 'Gestione abbonamenti',
    'billing.stripe_keys': 'Chiavi Stripe',
    'security.settings': 'Impostazioni sicurezza',
    'settings.platform': 'Impostazioni piattaforma',
    'kyc.decide': 'Approvazione KYC',
    'passkey.manage': 'Gestione passkey',
  },
  devices: [],
  webauthn: {
    rpId: 'localhost',
    allowedOrigins: ['http://localhost:5173'],
    hint: 'Solo mock',
  },
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  bytes.forEach((b) => {
    str += String.fromCharCode(b)
  })
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function credentialToJSON(cred: PublicKeyCredential): Record<string, unknown> {
  const assertion = cred.response as AuthenticatorAssertionResponse
  return {
    id: cred.id,
    rawId: bufferToBase64Url(cred.rawId),
    type: cred.type,
    clientExtensionResults: cred.getClientExtensionResults(),
    response: {
      clientDataJSON: bufferToBase64Url(assertion.clientDataJSON),
      authenticatorData: bufferToBase64Url(assertion.authenticatorData),
      signature: bufferToBase64Url(assertion.signature),
      userHandle: assertion.userHandle ? bufferToBase64Url(assertion.userHandle) : null,
    },
  }
}

export async function getAdminSecuritySettings(): Promise<AdminSecuritySettings> {
  if (isMockApiEnabled()) return { ...MOCK_SETTINGS }
  return httpGet<AdminSecuritySettings>('/api/v1/admin/security/settings')
}

export async function putAdminSecuritySettings(
  patch: {
    securityTotalEnabled?: boolean
    loginAlertsEnabled?: boolean
    loginAlertEmails?: string[]
    passwordLoginEnabled?: boolean
    confirmRecoveryCodesSaved?: boolean
  },
  stepUpToken?: string,
): Promise<AdminSecuritySettings> {
  if (isMockApiEnabled()) {
    return {
      ...MOCK_SETTINGS,
      ...patch,
      loginAlertEmails: patch.loginAlertEmails ?? MOCK_SETTINGS.loginAlertEmails,
      passwordLoginEnabled: patch.passwordLoginEnabled ?? MOCK_SETTINGS.passwordLoginEnabled,
    }
  }
  return httpPut<AdminSecuritySettings>('/api/v1/admin/security/settings', {
    body: patch,
    headers: stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : undefined,
  })
}

export async function regenerateAdminRecoveryCodes(stepUpToken?: string): Promise<{
  recoveryCodes: string[]
  recoveryCodesRemaining: number
  recoveryCodesGeneratedAt: string
}> {
  if (isMockApiEnabled()) {
    return {
      recoveryCodes: ['AAAA-BBBB-CCCC'],
      recoveryCodesRemaining: 1,
      recoveryCodesGeneratedAt: new Date().toISOString(),
    }
  }
  return httpPost('/api/v1/admin/security/recovery-codes/regenerate', {
    headers: stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : undefined,
  })
}

export async function fetchAdminLoginOptions(email: string): Promise<AdminLoginOptions> {
  if (isMockApiEnabled()) {
    return { passkeyAvailable: false, passwordAllowed: true, recoveryAvailable: false }
  }
  return httpPost<AdminLoginOptions>('/api/v1/auth/admin/login-options', {
    body: { email },
    anonymous: true,
  })
}

export async function redeemAdminRecoveryCode(
  email: string,
  code: string,
): Promise<{ token: string; user: unknown; recoverySession: boolean }> {
  return httpPost('/api/v1/auth/admin/recovery/code', {
    body: { email, code },
    anonymous: true,
  })
}

export async function requestAdminRecoveryEmail(email: string, turnstileToken?: string | null) {
  return httpPost('/api/v1/auth/admin/recovery/email/request', {
    body: { email, turnstileToken: turnstileToken || undefined },
    anonymous: true,
  })
}

export async function redeemAdminRecoveryEmail(
  email: string,
  token: string,
): Promise<{ token: string; user: unknown; recoverySession: boolean }> {
  return httpPost('/api/v1/auth/admin/recovery/email/verify', {
    body: { email, token },
    anonymous: true,
  })
}

export async function recoveryRegisterPasskey(name: string): Promise<unknown> {
  const { parseCreationOptions, passkeysSupported: supported } = await import('./adminPasskeyApi')
  if (!supported()) throw new Error('Passkey non supportate.')
  const begin = await httpPost<{ challengeId: string; options: Record<string, unknown> }>(
    '/api/v1/admin/recovery/passkeys/register/options',
    { body: { name } },
  )
  const publicKey = parseCreationOptions(begin.options)
  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null
  if (!credential) throw new Error('Registrazione annullata.')

  function toJson(cred: PublicKeyCredential): Record<string, unknown> {
    const anyCred = cred as PublicKeyCredential & {
      response: AuthenticatorAttestationResponse
    }
    const response = anyCred.response
    return {
      id: cred.id,
      rawId: bufferToBase64Url(cred.rawId),
      type: cred.type,
      clientExtensionResults: cred.getClientExtensionResults(),
      response: {
        clientDataJSON: bufferToBase64Url(response.clientDataJSON),
        attestationObject: bufferToBase64Url(response.attestationObject),
        transports:
          typeof response.getTransports === 'function' ? response.getTransports() : [],
      },
    }
  }

  return httpPost('/api/v1/admin/recovery/passkeys/register/verify', {
    body: { challengeId: begin.challengeId, credential: toJson(credential) },
  })
}

export async function recoveryReenablePassword(): Promise<void> {
  await httpPost('/api/v1/admin/recovery/reenable-password')
}

export async function performAdminStepUp(action: string): Promise<string> {
  if (isMockApiEnabled()) return 'mock-step-up'
  if (!passkeysSupported()) {
    throw new Error('Questo dispositivo non supporta le passkey.')
  }
  const begin = await httpPost<{ challengeId: string; options: Record<string, unknown> }>(
    '/api/v1/admin/security/step-up/options',
    { body: { action } },
  )
  const publicKey = parseRequestOptions(begin.options)
  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null
  if (!credential) throw new Error('Verifica passkey annullata.')

  const result = await httpPost<{ token: string }>(
    '/api/v1/admin/security/step-up/verify',
    {
      body: {
        action,
        challengeId: begin.challengeId,
        credential: credentialToJSON(credential),
      },
    },
  )
  return result.token
}

/**
 * Esegue `fn` con eventuale step-up. Se l'API risponde step_up_required,
 * chiede la passkey e riprova una volta.
 */
export async function withAdminStepUp<T>(
  action: string,
  fn: (stepUpToken?: string) => Promise<T>,
  stepUpToken?: string,
): Promise<T> {
  try {
    return await fn(stepUpToken)
  } catch (err) {
    if (
      err instanceof HttpError &&
      err.code === 'step_up_required' &&
      !stepUpToken
    ) {
      const resolvedAction = err.action || action
      const token = await performAdminStepUp(resolvedAction)
      return fn(token)
    }
    throw err
  }
}

export async function revokeOtherAdminSessions(stepUpToken?: string): Promise<void> {
  if (isMockApiEnabled()) return
  await httpPost('/api/v1/admin/security/revoke-sessions', {
    headers: stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : undefined,
  })
}

export function isStepUpRequired(err: unknown): boolean {
  return err instanceof HttpError && err.code === 'step_up_required'
}
