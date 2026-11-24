'use client'

import {
  IconAlertTriangle,
  IconCircleCheck,
  IconArrowUp,
  IconBrandWhatsapp,
  IconMessageChatbot,
  IconRefresh,
  IconSparkles,
  IconX,
} from '@tabler/icons-react'
import { AnimatePresence, motion } from 'motion/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

import { lockScroll, unlockScroll } from '@/lib/motion/SmoothScroll'
import { useStoreSettings, whatsappLink } from '@/lib/store/StoreSettingsProvider'
import { cn } from '@/lib/utils/cn'

import { useChat, type ChatMessage } from './ChatProvider'
import { ChatProducts } from './ChatProducts'
import { ChatText } from './ChatText'

const PRODUCT_STARTERS = ['How do I use it?', 'Is it right for me?', 'What sizes are there?', 'What goes well with it?']

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches

/**
 * Shopping assistant: the round chat button and the chat panel (floating on desktop, full screen on
 * phones). Mounted by the storefront layout only when the assistant is switched on and the server has
 * a Gemini key. Hidden on the checkout form, like the WhatsApp button.
 */
export function ChatAssistant() {
  const chat = useChat()
  const store = useStoreSettings()
  const pathname = usePathname()
  const a = store.assistant
  if (!chat || !a || pathname === '/checkout') return null
  return (
    <>
      <Launcher />
      <AnimatePresence>{chat.open ? <Panel key="panel" /> : null}</AnimatePresence>
    </>
  )
}

function Launcher() {
  const chat = useChat()!
  const store = useStoreSettings()
  return (
    <motion.button
      type="button"
      onClick={() => chat.setOpen(!chat.open)}
      aria-label={chat.open ? `Close ${store.assistant!.name}` : `Chat with ${store.assistant!.name}`}
      aria-expanded={chat.open}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 18 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className={cn(
        'group fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-[50] grid size-14 place-items-center rounded-full bg-sunset-gradient text-white shadow-glow ring-4 ring-white/70 md:bottom-6 md:right-6',
        chat.open && 'max-md:hidden',
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={chat.open ? 'x' : 'chat'} initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.15 }}>
          {chat.open ? <IconX size={26} stroke={2} aria-hidden /> : <IconMessageChatbot size={28} stroke={1.75} aria-hidden />}
        </motion.span>
      </AnimatePresence>
      {!chat.open && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-[calc(100%+12px)] top-1/2 hidden -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-full bg-ink-900 px-3.5 py-2 text-sm font-semibold text-white opacity-0 shadow-lift transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 md:block"
        >
          Ask {store.assistant!.name}
        </span>
      )}
    </motion.button>
  )
}

function Panel() {
  const chat = useChat()!
  const store = useStoreSettings()
  const a = store.assistant!
  const [draft, setDraft] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const stick = useRef(true)
  const wa = (text?: string) => whatsappLink(store, text ?? `Hi ${store.name}! I have a question.`)

  // Phones: full screen, so the page behind must not scroll. Escape closes everywhere.
  useEffect(() => {
    const phone = isPhone()
    const { overflow } = document.body.style
    if (phone) {
      document.body.style.overflow = 'hidden'
      lockScroll()
    } else window.setTimeout(() => input.current?.focus(), 60)
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') chat.setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (phone) {
        document.body.style.overflow = overflow
        unlockScroll()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Follow the reply as it streams, unless the shopper scrolled up to read
  const last = chat.messages.at(-1)
  useEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [chat.messages.length, last?.text, last?.products, last?.replies])

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!draft.trim() || chat.busy) return
    stick.current = true
    chat.send(draft)
    setDraft('')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e)
  }
  const ask = (text: string) => {
    stick.current = true
    chat.send(text)
  }
  const closeOnPhone = () => {
    if (isPhone()) chat.setOpen(false)
  }

  const empty = chat.messages.length === 0
  const productStarters = Boolean(chat.product) && !chat.busy && chat.messages.length === chat.productFrom
  const lastAssistant = [...chat.messages].reverse().find((m) => m.role === 'assistant')

  return (
    <motion.section
      role="dialog"
      aria-label={a.name}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="fixed inset-0 z-[70] flex flex-col bg-surface md:inset-auto md:bottom-24 md:right-6 md:h-[min(640px,calc(100dvh-8rem))] md:w-[400px] md:origin-bottom-right md:overflow-hidden md:rounded-2xl md:border md:border-line md:shadow-lift"
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sunset-gradient text-white" aria-hidden>
          <IconMessageChatbot size={22} stroke={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold leading-tight text-ink-900">{a.name}</p>
          {a.tagline ? (
            <p className="flex items-center gap-1.5 truncate text-xs text-ink-500">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden /> {a.tagline}
            </p>
          ) : null}
        </div>
        {wa() ? (
          <a
            href={wa()!}
            target="_blank"
            rel="noopener noreferrer"
            onClick={chat.markHandoff}
            aria-label="Chat with a person on WhatsApp (opens in a new tab)"
            className="grid size-9 place-items-center rounded-full text-[#1a8f4a] transition-colors hover:bg-[#1fa855]/10"
          >
            <IconBrandWhatsapp size={21} aria-hidden />
          </a>
        ) : null}
        {!empty && (
          <button type="button" onClick={chat.reset} aria-label="Start a new chat" className="grid size-9 place-items-center rounded-full text-ink-600 transition-colors hover:bg-ink-50">
            <IconRefresh size={19} aria-hidden />
          </button>
        )}
        <button type="button" onClick={() => chat.setOpen(false)} aria-label="Close chat" className="grid size-9 place-items-center rounded-full text-ink-600 transition-colors hover:bg-ink-50">
          <IconX size={20} aria-hidden />
        </button>
      </header>

      {chat.product ? (
        <div className="flex items-center gap-2 border-b border-line bg-sunset-50/60 px-4 py-2 text-xs text-ink-700">
          <IconSparkles size={14} className="shrink-0 text-sunset-600" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            Asking about <strong>{chat.product.name}</strong>
          </span>
          <button type="button" onClick={chat.clearProduct} aria-label="Stop asking about this product" className="grid size-6 place-items-center rounded-full hover:bg-white">
            <IconX size={13} aria-hidden />
          </button>
        </div>
      ) : null}

      {/* Messages */}
      <div
        ref={scroller}
        data-lenis-prevent
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
        }}
        className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4"
        aria-live="polite"
        aria-busy={chat.busy}
      >
        <Bubble role="assistant">
          <ChatText text={a.greeting} />
        </Bubble>
        {empty && !productStarters && a.starters.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-1">
            {a.starters.map((s) => (
              <QuickReply key={s} onClick={() => ask(s)}>
                {s}
              </QuickReply>
            ))}
          </div>
        )}
        {chat.messages.map((m) => (
          <Message
            key={m.id}
            m={m}
            isLast={m === lastAssistant && !productStarters}
            busy={chat.busy}
            onReply={ask}
            onNavigate={closeOnPhone}
            wa={wa}
            onHandoff={chat.markHandoff}
          />
        ))}
        {productStarters && (
          <div className="flex flex-wrap gap-2 pl-1">
            {PRODUCT_STARTERS.map((s) => (
              <QuickReply key={s} onClick={() => ask(s)}>
                {s}
              </QuickReply>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="border-t border-line bg-surface px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2.5 md:pb-2.5">
        <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-white px-3 py-1.5 transition-colors focus-within:border-ink-900">
          <label htmlFor="tos-chat-input" className="sr-only">
            Message {a.name}
          </label>
          <textarea
            id="tos-chat-input"
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, a.maxLength))}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={a.maxLength}
            placeholder="Ask about products, delivery, returns…"
            className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-snug text-ink-900 outline-none [field-sizing:content] placeholder:text-ink-400"
          />
          <button
            type="submit"
            disabled={!draft.trim() || chat.busy}
            aria-label="Send"
            className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-ink-900 text-white transition-colors hover:bg-ink-800 disabled:bg-ink-200 disabled:text-ink-500"
          >
            <IconArrowUp size={18} stroke={2.25} aria-hidden />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-center text-[11px] leading-snug text-ink-500">
          {draft.length > a.maxLength * 0.8 ? `${draft.length}/${a.maxLength} · ` : ''}
          AI assistant can make mistakes. Always confirm details.
        </p>
      </form>
    </motion.section>
  )
}

function Bubble({ role, children, tone }: { role: 'user' | 'assistant'; children: React.ReactNode; tone?: 'warning' | 'danger' }) {
  return (
    <div
      className={cn(
        'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-relaxed',
        role === 'user' ? 'self-end rounded-br-md bg-ink-900 text-white' : 'self-start rounded-bl-md bg-canvas text-ink-800',
        tone === 'warning' && 'border border-amber-200 bg-amber-50 text-amber-900',
        tone === 'danger' && 'border border-rose-200 bg-rose-50 text-rose-900',
      )}
    >
      {children}
    </div>
  )
}

function QuickReply({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-sunset-200 bg-sunset-50 px-3.5 py-1.5 text-left text-[13px] font-semibold text-sunset-800 transition-colors hover:border-sunset-400 hover:bg-sunset-100 disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function Typing() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-ink-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}

function Message({
  m,
  isLast,
  busy,
  onReply,
  onNavigate,
  wa,
  onHandoff,
}: {
  m: ChatMessage
  isLast: boolean
  busy: boolean
  onReply: (t: string) => void
  onNavigate: () => void
  wa: (text?: string) => string | null
  onHandoff: () => void
}) {
  if (m.role === 'user')
    return (
      <Bubble role="user">
        <p className="whitespace-pre-wrap break-words">{m.text}</p>
      </Bubble>
    )
  const tone = m.notice === 'limit' ? 'warning' : m.notice ? 'danger' : undefined
  const handoffLink = m.handoff !== undefined || m.notice ? wa(m.handoff ? `Hi! ${m.handoff}` : undefined) : null
  return (
    <div className="flex flex-col gap-2.5">
      {m.text || m.pending ? (
        <Bubble role="assistant" tone={tone}>
          {m.notice ? (
            <p className="flex gap-2">
              <IconAlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden /> <span>{m.text}</span>
            </p>
          ) : m.text ? (
            <ChatText text={m.text} />
          ) : (
            <Typing />
          )}
        </Bubble>
      ) : null}
      {m.bag && (m.bag.added.length > 0 || m.bag.choose.length > 0) ? (
        <div className="flex flex-col gap-1 self-start rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900">
          {m.bag.added.map((n) => (
            <span key={n} className="flex items-center gap-1.5">
              <IconCircleCheck size={15} className="shrink-0" aria-hidden /> Added: {n}
            </span>
          ))}
          {m.bag.choose.length ? <span className="text-ink-700">Pick a size for: {m.bag.choose.join(', ')}</span> : null}
        </div>
      ) : null}
      {m.products?.slugs.length ? <ChatProducts slugs={m.products.slugs} title={m.products.title} onNavigate={onNavigate} /> : null}
      {handoffLink ? (
        <a
          href={handoffLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onHandoff}
          className="inline-flex h-10 items-center gap-2 self-start rounded-full bg-[#1fa855] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgb(31_168_85/0.7)] transition-colors hover:bg-[#1a8f4a]"
        >
          <IconBrandWhatsapp size={18} aria-hidden /> Continue on WhatsApp
        </a>
      ) : null}
      {isLast && !busy && m.replies?.length ? (
        <div className="flex flex-wrap gap-2 pl-1">
          {m.replies.map((r) => (
            <QuickReply key={r} onClick={() => onReply(r)}>
              {r}
            </QuickReply>
          ))}
        </div>
      ) : null}
    </div>
  )
}
