/** Client-side image resize/compress before profile photo upload. */

export const PROFILE_PHOTO_RAW_MAX_BYTES = 10 * 1024 * 1024
/** Soft target after compression — under server limit with headroom. */
export const PROFILE_PHOTO_TARGET_BYTES = 450 * 1024
export const PROFILE_PHOTO_SERVER_MAX_BYTES = 10 * 1024 * 1024
export const PROFILE_PHOTO_MAX_EDGE = 1400
export const PROFILE_PHOTO_JPEG_QUALITY = 0.8

export class ImageCompressionError extends Error {
  readonly code: 'too_large' | 'unsupported' | 'failed'

  constructor(code: ImageCompressionError['code'], message: string) {
    super(message)
    this.name = 'ImageCompressionError'
    this.code = code
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageCompressionError('failed', 'Impossibile leggere l’immagine. Riprova con un altro file.'))
    }
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ImageCompressionError('failed', 'Compressione immagine non riuscita.'))
          return
        }
        resolve(blob)
      },
      type,
      quality,
    )
  })
}

/**
 * Resize to max edge and encode as JPEG (~0.8). Falls back to original if already small
 * and already JPEG/WebP under the target.
 */
export async function compressProfilePhoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new ImageCompressionError(
      'unsupported',
      'Formato non supportato: usa JPG, PNG o WebP.',
    )
  }

  if (file.size > PROFILE_PHOTO_RAW_MAX_BYTES) {
    throw new ImageCompressionError(
      'too_large',
      'La foto supera i 10 MB. Scegline una più leggera oppure riduci le dimensioni dalla fotocamera.',
    )
  }

  const alreadyOk =
    file.size <= PROFILE_PHOTO_TARGET_BYTES &&
    (file.type === 'image/jpeg' || file.type === 'image/webp')

  if (alreadyOk) {
    return file
  }

  const img = await loadImage(file)
  const maxDim = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height)
  const scale = maxDim > PROFILE_PHOTO_MAX_EDGE ? PROFILE_PHOTO_MAX_EDGE / maxDim : 1
  const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale))
  const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new ImageCompressionError('failed', 'Compressione immagine non riuscita.')
  }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  let quality = PROFILE_PHOTO_JPEG_QUALITY
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality)

  while (blob.size > PROFILE_PHOTO_TARGET_BYTES && quality > 0.45) {
    quality -= 0.1
    blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  }

  if (blob.size > PROFILE_PHOTO_SERVER_MAX_BYTES) {
    throw new ImageCompressionError(
      'too_large',
      'Anche dopo la compressione la foto è troppo grande. Prova un’immagine più piccola.',
    )
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto-profilo'
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}
