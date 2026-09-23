import type {
  AppNotification,
  NotificationAudience,
  NotificationStore,
  NotificationType,
} from '../lib/notificationTypes'
import { NotificationError } from '../lib/notificationTypes'

const MOCK_DELAY_MS = 400
const STORAGE_PREFIX = 'fa:notifications:'

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

function readStore(userId: string): NotificationStore | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as NotificationStore
  } catch {
    return null
  }
}

function writeStore(userId: string, store: NotificationStore): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(store))
}

function seedForUser(userId: string, audience: NotificationAudience): AppNotification[] {
  const base = (items: Array<Omit<AppNotification, 'userId' | 'audience'>>): AppNotification[] =>
    items.map((item) => ({ ...item, userId, audience }))

  switch (audience) {
    case 'professional':
      return base([
        {
          id: 'notif-pro-1',
          text: 'La Famiglia Colombo ha inviato una nuova richiesta di contatto.',
          createdAt: '2026-05-10T08:00:00.000Z',
          read: false,
          type: 'primary',
        },
        {
          id: 'notif-pro-2',
          text: 'Il tuo profilo è stato visualizzato 3 volte oggi da famiglie e strutture.',
          createdAt: '2026-05-09T14:00:00.000Z',
          read: false,
          type: 'info',
        },
        {
          id: 'notif-pro-3',
          text: 'La tua candidatura per "OSS part-time Milano" è stata visualizzata.',
          createdAt: '2026-05-06T10:00:00.000Z',
          read: true,
          type: 'primary',
        },
        {
          id: 'notif-pro-4',
          text: 'Complimenti! La candidatura per "Assistenza anziani convivente" è stata accettata.',
          createdAt: '2026-05-02T16:00:00.000Z',
          read: true,
          type: 'success',
        },
        {
          id: 'notif-pro-5',
          text: 'Mancano 5 giorni alla scadenza del tuo piano FREE. Passa a Premium per continuare.',
          createdAt: '2026-05-01T09:00:00.000Z',
          read: true,
          type: 'warning',
        },
        {
          id: 'notif-pro-6',
          text: 'Completa il profilo al 100% per aumentare la visibilità nelle ricerche.',
          createdAt: '2026-04-28T11:00:00.000Z',
          read: true,
          type: 'info',
        },
      ])
    case 'agency':
      return base([
        {
          id: 'notif-ag-1',
          text: 'Nuova candidatura per "Badante convivente – Milano zona sud" da Maria Rossi.',
          createdAt: '2026-05-10T07:30:00.000Z',
          read: false,
          type: 'primary',
        },
        {
          id: 'notif-ag-2',
          text: '2 candidature in attesa di revisione sugli annunci attivi.',
          createdAt: '2026-05-09T12:00:00.000Z',
          read: false,
          type: 'info',
        },
        {
          id: 'notif-ag-3',
          text: 'Messaggio da supporto: promemoria rinnovo abbonamento B2B il 15 giugno.',
          createdAt: '2026-05-05T09:00:00.000Z',
          read: true,
          type: 'warning',
        },
        {
          id: 'notif-ag-4',
          text: 'L\'annuncio "OSS part-time mattino" ha raggiunto 7 candidature.',
          createdAt: '2026-04-28T15:00:00.000Z',
          read: true,
          type: 'success',
        },
      ])
    case 'structure':
      return base([
        {
          id: 'notif-st-1',
          text: 'Nuova candidatura per "OSS turno mattina — Reparto Alzheimer".',
          createdAt: '2026-05-10T06:45:00.000Z',
          read: false,
          type: 'primary',
        },
        {
          id: 'notif-st-2',
          text: 'Giulia Bianchi ha aggiornato la disponibilità per turni notturni.',
          createdAt: '2026-05-08T18:00:00.000Z',
          read: false,
          type: 'info',
        },
        {
          id: 'notif-st-3',
          text: 'Promemoria: pubblica il turno weekend entro venerdì per coprire il reparto.',
          createdAt: '2026-05-03T08:00:00.000Z',
          read: true,
          type: 'warning',
        },
        {
          id: 'notif-st-4',
          text: 'Il profilo struttura è stato visualizzato 12 volte questa settimana.',
          createdAt: '2026-04-30T10:00:00.000Z',
          read: true,
          type: 'info',
        },
      ])
    case 'family':
      return base([
        {
          id: 'notif-fam-1',
          text: 'Nuova candidatura per "Badante per nonna anziana a Milano" da Maria Rossi.',
          createdAt: '2026-05-10T09:15:00.000Z',
          read: false,
          type: 'primary',
        },
        {
          id: 'notif-fam-2',
          text: 'Hai 2 candidature in attesa di risposta sulla richiesta attiva.',
          createdAt: '2026-05-07T11:00:00.000Z',
          read: false,
          type: 'info',
        },
        {
          id: 'notif-fam-3',
          text: 'La richiesta "Badante per nonna anziana a Milano" scade tra 14 giorni.',
          createdAt: '2026-05-01T08:00:00.000Z',
          read: true,
          type: 'warning',
        },
      ])
    default: {
      const _x: never = audience
      return _x
    }
  }
}

export function loadNotifications(userId: string, audience: NotificationAudience): AppNotification[] {
  const stored = readStore(userId)
  if (stored?.notifications.length) {
    return stored.notifications
      .filter((n) => n.audience === audience)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const seed = seedForUser(userId, audience)
  writeStore(userId, { notifications: seed })
  return seed
}

export async function fetchNotifications(
  userId: string,
  audience: NotificationAudience,
): Promise<AppNotification[]> {
  await delay()
  if (!userId) throw new NotificationError('not_found', 'Sessione non valida.')
  if (userId.toLowerCase().includes('server-error')) {
    throw new NotificationError('server', 'Servizio temporaneamente non disponibile. Riprova tra poco.')
  }
  return loadNotifications(userId, audience)
}

export async function patchNotificationRead(
  userId: string,
  notificationId: string,
): Promise<AppNotification> {
  await delay(200)
  if (!userId) throw new NotificationError('not_found', 'Sessione non valida.')

  const store = readStore(userId) ?? { notifications: [] }
  const index = store.notifications.findIndex((n) => n.id === notificationId)
  if (index === -1) {
    throw new NotificationError('not_found', 'Notifica non trovata.')
  }

  const updated: AppNotification = { ...store.notifications[index], read: true }
  const next = [...store.notifications]
  next[index] = updated
  writeStore(userId, { notifications: next })
  return updated
}

export async function patchAllNotificationsRead(userId: string): Promise<AppNotification[]> {
  await delay(200)
  if (!userId) throw new NotificationError('not_found', 'Sessione non valida.')

  const store = readStore(userId) ?? { notifications: [] }
  const next = store.notifications.map((n) => ({ ...n, read: true }))
  writeStore(userId, { notifications: next })
  return next
}

export function formatNotificationDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  })
}

export type { AppNotification, NotificationAudience, NotificationType }
