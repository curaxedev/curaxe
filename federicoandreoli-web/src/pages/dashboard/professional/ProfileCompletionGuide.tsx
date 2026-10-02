import type { ProfessionalProfile } from '../../../lib/professionalProfileTypes'
import {
  getProfileCompletionChecklist,
  type ProfileCompletionSectionId,
} from '../../../services/professionalProfileService'
import { IconCheckMark, IconChevronRight } from '../../../components/icons/DashboardIcons'

type Props = {
  profile: ProfessionalProfile | null
  completionPercent: number
  variant?: 'banner' | 'card'
  onGoToProfile: (sectionId?: ProfileCompletionSectionId) => void
}

export function ProfileCompletionGuide({
  profile,
  completionPercent,
  variant = 'card',
  onGoToProfile,
}: Props) {
  const checklist = getProfileCompletionChecklist(profile)
  const pending = checklist.filter((item) => !item.done)
  const doneCount = checklist.length - pending.length

  if (completionPercent >= 100 || checklist.length === 0) {
    return null
  }

  if (variant === 'banner') {
    return (
      <div className="dash-completion-banner" role="status">
        <div className="dash-completion-banner__text">
          <strong>Completa il profilo ({completionPercent}%)</strong>
          <span>
            {pending.length} {pending.length === 1 ? 'voce mancante' : 'voci mancanti'} — aumenta la
            visibilità nelle ricerche.
          </span>
        </div>
        <button type="button" className="dash-btn dash-btn--primary" onClick={() => onGoToProfile()}>
          Continua
          <IconChevronRight size={16} />
        </button>
      </div>
    )
  }

  const visibleItems = pending.length > 0 ? pending : checklist

  return (
    <div className="dash-card dash-completion-guide">
      <div className="dash-card__title">
        Completa il tuo profilo
        <span className="dash-badge dash-badge--new">
          {doneCount}/{checklist.length}
        </span>
      </div>
      <p className="dash-section__subtitle" style={{ marginTop: 0 }}>
        Tocca una voce per andare subito alla sezione. Completa queste parti per comparire meglio
        nelle ricerche.
      </p>
      <ul className="dash-completion-guide__list">
        {visibleItems.map((item) => (
          <li key={`${item.id}-${item.label}`}>
            <button
              type="button"
              className={`dash-completion-guide__item${item.done ? ' is-done' : ''}`}
              onClick={() => onGoToProfile(item.id)}
              disabled={item.done}
            >
              <span className="dash-completion-guide__icon" aria-hidden>
                {item.done ? <IconCheckMark size={14} /> : '·'}
              </span>
              <span className="dash-completion-guide__body">
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </span>
              {!item.done ? <IconChevronRight size={16} /> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
