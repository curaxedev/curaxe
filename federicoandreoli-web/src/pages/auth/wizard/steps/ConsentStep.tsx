import type { RegisterDraft } from '../../registerDraft'

type Props = {
  draft: RegisterDraft
  patchDraft: (p: Partial<RegisterDraft>) => void
  /** Se omesso (o hideFooter), i consensi si usano dentro un form padre con submit proprio. */
  onContinue?: () => void
  submitLabel?: string
  hideFooter?: boolean
}

type ConsentRowProps = {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  label: React.ReactNode
  badge?: 'obbligatorio' | 'facoltativo'
}

function ConsentRow({ id, checked, onChange, label, badge }: ConsentRowProps) {
  return (
    <div className="wz-toggle-block">
      <div className="wz-toggle-block__text">
        <label htmlFor={id} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {label}
          {badge === 'obbligatorio' && (
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--color-danger, #c0392b)',
                border: '1px solid currentColor',
                borderRadius: 4,
                padding: '1px 6px',
                whiteSpace: 'nowrap',
              }}
            >
              Obbligatorio
            </span>
          )}
          {badge === 'facoltativo' && (
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--color-text-muted, #6b7280)',
                border: '1px solid currentColor',
                borderRadius: 4,
                padding: '1px 6px',
                whiteSpace: 'nowrap',
              }}
            >
              Facoltativo
            </span>
          )}
        </label>
      </div>
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        className={`wz-switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      />
    </div>
  )
}

export function ConsentStep({
  draft,
  patchDraft,
  onContinue,
  submitLabel = 'Avanti',
  hideFooter = false,
}: Props) {
  const mandatoryComplete = draft.consentTermini && draft.consentPrivacy && draft.consentMaggiorenne

  return (
    <>
      <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
        Per completare la registrazione è necessario accettare i seguenti termini. I consensi facoltativi
        migliorano l&apos;esperienza ma non sono richiesti.
      </p>

      <p className="wz-section-label">Consensi obbligatori</p>

      <ConsentRow
        id="consent-termini"
        checked={draft.consentTermini}
        onChange={(v) => patchDraft({ consentTermini: v })}
        badge="obbligatorio"
        label={
          <>
            Accetto i{' '}
            <a href="/termini" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700 }}>
              Termini e Condizioni
            </a>
          </>
        }
      />

      <ConsentRow
        id="consent-privacy"
        checked={draft.consentPrivacy}
        onChange={(v) => patchDraft({ consentPrivacy: v })}
        badge="obbligatorio"
        label={
          <>
            Ho letto e accetto l'{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700 }}>
              Informativa Privacy
            </a>
          </>
        }
      />

      <ConsentRow
        id="consent-maggiorenne"
        checked={draft.consentMaggiorenne}
        onChange={(v) => patchDraft({ consentMaggiorenne: v })}
        badge="obbligatorio"
        label="Dichiaro di avere almeno 18 anni"
      />

      <p className="wz-section-label" style={{ marginTop: 'var(--space-5)' }}>
        Consensi facoltativi
      </p>

      <ConsentRow
        id="consent-comunicazioni"
        checked={!!draft.consentComunicazioni}
        onChange={(v) => patchDraft({ consentComunicazioni: v })}
        badge="facoltativo"
        label={
          <span>
            <strong>Comunicazioni commerciali e newsletter</strong>
            <span style={{ display: 'block', fontSize: 'var(--text-small)', color: 'var(--color-text-muted)' }}>
              Acconsento a ricevere aggiornamenti, offerte e novità della piattaforma.
            </span>
          </span>
        }
      />

      <ConsentRow
        id="consent-profilazione"
        checked={!!draft.consentProfilazione}
        onChange={(v) => patchDraft({ consentProfilazione: v })}
        badge="facoltativo"
        label={
          <span>
            <strong>Profilazione per suggerimenti di abbinamento</strong>
            <span style={{ display: 'block', fontSize: 'var(--text-small)', color: 'var(--color-text-muted)' }}>
              Acconsento all'analisi dei miei dati per migliorare i suggerimenti di abbinamento.
            </span>
          </span>
        }
      />

      <div className="wz-callout wz-callout--muted" style={{ marginTop: 'var(--space-4)' }}>
        Puoi revocare i consensi facoltativi in qualsiasi momento dalle impostazioni del tuo profilo.
      </div>

      {!hideFooter && onContinue ? (
        <div className="wz-footer">
          <button
            type="button"
            className="wz-btn-primary"
            onClick={onContinue}
            disabled={!mandatoryComplete}
          >
            {submitLabel}
          </button>
        </div>
      ) : null}
    </>
  )
}
