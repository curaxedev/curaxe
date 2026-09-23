import { getApiBaseUrl } from './runtimeConfig'

/** Auth endpoints — see `authApi.ts` (mock today, Laravel Sanctum later). */
export { getPolicies, getSession, loginWithPassword, logout, requestOtp, verifyOtp } from './authApi'

export async function fetchApiMeta(): Promise<{ name: string; version: number }> {
  const path = '/api/v1/meta'
  const base = getApiBaseUrl()
  const url = base ? `${base}${path}` : path
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`API meta failed: ${res.status}`)
  }
  return res.json() as Promise<{ name: string; version: number }>
}
