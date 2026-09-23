import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { postBillingCheckoutComplete } from '../../../lib/billingApi'
import type { BillingAudience } from '../../../lib/billingTypes'

type BillingCheckoutReturnPageProps = {
  audience: BillingAudience
  dashboardPath: string
  planSection?: string
}

export function BillingCheckoutReturnPage({
  audience,
  dashboardPath,
  planSection = 'piano',
}: BillingCheckoutReturnPageProps) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Elaborazione pagamento…')

  const result = searchParams.get('result')
  const sessionId = searchParams.get('session_id') ?? ''

  useEffect(() => {
    const run = async () => {
      if (result === 'cancel') {
        navigate(`${dashboardPath}?billing=cancel`, { replace: true })
        return
      }

      if (result !== 'success' || !sessionId) {
        navigate(`${dashboardPath}?billing=error`, { replace: true })
        return
      }

      try {
        await postBillingCheckoutComplete(sessionId)
        navigate(`${dashboardPath}?billing=success&section=${planSection}`, { replace: true })
      } catch {
        setMessage('Non è stato possibile confermare il pagamento.')
        setTimeout(() => {
          navigate(`${dashboardPath}?billing=error&section=${planSection}`, { replace: true })
        }, 2000)
      }
    }

    void run()
  }, [audience, dashboardPath, navigate, planSection, result, sessionId])

  return (
    <div className="billing-checkout-page">
      <div className="billing-checkout-page__card">
        <p>{message}</p>
      </div>
    </div>
  )
}
