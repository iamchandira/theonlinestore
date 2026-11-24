'use client'

import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import type { Product } from '@/lib/catalog'
import { useShop } from '@/lib/store/shop'

/**
 * Shopping assistant state: the open/closed panel, the conversation (kept in sessionStorage so it
 * survives a reload) and sending messages to /api/assistant/chat, whose reply streams in as JSON lines.
 */

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  products?: { slugs: string[]; title: string }
  replies?: string[]
  handoff?: string
  /** What the assistant put in the bag (names), and products waiting for a size choice */
  bag?: { added: string[]; choose: string[] }
  /** A notice instead of an answer (limit reached, blocked, error) */
  notice?: 'limit' | 'blocked' | 'error'
  pending?: boolean
}

export type ProductContext = { slug: string; name: string }

type ChatState = {
  open: boolean
  setOpen: (open: boolean) => void
  messages: ChatMessage[]
  busy: boolean
  send: (text: string) => void
  reset: () => void
  /** The product the shopper asked about with "Ask about this product" (or is viewing) */
  product: ProductContext | null
  /** Message count when "Ask about this product" was tapped (its suggested questions show until the next message) */
  productFrom: number
  clearProduct: () => void
  openWith: (opts?: { product?: ProductContext; message?: string }) => void
  conversationId: number | null
  /** Tell the log the shopper moved to WhatsApp */
  markHandoff: () => void
}

const Ctx = createContext<ChatState | null>(null)
const STORE_KEY = 'tos-chat'
const uid = () => Math.random().toString(36).slice(2, 10)
const PRODUCT_PATH = /^\/p\/([a-z0-9-]{1,120})\/?$/

type Saved = { conversationId: number | null; messages: ChatMessage[] }

function load(): Saved {
  if (typeof window === 'undefined') return { conversationId: null, messages: [] }
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as Saved
      return { conversationId: s.conversationId ?? null, messages: (s.messages ?? []).filter((m) => !m.pending) }
    }
  } catch {
    /* private mode or bad data */
  }
  return { conversationId: null, messages: [] }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  // Restored from sessionStorage on first render (nothing that depends on it renders on the server)
  const [saved] = useState(load)
  const [messages, setMessages] = useState<ChatMessage[]>(saved.messages)
  const [conversationId, setConversationId] = useState<number | null>(saved.conversationId)
  const [busy, setBusy] = useState(false)
  const [asked, setAsked] = useState<ProductContext | null>(null)
  const [productFrom, setProductFrom] = useState(0)
  const abort = useRef<AbortController | null>(null)
  const { addToCart, setQuickAdd } = useShop()

  // "Add these to my bag": the server picked the variants; prices and stock come from the live catalogue
  const applyBag = useCallback(
    async (items: { slug: string; sku: string | null; qty: number }[], replyId: string) => {
      const slugs = [...new Set(items.map((i) => i.slug))]
      const res = await fetch(`/api/products/cards?slugs=${encodeURIComponent(slugs.join(','))}`).catch(() => null)
      const products = ((await res?.json().catch(() => null))?.products ?? []) as Product[]
      const added: string[] = []
      const choose: Product[] = []
      for (const it of items) {
        const p = products.find((x) => x.slug === it.slug)
        if (!p) continue
        const v = it.sku ? p.variants.find((x) => x.sku === it.sku) : p.variants.length === 1 ? p.variants[0] : null
        if (v && v.stock > 0) {
          addToCart(p, v, { qty: Math.min(it.qty, v.stock) })
          added.push(`${p.brand} ${p.name}${p.variants.length > 1 ? ` (${[v.label, v.option2].filter(Boolean).join(' / ')})` : ''}`.trim())
        } else choose.push(p)
      }
      // One size picker at a time: the first product that needs a choice
      if (choose[0]) setQuickAdd(choose[0])
      setMessages((ms) => ms.map((m) => (m.id === replyId ? { ...m, bag: { added, choose: choose.map((p) => `${p.brand} ${p.name}`.trim()) } } : m)))
    },
    [addToCart, setQuickAdd],
  )

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ conversationId, messages: messages.filter((m) => !m.pending).slice(-60) }))
    } catch {
      /* storage full or blocked */
    }
  }, [messages, conversationId])

  // The product page being viewed counts as context too
  const viewing = pathname.match(PRODUCT_PATH)?.[1] ?? null
  // Leaving the product the shopper asked about drops that context
  const product = asked && (!viewing || viewing === asked.slug) ? asked : null
  const contextSlug = product?.slug ?? viewing

  const patch = useCallback((id: string, fn: (m: ChatMessage) => ChatMessage) => setMessages((ms) => ms.map((m) => (m.id === id ? fn(m) : m))), [])

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || busy) return
      const replyId = uid()
      setMessages((ms) => [...ms, { id: uid(), role: 'user', text }, { id: replyId, role: 'assistant', text: '', pending: true }])
      setBusy(true)
      const ctrl = new AbortController()
      abort.current = ctrl
      try {
        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ message: text, conversationId, productSlug: contextSlug, page: pathname }),
          signal: ctrl.signal,
        })
        if (!res.ok || !res.body) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          patch(replyId, (m) => ({ ...m, pending: false, notice: 'error', text: err?.error ?? 'Sorry, the assistant isn’t available right now.' }))
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.trim()) continue
            let e: Record<string, unknown>
            try {
              e = JSON.parse(line)
            } catch {
              continue
            }
            switch (e.type) {
              case 'start':
              case 'done':
                if (typeof e.conversationId === 'number') setConversationId(e.conversationId)
                break
              case 'text':
                patch(replyId, (m) => ({ ...m, text: m.text + String(e.delta ?? '') }))
                break
              case 'products':
                patch(replyId, (m) => ({ ...m, products: { slugs: (e.slugs as string[]) ?? [], title: String(e.title ?? '') } }))
                break
              case 'replies':
                patch(replyId, (m) => ({ ...m, replies: (e.options as string[]) ?? [] }))
                break
              case 'handoff':
                patch(replyId, (m) => ({ ...m, handoff: String(e.summary ?? '') }))
                break
              case 'bag':
                void applyBag((e.items as { slug: string; sku: string | null; qty: number }[]) ?? [], replyId)
                break
              case 'limit':
              case 'blocked':
              case 'error':
                patch(replyId, (m) => ({ ...m, notice: e.type as ChatMessage['notice'], text: String(e.message ?? '') }))
                break
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError')
          patch(replyId, (m) => ({ ...m, notice: 'error', text: m.text || 'The connection dropped. Please try again.' }))
      } finally {
        patch(replyId, (m) => ({ ...m, pending: false }))
        setBusy(false)
        abort.current = null
      }
    },
    [busy, conversationId, contextSlug, pathname, patch, applyBag],
  )

  const reset = useCallback(() => {
    abort.current?.abort()
    setMessages([])
    setConversationId(null)
    setAsked(null)
    setBusy(false)
  }, [])

  const openWith = useCallback(
    (opts?: { product?: ProductContext; message?: string }) => {
      if (opts?.product) {
        setAsked(opts.product)
        setProductFrom(messages.length)
      }
      setOpen(true)
      if (opts?.message) void send(opts.message)
    },
    [send, messages.length],
  )

  const markHandoff = useCallback(() => {
    if (!conversationId) return
    void fetch('/api/assistant/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ conversationId, type: 'handoff' }),
      keepalive: true,
    }).catch(() => {})
  }, [conversationId])

  const value = useMemo<ChatState>(
    () => ({ open, setOpen, messages, busy, send, reset, product, productFrom, clearProduct: () => setAsked(null), openWith, conversationId, markHandoff }),
    [open, messages, busy, send, reset, product, productFrom, openWith, conversationId, markHandoff],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Chat state, or null when the provider isn't mounted. */
export const useChat = () => useContext(Ctx)
