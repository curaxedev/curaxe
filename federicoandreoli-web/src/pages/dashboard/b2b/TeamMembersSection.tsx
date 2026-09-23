import { useState, type FormEvent } from 'react'
import { useTeamMembers } from '../../../hooks/useTeamMembers'
import {
  TEAM_MEMBER_ROLE_LABELS,
  TEAM_MEMBER_STATUS_LABELS,
  formatTeamMemberDate,
} from '../../../lib/teamMemberApi'
import type { TeamMemberRole } from '../../../lib/teamMemberTypes'
import {
  IconAlert,
  IconPlus,
  IconUsers,
} from '../../../components/icons/DashboardIcons'

type TeamMembersSectionProps = {
  variant: 'agency' | 'structure'
}

export function TeamMembersSection({ variant }: TeamMembersSectionProps) {
  const team = useTeamMembers()
  const [panelOpen, setPanelOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamMemberRole>(team.defaultRole)

  const copy =
    variant === 'structure'
      ? {
          title: 'Team e collaboratori',
          subtitle: 'Invita colleghi o referenti HR ad accedere alla dashboard struttura',
          inviteLabel: 'Invita collaboratore',
        }
      : {
          title: 'Team agenzia',
          subtitle: 'Invita recruiter e collaboratori con accesso alla dashboard',
          inviteLabel: 'Invita membro',
        }

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await team.invite({ email, role })
    if (ok) {
      setEmail('')
      setRole(team.defaultRole)
      setPanelOpen(false)
    }
  }

  return (
    <div>
      {team.toast ? (
        <div className="dash-card" role="status" style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-sage)' }}>
          {team.toast}
        </div>
      ) : null}

      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">{copy.title}</h2>
          <p className="dash-section__subtitle">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          className="dash-btn dash-btn--primary"
          onClick={() => {
            team.clearInviteFeedback()
            setPanelOpen((v) => !v)
          }}
        >
          <IconPlus size={16} />
          {copy.inviteLabel}
        </button>
      </div>

      {panelOpen ? (
        <form className="dash-card" onSubmit={(e) => void handleInvite(e)} style={{ marginBottom: 'var(--space-4)' }}>
          <div className="dash-form-grid">
            <div className="dash-form-field dash-form-field--full">
              <label className="dash-form-label" htmlFor="team-invite-email">
                Email collaboratore
              </label>
              <input
                id="team-invite-email"
                type="email"
                className="dash-form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.it"
                autoComplete="email"
                aria-invalid={Boolean(team.fieldErrors.email)}
                aria-describedby={team.fieldErrors.email ? 'team-email-error' : undefined}
              />
              {team.fieldErrors.email ? (
                <p id="team-email-error" className="dash-form-error">
                  {team.fieldErrors.email}
                </p>
              ) : null}
            </div>
            <div className="dash-form-field">
              <label className="dash-form-label" htmlFor="team-invite-role">
                Ruolo
              </label>
              <select
                id="team-invite-role"
                className="dash-form-select"
                value={role}
                onChange={(e) => setRole(e.target.value as TeamMemberRole)}
              >
                {(Object.keys(TEAM_MEMBER_ROLE_LABELS) as TeamMemberRole[]).map((key) => (
                  <option key={key} value={key}>
                    {TEAM_MEMBER_ROLE_LABELS[key]}
                  </option>
                ))}
              </select>
              {team.fieldErrors.role ? <p className="dash-form-error">{team.fieldErrors.role}</p> : null}
            </div>
          </div>
          {team.inviteError ? (
            <p className="dash-form-error" role="alert" style={{ marginTop: 'var(--space-3)' }}>
              {team.inviteError}
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <button type="submit" className="dash-btn dash-btn--primary" disabled={team.inviting}>
              {team.inviting ? 'Invio…' : 'Invia invito (mock)'}
            </button>
            <button
              type="button"
              className="dash-btn dash-btn--ghost"
              onClick={() => {
                setPanelOpen(false)
                team.clearInviteFeedback()
              }}
            >
              Annulla
            </button>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>
            In produzione verrà inviata un&apos;email con link di invito. Oggi l&apos;invito è simulato in locale.
          </p>
        </form>
      ) : null}

      {team.loading ? (
        <div className="dash-card" aria-busy="true" aria-label="Caricamento team">
          <div className="dash-skeleton dash-skeleton--title" style={{ width: 140, height: 20, marginBottom: 12 }} />
          <div className="dash-skeleton" style={{ width: '100%', height: 80 }} />
        </div>
      ) : team.error ? (
        <div className="dash-empty-state" role="alert">
          <div className="dash-empty-state__icon">
            <IconAlert size={28} />
          </div>
          <div className="dash-empty-state__title">Errore di caricamento</div>
          <div className="dash-empty-state__sub">{team.error}</div>
          <button type="button" className="dash-btn dash-btn--primary" onClick={() => void team.reload()}>
            Riprova
          </button>
        </div>
      ) : team.members.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state__icon">
            <IconUsers size={28} />
          </div>
          <div className="dash-empty-state__title">Nessun membro</div>
          <div className="dash-empty-state__sub">Invita il primo collaboratore con accesso alla dashboard.</div>
        </div>
      ) : (
        <div className="dash-team-grid">
          {team.members.map((m) => (
            <div key={m.id} className="dash-team-card">
              <div className="dash-team-card__avatar">{m.initials}</div>
              <div style={{ flex: 1 }}>
                <div className="dash-team-card__name">{m.name}</div>
                <div className="dash-team-card__meta">
                  {m.email} · {TEAM_MEMBER_ROLE_LABELS[m.role]}
                </div>
                <span
                  className={`dash-badge dash-badge--${m.status === 'active' ? 'active' : 'paused'}`}
                  style={{ marginTop: 4 }}
                >
                  {TEAM_MEMBER_STATUS_LABELS[m.status]}
                </span>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Invito {formatTeamMemberDate(m.invitedAt)}
                  {m.joinedAt ? ` · Attivo dal ${formatTeamMemberDate(m.joinedAt)}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="dash-btn dash-btn--danger"
                disabled={team.removingId === m.id}
                onClick={() => {
                  if (window.confirm(`Rimuovere ${m.email} dal team?`)) {
                    void team.remove(m.id)
                  }
                }}
              >
                {team.removingId === m.id ? '…' : 'Rimuovi'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
