/** Real Stripe Checkout / Elements — requires backend session + `VITE_STRIPE_ENABLED=true`. */
export function isStripeEnabled(): boolean {
  return import.meta.env.VITE_STRIPE_ENABLED === 'true'
}

/** Demo / sandbox copy (e.g. "nessun addebito reale") — dev only when Stripe is off. */
export function showBillingDemoCopy(): boolean {
  return import.meta.env.DEV && !isStripeEnabled()
}
