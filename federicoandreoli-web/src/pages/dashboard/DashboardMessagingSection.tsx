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
    <div className="dash-msg-layout" aria-busy="true" aria-label="Caricamento messaggi">
      <div className="dash-msg-sidebar">
        {[0, 1, 2].map((key) => (
          <div key={key} className="dash-skeleton" style={{ width: '100%', height: 72, marginBottom: 8 }} />
        ))}
      </div>
      <div className="dash-msg-panel">
        <div className="dash-skeleton" style={{ width: '100%', height: '100%', minHeight: 280 }} />
      </div>
    </div>
  )
}

function linkTypeLabel(linkType: MessageThread['linkType']): string {
  return linkType === 'application' ? 'Candidatura' : 'Contatto diretto'
}

export function DashboardMessagingSection({
  title = 'Messaggi',
  subtitle = 'Conversazioni con professionisti e candidature',
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
      <div>
        <div className="dash-section-header">
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

  return (
    <div>
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section__title">{title}</h2>
          <p className="dash-section__subtitle">{subtitle}</p>
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="dash-empty-state polish-state-panel">
          <EmptyStateIcon>
            <IconInbox size={28} />
          </EmptyStateIcon>
          <div className="dash-empty-state__title">Nessuna conversazione</div>
          <div className="dash-empty-state__sub">
            Quando contatti un professionista o rispondi a una candidatura, la conversazione apparirà qui.
          </div>
        </div>
      ) : (
        <div className={`dash-msg-layout${selectedThreadId ? ' dash-msg-layout--conversation' : ''}`}>
          <div className="dash-msg-sidebar" role="list" aria-label="Elenco conversazioni">
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
                      <span className="dash-msg-thread__time">{formatMessageTime(thread.lastMessageAt)}</span>
                    </div>
                    <div className="dash-msg-thread__subject">{thread.subject}</div>
                    <div className="dash-msg-thread__preview">{thread.lastMessagePreview}</div>
                    <div className="dash-msg-thread__meta">
                      <span className="dash-badge dash-badge--info">{linkTypeLabel(thread.linkType)}</span>
                      {unread > 0 ? (
                        <span className="dash-msg-thread__badge" aria-label={`${unread} non letti`}>
                          {unread}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="dash-msg-panel">
            {!selectedThread ? (
              <div className="dash-msg-panel__empty">
                <EmptyStateIcon>
                  <IconMessages size={28} />
                </EmptyStateIcon>
                <div className="dash-empty-state__title">Seleziona una conversazione</div>
                <div className="dash-empty-state__sub">Scegli un thread dalla lista per leggere e rispondere.</div>
              </div>
            ) : (
              <>
                <div className="dash-msg-panel__header">
                  <div>
                    <div className="dash-msg-panel__title">
                      {threadCounterparty(selectedThread, userId)?.name ?? selectedThread.subject}
                    </div>
                    <div className="dash-msg-panel__sub">
                      {selectedThread.subject}
                      {selectedThread.linkLabel ? ` · ${selectedThread.linkLabel}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dash-btn dash-btn--ghost dash-msg-panel__back"
                    onClick={() => onSelectThread(null)}
                    aria-label="Torna all'elenco conversazioni"
                  >
                    <IconChevronLeft size={16} />
                    Elenco
                  </button>
                </div>

                {messagesLoading ? (
                  <div className="dash-msg-panel__body" aria-busy="true">
                    <div className="dash-skeleton" style={{ width: '70%', height: 48, marginBottom: 12 }} />
                    <div className="dash-skeleton" style={{ width: '55%', height: 48, marginLeft: 'auto' }} />
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
                      <div className="dash-empty-mini">Nessun messaggio. Scrivi il primo messaggio qui sotto.</div>
                    ) : (
                      <div className="polish-msg-feed">
                        {messages.map((m) => (
                          <MessageBubble key={m.id} message={m} isOwn={m.senderId === userId} />
                        ))}
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                <div className="dash-msg-compose">
                  <label className="visually-hidden" htmlFor={composeId}>
                    Scrivi un messaggio
                  </label>
                  <textarea
                    id={composeId}
                    className="dash-form-input dash-form-textarea dash-msg-compose__input"
                    rows={2}
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
                    type="button"
                    className="dash-btn dash-btn--primary dash-msg-compose__send"
                    disabled={sending || !draft.trim()}
                    onClick={() => void handleSend()}
                    aria-label={sending ? 'Invio in corso' : 'Invia messaggio'}
                  >
                    <IconSend size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={`dash-msg-bubble${isOwn ? ' dash-msg-bubble--own' : ''}`}>
      {!isOwn ? <div className="dash-msg-bubble__sender">{message.senderName}</div> : null}
      <div className="dash-msg-bubble__body">{message.body}</div>
      <div className="dash-msg-bubble__time">{formatMessageTime(message.createdAt)}</div>
    </div>
  )
}
