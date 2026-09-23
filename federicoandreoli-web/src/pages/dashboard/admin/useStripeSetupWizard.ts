import { useCallback, useEffect, useState } from 'react'
import {
  billingSettingsError,
  getAdminBillingSettings,
  postAdminBillingDiagnostic,
  putAdminBillingSettings,
  STRIPE_WIZARD_STEPS,
  type BillingSettingsPayload,
  type DiagnosticResult,
  type UpdateBillingSettingsInput,
} from '../../../lib/adminBillingSettingsApi'

export function useStripeSetupWizard() {
  const [settings, setSettings] = useState<BillingSettingsPayload | null>(null)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null)

  const [secretKey, setSecretKey] = useState('')
  const [publishableKey, setPublishableKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [priceProfessional, setPriceProfessional] = useState('')
  const [priceAgency, setPriceAgency] = useState('')
  const [priceStructure, setPriceStructure] = useState('')
  const [trialDaysProfessional, setTrialDaysProfessional] = useState(14)
  const [trialDaysAgency, setTrialDaysAgency] = useState(14)
  const [trialDaysStructure, setTrialDaysStructure] = useState(14)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminBillingSettings()
      setSettings(data)
      setPublishableKey(data.publishableKey ?? '')
      setPriceProfessional(data.priceProfessional ?? '')
      setPriceAgency(data.priceAgency ?? '')
      setPriceStructure(data.priceStructure ?? '')
      setTrialDaysProfessional(data.trialDaysProfessional)
      setTrialDaysAgency(data.trialDaysAgency)
      setTrialDaysStructure(data.trialDaysStructure)
      setDiagnostic(data.lastDiagnostic)
      if (data.setupComplete) setStep(STRIPE_WIZARD_STEPS.length - 1)
    } catch (err) {
      setError(billingSettingsError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(async (patch: UpdateBillingSettingsInput) => {
    setBusy(true)
    setError(null)
    try {
      const next = await putAdminBillingSettings(patch)
      setSettings(next)
      return next
    } catch (err) {
      setError(billingSettingsError(err))
      return null
    } finally {
      setBusy(false)
    }
  }, [])

  const runDiagnostic = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await postAdminBillingDiagnostic()
      setDiagnostic(result)
      await reload()
      return result
    } catch (err) {
      setError(billingSettingsError(err))
      return null
    } finally {
      setBusy(false)
    }
  }, [reload])

  return {
    settings,
    step,
    setStep,
    loading,
    busy,
    error,
    setError,
    diagnostic,
    secretKey,
    setSecretKey,
    publishableKey,
    setPublishableKey,
    webhookSecret,
    setWebhookSecret,
    priceProfessional,
    setPriceProfessional,
    priceAgency,
    setPriceAgency,
    priceStructure,
    setPriceStructure,
    trialDaysProfessional,
    setTrialDaysProfessional,
    trialDaysAgency,
    setTrialDaysAgency,
    trialDaysStructure,
    setTrialDaysStructure,
    reload,
    save,
    runDiagnostic,
    steps: STRIPE_WIZARD_STEPS,
  }
}
