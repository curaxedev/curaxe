import { useId, useRef, useState } from 'react'
import { IconUpload } from './icons/DashboardIcons'
import { PersonAvatar } from './PersonAvatar'
import {
  compressProfilePhoto,
  ImageCompressionError,
  PROFILE_PHOTO_RAW_MAX_BYTES,
} from '../lib/imageCompression'
import {
  DEFAULT_AVATAR_PRESET_ID,
  presetIdFromPhotoUrl,
  PROFILE_AVATAR_PRESETS,
} from '../lib/profileAvatars'

type Props = {
  photoUrl: string | null
  displayName: string
  busy?: boolean
  onUploadPhoto: (file: File) => Promise<boolean>
  onSelectPreset: (presetId: string) => Promise<boolean>
  onClear: () => Promise<boolean>
}

export function ProfilePhotoPicker({
  photoUrl,
  displayName,
  busy = false,
  onUploadPhoto,
  onSelectPreset,
  onClear,
}: Props) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)

  const selectedPreset = presetIdFromPhotoUrl(photoUrl)
  const showingDefault = !photoUrl
  const isBusy = busy || compressing

  async function handleFile(file: File | undefined) {
    if (!file) return
    setLocalError(null)

    if (file.size > PROFILE_PHOTO_RAW_MAX_BYTES) {
      setLocalError(
        'La foto supera i 10 MB. Scegline una più leggera oppure riduci le dimensioni dalla fotocamera.',
      )
      return
    }

    setCompressing(true)
    let objectUrl: string | null = null
    try {
      const compressed = await compressProfilePhoto(file)
      objectUrl = URL.createObjectURL(compressed)
      setPreviewUrl(objectUrl)
      const ok = await onUploadPhoto(compressed)
      if (!ok) {
        setPreviewUrl(null)
      }
    } catch (err) {
      setPreviewUrl(null)
      if (err instanceof ImageCompressionError) {
        setLocalError(err.message)
      } else {
        setLocalError('Caricamento foto non riuscito. Riprova.')
      }
    } finally {
      setCompressing(false)
      if (objectUrl) {
        // Keep preview until server URL arrives; revoke after a beat.
        window.setTimeout(() => URL.revokeObjectURL(objectUrl!), 30_000)
      }
    }
  }

  const displaySrc = previewUrl || photoUrl

  return (
    <div className="dash-prof-photo-picker">
      <div className="dash-prof-photo">
        <PersonAvatar
          src={displaySrc}
          alt={displayName ? `Foto di ${displayName}` : 'Foto profilo'}
          size={88}
          className="dash-prof-photo__img"
          fallbackPresetId={DEFAULT_AVATAR_PRESET_ID}
        />
        <div className="dash-prof-photo__body">
          <input
            id={inputId}
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              void handleFile(file)
            }}
          />
          <div className="dash-prof-photo__actions">
            <button
              type="button"
              className="dash-btn dash-btn--ghost"
              disabled={isBusy}
              onClick={() => fileRef.current?.click()}
            >
              <IconUpload size={16} />{' '}
              {compressing ? 'Ottimizzazione…' : isBusy ? 'Caricamento…' : 'Carica foto'}
            </button>
            {!showingDefault ? (
              <button
                type="button"
                className="dash-btn dash-btn--ghost"
                disabled={isBusy}
                onClick={() => {
                  setLocalError(null)
                  setPreviewUrl(null)
                  void onClear()
                }}
              >
                Usa icona predefinita
              </button>
            ) : null}
          </div>
          <p className="dash-form-hint">
            Carica una foto (fino a 10 MB: la comprimiamo automaticamente) oppure scegli un
            avatar colorato. Formati JPG, PNG, WebP.
          </p>
          {localError ? (
            <p className="dash-prof-photo-picker__error" role="alert">
              {localError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="dash-prof-avatar-library">
        <p className="dash-prof-avatar-library__label">Libreria avatar</p>
        <div className="dash-prof-avatar-library__grid" role="listbox" aria-label="Avatar predefiniti">
          {PROFILE_AVATAR_PRESETS.map((preset) => {
            // null photo → default colored person; highlight matching preset
            const isCurrent =
              selectedPreset === preset.id ||
              (showingDefault && preset.id === DEFAULT_AVATAR_PRESET_ID)

            return (
              <button
                key={preset.id}
                type="button"
                role="option"
                aria-selected={isCurrent}
                className={`dash-prof-avatar-library__item${isCurrent ? ' is-selected' : ''}`}
                disabled={isBusy}
                title={preset.label}
                onClick={() => {
                  setLocalError(null)
                  setPreviewUrl(null)
                  void onSelectPreset(preset.id)
                }}
              >
                <img src={preset.src} alt="" width={48} height={48} />
                <span className="visually-hidden">{preset.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
