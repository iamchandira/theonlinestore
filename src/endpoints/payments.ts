import type { Endpoint, PayloadRequest } from 'payload'

import type { Order } from '@/payload-types'

import { hasRole, isStaff } from '../access/roles'
import { allow, clientIp } from '../lib/server/rateLimit'

/**
 * Payment endpoints (Sprint 5):
 *   POST /api/transactions/notify/payhere  PayHere server-to-server notification (form-encoded, signed)
 *   GET  /api/orders/payment-status?n=&t=  polling while a gateway confirms (owner, staff or private link)
 *   POST /api/orders/slip                  bank transfer slip upload (multipart: orderNumber, t, file, note)
 *   POST /api/orders/:id/payment           staff payment actions: verify-slip, reject-slip, mark-paid, cash-collected
 */

const str = (v: unknown, max: number) =>
  String(v ?? '')
    .trim()
    .slice(0, max)
const shopper = (req: PayloadRequest) =>
  req.user && req.user.collection === 'users' ? req.user : null

/** An order the caller may see: by its private link token, as its signed-in owner, or as staff. */
export async function findShopperOrder(
  req: PayloadRequest,
  orderNumber: string,
  token: string | null,
) {
  const order = (
    await req.payload.find({
      collection: 'orders',
      where: { orderNumber: { equals: orderNumber } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })
  ).docs[0] as Order | undefined
  if (!order) return null
  const user = shopper(req)
  const owner = Boolean(user && typeof order.customer === 'number' && order.customer === user.id)
  const tokenOk = Boolean(token && order.accessToken && token === order.accessToken)
  return tokenOk || owner || (user && isStaff(user)) ? order : null
}

/* ------------------------------------------------------------------ PayHere notify */

export const paymentNotifyEndpoints: Endpoint[] = [
  {
    path: '/notify/payhere',
    method: 'post',
    handler: async (req) => {
      const ip = clientIp(req.headers)
      if (!allow(`notify:${ip}`, 300, 60_000)) return new Response('slow down', { status: 429 })
      const raw = (await req.text?.()) ?? ''
      const body = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>
      const [
        { loadPaymentConfig },
        { parsePayhereNotify },
        { applyGatewayResult },
        { sendPaidConfirmation },
      ] = await Promise.all([
        import('../lib/payments/config'),
        import('../lib/payments/payhere'),
        import('../lib/payments/service'),
        import('../lib/payments/emails'),
      ])
      const cfg = await loadPaymentConfig(req.payload)
      const n = parsePayhereNotify(body, cfg.payhere.merchantId, cfg.payhere.merchantSecret)
      // Never keep card details, even masked ones, in our logs
      const { card_no: _c, card_holder_name: _h, card_expiry: _e, md5sig: _s, ...safe } = body
      const out = await applyGatewayResult(req.payload, {
        reference: n.reference,
        result: n.result,
        amount: n.amount,
        currency: n.currency,
        providerRef: n.providerRef,
        message: n.message,
        valid: n.valid,
        ip,
        data: safe,
      })
      if (!out.ok)
        req.payload.logger.warn(
          { reference: n.reference, reason: out.reason },
          'PayHere notification not applied',
        )
      if (out.newlyPaid && out.orderId) await sendPaidConfirmation(req.payload, out.orderId)
      // PayHere only needs a 200; a 400 tells it (and us, in its dashboard) the message was refused
      return new Response(out.ok ? 'OK' : 'REJECTED', { status: out.ok ? 200 : 400 })
    },
  },
]

/* ------------------------------------------------------------------ shopper: status + slip */

export const orderStatusEndpoint: Endpoint = {
  path: '/payment-status',
  method: 'get',
  handler: async (req) => {
    if (!allow(`paystatus:${clientIp(req.headers)}`, 120, 60_000))
      return Response.json({ error: 'Too many requests' }, { status: 429 })
    const url = new URL(req.url ?? 'http://x')
    const order = await findShopperOrder(
      req,
      str(url.searchParams.get('n'), 40),
      url.searchParams.get('t'),
    )
    if (!order) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ status: order.status, paymentStatus: order.paymentStatus })
  },
}

const SLIP_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
const MAX_SLIP = 8 * 1024 * 1024

export const slipUploadEndpoint: Endpoint = {
  path: '/slip',
  method: 'post',
  handler: async (req) => {
    const ip = clientIp(req.headers)
    if (!allow(`slip:${ip}`, 10, 60 * 60_000))
      return Response.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 })
    const form = await req.formData?.().catch(() => null)
    if (!form) return Response.json({ error: 'Please choose a file.' }, { status: 400 })
    const order = await findShopperOrder(
      req,
      str(form.get('orderNumber'), 40),
      str(form.get('t'), 100) || null,
    )
    if (!order) return Response.json({ error: 'We couldn’t find that order.' }, { status: 404 })
    if (order.paymentMethod !== 'bank-transfer')
      return Response.json({ error: 'This order isn’t paid by bank transfer.' }, { status: 400 })
    if (order.paymentStatus === 'paid')
      return Response.json({ error: 'This order is already paid. Thank you!' }, { status: 409 })
    if (order.status === 'cancelled')
      return Response.json(
        { error: 'This order was cancelled. Please contact us if you’ve already paid.' },
        { status: 409 },
      )
    const file = form.get('file')
    if (!(file instanceof File) || !file.size)
      return Response.json(
        { error: 'Please choose a photo or PDF of your slip.', fields: { file: 'Choose a file' } },
        { status: 400 },
      )
    if (!SLIP_TYPES.includes(file.type))
      return Response.json(
        {
          error: 'Please upload a photo (JPG, PNG, WebP, HEIC) or a PDF.',
          fields: { file: 'Photo or PDF only' },
        },
        { status: 400 },
      )
    if (file.size > MAX_SLIP)
      return Response.json(
        {
          error: 'That file is over 8 MB. Please upload a smaller photo.',
          fields: { file: 'Max 8 MB' },
        },
        { status: 400 },
      )

    const payload = req.payload
    const now = new Date().toISOString()
    const ext = file.type === 'application/pdf' ? 'pdf' : (file.type.split('/')[1] ?? 'jpg')
    const slip = await payload.create({
      collection: 'payment-slips',
      overrideAccess: true,
      data: {
        order: order.id,
        orderNumber: order.orderNumber,
        note: str(form.get('note'), 300) || null,
        status: 'pending',
      },
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        mimetype: file.type,
        name: `${order.orderNumber}-${Date.now()}.${ext}`,
        size: file.size,
      },
    })
    const { totalDocs } = await payload.count({
      collection: 'transactions',
      where: { order: { equals: order.id } },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'transactions',
      overrideAccess: true,
      data: {
        reference: `${order.orderNumber}-S${totalDocs + 1}`,
        order: order.id,
        method: 'bank-transfer',
        kind: 'payment',
        status: 'slip-uploaded',
        amount: order.totals?.total ?? 0,
        currency: 'LKR',
        slip: slip.id,
        events: [{ at: now, status: 'slip-uploaded', ip }],
      },
    })
    await payload.update({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
      data: {
        paymentStatus: 'slip-uploaded',
        timeline: [
          ...(order.timeline ?? []),
          {
            at: now,
            event: 'Bank slip uploaded: waiting for staff to check it',
            by: order.contact.email,
          },
        ],
      },
    })
    return Response.json({ ok: true })
  },
}

/* ------------------------------------------------------------------ staff actions */

type Action = 'verify-slip' | 'reject-slip' | 'mark-paid' | 'cash-collected' | 'refund'
const ACTION_ROLES: Record<Action, Parameters<typeof hasRole>[1][]> = {
  'verify-slip': ['admin', 'store-manager', 'support'],
  'reject-slip': ['admin', 'store-manager', 'support'],
  'mark-paid': ['admin', 'store-manager'],
  'cash-collected': ['admin', 'store-manager', 'order-fulfillment'],
  refund: ['admin', 'store-manager'],
}

export const orderPaymentEndpoint: Endpoint = {
  path: '/:id/payment',
  method: 'post',
  handler: async (req) => {
    const body = ((await req.json?.().catch(() => null)) ?? {}) as {
      action?: Action
      slipId?: number
      reason?: string
      note?: string
    }
    const action = body.action
    if (!action || !ACTION_ROLES[action])
      return Response.json({ error: 'Unknown action' }, { status: 400 })
    if (!req.user || !isStaff(req.user) || !hasRole(req.user, ...ACTION_ROLES[action]))
      return Response.json({ error: 'You don’t have permission to do that.' }, { status: 403 })
    const payload = req.payload
    const id = Number(req.routeParams?.id)
    const order = (await payload
      .findByID({
        collection: 'orders',
        id,
        depth: 0,
        overrideAccess: true,
        showHiddenFields: true,
      })
      .catch(() => null)) as Order | null
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })
    const now = new Date().toISOString()
    const by = (req.user as { email?: string }).email ?? 'staff'
    const { audit } = await import('../lib/payload/audit')
    const { totalDocs } = await payload.count({
      collection: 'transactions',
      where: { order: { equals: order.id } },
      overrideAccess: true,
    })
    const ref = (p: string) => `${order.orderNumber}-${p}${totalDocs + 1}`
    const total = order.totals?.total ?? 0
    const timeline = [...(order.timeline ?? [])]

    if (action === 'verify-slip' || action === 'reject-slip') {
      const slip = body.slipId
        ? await payload
            .findByID({
              collection: 'payment-slips',
              id: body.slipId,
              depth: 0,
              overrideAccess: true,
            })
            .catch(() => null)
        : null
      if (!slip || (typeof slip.order === 'object' ? slip.order?.id : slip.order) !== order.id)
        return Response.json({ error: 'Slip not found for this order' }, { status: 404 })
      if (slip.status !== 'pending')
        return Response.json({ error: 'This slip was already checked.' }, { status: 409 })
      const reason = str(body.reason, 200)
      if (action === 'reject-slip' && reason.length < 3)
        return Response.json(
          { error: 'Say why, so the shopper can fix it.', fields: { reason: 'Required' } },
          { status: 400 },
        )
      await payload.update({
        collection: 'payment-slips',
        id: slip.id,
        overrideAccess: true,
        data: {
          status: action === 'verify-slip' ? 'verified' : 'rejected',
          reason: reason || null,
          reviewedBy: req.user.id,
          reviewedAt: now,
        },
      })
      await payload.create({
        collection: 'transactions',
        overrideAccess: true,
        data: {
          reference: ref('V'),
          order: order.id,
          method: 'bank-transfer',
          kind: 'payment',
          status: action === 'verify-slip' ? 'paid' : 'rejected',
          amount: total,
          currency: 'LKR',
          slip: slip.id,
          by: req.user.id,
          message: reason || null,
          events: [{ at: now, status: action }],
        },
      })
      if (action === 'verify-slip') {
        timeline.push({ at: now, event: 'Bank transfer confirmed from the slip', by })
        await payload.update({
          collection: 'orders',
          id: order.id,
          overrideAccess: true,
          user: req.user,
          data: {
            paymentStatus: 'paid',
            paidAt: now,
            ...(order.status === 'pending-payment' ? { status: 'processing' } : {}),
            timeline,
          },
        })
      } else {
        timeline.push({ at: now, event: `Bank slip rejected: ${reason}`, by })
        await payload.update({
          collection: 'orders',
          id: order.id,
          overrideAccess: true,
          user: req.user,
          data: { paymentStatus: 'unpaid', timeline },
        })
      }
      await audit(req, {
        action: 'payment',
        collection: 'orders',
        docId: order.id,
        summary: `${order.orderNumber}: bank slip ${action === 'verify-slip' ? 'verified' : `rejected (${reason})`}`,
      })
      const { sendSlipDecision } = await import('../lib/payments/emails')
      await sendSlipDecision(
        payload,
        order,
        action === 'verify-slip' ? { ok: true } : { ok: false, reason },
      )
      return Response.json({ ok: true })
    }

    if (action === 'refund') {
      const b = body as { amount?: number; reference?: string }
      const { refundOrder } = await import('../lib/payments/refunds')
      const r = await refundOrder(payload, {
        order,
        amount: Number(b.amount),
        reason: str(body.reason, 200),
        reference: str(b.reference, 80) || undefined,
        user: req.user as never,
      })
      if (!r.ok) return Response.json({ error: r.error }, { status: 400 })
      await audit(req, {
        action: 'payment',
        collection: 'orders',
        docId: order.id,
        summary: `${order.orderNumber}: refunded Rs ${r.refunded} ${r.via}`,
      })
      return Response.json({ ok: true })
    }

    if (order.paymentStatus === 'paid')
      return Response.json({ error: 'This order is already paid.' }, { status: 409 })
    if (action === 'cash-collected' && order.paymentMethod !== 'cod')
      return Response.json({ error: 'Only cash-on-delivery orders collect cash.' }, { status: 400 })
    if (action === 'mark-paid' && order.paymentMethod !== 'bank-transfer')
      return Response.json(
        { error: 'Card and instalment payments are confirmed by the gateway.' },
        { status: 400 },
      )
    const note = str(body.note, 200)
    await payload.create({
      collection: 'transactions',
      overrideAccess: true,
      data: {
        reference: ref(action === 'cash-collected' ? 'C' : 'M'),
        order: order.id,
        method: order.paymentMethod,
        kind: 'payment',
        status: 'paid',
        amount: total,
        currency: 'LKR',
        by: req.user.id,
        message: note || null,
        events: [{ at: now, status: action }],
      },
    })
    timeline.push({
      at: now,
      event:
        action === 'cash-collected'
          ? 'Cash collected on delivery'
          : `Bank transfer received${note ? ` (${note})` : ''}`,
      by,
    })
    await payload.update({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
      user: req.user,
      data: {
        paymentStatus: 'paid',
        paidAt: now,
        ...(order.status === 'pending-payment' ? { status: 'processing' } : {}),
        timeline,
      },
    })
    await audit(req, {
      action: 'payment',
      collection: 'orders',
      docId: order.id,
      summary: `${order.orderNumber}: ${action === 'cash-collected' ? 'cash collected' : 'marked paid'} (Rs ${total})`,
    })
    return Response.json({ ok: true })
  },
}
