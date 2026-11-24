// @vitest-environment node
/**
 * Shopping assistant (chatbot): grounding, limits, blocks, privacy of conversations and the IP helpers.
 * Gemini is replaced by a scripted fake (no network, no key needed). Runs against the local dev database
 * and removes everything it creates.
 */
import config from '@/payload.config'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Scripted Gemini: search → show the first result plus a made-up slug → answer
const modelCalls: { messages: number }[] = []
vi.mock('@/lib/assistant/gemini', () => ({
  streamModel: async function* (req: { contents: { role: string; parts: Record<string, unknown>[] }[] }) {
    modelCalls.push({ messages: req.contents.length })
    const last = req.contents.at(-1)!
    const response = last.parts.find((p) => p.functionResponse)?.functionResponse as { name: string; response: { results?: { slug: string }[] } } | undefined
    if (!response) {
      yield { text: '', parts: [{ functionCall: { id: 'c1', name: 'search_products', args: { query: 'cerave', limit: 3 } } }], usage: { input: 100, output: 10 } }
    } else if (response.name === 'search_products') {
      const first = response.response.results?.[0]?.slug ?? 'missing'
      yield { text: '', parts: [{ functionCall: { id: 'c2', name: 'show_products', args: { slugs: [first, 'made-up-product'], title: 'Picks' } } }], usage: { input: 200, output: 10 } }
    } else {
      yield { text: 'Here are ', parts: [{ text: 'Here are ' }] }
      yield { text: 'my picks.', parts: [{ text: 'my picks.' }], usage: { input: 300, output: 20 } }
    }
  },
}))

import { assistantChatEndpoint } from '@/endpoints/assistant'
import { inCidr, isIp, parseCidr, rangeOf } from '@/lib/assistant/ip'
import { runTool, type ToolContext } from '@/lib/assistant/tools'
import { getKnowledge } from '@/lib/assistant/knowledge'
import { loadChatConfig } from '@/lib/assistant/config'
import { suspiciousReasons } from '@/lib/assistant/signals'
import { internalPath } from '@/components/assistant/ChatText'

let payload: Payload
let savedSettings: Record<string, unknown>
const createdChats = new Set<number>()
const createdBlocks: number[] = []
let n = 0

const visitor = () => `${'a'.repeat(8)}-test-${Date.now().toString(16)}-${(n++).toString(16).padStart(4, '0')}`.replace(/[^a-f0-9-]/g, 'a')

function req(body: unknown, opts: { visitorId?: string; ip?: string; origin?: string; user?: unknown } = {}) {
  const headers = new Headers({
    host: 'localhost:3000',
    origin: opts.origin ?? 'http://localhost:3000',
    'sec-fetch-site': opts.origin ? 'cross-site' : 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36',
    'x-real-ip': opts.ip ?? '203.0.113.50',
    ...(opts.visitorId ? { cookie: `tos_chat_vid=${opts.visitorId}` } : {}),
  })
  return { payload, headers, json: async () => body, user: opts.user ?? null } as unknown as PayloadRequest
}

async function chat(body: Record<string, unknown>, opts: Parameters<typeof req>[1] = {}) {
  const res = await assistantChatEndpoint.handler(req(body, opts))
  const text = res.status === 200 ? await res.text() : ''
  const events = text
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, unknown>)
  const done = events.find((e) => e.type === 'done')
  if (typeof done?.conversationId === 'number') createdChats.add(done.conversationId)
  return { res, events }
}

const setSettings = (data: Record<string, unknown>) => payload.updateGlobal({ slug: 'chat-settings', data, overrideAccess: true })

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  savedSettings = (await payload.findGlobal({ slug: 'chat-settings', depth: 0, overrideAccess: true })) as unknown as Record<string, unknown>
  process.env.GEMINI_API_KEY = 'test-key'
  await setSettings({ enabled: true, perHour: 50, perDay: 100, perConversation: 40, dailyCap: 100000, autoBlock: false })
})

beforeEach(() => {
  modelCalls.length = 0
})

afterAll(async () => {
  for (const id of createdBlocks) await payload.delete({ collection: 'chat-blocks', id, overrideAccess: true }).catch(() => {})
  for (const id of createdChats) await payload.delete({ collection: 'chat-conversations', id, overrideAccess: true }).catch(() => {})
  const { id: _id, createdAt: _c, updatedAt: _u, globalType: _g, ...rest } = savedSettings
  await setSettings(rest).catch(() => {})
})

describe('IP helpers', () => {
  it('parses addresses and ranges', () => {
    expect(isIp('203.0.113.7')).toBe(true)
    expect(isIp('2001:db8::1')).toBe(true)
    expect(isIp('1.2.3.256')).toBe(false)
    expect(parseCidr('203.0.113.0/24')).not.toBeNull()
    expect(parseCidr('203.0.113.0/40')).toBeNull()
    expect(inCidr('203.0.113.99', '203.0.113.0/24')).toBe(true)
    expect(inCidr('203.0.114.1', '203.0.113.0/24')).toBe(false)
    expect(inCidr('::ffff:203.0.113.9', '203.0.113.0/24')).toBe(true)
    expect(rangeOf('203.0.113.77')).toBe('203.0.113.0/24')
  })
})

describe('signals and link safety', () => {
  it('flags scripts, datacenters and bursts, not normal shoppers', () => {
    expect(suspiciousReasons({ limitHits: 0, fastMessages: 0, datacenter: false, userAgent: 'Mozilla/5.0 Chrome/131' })).toEqual([])
    expect(suspiciousReasons({ limitHits: 0, fastMessages: 0, datacenter: false, userAgent: 'python-requests/2.31' }).length).toBe(1)
    expect(suspiciousReasons({ limitHits: 4, fastMessages: 3, datacenter: true, userAgent: '' }).length).toBe(4)
  })

  it('only links to pages on this site', () => {
    expect(internalPath('/returns')).toBe('/returns')
    expect(internalPath('https://theonlinestore.lk/p/abc')).toBe('/p/abc')
    expect(internalPath('https://evil.example/p/abc')).toBeNull()
    expect(internalPath('//evil.example')).toBeNull()
    expect(internalPath('javascript:alert(1)')).toBeNull()
  })
})

describe('tools', () => {
  const ctx = async (): Promise<ToolContext> => {
    const cfg = await loadChatConfig(payload)
    const k = await getKnowledge(payload, cfg)
    return { payload, vocab: k.vocab, seen: new Set(), effects: { products: null, replies: [], handoff: null, unanswered: [] } }
  }

  it('searches published products only and never returns costs', async () => {
    const c = await ctx()
    const res = (await runTool(c, 'search_products', { query: 'cerave', limit: 8 })) as { results: Record<string, unknown>[] }
    expect(res.results.length).toBeGreaterThan(0)
    expect(JSON.stringify(res)).not.toMatch(/"cost"/)
    const slugs = res.results.map((r) => String(r.slug))
    const docs = await payload.find({ collection: 'products', where: { slug: { in: slugs } }, depth: 0, limit: 10, overrideAccess: true, select: { _status: true } })
    expect(docs.docs.every((d) => d._status === 'published')).toBe(true)
    expect(res.results.every((r) => r.brand === 'CeraVe')).toBe(true)
  })

  it('resolves filters by slug or name', async () => {
    const c = await ctx()
    const res = (await runTool(c, 'search_products', { brand: 'CeraVe', limit: 3 })) as { filters: Record<string, string>; results: unknown[] }
    expect(res.filters.brand).toBe('cerave')
    expect(res.results.length).toBeGreaterThan(0)
  })

  it('shows only products the tools returned', async () => {
    const c = await ctx()
    const blocked = await runTool(c, 'show_products', { slugs: ['made-up-product'] })
    expect(blocked.shown).toBe(0)
    expect(c.effects.products).toBeNull()
    const found = (await runTool(c, 'search_products', { query: 'cerave', limit: 2 })) as { results: { slug: string }[] }
    await runTool(c, 'show_products', { slugs: [found.results[0].slug, 'made-up-product'] })
    expect(c.effects.products?.slugs).toEqual([found.results[0].slug])
  })

  it('describes a product without internal fields', async () => {
    const c = await ctx()
    const found = (await runTool(c, 'search_products', { query: 'cerave', limit: 1 })) as { results: { slug: string }[] }
    const p = await runTool(c, 'get_product', { slug: found.results[0].slug })
    expect(p.slug).toBe(found.results[0].slug)
    expect(Array.isArray(p.variants)).toBe(true)
    expect(JSON.stringify(p)).not.toMatch(/"cost"|"sku"|stock":\d/)
    expect((await runTool(c, 'get_product', { slug: 'no-such-product-xyz' })).error).toBeTruthy()
  })
})

describe('chat endpoint', () => {
  it('is unavailable without a Gemini key', async () => {
    const key = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    const { res } = await chat({ message: 'hi' }, { visitorId: visitor() })
    process.env.GEMINI_API_KEY = key
    expect(res.status).toBe(503)
  })

  it('is unavailable when switched off', async () => {
    await setSettings({ enabled: false })
    const { res } = await chat({ message: 'hi' }, { visitorId: visitor() })
    await setSettings({ enabled: true })
    expect(res.status).toBe(503)
  })

  it('refuses other websites', async () => {
    const { res } = await chat({ message: 'hi' }, { visitorId: visitor(), origin: 'https://evil.example' })
    expect(res.status).toBe(403)
  })

  it('rejects messages over the length limit', async () => {
    const { res } = await chat({ message: 'x'.repeat(5000) }, { visitorId: visitor() })
    expect(res.status).toBe(400)
  })

  it('answers with grounded product cards and saves the chat with IP and device', async () => {
    const v = visitor()
    const { res, events } = await chat({ message: 'Show me CeraVe', page: '/' }, { visitorId: v, ip: '112.134.0.1' })
    expect(res.status).toBe(200)
    const products = events.find((e) => e.type === 'products') as { slugs: string[] }
    expect(products.slugs).toHaveLength(1)
    expect(products.slugs).not.toContain('made-up-product')
    expect(events.filter((e) => e.type === 'text').map((e) => e.delta).join('')).toBe('Here are my picks.')
    const id = events.find((e) => e.type === 'done')!.conversationId as number
    const saved = await payload.findByID({ collection: 'chat-conversations', id, overrideAccess: true })
    expect(saved.visitorId).toBe(v)
    expect(saved.ip).toBe('112.134.0.1')
    expect(saved.messageCount).toBe(1)
    expect(saved.who).toBe('Guest')
    expect(saved.device).toMatch(/Chrome on Mac/)
    expect((saved.messages as { role: string; products?: string[] }[]).map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(saved.inputTokens).toBeGreaterThan(0)
  })

  it('continues a chat from the database, and never another visitor’s chat', async () => {
    const v = visitor()
    const first = await chat({ message: 'CeraVe please' }, { visitorId: v })
    const id = first.events.find((e) => e.type === 'done')!.conversationId as number
    modelCalls.length = 0
    await chat({ message: 'And another?', conversationId: id }, { visitorId: v })
    // The history sent to the model is the saved chat (2 earlier messages + the new one)
    expect(modelCalls[0].messages).toBe(3)
    const other = await chat({ message: 'Hijack', conversationId: id }, { visitorId: visitor() })
    expect(other.events.find((e) => e.type === 'done')!.conversationId).not.toBe(id)
    const saved = await payload.findByID({ collection: 'chat-conversations', id, overrideAccess: true })
    expect(saved.messageCount).toBe(2)
  })

  it('links a signed-in shopper’s chat to their account', async () => {
    const u = (await payload.find({ collection: 'users', limit: 1, depth: 0, overrideAccess: true })).docs[0]
    const { events } = await chat({ message: 'Hello' }, { visitorId: visitor(), user: { ...u, collection: 'users' } })
    const saved = await payload.findByID({ collection: 'chat-conversations', id: events.find((e) => e.type === 'done')!.conversationId as number, overrideAccess: true, depth: 0 })
    expect(saved.customer).toBe(u.id)
    expect(saved.who).toContain(u.email)
  })

  it('applies the per-shopper limit set in the admin', async () => {
    await setSettings({ perHour: 2 })
    const v = visitor()
    const a = await chat({ message: 'one' }, { visitorId: v, ip: '198.51.100.21' })
    const id = a.events.find((e) => e.type === 'done')!.conversationId as number
    await chat({ message: 'two', conversationId: id }, { visitorId: v, ip: '198.51.100.21' })
    modelCalls.length = 0
    const third = await chat({ message: 'three', conversationId: id }, { visitorId: v, ip: '198.51.100.21' })
    await setSettings({ perHour: 50 })
    expect(third.events.some((e) => e.type === 'limit')).toBe(true)
    expect(modelCalls).toHaveLength(0)
    const saved = await payload.findByID({ collection: 'chat-conversations', id, overrideAccess: true })
    expect(saved.limitHits).toBe(1)
  })

  it('applies the store-wide daily cap', async () => {
    await setSettings({ dailyCap: 1 })
    const { events } = await chat({ message: 'cap?' }, { visitorId: visitor() })
    await setSettings({ dailyCap: 100000 })
    expect(events.some((e) => e.type === 'limit')).toBe(true)
  })

  it('blocks devices, IPs and ranges before calling Gemini, and counts attempts', async () => {
    const v = visitor()
    const dev = await payload.create({ collection: 'chat-blocks', data: { type: 'visitor', value: v, reason: 'test' }, overrideAccess: true })
    const range = await payload.create({ collection: 'chat-blocks', data: { type: 'range', value: '198.51.100.0/24', reason: 'test' }, overrideAccess: true })
    const expired = await payload.create({
      collection: 'chat-blocks',
      data: { type: 'ip', value: '192.0.2.10', reason: 'test', expiresAt: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    createdBlocks.push(dev.id, range.id, expired.id)
    const byDevice = await chat({ message: 'hi' }, { visitorId: v })
    const byRange = await chat({ message: 'hi' }, { visitorId: visitor(), ip: '198.51.100.200' })
    expect(byDevice.events.some((e) => e.type === 'blocked')).toBe(true)
    expect(byRange.events.some((e) => e.type === 'blocked')).toBe(true)
    expect(modelCalls).toHaveLength(0)
    const after = await payload.findByID({ collection: 'chat-blocks', id: dev.id, overrideAccess: true })
    expect(after.hits).toBe(1)
    // An expired block no longer applies
    const free = await chat({ message: 'hi' }, { visitorId: visitor(), ip: '192.0.2.10' })
    expect(free.events.some((e) => e.type === 'blocked')).toBe(false)
  })
})
