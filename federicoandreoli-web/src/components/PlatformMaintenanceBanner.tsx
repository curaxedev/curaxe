import { usePlatformConfig } from '../hooks/usePlatformConfig'

/** Banner globale quando manutenzione + flag banner sono attivi. */
export function PlatformMaintenanceBanner() {
  const { maintenance } = usePlatformConfig()

  if (!maintenance.showBanner) return null

  return (
    <div
      className="platform-maintenance-banner"
      role="status"
      style={{
        background: 'var(--color-accent, #c45c26)',
        color: '#fff',
        textAlign: 'center',
        padding: '10px 16px',
        fontSize: 14,
        lineHeight: 1.4,
        fontWeight: 500,
      }}
    >
      {maintenance.message}
    </div>
  )
}
