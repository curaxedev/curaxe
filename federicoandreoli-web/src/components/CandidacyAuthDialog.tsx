import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'

export type CandidacyAuthDialogProps = {
  open: boolean
  onClose: () => void
  /** Path + query per tornare dopo il login, es. `/posizioni/op-cg-1?assistenza=offro` */
  returnTo: string
}

export function CandidacyAuthDialog({ open, onClose, returnTo }: CandidacyAuthDialogProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  const loginHref = `/accedi?redirect=${encodeURIComponent(returnTo)}`
  const registerHref = `/registrazione/intent`

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="candidacy-auth-dialog" role="presentation">
      <button type="button" className="candidacy-auth-dialog__backdrop" aria-label="Chiudi" onClick={onClose} />
      <div
        ref={panelRef}
        className="candidacy-auth-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button ref={closeBtnRef} type="button" className="candidacy-auth-dialog__close" onClick={onClose}>
          Chiudi
        </button>
        <h2 id={titleId} className="candidacy-auth-dialog__title">
          Accedi per candidarti
        </h2>
        <p className="candidacy-auth-dialog__text">
          Per inviare la candidatura serve un account. Accedi se sei già registrato, oppure apri un profilo
          professionista in pochi passi.
        </p>
        <div className="candidacy-auth-dialog__actions">
          <Link className="candidacy-auth-dialog__btn candidacy-auth-dialog__btn--primary" to={loginHref}>
            Accedi
          </Link>
          <Link className="candidacy-auth-dialog__btn candidacy-auth-dialog__btn--ghost" to={registerHref}>
            Registrazione
          </Link>
        </div>
        <p className="candidacy-auth-dialog__note">
          Dopo l’accesso tornerai automaticamente a questa posizione.
        </p>
      </div>
    </div>
  )
}
