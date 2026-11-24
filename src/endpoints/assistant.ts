import type { Endpoint, PayloadRequest } from 'payload'

/**
 * Shopping assistant endpoints (root level, /api/assistant/…). Heavy modules are imported lazily so seed
 * scripts and tests can load the config without the Gemini SDK.
 *
 *   POST /api/assistant/chat   { message, conversationId?, productSlug?, page? } → NDJSON event stream
 *   POST /api/assistant/event  { conversationId, type: 'handoff' }            → 204
 */

const VISITOR_COOKIE = 'tos_chat_vid'
const VISITOR_ID = /^[a-f0-9-]{16,64}$/
const SLUG = /^[a-z0-9-]{1,120}$/

const unavailable = (message = 'The assistant isn’t available right now.') =>
  Response.json({ error: message }, { status: 503 })

function readCookie(req: PayloadRequest, name: string) {
  const raw = req.headers.get('cookie') ?? ''
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

/** Same-site requests only: other websites can't use the store's Gemini quota. */
function sameOrigin(req: PayloadRequest) {
  const site = req.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin') return false
  const origin = req.headers.get('origin')
  if (!origin) return site === 'same-origin'
  try {
    return new URL(origin).host === (req.headers.get('x-forwarded-host') ?? req.headers.get('host'))
  } catch {
    return false
  }
}

function visitorCookie(id: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${VISITOR_COOKIE}=${id}; Path=/; Max-Age=${60 * 60 * 24 * 365}; HttpOnly; SameSite=Lax${secure}`
}

export const assistantChatEndpoint: Endpoint = {
  path: '/assistant/chat',
  method: 'post',
  handler: async (req) => {
    const { hasGeminiKey, loadChatConfig } = await import('../lib/assistant/config')
    if (!hasGeminiKey()) return unavailable()
    const cfg = await loadChatConfig(req.payload)
    if (!cfg.enabled) return unavailable()
    if (!sameOrigin(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const body = ((await req.json?.().catch(() => null)) ?? {}) as {
      message?: unknown
      conversationId?: unknown
      productSlug?: unknown
      page?: unknown
    }
    const message = String(body.message ?? '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!message) return Response.json({ error: 'Type a message' }, { status: 400 })
    if (message.length > cfg.limits.maxLength)
      return Response.json(
        { error: `Messages can be up to ${cfg.limits.maxLength} characters.` },
        { status: 400 },
      )
    const productSlug =
      typeof body.productSlug === 'string' && SLUG.test(body.productSlug) ? body.productSlug : null
    const page =
      typeof body.page === 'string' && body.page.startsWith('/') ? body.page.slice(0, 200) : ''

    const [
      { clientIp },
      conv,
      { findBlock, recordBlockedAttempt, autoBlockIp },
      { checkLimits, countMessage, limitHitBurst },
    ] = await Promise.all([
      import('../lib/server/rateLimit'),
      import('../lib/assistant/conversation'),
      import('../lib/assistant/blocks'),
      import('../lib/assistant/limits'),
    ])

    // Who is asking
    const cookieId = readCookie(req, VISITOR_COOKIE)
    const visitorId = cookieId && VISITOR_ID.test(cookieId) ? cookieId : crypto.randomUUID()
    const user =
      req.user?.collection === 'users'
        ? (req.user as { id: number; email?: string; fullName?: string | null })
        : null
    const visitor = {
      visitorId,
      ip: clientIp(req.headers),
      userAgent: req.headers.get('user-agent') ?? '',
      referrer: req.headers.get('referer') ?? '',
      customer: user
        ? {
            id: user.id,
            label: [user.fullName, user.email].filter(Boolean).join(' · ') || `User ${user.id}`,
          }
        : null,
    }
    // no-transform: compression would hold the stream back until the reply is complete
    const headers = new Headers({
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    })
    if (cookieId !== visitorId) headers.append('Set-Cookie', visitorCookie(visitorId))

    // A short reply without calling Gemini (blocked, over a limit)
    const notice = (
      event: { type: 'limit' | 'blocked'; message: string },
      conversationId: number | null,
    ) =>
      new Response(
        `${JSON.stringify(event)}\n${JSON.stringify({ type: 'done', conversationId })}\n`,
        { headers },
      )

    const existing = await conv.findConversation(req.payload, body.conversationId, visitorId)

    const block = await findBlock(req.payload, {
      ip: visitor.ip,
      visitorId,
      customerId: visitor.customer?.id ?? null,
    })
    if (block) {
      await recordBlockedAttempt(req.payload, block.id)
      return notice(
        {
          type: 'blocked',
          message: 'Chat isn’t available right now. You can still reach us on WhatsApp.',
        },
        existing?.id ?? null,
      )
    }

    const limit = await checkLimits(req.payload, cfg, visitor, existing?.messageCount ?? 0)
    if (!limit.ok) {
      if (existing && limit.reason !== 'chat') await conv.recordLimitHit(req.payload, existing)
      if (
        cfg.limits.autoBlock &&
        limit.reason !== 'chat' &&
        limit.reason !== 'store' &&
        limitHitBurst(visitor.ip, cfg.limits.autoBlockThreshold)
      ) {
        await autoBlockIp(
          req.payload,
          visitor.ip,
          existing?.id ?? null,
          'auto: repeated limit hits',
        ).catch(() => {})
      }
      return notice({ type: 'limit', message: limit.message }, existing?.id ?? null)
    }

    // The product being viewed (validated against the catalogue)
    const [
      { getKnowledge },
      { systemPrompt, productContext },
      { runTurn },
      { runTool },
      { getStoreSettings },
    ] = await Promise.all([
      import('../lib/assistant/knowledge'),
      import('../lib/assistant/prompt'),
      import('../lib/assistant/run'),
      import('../lib/assistant/tools'),
      import('../lib/store/settings'),
    ])
    const [knowledge, store] = await Promise.all([
      getKnowledge(req.payload, cfg),
      getStoreSettings(),
    ])
    const seen = new Set<string>(conv.messagesOf(existing).flatMap((m) => m.products ?? []))
    let extraContext: string | undefined
    let productId: number | null = null
    if (productSlug) {
      const facts = await runTool(
        {
          payload: req.payload,
          vocab: knowledge.vocab,
          seen,
          effects: { products: null, replies: [], handoff: null, unanswered: [] },
        },
        'get_product',
        { slug: productSlug },
      )
      if (!('error' in facts)) {
        extraContext = productContext(facts)
        const found = await req.payload.find({
          collection: 'products',
          where: { slug: { equals: productSlug } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          select: { slug: true },
        })
        productId = (found.docs[0]?.id as number | undefined) ?? null
      }
    }

    const conversation =
      existing ?? (await conv.createConversation(req.payload, visitor, message, page, productId))
    const fast = Boolean(
      existing?.lastMessageAt && Date.now() - new Date(existing.lastMessageAt).getTime() < 2000,
    )
    const history = conv.historyFor(conv.messagesOf(existing))
    const system = systemPrompt(cfg, store.name, knowledge.text)
    const userMessage = { role: 'user' as const, text: message, at: new Date().toISOString() }
    countMessage()

    // The reply is written by a separate task: the response is returned (and starts flowing) straight away
    const encoder = new TextEncoder()
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
    const writer = writable.getWriter()
    const emit = (e: object) => {
      writer.write(encoder.encode(`${JSON.stringify(e)}\n`)).catch(() => {
        /* shopper closed the chat */
      })
    }
    void (async () => {
      emit({ type: 'start', conversationId: conversation.id })
      try {
        const result = await runTurn({
          cfg,
          system,
          history,
          message,
          extraContext,
          ctx: { payload: req.payload, vocab: knowledge.vocab, seen },
          emit,
        })
        const text =
          result.text ||
          (result.effects.products
            ? 'Here are some options:'
            : result.effects.handoff
              ? 'A person on WhatsApp can help with this.'
              : '')
        await conv.saveTurn(req.payload, conversation, visitor, {
          user: userMessage,
          assistant: {
            role: 'assistant',
            text,
            ...(result.effects.products ? { products: result.effects.products.slugs } : {}),
            ...(result.effects.replies.length ? { replies: result.effects.replies } : {}),
            ...(result.effects.handoff ? { handoff: result.effects.handoff } : {}),
            at: new Date().toISOString(),
          },
          usage: result.usage,
          unanswered: result.effects.unanswered,
          productsShown: result.effects.products?.slugs.length ?? 0,
          fast,
        })
        if (!result.text && !result.effects.products && !result.effects.handoff)
          emit({ type: 'text', delta: 'Sorry, I didn’t catch that. Could you say it another way?' })
      } catch (e) {
        const status = (e as { status?: number })?.status
        // 429/5xx from Google, or no answer in time (status 0)
        const busy = status === 0 || status === 429 || (typeof status === 'number' && status >= 500)
        req.payload.logger.error({
          err: busy ? { status, message: 'Gemini busy or over quota' } : e,
          msg: 'Shopping assistant failed',
        })
        emit({
          type: 'error',
          message: busy
            ? 'I’m getting a lot of questions right now. Please try again in a minute, or message us on WhatsApp.'
            : 'Sorry, something went wrong on our side. Please try again, or message us on WhatsApp.',
        })
        await conv
          .saveTurn(req.payload, conversation, visitor, {
            user: userMessage,
            assistant: null,
            usage: { input: 0, output: 0 },
            unanswered: [],
            productsShown: 0,
            fast,
          })
          .catch(() => {})
      }
      emit({ type: 'done', conversationId: conversation.id })
      await writer.close().catch(() => {})
    })()
    return new Response(readable, { headers })
  },
}

/** The shopper tapped "Continue on WhatsApp" (shown in the chat log). */
export const assistantEventEndpoint: Endpoint = {
  path: '/assistant/event',
  method: 'post',
  handler: async (req) => {
    if (!sameOrigin(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
    const body = ((await req.json?.().catch(() => null)) ?? {}) as {
      conversationId?: unknown
      type?: unknown
    }
    const visitorId = readCookie(req, VISITOR_COOKIE)
    if (body.type !== 'handoff' || !visitorId || !VISITOR_ID.test(visitorId))
      return new Response(null, { status: 204 })
    const { findConversation } = await import('../lib/assistant/conversation')
    const c = await findConversation(req.payload, body.conversationId, visitorId)
    if (c && !c.handoffClicked)
      await req.payload.update({
        collection: 'chat-conversations',
        id: c.id,
        data: { handoffClicked: true },
        overrideAccess: true,
      })
    return new Response(null, { status: 204 })
  },
}
