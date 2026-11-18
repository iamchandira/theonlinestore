import type { Endpoint } from 'payload'

import type { Order, Return } from '@/payload-types'

import { hasRole, isStaff } from '../access/roles'
import { allow, clientIp } from '../lib/server/rateLimit'
import { findShopperOrder } from './payments'

/**
 * Returns (Sprint 6, TOS-706):
 *   POST /api/returns/request     shopper, with the order's private link or signed in
 *   POST /api/returns/:id/action  staff: approve, reject, receive (restock), refund, close
 */

/** Return window and non-returnable product types come from Admin › Settings › Policies › Returns. */
async function returnRules(payload: Parameters<Endpoint['handler']>[0]['payload']) {
  const p = (await payload.findGlobal({ slug: 'policies', depth: 0, overrideAccess: true })) as { returnWindowDays?: number | null; nonReturnableTypes?: string[] | null }
  return { days: p.returnWindowDays ?? 7, blocked: (p.nonReturnableTypes ?? ['chocolate']) as string[] }
}
const str = (v: unknown, max: number) =>
  String(v ?? '')
    .trim()
    .slice(0, max)
const REASONS = ['damaged', 'wrong-item', 'size', 'changed-mind', 'other']

/** What a shopper can still return from an order, per SKU (ordered minus already asked for). */
export async function returnableItems(
  payload: Parameters<Endpoint['handler']>[0]['payload'],
  order: Order,
) {
  const rules = await returnRules(payload)
  const deliveredAt = order.statusDates?.deliveredAt
    ? new Date(order.statusDates.deliveredAt)
    : null
  const open =
    rules.days > 0 &&
    ['delivered', 'completed'].includes(order.status) &&
    deliveredAt != null &&
    Date.now() - deliveredAt.getTime() <= rules.days * 86_400_000
  const existing = await payload.find({
    collection: 'returns',
    where: { and: [{ order: { equals: order.id } }, { status: { not_equals: 'rejected' } }] },
    depth: 0,
    limit: 50,
    overrideAccess: true,
  })
  const asked = new Map<string, number>()
  for (const r of existing.docs as Return[])
    for (const i of r.items ?? []) asked.set(i.sku, (asked.get(i.sku) ?? 0) + i.quantity)
  const productIds = [
    ...new Set(
      order.items
        .map((i) => (typeof i.product === 'object' ? i.product?.id : i.product))
        .filter(Boolean),
    ),
  ] as number[]
  const products = productIds.length
    ? await payload.find({
        collection: 'products',
        where: { id: { in: productIds } },
        depth: 0,
        limit: productIds.length,
        overrideAccess: true,
        select: { productType: true },
      })
    : { docs: [] }
  const typeOf = new Map(
    products.docs.map((p) => [p.id, (p as { productType?: string }).productType]),
  )
  const items = order.items.map((i) => {
    const pid = typeof i.product === 'object' ? i.product?.id : i.product
    const food = rules.blocked.includes(String(typeOf.get(pid as number) ?? '')) // e.g. food
    return {
      sku: i.sku,
      name: i.name,
      variant: i.variant,
      ordered: i.quantity,
      left: food ? 0 : Math.max(0, i.quantity - (asked.get(i.sku) ?? 0)),
      food,
      unitRefund: Math.round((i.lineTotal ?? 0) / i.quantity),
    }
  })
  const until = deliveredAt ? new Date(deliveredAt.getTime() + rules.days * 86_400_000) : null
  return { open, until, days: rules.days, items, existing: existing.docs as Return[] }
}

export const returnRequestEndpoint: Endpoint = {
  path: '/request',
  method: 'post',
  handler: async (req) => {
    if (!allow(`return:${clientIp(req.headers)}`, 10, 60 * 60_000))
      return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    const body = ((await req.json?.().catch(() => null)) ?? {}) as {
      orderNumber?: string
      t?: string
      items?: { sku: string; qty: number }[]
      reason?: string
      details?: string
    }
    const order = await findShopperOrder(req, str(body.orderNumber, 40), str(body.t, 100) || null)
    if (!order) return Response.json({ error: 'We couldn’t find that order.' }, { status: 404 })
    const payload = req.payload
    const r = await returnableItems(payload, order)
    if (!r.open)
      return Response.json(
        {
          error: r.days > 0 ? `Returns are open for ${r.days} days after delivery. Please contact us if something’s wrong.` : 'Please contact us about returns.',
        },
        { status: 409 },
      )
    const reason = str(body.reason, 20)
    if (!REASONS.includes(reason))
      return Response.json(
        { error: 'Choose a reason.', fields: { reason: 'Choose a reason' } },
        { status: 400 },
      )
    const details = str(body.details, 1000)
    if (
      (reason === 'damaged' || reason === 'wrong-item' || reason === 'other') &&
      details.length < 5
    )
      return Response.json(
        {
          error: 'Tell us a little more so we can sort it quickly.',
          fields: { details: 'Required' },
        },
        { status: 400 },
      )
    const wanted = (Array.isArray(body.items) ? body.items : [])
      .map((i) => ({ sku: str(i.sku, 80), qty: Math.floor(Number(i.qty) || 0) }))
      .filter((i) => i.qty > 0)
    if (!wanted.length)
      return Response.json(
        { error: 'Choose the items to return.', fields: { items: 'Choose at least one' } },
        { status: 400 },
      )
    const items = []
    for (const w of wanted) {
      const line = r.items.find((i) => i.sku === w.sku)
      if (!line) return Response.json({ error: 'That item isn’t in this order.' }, { status: 400 })
      if (line.food)
        return Response.json(
          { error: `${line.name} can’t be returned (see our returns policy).` },
          { status: 400 },
        )
      if (w.qty > line.left)
        return Response.json(
          { error: `You can return up to ${line.left} of ${line.name}.` },
          { status: 400 },
        )
      items.push({ sku: line.sku, name: line.name, quantity: w.qty, unitRefund: line.unitRefund })
    }
    const now = new Date().toISOString()
    const returnNumber = `RET-${order.orderNumber.slice(4)}-${r.existing.length + 1}`
    const doc = await payload.create({
      collection: 'returns',
      overrideAccess: true,
      data: {
        returnNumber,
        order: order.id,
        items,
        reason: reason as Return['reason'],
        details: details || null,
        status: 'requested',
        timeline: [{ at: now, event: 'Return requested', by: order.contact.email }],
      },
    })
    await payload.update({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
      context: { skipLifecycle: true },
      data: {
        timeline: [
          ...(order.timeline ?? []),
          {
            at: now,
            event: `Return ${returnNumber} requested (${items.reduce((n, i) => n + i.quantity, 0)} item(s))`,
            by: order.contact.email,
          },
        ],
      },
    })
    return Response.json({ ok: true, returnNumber: doc.returnNumber })
  },
}

type Action = 'approve' | 'reject' | 'receive' | 'refund' | 'close'
const ROLES: Record<Action, Parameters<typeof hasRole>[1][]> = {
  approve: ['admin', 'store-manager', 'support'],
  reject: ['admin', 'store-manager', 'support'],
  receive: ['admin', 'store-manager', 'support', 'order-fulfillment'],
  refund: ['admin', 'store-manager'],
  close: ['admin', 'store-manager'],
}
const FROM: Record<Action, string[]> = {
  approve: ['requested'],
  reject: ['requested'],
  receive: ['approved'],
  refund: ['received'],
  close: ['requested', 'approved', 'received', 'refunded'],
}
const TO: Record<Action, Return['status']> = {
  approve: 'approved',
  reject: 'rejected',
  receive: 'received',
  refund: 'refunded',
  close: 'closed',
}

export const returnActionEndpoint: Endpoint = {
  path: '/:id/action',
  method: 'post',
  handler: async (req) => {
    const body = ((await req.json?.().catch(() => null)) ?? {}) as {
      action?: Action
      note?: string
      restock?: boolean
      amount?: number
      reference?: string
    }
    const action = body.action
    if (!action || !ROLES[action])
      return Response.json({ error: 'Unknown action' }, { status: 400 })
    if (!req.user || !isStaff(req.user) || !hasRole(req.user, ...ROLES[action]))
      return Response.json({ error: 'You don’t have permission to do that.' }, { status: 403 })
    const payload = req.payload
    const ret = (await payload
      .findByID({
        collection: 'returns',
        id: Number(req.routeParams?.id),
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)) as Return | null
    if (!ret) return Response.json({ error: 'Return not found' }, { status: 404 })
    if (!FROM[action].includes(ret.status))
      return Response.json(
        {
          error: `This return is ${ret.status}; it can’t be ${action === 'receive' ? 'received' : `${action}d`} now.`,
        },
        { status: 409 },
      )
    const order = (await payload.findByID({
      collection: 'orders',
      id: ret.order as number,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })) as Order
    const note = str(body.note, 500)
    const now = new Date().toISOString()
    const by = (req.user as { email?: string }).email ?? 'staff'
    const data: Partial<Return> = { status: TO[action] }
    let event = ''
    const { audit } = await import('../lib/payload/audit')

    if (action === 'reject' && note.length < 3)
      return Response.json(
        { error: 'Tell the shopper why.', fields: { note: 'Required' } },
        { status: 400 },
      )
    if (action === 'approve' || action === 'reject') {
      data.decisionNote = note || null
      event = action === 'approve' ? 'Approved' : `Rejected: ${note}`
      try {
        const { returnUpdate } = await import('../lib/email/templates')
        const { orderPageUrl } = await import('../lib/orders/notify')
        await payload.sendEmail({
          to: order.contact.email,
          subject: `Return ${ret.returnNumber} for order ${order.orderNumber}`,
          html: returnUpdate({
            orderNumber: order.orderNumber,
            fullName: order.contact.fullName,
            returnNumber: ret.returnNumber,
            approved: action === 'approve',
            note,
            orderUrl: orderPageUrl(order),
          }),
        })
      } catch (err) {
        payload.logger.error({ err }, 'Return email failed')
      }
    }
    if (action === 'receive') {
      const restock = body.restock !== false
      if (restock) {
        const { restockItems } = await import('../lib/orders/stock')
        await restockItems(
          payload,
          ret.items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
          `Return ${ret.returnNumber}`,
        )
      }
      data.items = ret.items.map((i) => ({ ...i, restocked: restock }))
      event = restock
        ? 'Items received and put back into stock'
        : `Items received, not resellable${note ? `: ${note}` : ''}`
      // Every item of the order now returned? Then the order itself is returned.
      const all = await payload.find({
        collection: 'returns',
        where: {
          and: [{ order: { equals: order.id } }, { status: { in: ['received', 'refunded'] } }],
        },
        depth: 0,
        limit: 50,
        overrideAccess: true,
      })
      const back = new Map<string, number>()
      for (const r of [...(all.docs as Return[]), ret])
        for (const i of r.items ?? []) back.set(i.sku, (back.get(i.sku) ?? 0) + i.quantity)
      if (
        order.items.every((i) => (back.get(i.sku) ?? 0) >= i.quantity) &&
        ['delivered', 'completed'].includes(order.status)
      ) {
        await payload.update({
          collection: 'orders',
          id: order.id,
          overrideAccess: true,
          user: req.user,
          context: { skipEmail: true },
          data: { status: 'returned', stockReturned: true },
        })
      }
    }
    if (action === 'refund') {
      const suggested = ret.items.reduce((n, i) => n + (i.unitRefund ?? 0) * i.quantity, 0)
      const amount = typeof body.amount === 'number' ? body.amount : suggested
      const { refundOrder } = await import('../lib/payments/refunds')
      const fresh = (await payload.findByID({
        collection: 'orders',
        id: order.id,
        depth: 0,
        overrideAccess: true,
        showHiddenFields: true,
      })) as Order
      const r = await refundOrder(payload, {
        order: fresh,
        amount,
        reason: `Return ${ret.returnNumber}${note ? `: ${note}` : ''}`,
        reference: body.reference,
        user: req.user as never,
        returnId: ret.id,
      })
      if (!r.ok) return Response.json({ error: r.error }, { status: 400 })
      data.refundAmount = r.refunded
      event = `Refunded Rs ${r.refunded.toLocaleString('en-LK')} ${r.via}`
    }
    if (action === 'close') event = `Closed${note ? `: ${note}` : ''}`

    await payload.update({
      collection: 'returns',
      id: ret.id,
      overrideAccess: true,
      data: { ...data, timeline: [...(ret.timeline ?? []), { at: now, event, by }] },
    })
    await audit(req, {
      action: 'payment',
      collection: 'returns',
      docId: ret.id,
      summary: `${ret.returnNumber} (${order.orderNumber}): ${event}`,
    })
    return Response.json({ ok: true })
  },
}
