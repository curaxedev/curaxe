import { useEffect, useId, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

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
 * Sei caselle OTP separate (paste / auto-advance / backspace).
 * Un solo valore stringa verso il form padre.
 */
export function OtpCodeInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
  name = 'code',
  'aria-label': ariaLabel = 'Codice a 6 cifre',
  id,
}: Props) {
  const reactId = useId()
  const baseId = id ?? `otp-${reactId}`
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const filled = onlyDigits(value, length)

  useEffect(() => {
    if (!autoFocus || disabled) return
    const firstEmpty = Math.min(filled.length, length - 1)
    refs.current[firstEmpty]?.focus()
    // Solo al primo mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setAt(index: number, char: string) {
    const current = filled.split('')
    while (current.length < length) current.push('')
    current[index] = char
    onChange(onlyDigits(current.join(''), length))
  }

  function fillFrom(start: number, raw: string) {
    const incoming = onlyDigits(raw, length - start)
    if (!incoming) return
    const current = filled.split('')
    while (current.length < length) current.push('')
    for (let i = 0; i < incoming.length; i++) current[start + i] = incoming[i]!
    const next = onlyDigits(current.join(''), length)
    onChange(next)
    const focusAt = Math.min(start + incoming.length, length - 1)
    requestAnimationFrame(() => refs.current[focusAt]?.focus())
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (filled[index]) {
        setAt(index, '')
        return
      }
      if (index > 0) {
        setAt(index - 1, '')
        refs.current[index - 1]?.focus()
      }
      return
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      refs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      refs.current[index + 1]?.focus()
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    fillFrom(0, e.clipboardData.getData('text') || '')
  }

  return (
    <div className="auth-otp-boxes" role="group" aria-label={ariaLabel}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          id={i === 0 ? baseId : `${baseId}-${i}`}
          type="text"
          name={i === 0 ? name : undefined}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          className="auth-otp-box"
          value={filled[i] ?? ''}
          disabled={disabled}
          aria-label={`Cifra ${i + 1} di ${length}`}
          onChange={(e) => {
            const raw = e.target.value
            if (raw.length > 1) {
              fillFrom(i, raw)
              return
            }
            const dig = onlyDigits(raw, 1)
            if (!dig) {
              setAt(i, '')
              return
            }
            setAt(i, dig)
            if (i < length - 1) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  )
}
