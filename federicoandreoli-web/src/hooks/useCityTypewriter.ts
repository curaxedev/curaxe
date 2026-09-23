import { useEffect, useRef, useState } from 'react'

const CITIES = [
  'Torino',
  'Ivrea',
  'Milano',
  'Caserta',
  'Roma',
  'Firenze',
  'Napoli',
  'Bari',
  'Venezia',
  'Palermo',
  'Como',
  'Trento',
  'Modena',
  'Perugia',
  'Cagliari',
  'Trieste',
  'Parma',
  'Lecce',
]

const TYPE_MS = 72
const DELETE_MS = 38
const PAUSE_TYPED_MS = 2100
const PAUSE_EMPTY_MS = 420
const START_DELAY_MS = 550

type Phase = 'typing' | 'pauseTyped' | 'deleting'

/**
 * Testo città animato macchina da scrivere. Disattivare con `run === false` (focus o valore reale).
 */
export function useCityTypewriter(run: boolean): string {
  const [text, setText] = useState('')
  const cityIdx = useRef(0)
  const charIdx = useRef(0)
  const phase = useRef<Phase>('typing')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const clearTimer = () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    if (!run) {
      clearTimer()
      cityIdx.current = 0
      charIdx.current = 0
      phase.current = 'typing'
      const resetId = requestAnimationFrame(() => setText(''))
      return () => {
        cancelAnimationFrame(resetId)
        clearTimer()
      }
    }

    let cancelled = false

    const schedule = (fn: () => void, ms: number) => {
      clearTimer()
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        if (!cancelled) fn()
      }, ms)
    }

    const tick = () => {
      if (cancelled) return
      const city = CITIES[cityIdx.current % CITIES.length]

      if (phase.current === 'typing') {
        if (charIdx.current < city.length) {
          charIdx.current += 1
          setText(city.slice(0, charIdx.current))
          schedule(tick, TYPE_MS)
        } else {
          phase.current = 'pauseTyped'
          schedule(() => {
            if (cancelled) return
            phase.current = 'deleting'
            tick()
          }, PAUSE_TYPED_MS)
        }
        return
      }

      if (phase.current === 'deleting') {
        if (charIdx.current > 0) {
          charIdx.current -= 1
          setText(city.slice(0, charIdx.current))
          schedule(tick, DELETE_MS)
        } else {
          cityIdx.current = (cityIdx.current + 1) % CITIES.length
          phase.current = 'typing'
          schedule(tick, PAUSE_EMPTY_MS)
        }
      }
    }

    schedule(tick, START_DELAY_MS)

    return () => {
      cancelled = true
      clearTimer()
    }
  }, [run])

  return text
}
