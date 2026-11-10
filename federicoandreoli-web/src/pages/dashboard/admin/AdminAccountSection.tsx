import { IconLock, IconProfile, IconRefresh, IconShield } from '../../../components/icons/DashboardIcons'
import { AccountSettingsSection } from '../AccountSettingsSection'
import { AdminSecuritySection } from './AdminSecuritySection'

/**
 * Admin Account — WineOS hub: profilo/preferenze + sicurezza in box densità admin.
 */
export function AdminAccountSection() {
  return (
    <div className="admin-account">
      <div className="admin-account__crumb">
        <span>Admin</span>
        <span className="admin-account__crumb-sep">›</span>
        <strong>Account</strong>
      </div>

      <header className="admin-account__head">
        <div>
          <p className="admin-account__eyebrow">
            <IconProfile size={12} /> Il tuo accesso
          </p>
          <h1 className="admin-account__title">Account</h1>
          <p className="admin-account__sub">
            Email, password, preferenze e sicurezza amministratore — stesso densità WineOS delle altre
            sezioni.
          </p>
        </div>
      </header>

      <div className="admin-account__grid">
        <section className="admin-account-panel" aria-labelledby="admin-account-profile-title">
          <div className="admin-account-panel__head">
            <div>
              <h2 id="admin-account-profile-title" className="admin-account-panel__title">
                Profilo e preferenze
              </h2>
              <p className="admin-account-panel__sub">Email, password, notifiche e diritti GDPR</p>
            </div>
            <span className="admin-account-panel__badge">
              <IconRefresh size={12} /> Sync
            </span>
          </div>
          <div className="admin-account-panel__body admin-account-panel__body--settings">
            <AccountSettingsSection hideHeader />
          </div>
        </section>

        <section className="admin-account-panel" aria-labelledby="admin-account-security-title">
          <div className="admin-account-panel__head">
            <div>
              <h2 id="admin-account-security-title" className="admin-account-panel__title">
                Sicurezza
              </h2>
              <p className="admin-account-panel__sub">Passkey, step-up e alert di accesso</p>
            </div>
            <span className="admin-account-panel__badge admin-account-panel__badge--lock">
              <IconLock size={12} /> Critico
            </span>
          </div>
          <div className="admin-account-panel__body">
            <div className="admin-account-panel__hint">
              <IconShield size={14} />
              <span>
                Le azioni sensibili (utenti, piani, Stripe, KYC) richiedono conferma passkey quando
                Sicurezza totale è attiva.
              </span>
            </div>
            <AdminSecuritySection />
          </div>
        </section>
      </div>
    </div>
  )
}
