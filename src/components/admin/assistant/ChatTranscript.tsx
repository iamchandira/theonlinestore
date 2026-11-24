'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { IconBrandWhatsapp, IconMessageChatbot, IconUser } from '@tabler/icons-react'

type Message = { role: 'user' | 'assistant'; text: string; products?: string[]; replies?: string[]; handoff?: string; at?: string }

const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/** The chat as speech bubbles (Insights › Chat conversations). */
export function ChatTranscript() {
  const { initialData } = useDocumentInfo()
  const messages = (Array.isArray(initialData?.messages) ? initialData.messages : []) as Message[]
  if (!messages.length) return <p className="tos-empty">No messages saved.</p>
  return (
    <ol className="tos-transcript">
      {messages.map((m, i) => (
        <li key={i} className={`tos-transcript__msg tos-transcript__msg--${m.role}`}>
          <span className="tos-transcript__who" aria-hidden>
            {m.role === 'user' ? <IconUser size={14} /> : <IconMessageChatbot size={14} />}
          </span>
          <div className="tos-transcript__bubble">
            <p className="tos-transcript__text">{m.text || (m.role === 'assistant' ? '(no reply)' : '')}</p>
            {m.products?.length ? (
              <div className="tos-transcript__tags">
                {m.products.map((slug) => (
                  <a key={slug} className="tos-pill tos-pill--brand tos-pill--plain" href={`/p/${slug}`} target="_blank" rel="noreferrer">
                    {slug}
                  </a>
                ))}
              </div>
            ) : null}
            {m.replies?.length ? (
              <div className="tos-transcript__tags">
                {m.replies.map((r) => (
                  <span key={r} className="tos-pill tos-pill--muted tos-pill--plain">
                    {r}
                  </span>
                ))}
              </div>
            ) : null}
            {m.handoff ? (
              <p className="tos-transcript__handoff">
                <IconBrandWhatsapp size={14} aria-hidden /> Offered WhatsApp: {m.handoff}
              </p>
            ) : null}
            {m.at ? <time className="tos-transcript__time">{time.format(new Date(m.at))}</time> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
