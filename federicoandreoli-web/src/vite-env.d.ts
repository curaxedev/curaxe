/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL API Laravel (HTTPS, senza slash finale). Vuota in dev con proxy Vite. */
  readonly VITE_API_URL?: string
  /** Origine pubblica del frontend (HTTPS, senza slash finale). Opzionale in dev. */
  readonly VITE_SITE_ORIGIN?: string
  /** `true` (default) = mock services; `false` = call Laravel when directory API client is wired. */
  readonly VITE_USE_MOCKS?: string
  /** `true` = Stripe Checkout redirect via backend; default `false` = embedded mock checkout. */
  readonly VITE_STRIPE_ENABLED?: string
  /** Measurement ID analytics (es. GA4). Vuoto = analytics disabilitato; in dev log stub in console. */
  readonly VITE_ANALYTICS_ID?: string
  /** `true` = step upload documenti nel wizard registrazione. Default `false`. */
  readonly VITE_REGISTRATION_DOCUMENT_UPLOAD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
