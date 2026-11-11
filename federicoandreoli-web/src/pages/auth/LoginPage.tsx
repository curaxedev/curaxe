import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resolvePostLoginPath } from '../../auth/roleDashboard'
import type { AuthChannel, AuthPoliciesResponse, AuthUser } from '../../auth/types'
import { AuthError } from '../../auth/types'
import { setAuthSession } from '../../auth/authSessionStore'
import { getPolicies, loginWithPassword, requestOtp, verifyOtp } from '../../lib/authApi'
import { loginWithPasskey, passkeysSupported } from '../../lib/adminPasskeyApi'
import {
  fetchAdminLoginOptions,
  redeemAdminRecoveryCode,
  redeemAdminRecoveryEmail,
  requestAdminRecoveryEmail,
  type AdminLoginOptions,
} from '../../lib/adminSecurityApi'
import { isMockApiEnabled } from '../../lib/runtimeConfig'
import { findMockAccountByEmail, DEMO_LOGIN_ACCOUNTS, type DemoLoginAccount } from '../../mocks/authFixtures'
import { AuthShell } from '../../components/AuthShell'
import { OtpCodeInput } from '../../components/OtpCodeInput'
import { TurnstileWidget } from '../../components/TurnstileWidget'
import {
  IconChevronLeft,
  IconEye,
  IconEyeOff,
  IconInbox,
  IconLock,
  IconMail,
  IconShield,
} from '../../components/icons/DashboardIcons'
import './auth-pages.css'

type LoginMethod = 'otp' | 'password' | 'passkey' | 'recovery' | null

type ChannelHint = {
  channel: AuthChannel
  label: string
  description: string
}

function channelToLoginMethod(channel: AuthChannel): LoginMethod {
  return channel === 'otp_email' ? 'otp' : 'password'
}

function authErrorMessage(err: unknown): string {
  if (err instanceof AuthError) return err.message
  if (err instanceof Error) return err.message
  return 'Si è verificato un errore. Riprova.'
}

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState<LoginMethod>(null)
  const [showPwd, setShowPwd] = useState(false)
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpNeeded, setTotpNeeded] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [policies, setPolicies] = useState<AuthPoliciesResponse | null>(null)
  const [hintEmail, setHintEmail] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [adminOpts, setAdminOpts] = useState<AdminLoginOptions | null>(null)
  const [recoveryMode, setRecoveryMode] = useState<'code' | 'email'>('code')
  const [recoveryValue, setRecoveryValue] = useState('')
  const [recoveryEmailSent, setRecoveryEmailSent] = useState(false)

  useEffect(() => {
    void getPolicies().then(setPolicies).catch(() => setPolicies(null))
  }, [])

  const channelHint = useMemo(
    () => (hintEmail ? resolveChannelHint(hintEmail, policies) : null),
    [hintEmail, policies],
  )

  const redirectTarget = (() => {
    const raw = searchParams.get('redirect')?.trim()
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
    return raw
  })()

  function clearError() {
    setError(null)
  }

  async function finishLogin(role: Parameters<typeof resolvePostLoginPath>[0]) {
    const path = resolvePostLoginPath(role, redirectTarget)
    navigate(path, { replace: true })
  }

  function goStep1() {
    setStep(1)
    setMethod(null)
    setOtpSent(false)
    setOtpCode('')
    setPassword('')
    setTotpCode('')
    setTotpNeeded(false)
    setHintEmail(null)
    setAdminOpts(null)
    setRecoveryEmailSent(false)
    setRecoveryValue('')
    clearError()
  }

  function resolveChannelHint(em: string, policySet: AuthPoliciesResponse | null): ChannelHint | null {
    if (!policySet) return null
    const account = findMockAccountByEmail(em)
    if (!account) return null
    const channel = policySet.roles_to_auth_channel[account.role]
    const meta = policySet.channels[channel]
    return { channel, label: meta.label, description: meta.description }
  }

  function refreshChannelHint(em: string) {
    setHintEmail(em || null)
  }

  async function submitEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const em = email.trim()
    if (!em) return
    setEmail(em)
    setHintEmail(em)
    setStep(2)
    setOtpSent(false)
    setOtpCode('')
    clearError()
    setBusy(true)
    try {
      const opts = await fetchAdminLoginOptions(em)
      setAdminOpts(opts)
      if (opts.passkeyAvailable && passkeysSupported() && !isMockApiEnabled()) {
        setMethod('passkey')
      } else {
        const hint = resolveChannelHint(em, policies)
        setMethod(hint ? channelToLoginMethod(hint.channel) : null)
      }
    } catch {
      setAdminOpts(null)
      const hint = resolveChannelHint(em, policies)
      setMethod(hint ? channelToLoginMethod(hint.channel) : null)
    } finally {
      setBusy(false)
    }
  }

  async function handleSendOtp() {
    clearError()
    setBusy(true)
    try {
      await requestOtp(email, turnstileToken)
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
      const user = await verifyOtp(email, otpCode)
      await finishLogin(user.role)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handlePasswordLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    clearError()
    setBusy(true)
    try {
      const user = await loginWithPassword(email, password, totpCode.trim() || undefined, turnstileToken)
      await finishLogin(user.role)
    } catch (err) {
      if (err instanceof AuthError && err.code === 'totp_required') {
        setTotpNeeded(true)
      } else if (err instanceof AuthError && err.code === 'password_login_disabled') {
        setError(err.message)
        setMethod(adminOpts?.passkeyAvailable ? 'passkey' : 'recovery')
      } else {
        setError(authErrorMessage(err))
      }
    } finally {
      setBusy(false)
    }
  }

  async function handlePasskeyLogin() {
    if (busy || !email.trim()) return
    clearError()
    setBusy(true)
    try {
      const user = await loginWithPasskey(email.trim())
      await finishLogin(user.role)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRecoveryRedeem() {
    if (busy || !email.trim() || !recoveryValue.trim()) return
    clearError()
    setBusy(true)
    try {
      const res =
        recoveryMode === 'code'
          ? await redeemAdminRecoveryCode(email.trim(), recoveryValue.trim())
          : await redeemAdminRecoveryEmail(email.trim(), recoveryValue.trim())
      setAuthSession({
        user: res.user as AuthUser,
        token: res.token,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        recoverySession: true,
      })
      navigate('/accedi/recupero-admin', { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRecoveryEmailRequest() {
    clearError()
    setBusy(true)
    try {
      await requestAdminRecoveryEmail(email.trim(), turnstileToken)
      setRecoveryEmailSent(true)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDemoLogin(account: DemoLoginAccount) {
    if (busy) return
    clearError()
    setBusy(true)
    try {
      let user
      if (account.method === 'otp') {
        await requestOtp(account.email)
        user = await verifyOtp(account.email, account.secret)
      } else {
        user = await loginWithPassword(account.email, account.secret)
      }
      await finishLogin(user.role)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const passwordAllowed = adminOpts?.passwordAllowed !== false
  const recoveryAvailable = Boolean(adminOpts?.recoveryAvailable)

  return (
    <AuthShell className="auth-page auth-page--login" hideBrandBar>
      <main className="auth-login-main">
        <div className="auth-card auth-card--login">
          <p className="auth-login-home">
            <Link to="/">
              <IconChevronLeft size={16} aria-hidden />
              Torna alla home
            </Link>
          </p>
          <p className="auth-login-step">Passo {step} di 2</p>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          {step === 1 && (
            <>
              <h1 className="auth-title">Accedi</h1>
              <p className="auth-subtitle">Inserisci l’email del tuo account per continuare.</p>

              <form className="auth-form" onSubmit={(e) => void submitEmail(e)}>
                <label className="auth-field">
                  <span className="auth-field__label">Email</span>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">
                      <IconMail size={20} />
                    </span>
                    <input
                      type="email"
                      name="email"
                      placeholder="nome@struttura.it"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (hintEmail) setHintEmail(null)
                      }}
                      onBlur={() => refreshChannelHint(email.trim())}
                    />
                  </div>
                </label>

                <p className="auth-channel-hint auth-channel-hint--reserved" role="status">
                  {channelHint ? (
                    <>
                      <strong>{channelHint.label}</strong> — {channelHint.description}
                    </>
                  ) : null}
                </p>

                <button type="submit" className="auth-btn-primary auth-btn-primary--block" disabled={busy}>
                  {busy ? '…' : 'Avanti'}
                </button>
              </form>
            </>
          )}

          {step === 2 && !method && (
            <>
              <h1 className="auth-title">Come vuoi accedere?</h1>
              <p className="auth-subtitle">
                Stai entrando con <strong className="auth-email-emphasis">{email}</strong>
              </p>
              {channelHint && (
                <p className="auth-channel-hint" role="status">
                  Metodo consigliato: <strong>{channelHint.label}</strong>
                </p>
              )}
              <button type="button" className="auth-change-email" onClick={goStep1}>
                Modifica email
              </button>

              <div className="auth-login-choice-grid" role="group" aria-label="Metodo di accesso">
                <button type="button" className="auth-login-choice" onClick={() => setMethod('otp')}>
                  <span className="auth-login-choice__icon" aria-hidden>
                    <IconInbox size={26} />
                  </span>
                  <span className="auth-login-choice__title">Ricevi un codice via email</span>
                  <span className="auth-login-choice__desc">Accesso senza password: ideale per OSS e percorsi leggeri.</span>
                </button>
                <button type="button" className="auth-login-choice" onClick={() => setMethod('password')}>
                  <span className="auth-login-choice__icon" aria-hidden>
                    <IconLock size={26} />
                  </span>
                  <span className="auth-login-choice__title">Inserisci password</span>
                  <span className="auth-login-choice__desc">Per account con password e secondo fattore (es. strutture, admin).</span>
                </button>
              </div>
            </>
          )}

          {step === 2 && method === 'passkey' && (
            <>
              <h1 className="auth-title">Accesso con passkey</h1>
              <p className="auth-subtitle">
                Account <strong className="auth-email-emphasis">{email}</strong> — conferma Face ID,
                Touch ID o la tua chiavetta.
              </p>
              <button type="button" className="auth-change-email" onClick={goStep1}>
                Modifica email
              </button>
              <button
                type="button"
                className="auth-btn-primary auth-btn-primary--block"
                disabled={busy || !passkeysSupported()}
                onClick={() => void handlePasskeyLogin()}
              >
                {busy ? 'Verifica…' : 'Continua con passkey'}
              </button>
              {!passkeysSupported() && (
                <p className="auth-error">Questo browser non supporta le passkey.</p>
              )}
              {passwordAllowed ? (
                <button
                  type="button"
                  className="auth-link-resend"
                  disabled={busy}
                  onClick={() => {
                    clearError()
                    setMethod('password')
                  }}
                >
                  Non riesco con la passkey — usa password
                </button>
              ) : (
                <button
                  type="button"
                  className="auth-link-resend"
                  disabled={busy}
                  onClick={() => {
                    clearError()
                    setMethod('recovery')
                  }}
                >
                  Recupero accesso
                </button>
              )}
              {passwordAllowed && recoveryAvailable ? (
                <button
                  type="button"
                  className="auth-link-resend"
                  disabled={busy}
                  onClick={() => setMethod('recovery')}
                >
                  Recupero accesso
                </button>
              ) : null}
            </>
          )}

          {step === 2 && method === 'recovery' && (
            <>
              <h1 className="auth-title">Recupero accesso</h1>
              <p className="auth-subtitle">
                Usa un codice di ripristino salvato oppure richiedi un codice lungo alle email di
                notifica.
              </p>
              <button
                type="button"
                className="auth-change-email"
                onClick={() => setMethod(adminOpts?.passkeyAvailable ? 'passkey' : null)}
              >
                <IconChevronLeft size={14} aria-hidden />
                Indietro
              </button>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  className={`dash-btn ${recoveryMode === 'code' ? 'dash-btn--primary' : 'dash-btn--ghost'}`}
                  onClick={() => setRecoveryMode('code')}
                >
                  Codice ripristino
                </button>
                <button
                  type="button"
                  className={`dash-btn ${recoveryMode === 'email' ? 'dash-btn--primary' : 'dash-btn--ghost'}`}
                  onClick={() => setRecoveryMode('email')}
                >
                  Email break-glass
                </button>
              </div>
              {recoveryMode === 'email' && !recoveryEmailSent ? (
                <>
                  <TurnstileWidget onToken={setTurnstileToken} />
                  <button
                    type="button"
                    className="auth-btn-primary auth-btn-primary--block"
                    disabled={busy}
                    onClick={() => void handleRecoveryEmailRequest()}
                  >
                    {busy ? 'Invio…' : 'Invia codice alle email di notifica'}
                  </button>
                </>
              ) : (
                <>
                  <label className="auth-field">
                    <span className="auth-field__label">
                      {recoveryMode === 'code' ? 'Codice (XXXX-XXXX-XXXX)' : 'Codice ricevuto via email'}
                    </span>
                    <input
                      className="auth-input"
                      value={recoveryValue}
                      onChange={(e) => setRecoveryValue(e.target.value)}
                      disabled={busy}
                      autoComplete="one-time-code"
                    />
                  </label>
                  <button
                    type="button"
                    className="auth-btn-primary auth-btn-primary--block"
                    disabled={busy || !recoveryValue.trim()}
                    onClick={() => void handleRecoveryRedeem()}
                  >
                    {busy ? 'Verifica…' : 'Continua'}
                  </button>
                </>
              )}
            </>
          )}

          {step === 2 && method === 'otp' && (
            <>
              <h1 className="auth-title">Codice via email</h1>
              <p className="auth-subtitle">
                {otpSent
                  ? `Se ${email} è registrato, riceverai un codice a breve (controlla anche spam).`
                  : `Se ${email} è registrato, invieremo un codice monouso.`}
              </p>
              <button type="button" className="auth-change-email" onClick={() => setMethod(null)}>
                <IconChevronLeft size={14} aria-hidden />
                Torna alla scelta
              </button>

              <form className="auth-form" onSubmit={(e) => void handleVerifyOtp(e)}>
                {!otpSent ? (
                  <>
                    <TurnstileWidget onToken={setTurnstileToken} />
                    <button
                      type="button"
                      className="auth-btn-primary auth-btn-primary--block"
                      disabled={busy}
                      onClick={() => void handleSendOtp()}
                    >
                      {busy ? 'Invio…' : 'Invia codice'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="auth-field">
                      <span className="auth-field__label" id="otp-code-label">
                        Codice a 6 cifre
                      </span>
                      <OtpCodeInput
                        value={otpCode}
                        onChange={setOtpCode}
                        name="one-time-code"
                        aria-label="Codice OTP a 6 cifre"
                      />
                    </div>
                    <button
                      type="submit"
                      className="auth-btn-primary auth-btn-primary--block"
                      disabled={busy || otpCode.trim().length < 6}
                    >
                      {busy ? 'Verifica…' : 'Continua'}
                    </button>
                    <button
                      type="button"
                      className="auth-link-resend"
                      disabled={busy}
                      onClick={() => void handleSendOtp()}
                    >
                      Invia di nuovo
                    </button>
                  </>
                )}
              </form>
            </>
          )}

          {step === 2 && method === 'password' && (
            <>
              <h1 className="auth-title">Password</h1>
              <p className="auth-subtitle">Account {email}</p>
              <button
                type="button"
                className="auth-change-email"
                onClick={() => setMethod(adminOpts?.passkeyAvailable ? 'passkey' : null)}
              >
                <IconChevronLeft size={14} aria-hidden />
                {adminOpts?.passkeyAvailable ? 'Torna alla passkey' : 'Torna alla scelta'}
              </button>

              <form className="auth-form" onSubmit={(e) => void handlePasswordLogin(e)}>
                <div className="auth-field-head">
                  <span className="auth-field__label">Password</span>
                  <Link to="/password-dimenticata" className="auth-forgot">
                    Password dimenticata?
                  </Link>
                </div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <IconLock size={20} />
                  </span>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-input-suffix"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? 'Nascondi password' : 'Mostra password'}
                  >
                    {showPwd ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                  </button>
                </div>

                {totpNeeded && (
                  <div className="auth-field">
                    <span className="auth-field__label">Codice di verifica (app authenticator)</span>
                    <OtpCodeInput
                      value={totpCode}
                      onChange={setTotpCode}
                      name="totp"
                      aria-label="Codice TOTP a 6 cifre"
                    />
                  </div>
                )}

                <label className="auth-checkbox">
                  <input type="checkbox" name="remember" />
                  <span>Ricordami per 30 giorni</span>
                </label>

                <TurnstileWidget onToken={setTurnstileToken} />

                <button type="submit" className="auth-btn-primary auth-btn-primary--block" disabled={busy}>
                  {busy ? 'Accesso…' : 'Accedi'}
                </button>
              </form>
            </>
          )}

          {(step === 1 || (step === 2 && method === 'password')) && (
            <p className="auth-trust-inline">
              <IconShield size={18} />
              Piattaforma progettata per GDPR e trattamento dati controllato
            </p>
          )}

          {isMockApiEnabled() && (
            <section className="auth-demo-panel" aria-labelledby="auth-demo-title">
              <div className="auth-demo-panel__head">
                <h2 id="auth-demo-title" className="auth-demo-panel__title">
                  Accesso demo
                </h2>
                <span className="auth-demo-badge">Demo</span>
              </div>
              <p className="auth-demo-panel__lead">
                Accedi con un account precaricato per esplorare la piattaforma.
              </p>
              <ul className="auth-demo-list">
                {DEMO_LOGIN_ACCOUNTS.map((account) => (
                  <li key={account.email} className="auth-demo-row">
                    <div className="auth-demo-row__body">
                      <span className="auth-demo-row__label">{account.label}</span>
                      <span className="auth-demo-row__cred">
                        <span className="auth-demo-row__cred-key">Email</span>
                        <code>{account.email}</code>
                      </span>
                      <span className="auth-demo-row__cred">
                        <span className="auth-demo-row__cred-key">
                          {account.method === 'otp' ? 'Codice OTP' : 'Password'}
                        </span>
                        <code>{account.secret}</code>
                      </span>
                      <span className="auth-demo-row__dest">→ {account.dashboardPath}</span>
                    </div>
                    <button
                      type="button"
                      className="auth-btn-outline auth-demo-row__btn"
                      disabled={busy}
                      onClick={() => void handleDemoLogin(account)}
                    >
                      {busy ? 'Accesso…' : 'Accedi'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="auth-switch">
            Non hai un account? <Link to="/registrazione/intent">Crea un account</Link>
          </p>

          <nav className="auth-legal-row" aria-label="Legale">
            <Link to="/termini">Termini di servizio</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/cookie">Cookie</Link>
          </nav>
        </div>
      </main>
    </AuthShell>
  )
}
