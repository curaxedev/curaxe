import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthError, type AuthUser } from '../auth/types'
import { requestOtp, verifyOtp } from '../lib/authApi'
import { OtpCodeInput } from './OtpCodeInput'
import { TurnstileWidget } from './TurnstileWidget'

export type ContactAuthDialogProps = {
  open: boolean
  onClose: () => void
  /** Path + query per tornare dopo il login (fallback link), es. `/profili/12?contact=1` */
  returnTo: string
  professionalName?: string
  /** Chiamato dopo OTP riuscito, restando sulla pagina corrente. */
  onAuthenticated?: (user: AuthUser) => void
}

function authErrorMessage(err: unknown): string {
  if (err instanceof AuthError) return err.message
  return 'Si è verificato un errore. Riprova.'
}

export function ContactAuthDialog({
  open,
  onClose,
  returnTo,
  professionalName,
  onAuthenticated,
}: ContactAuthDialogProps) {
  const titleId = useId()
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const registerHref = `/registrazione/intent`
  const loginFallbackHref = `/accedi?redirect=${encodeURIComponent(returnTo)}`

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Reset soft allo open: focus email
    requestAnimationFrame(() => emailInputRef.current?.focus())
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, busy])

  if (!open) return null

  const nameFragment = professionalName ? ` ${professionalName.split(' ')[0]}` : ''

  function clearError() {
    setError(null)
  }

  async function handleSendOtp() {
    const trimmed = email.trim()
    if (!trimmed || busy) return
    clearError()
    setBusy(true)
    try {
      await requestOtp(trimmed, turnstileToken)
      setOtpSent(true)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!otpSent || busy) return
    clearError()
    setBusy(true)
    try {
      const user = await verifyOtp(email.trim(), otpCode)
      onAuthenticated?.(user)
      onClose()
      setEmail('')
      setOtpCode('')
      setOtpSent(false)
      setTurnstileToken(null)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="candidacy-auth-dialog" role="presentation">
      <button
        type="button"
        className="candidacy-auth-dialog__backdrop"
        aria-label="Chiudi"
        onClick={() => {
          if (!busy) onClose()
        }}
      />
      <div
        className="candidacy-auth-dialog__panel candidacy-auth-dialog__panel--otp"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          ref={closeBtnRef}
          type="button"
          className="candidacy-auth-dialog__close"
          onClick={() => {
            if (!busy) onClose()
          }}
        >
          Chiudi
        </button>
        <h2 id={titleId} className="candidacy-auth-dialog__title">
          Accedi per contattare
        </h2>
        <p className="candidacy-auth-dialog__text">
          Per scrivere a{nameFragment} serve un account famiglia. Inserisci l&apos;email: ti inviamo un codice
          e resti su questa pagina.
        </p>

        <form className="candidacy-auth-dialog__form" onSubmit={(e) => void handleVerifyOtp(e)}>
          {!otpSent ? (
            <>
              <label className="candidacy-auth-dialog__label" htmlFor="contact-auth-email">
                Email
              </label>
              <input
                ref={emailInputRef}
                id="contact-auth-email"
                className="candidacy-auth-dialog__input"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="nome@email.it"
                value={email}
                disabled={busy}
                required
                onChange={(e) => setEmail(e.target.value)}
              />
              <TurnstileWidget onToken={setTurnstileToken} />
              {error ? (
                <p className="candidacy-auth-dialog__error" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                className="candidacy-auth-dialog__btn candidacy-auth-dialog__btn--primary"
                disabled={busy || !email.trim()}
                onClick={() => void handleSendOtp()}
              >
                {busy ? 'Invio…' : 'Invia codice'}
              </button>
            </>
          ) : (
            <>
              <p className="candidacy-auth-dialog__otp-hint">
                Codice inviato a <strong>{email.trim()}</strong>
              </p>
              <OtpCodeInput
                value={otpCode}
                onChange={setOtpCode}
                disabled={busy}
                autoFocus
                aria-label="Codice di accesso a 6 cifre"
              />
              {error ? (
                <p className="candidacy-auth-dialog__error" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                className="candidacy-auth-dialog__btn candidacy-auth-dialog__btn--primary"
                disabled={busy || otpCode.replace(/\D/g, '').length < 6}
              >
                {busy ? 'Verifica…' : 'Conferma e contatta'}
              </button>
              <button
                type="button"
                className="candidacy-auth-dialog__linkish"
                disabled={busy}
                onClick={() => void handleSendOtp()}
              >
                Reinvia codice
              </button>
              <button
                type="button"
                className="candidacy-auth-dialog__linkish"
                disabled={busy}
                onClick={() => {
                  setOtpSent(false)
                  setOtpCode('')
                  clearError()
                }}
              >
                Cambia email
              </button>
            </>
          )}
        </form>

        <p className="candidacy-auth-dialog__note">
          Non hai un account?{' '}
          <Link to={registerHref}>Registrati</Link>
          {' · '}
          <Link to={loginFallbackHref}>Pagina accesso completa</Link>
        </p>
      </div>
    </div>
  )
}
