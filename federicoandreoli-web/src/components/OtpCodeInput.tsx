import { useEffect, useId, useRef, type ClipboardEvent, type FormEvent } from 'react'

type Props = {
  value: string
  onChange: (next: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  name?: string
  'aria-label'?: string
  id?: string
}

function onlyDigits(raw: string, max: number): string {
  return raw.replace(/\D/g, '').slice(0, max)
}

/**
 * Campo OTP singolo (non caselle spezzate): iOS/Android consigliano il codice
 * da email/SMS solo con autocomplete="one-time-code" su un input unico ≥16px.
 */
export function OtpCodeInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
  name = 'one-time-code',
  'aria-label': ariaLabel = 'Codice a 6 cifre',
  id,
}: Props) {
  const reactId = useId()
  const inputId = id ?? `otp-${reactId}`
  const ref = useRef<HTMLInputElement | null>(null)
  const filled = onlyDigits(value, length)

  useEffect(() => {
    if (!autoFocus || disabled) return
    ref.current?.focus()
    // Solo al primo mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function apply(raw: string) {
    onChange(onlyDigits(raw, length))
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    apply(e.clipboardData.getData('text') || '')
  }

  function onInput(e: FormEvent<HTMLInputElement>) {
    apply(e.currentTarget.value)
  }

  return (
    <div className="auth-otp-single-wrap">
      <input
        ref={ref}
        id={inputId}
        className="auth-otp-single"
        type="text"
        name={name}
        value={filled}
        disabled={disabled}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        autoComplete="one-time-code"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        aria-label={ariaLabel}
        placeholder={'· '.repeat(length).trim()}
        onInput={onInput}
        onPaste={onPaste}
        onFocus={(e) => e.currentTarget.select()}
      />
      <p className="auth-otp-single-hint" aria-hidden>
        {filled.length}/{length} cifre
      </p>
    </div>
  )
}
