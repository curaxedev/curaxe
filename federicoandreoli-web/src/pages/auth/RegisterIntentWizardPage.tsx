import { useNavigate, Link } from 'react-router-dom'
import { IconBriefcase, IconHome } from '../../components/icons/DashboardIcons'
import { useRegisterWizard } from './RegisterWizardContext'
import { offerStepHref, seekerStepHref, OFFER_STEP_IDS, SEEKER_STEP_IDS } from './wizard/stepConfig'
import { WizardShell } from './wizard/WizardShell'
import './wizard/register-wizard.css'

export function RegisterIntentWizardPage() {
  const navigate = useNavigate()
  const { resetForIntent } = useRegisterWizard()

  return (
    <WizardShell backTo="/accedi" backLabel="Login" progressFraction={0.06} title="Come vuoi usare Curaxe?">
      <div className="wz-intent-grid">
        <button
          type="button"
          className="wz-intent-card"
          onClick={() => {
            resetForIntent('seeker')
            navigate(seekerStepHref(SEEKER_STEP_IDS[0]))
          }}
        >
          <div className="wz-intent-card__icon" style={{ color: 'var(--color-primary)' }} aria-hidden>
            <IconHome size={28} />
          </div>
          <h2>Cerco assistenza</h2>
          <p>Famiglia o assistito alla ricerca di professionisti.</p>
        </button>

        <button
          type="button"
          className="wz-intent-card"
          onClick={() => {
            resetForIntent('offer')
            navigate(offerStepHref(OFFER_STEP_IDS[0]))
          }}
        >
          <div className="wz-intent-card__icon" style={{ color: 'var(--color-accent)' }} aria-hidden>
            <IconBriefcase size={28} />
          </div>
          <h2>Offro assistenza</h2>
          <p>OSS, infermieri, badanti e liberi professionisti.</p>
        </button>
      </div>

      <p style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
        <Link to="/iscriviti" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
          Guida per professionisti
        </Link>
      </p>
    </WizardShell>
  )
}
