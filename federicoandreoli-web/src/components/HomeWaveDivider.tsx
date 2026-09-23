type HomeWaveDividerProps = {
  /** Sfondo della sezione successiva (riempie la parte sotto il profilo curvo). */
  fill: 'page' | 'surface'
}

const FILL: Record<HomeWaveDividerProps['fill'], string> = {
  page: 'var(--color-page)',
  surface: 'var(--color-surface)',
}

/**
 * Ponte visivo full-bleed tra due blocchi con sfondo diverso.
 * La parte sopra la curva è trasparente così si vede lo sfondo della sezione precedente.
 */
export function HomeWaveDivider({ fill }: HomeWaveDividerProps) {
  return (
    <div className="home-wave-divider" aria-hidden>
      <svg viewBox="0 0 1440 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fill={FILL[fill]}
          d="M0,40 C240,28 480,48 720,36 C960,24 1200,44 1440,34 L1440,56 L0,56 Z"
        />
      </svg>
    </div>
  )
}
