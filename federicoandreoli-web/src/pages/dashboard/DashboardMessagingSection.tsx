import { useEffect, useId, useRef, useState } from 'react'
import {
  IconAlert,
  IconChevronLeft,
  IconInbox,
  IconMessages,
  IconSend,
} from '../../components/icons/DashboardIcons'
import type { Message, MessageThread } from '../../lib/messagingTypes'
import { formatMessageTime, threadCounterparty } from '../../lib/messagingApi'

type DashboardMessagingSectionProps = {
  title?: string
  subtitle?: string
  userId: string
  threads: MessageThread[]
  messages: Message[]
  selectedThread: MessageThread | null
  selectedThreadId: string | null
  loading: boolean
  messagesLoading: boolean
  error: string | null
  messagesError: string | null
  sending: boolean
  onReload: () => void
  onSelectThread: (threadId: string | null) => void
  onSendMessage: (body: string) => Promise<boolean>
}

const AVATAR_VARIANTS = ['a', 'b', 'c', 'd'] as const

function nameInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

function avatarVariant(id: string): (typeof AVATAR_VARIANTS)[number] {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) % AVATAR_VARIANTS.length
  }
  return AVATAR_VARIANTS[hash] ?? 'a'
}

function EmptyStateIcon({ children }: { children: React.ReactNode }) {
  return <div className="dash-empty-state__icon">{children}</div>
}

function MessagingSkeleton() {
  return (
    <div className="dash-msg-shell" aria-busy="true" aria-label="Caricamento messaggi">
      <div className="dash-msg-sidebar">
        {[0, 1, 2].map((key) => (
          <div key={key} className="dash-skeleton dash-msg-skeleton-row" />
        ))}
      </div>
      <div className="dash-msg-panel">
        <div className="dash-skeleton dash-msg-skeleton-panel" />
      </div>
    </div>
  )
}

function linkTypeLabel(linkType: MessageThread['linkType']): string {
  return linkType === 'application' ? 'Candidatura' : 'Contatto diretto'
}

export function DashboardMessagingSection({
  title = 'Messaggi',
  subtitle = 'Conversazioni con i professionisti che hai contattato o che si sono candidati.',
  userId,
  threads,
  messages,
  selectedThread,
  selectedThreadId,
  loading,
  messagesLoading,
  error,
  messagesError,
  sending,
  onReload,
  onSelectThread,
  onSendMessage,
}: DashboardMessagingSectionProps) {
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const composeId = useId()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedThreadId])

  if (loading) {
    return (
      <div className="dash-msg-page">
        <div className="dash-section-header dash-msg-page__header">
          <div>
            <h2 className="dash-section__title">{title}</h2>
          </div>
        </div>
        <MessagingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="dash-msg-page">
        <div className="dash-section-header dash-msg-page__header">
          <div>
            <h2 className="dash-section__title">{title}</h2>
          </div>
        </div>
        <div className="dash-empty-state polish-state-panel" role="alert">
          <EmptyStateIcon>
            <IconAlert size={28} />
          </EmptyStateIcon>
          <div className="dash-empty-state__title">Impossibile caricare i messaggi</div>
          <div className="dash-empty-state__sub">{error}</div>
          <button type="button" className="dash-btn dash-btn--primary" onClick={onReload}>
            Riprova
          </button>
        </div>
      </div>
    )
  }

  const handleSend = async () => {
    if (!draft.trim() || sending) return
    const ok = await onSendMessage(draft)
    if (ok) setDraft('')
  }

  const selectedName = selectedThread
    ? (threadCounterparty(selectedThread, userId)?.name ?? selectedThread.subject)
    : null

  return (
    <div className="dash-msg-page">
      <div className="dash-section-header dash-msg-page__header">
        <div>
          <h2 className="dash-section__title">{title}</h2>
          <p className="dash-section__subtitle">{subtitle}</p>
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="dash-empty-state polish-state-panel dash-msg-empty">
          <EmptyStateIcon>
            <IconInbox size={28} />
          </EmptyStateIcon>
          <div className="dash-empty-state__title">Nessuna conversazione</div>
          <div className="dash-empty-state__sub">
            Quando contatti un professionista o rispondi a una candidatura, la chat apparirà qui.
          </div>
        </div>
      ) : (
        <div
          className={`dash-msg-shell${selectedThreadId ? ' dash-msg-shell--conversation' : ''}`}
        >
          <aside className="dash-msg-sidebar" aria-label="Elenco conversazioni">
            <div className="dash-msg-sidebar__label">Inbox</div>
            <div className="dash-msg-sidebar__list" role="list">
              {threads.map((thread) => {
                const counterparty = threadCounterparty(thread, userId)
                const displayName = counterparty?.name ?? thread.subject
                const unread = thread.unreadByUserId[userId] ?? 0
                const isActive = thread.id === selectedThreadId

                return (
                  <button
                    key={thread.id}
                    type="button"
                    role="listitem"
                    className={`dash-msg-thread${isActive ? ' dash-msg-thread--active' : ''}${unread > 0 ? ' dash-msg-thread--unread' : ''}`}
                    onClick={() => onSelectThread(thread.id)}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <div
                      className={`dash-msg-avatar dash-msg-avatar--${avatarVariant(thread.id)}`}
                      aria-hidden="true"
                    >
                      {nameInitials(displayName)}
                    </div>
                    <div className="dash-msg-thread__content">
                      <div className="dash-msg-thread__top">
                        <span className="dash-msg-thread__name">{displayName}</span>
                        <span className="dash-msg-thread__time">
                          {formatMessageTime(thread.lastMessageAt)}
                        </span>
                      </div>
                      <div className="dash-msg-thread__preview">
                        {thread.lastMessagePreview || 'Nessun messaggio ancora'}
                      </div>
                      <div className="dash-msg-thread__meta">
                        <span className="dash-msg-chip">{linkTypeLabel(thread.linkType)}</span>
                        {unread > 0 ? (
                          <span className="dash-msg-thread__badge" aria-label={`${unread} non letti`}>
                            {unread > 9 ? '9+' : unread}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="dash-msg-panel" aria-label="Conversazione">
            {!selectedThread || !selectedName ? (
              <div className="dash-msg-panel__empty">
                <div className="dash-msg-panel__empty-orb" aria-hidden>
                  <IconMessages size={28} />
                </div>
                <div className="dash-empty-state__title">Seleziona una chat</div>
                <div className="dash-empty-state__sub">
                  Scegli una conversazione a sinistra per leggere e rispondere.
                </div>
              </div>
            ) : (
              <>
                <header className="dash-msg-panel__header">
                  <button
                    type="button"
                    className="dash-msg-panel__back"
                    onClick={() => onSelectThread(null)}
                    aria-label="Torna all'elenco conversazioni"
                  >
                    <IconChevronLeft size={18} />
                  </button>
                  <div
                    className={`dash-msg-avatar dash-msg-avatar--sm dash-msg-avatar--${avatarVariant(selectedThread.id)}`}
                    aria-hidden="true"
                  >
                    {nameInitials(selectedName)}
                  </div>
                  <div className="dash-msg-panel__who">
                    <div className="dash-msg-panel__title">{selectedName}</div>
                    <div className="dash-msg-panel__sub">
                      <span className="dash-msg-chip dash-msg-chip--soft">
                        {linkTypeLabel(selectedThread.linkType)}
                      </span>
                      {selectedThread.linkLabel ? (
                        <span className="dash-msg-panel__link-label">{selectedThread.linkLabel}</span>
                      ) : null}
                    </div>
                  </div>
                </header>

                {messagesLoading ? (
                  <div className="dash-msg-panel__body" aria-busy="true">
                    <div className="dash-msg-bubble-skel dash-msg-bubble-skel--them" />
                    <div className="dash-msg-bubble-skel dash-msg-bubble-skel--own" />
                    <div className="dash-msg-bubble-skel dash-msg-bubble-skel--them" />
                  </div>
                ) : messagesError ? (
                  <div className="dash-msg-panel__body" role="alert">
                    <div className="dash-empty-state">
                      <EmptyStateIcon>
                        <IconAlert size={24} />
                      </EmptyStateIcon>
                      <div className="dash-empty-state__title">Errore caricamento messaggi</div>
                      <div className="dash-empty-state__sub">{messagesError}</div>
                    </div>
                  </div>
                ) : (
                  <div className="dash-msg-panel__body" role="log" aria-live="polite" aria-relevant="additions">
                    {messages.length === 0 ? (
                      <div className="dash-msg-dayhint">Nessun messaggio ancora. Scrivi qui sotto.</div>
                    ) : (
                      <div className="polish-msg-feed dash-msg-feed">
                        {messages.map((m, index) => {
                          const prev = messages[index - 1]
                          const next = messages[index + 1]
                          const isOwn = m.senderId === userId
                          const stackedTop = Boolean(prev && prev.senderId === m.senderId)
                          const stackedBottom = Boolean(next && next.senderId === m.senderId)
                          return (
                            <MessageBubble
                              key={m.id}
                              message={m}
                              isOwn={isOwn}
                              stackedTop={stackedTop}
                              stackedBottom={stackedBottom}
                              showSender={!isOwn && !stackedTop}
                            />
                          )
                        })}
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                <form
                  className="dash-msg-compose"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleSend()
                  }}
                >
                  <label className="visually-hidden" htmlFor={composeId}>
                    Scrivi un messaggio
                  </label>
                  <div className="dash-msg-compose__shell">
                    <textarea
                      id={composeId}
                      className="dash-msg-compose__input"
                      rows={1}
                      placeholder="Scrivi un messaggio…"
                      value={draft}
                      disabled={sending}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          void handleSend()
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="dash-msg-compose__send"
                      disabled={sending || !draft.trim()}
                      aria-label={sending ? 'Invio in corso' : 'Invia messaggio'}
                    >
                      <IconSend size={17} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function MessageBubble({
  message,
  isOwn,
  stackedTop,
  stackedBottom,
  showSender,
}: {
  message: Message
  isOwn: boolean
  stackedTop: boolean
  stackedBottom: boolean
  showSender: boolean
}) {
  const className = [
    'dash-msg-bubble',
    isOwn ? 'dash-msg-bubble--own' : 'dash-msg-bubble--them',
    stackedTop ? 'dash-msg-bubble--stack-top' : '',
    stackedBottom ? 'dash-msg-bubble--stack-bottom' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      {showSender ? <div className="dash-msg-bubble__sender">{message.senderName}</div> : null}
      <div className="dash-msg-bubble__body">{message.body}</div>
      <div className="dash-msg-bubble__time">{formatMessageTime(message.createdAt)}</div>
    </div>
  )
}
