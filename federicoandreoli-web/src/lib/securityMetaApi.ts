/**
 * Cloudflare Turnstile — legge site key da API e gestisce token.
 * Se Turnstile non è abilitato lato server, le funzioni no-op.
 */
import { httpGet } from './http'
import { isMockApiEnabled } from './runtimeConfig'

export type SecurityMeta = {
  turnstile: { enabled: boolean; siteKey: string | null }
  cloudflareTrustProxies: boolean
}

let cachedMeta: SecurityMeta | null = null

export async function getSecurityMeta(): Promise<SecurityMeta> {
  if (isMockApiEnabled()) {
    return { turnstile: { enabled: false, siteKey: null }, cloudflareTrustProxies: false }
  }
  if (cachedMeta) return cachedMeta
  try {
    cachedMeta = await httpGet<SecurityMeta>('/api/v1/security/meta', { anonymous: true })
    return cachedMeta
  } catch {
    // API irraggiungibile: Turnstile off, niente errore in UI
    return { turnstile: { enabled: false, siteKey: null }, cloudflareTrustProxies: false }
  }
}

export function clearSecurityMetaCache(): void {
  cachedMeta = null
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

let scriptLoading: Promise<void> | null = null

export function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptLoading) return scriptLoading

  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-cf-turnstile]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Turnstile script error')))
      return
    }
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.dataset.cfTurnstile = '1'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Impossibile caricare Turnstile'))
    document.head.appendChild(s)
  })

  return scriptLoading
}
