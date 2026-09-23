import { useState } from 'react'
import {
  IconAlert,
  IconBell,
  IconCheck,
  IconInfo,
  IconMail,
} from '../../components/icons/DashboardIcons'
import type { AppNotification, NotificationType } from '../../lib/notificationTypes'
import { formatNotificationDate } from '../../services/notificationService'

type NotifFilter = 'all' | 'unread'

const NOTIF_ICON: Record<NotificationType, typeof IconMail> = {
  primary: IconMail,
  info: IconInfo,
  warning: IconAlert,
  success: IconCheck,
}

type DashboardNotificationsSectionProps = {
  title?: string
  subtitle?: string
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markingAll?: boolean
  onReload: () => void
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
}

function EmptyStateIcon({ children }: { children: React.ReactNode }) {
  return <div className="dash-empty-state__icon">{children}</div>
}

function NotificationsSkeleton() {
  return (
    <div className="dash-notif-skeleton" aria-busy="true" aria-label="Caricamento notifiche">
      <div className="dash-skeleton dash-notif-skeleton__title" />
      <div className="dash-skeleton dash-notif-skeleton__subtitle" />
      <div className="dash-notif-skeleton__list">
        {[0, 1, 2].map((key) => (
          <div key={key} className="dash-skeleton dash-notif-skeleton__item" />
        ))}
      </div>
    </div>
  )
}

export function DashboardNotificationsSection({
  title = 'Notifiche',
  subtitle,
  notifications,
  unreadCount,
  loading,
  error,
  markingAll = false,
  onReload,
  onMarkAllRead,
  onMarkRead,
}: DashboardNotificationsSectionProps) {
  const [filter, setFilter] = useState<NotifFilter>('all')

  const subtitleText =
    subtitle ??
    (unreadCount > 0 ? `${unreadCount} non lette` : 'Tutte lette')

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications

  if (loading) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">{title}</h2>
          </div>
        </div>
        <NotificationsSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section__title">{title}</h2>
          </div>
        </div>
        <div className="dash-empty-state polish-state-panel" role="alert">
          <EmptyStateIcon>
            <IconAlert size={28} />
          </EmptyStateIcon>
          <div className="dash-empty-state__title">Impossibile caricare le notifiche</div>
          <div className="dash-empty-state__sub">{error}</div>
          <button type="button" className="dash-btn dash-btn--primary" onClick={onReload}>
            Riprova
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">{title}</h2>
          <p className="dash-section__subtitle">{subtitleText}</p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="dash-btn dash-notif-mark-all-btn"
            disabled={markingAll}
            onClick={() => void onMarkAllRead()}
          >
            {markingAll ? 'Aggiornamento…' : 'Segna tutte come lette'}
          </button>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="dash-notif-filters" role="tablist" aria-label="Filtra notifiche">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            className={`dash-notif-filter-pill${filter === 'all' ? ' dash-notif-filter-pill--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tutte
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'unread'}
            className={`dash-notif-filter-pill${filter === 'unread' ? ' dash-notif-filter-pill--active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Non lette
            {unreadCount > 0 && (
              <span className="dash-notif-filter-pill__badge">{unreadCount}</span>
            )}
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="dash-empty-state polish-state-panel">
          <EmptyStateIcon>
            <IconBell size={28} />
          </EmptyStateIcon>
          <div className="dash-empty-state__title">Nessuna notifica</div>
          <div className="dash-empty-state__sub">
            Quando riceverai aggiornamenti su candidature, messaggi o account, li troverai qui.
          </div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="dash-empty-state polish-state-panel">
          <EmptyStateIcon>
            <IconCheck size={28} />
          </EmptyStateIcon>
          <div className="dash-empty-state__title">Nessuna notifica non letta</div>
          <div className="dash-empty-state__sub">
            Hai già letto tutte le notifiche. Torna al filtro Tutte per rivederle.
          </div>
        </div>
      ) : (
        <div className="dash-notif-list">
          {filteredNotifications.map((n) => {
            const NotifIcon = NOTIF_ICON[n.type]
            return (
              <button
                key={n.id}
                type="button"
                className={`dash-notif-item${!n.read ? ' dash-notif-item--unread' : ''}`}
                onClick={() => {
                  if (!n.read) void onMarkRead(n.id)
                }}
                aria-label={n.read ? n.text : `${n.text} — non letta`}
              >
                <div className={`dash-notif-item__icon dash-notif-item__icon--${n.type}`}>
                  <NotifIcon size={18} />
                </div>
                <div className="dash-notif-item__body">
                  <div className="dash-notif-item__text">{n.text}</div>
                  <div className="dash-notif-item__date">{formatNotificationDate(n.createdAt)}</div>
                </div>
                {!n.read && <span className="dash-notif-item__dot" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
