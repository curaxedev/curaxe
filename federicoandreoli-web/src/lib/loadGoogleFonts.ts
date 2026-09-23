const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Inter:wght@400;500;600&display=swap'

let injected = false

/**
 * Inietta i tag <link> di Google Fonts nel <head> una sola volta.
 * Chiamare solo dopo aver ottenuto il consenso funzionale dell'utente.
 */
export function loadGoogleFonts(): void {
  if (injected) return
  injected = true

  const preconnect1 = document.createElement('link')
  preconnect1.rel = 'preconnect'
  preconnect1.href = 'https://fonts.googleapis.com'
  document.head.appendChild(preconnect1)

  const preconnect2 = document.createElement('link')
  preconnect2.rel = 'preconnect'
  preconnect2.href = 'https://fonts.gstatic.com'
  preconnect2.crossOrigin = 'anonymous'
  document.head.appendChild(preconnect2)

  const stylesheet = document.createElement('link')
  stylesheet.rel = 'stylesheet'
  stylesheet.href = FONTS_URL
  document.head.appendChild(stylesheet)
}
