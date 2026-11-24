import type { Content } from './gemini'
import type { Payload } from 'payload'

import type { ChatConversation } from '@/payload-types'

import { lookupIp, locationText, networkText } from './geo'
import { colomboDay } from './limits'
import { parseDevice, suspiciousReasons } from './signals'

/** One message in the chat log (chat-conversations.messages). */
export type StoredMessage = {
  role: 'user' | 'assistant'
  text: string
  products?: string[]
  replies?: string[]
  handoff?: string
  at: string
}

export type Visitor = {
  visitorId: string
  ip: string
  userAgent: string
  referrer: string
  customer: { id: number; label: string } | null
}

const HISTORY_TURNS = 12

export const messagesOf = (c: Pick<ChatConversation, 'messages'> | null): StoredMessage[] => (Array.isArray(c?.messages) ? (c!.messages as StoredMessage[]) : [])

/** The chat so far, for the model: the last few messages, with the cards shown noted in words. */
export function historyFor(messages: StoredMessage[]): Content[] {
  return messages.slice(-HISTORY_TURNS).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.role === 'assistant' && m.products?.length ? `${m.text}\n[Product cards shown: ${m.products.join(', ')}]` : m.text || '…' }],
  }))
}

/** The shopper's own chat, or null (another visitor's id is treated as unknown). */
export async function findConversation(payload: Payload, id: unknown, visitorId: string) {
  const n = Number(id)
  if (!Number.isInteger(n) || n <= 0) return null
  const c = await payload.findByID({ collection: 'chat-conversations', id: n, depth: 0, overrideAccess: true, disableErrors: true }).catch(() => null)
  return c && c.visitorId === visitorId ? (c as ChatConversation) : null
}

export async function createConversation(payload: Payload, v: Visitor, firstMessage: string, page: string, productId: number | null) {
  const geo = await lookupIp(v.ip)
  const reasons = suspiciousReasons({ limitHits: 0, fastMessages: 0, datacenter: geo.datacenter, userAgent: v.userAgent })
  return (await payload.create({
    collection: 'chat-conversations',
    overrideAccess: true,
    data: {
      title: firstMessage.slice(0, 80),
      messages: [],
      who: v.customer?.label ?? 'Guest',
      ...(v.customer ? { customer: v.customer.id } : {}),
      visitorId: v.visitorId,
      startPage: page,
      ...(productId ? { product: productId } : {}),
      ip: v.ip,
      location: locationText(geo),
      countryCode: geo.countryCode,
      network: networkText(geo),
      datacenter: geo.datacenter,
      device: parseDevice(v.userAgent),
      userAgent: v.userAgent.slice(0, 400),
      referrer: v.referrer.slice(0, 300),
      suspicious: reasons.length > 0,
      suspiciousReasons: reasons.join(', '),
      day: colomboDay(),
      lastMessageAt: new Date().toISOString(),
    },
  })) as ChatConversation
}

/** Saves the shopper's message and the reply, with counters and abuse signals. */
export async function saveTurn(
  payload: Payload,
  c: ChatConversation,
  v: Visitor,
  turn: { user: StoredMessage; assistant: StoredMessage | null; usage: { input: number; output: number }; unanswered: string[]; productsShown: number; fast: boolean },
) {
  const messages = [...messagesOf(c), turn.user, ...(turn.assistant ? [turn.assistant] : [])]
  const fastMessages = (c.fastMessages ?? 0) + (turn.fast ? 1 : 0)
  const reasons = suspiciousReasons({ limitHits: c.limitHits ?? 0, fastMessages, datacenter: Boolean(c.datacenter), userAgent: v.userAgent || c.userAgent || '' })
  const unanswered = [...(c.unansweredQuestions ? c.unansweredQuestions.split('\n') : []), ...turn.unanswered].filter(Boolean)
  await payload.update({
    collection: 'chat-conversations',
    id: c.id,
    overrideAccess: true,
    data: {
      messages,
      messageCount: (c.messageCount ?? 0) + 1,
      productsShown: (c.productsShown ?? 0) + turn.productsShown,
      inputTokens: (c.inputTokens ?? 0) + turn.usage.input,
      outputTokens: (c.outputTokens ?? 0) + turn.usage.output,
      fastMessages,
      suspicious: reasons.length > 0,
      suspiciousReasons: reasons.join(', '),
      unanswered: unanswered.length > 0,
      unansweredQuestions: unanswered.join('\n'),
      ...(v.ip && v.ip !== c.ip ? { lastIp: v.ip } : {}),
      ...(v.customer && !c.customer ? { customer: v.customer.id, who: v.customer.label } : {}),
      lastMessageAt: new Date().toISOString(),
    },
  })
}

/** Counts a limit hit on the chat (shown under Signals, feeds the suspicious flag). */
export async function recordLimitHit(payload: Payload, c: ChatConversation) {
  const limitHits = (c.limitHits ?? 0) + 1
  const reasons = suspiciousReasons({ limitHits, fastMessages: c.fastMessages ?? 0, datacenter: Boolean(c.datacenter), userAgent: c.userAgent ?? '' })
  await payload
    .update({ collection: 'chat-conversations', id: c.id, overrideAccess: true, data: { limitHits, suspicious: reasons.length > 0, suspiciousReasons: reasons.join(', ') } })
    .catch(() => {})
}
