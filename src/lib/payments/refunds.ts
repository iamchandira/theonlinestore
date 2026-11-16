import type { Payload } from 'payload'

import type { Order, Transaction, User } from '@/payload-types'

import { orderPageUrl } from '../orders/notify'
import { loadPaymentConfig } from './config'
import { payhereAmount } from './payhere'

/**
 * Refunds (Sprint 6, TOS-706). Card payments go back through PayHere's Refund API (partial refunds
 * supported); test-gateway payments are refunded on the test gateway; bank transfer and cash refunds are
 * paid by staff and recorded here with their bank reference. Every refund is a `transactions` row.
 */

const PAYHERE_API = {
  test: 'https://sandbox.payhere.lk/merchant/v1',
  live: 'https://www.payhere.lk/merchant/v1',
} as const

export async function payhereRefund(
  cfg: { mode: 'test' | 'live'; appId: string; appSecret: string },
  paymentId: string,
  amount: number | null,
  description: string,
) {
  const base = PAYHERE_API[cfg.mode]
  const tokenRes = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.appId}:${cfg.appSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const token = (await tokenRes.json().catch(() => ({}))) as { access_token?: string }
  if (!token.access_token)
    return { ok: false as const, message: 'PayHere sign-in failed. Check the App ID and secret.' }
  const res = await fetch(`${base}/payment/refund`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payment_id: paymentId,
      description: description.slice(0, 100),
      ...(amount != null ? { amount: payhereAmount(amount) } : {}),
    }),
  })
  const out = (await res.json().catch(() => ({}))) as {
    status?: number
    msg?: string
    data?: unknown
  }
  return out.status === 1
    ? { ok: true as const, ref: String(out.data ?? '') }
    : {
        ok: false as const,
        message: out.msg || `PayHere refused the refund (status ${out.status ?? res.status}).`,
      }
}

export type RefundInput = {
  order: Order
  amount: number
  reason: string
  /** For bank transfer / cash refunds: the reference of the money staff sent back */
  reference?: string
  user: User
  returnId?: number
}

export type RefundResult =
  { ok: true; refunded: number; via: string } | { ok: false; error: string }

export async function refundOrder(payload: Payload, input: RefundInput): Promise<RefundResult> {
  const { order, reason, user } = input
  const amount = Math.round(input.amount)
  const paid = order.totals?.total ?? 0
  const already = order.refundedTotal ?? 0
  if (!['paid', 'partially-refunded'].includes(order.paymentStatus))
    return { ok: false, error: 'Only paid orders can be refunded.' }
  if (!(amount > 0)) return { ok: false, error: 'Enter the amount to refund.' }
  if (amount > paid - already)
    return {
      ok: false,
      error: `You can refund up to Rs ${(paid - already).toLocaleString('en-LK')}.`,
    }
  if (reason.trim().length < 3)
    return { ok: false, error: 'Say why, for the records and the shopper.' }

  const txs = (
    await payload.find({
      collection: 'transactions',
      where: {
        and: [
          { order: { equals: order.id } },
          { status: { equals: 'paid' } },
          { kind: { equals: 'payment' } },
        ],
      },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs as Transaction[]
  const paidTx = txs[0]
  const online = ['payhere', 'koko', 'mintpay'].includes(order.paymentMethod)
  let via: string
  let providerRef: string | null = null
  let simulated = false

  if (online && paidTx?.simulated) {
    simulated = true
    via = 'on the test gateway'
  } else if (order.paymentMethod === 'payhere') {
    const cfg = await loadPaymentConfig(payload)
    if (!paidTx?.providerRef)
      return {
        ok: false,
        error:
          'No PayHere payment id on this order. Refund it in the PayHere portal and record it as a manual refund.',
      }
    if (!cfg.payhere.appId || !cfg.payhere.appSecret) {
      if (!input.reference?.trim())
        return {
          ok: false,
          error:
            'PayHere refund credentials aren’t set up. Refund it in the PayHere portal, then enter its refund reference here.',
        }
      via = 'through the PayHere portal'
      providerRef = input.reference.trim()
    } else {
      const r = await payhereRefund(
        { mode: cfg.mode, appId: cfg.payhere.appId, appSecret: cfg.payhere.appSecret },
        paidTx.providerRef,
        amount === paid - already && already === 0 ? null : amount,
        reason,
      )
      if (!r.ok) {
        await record(payload, order, {
          amount,
          status: 'refund-failed',
          message: r.message,
          by: user.id,
        })
        return { ok: false, error: r.message }
      }
      via = 'to your card'
      providerRef = r.ref
    }
  } else if (online) {
    return {
      ok: false,
      error:
        'Refunds for this method aren’t connected yet. Refund it in the provider’s portal and contact us to record it.',
    }
  } else {
    if (!input.reference?.trim())
      return { ok: false, error: 'Enter the bank transfer reference of the money you sent back.' }
    via = 'by bank transfer'
    providerRef = input.reference.trim()
  }

  await record(payload, order, {
    amount,
    status: 'refunded',
    message: reason,
    by: user.id,
    providerRef,
    simulated,
  })
  const refundedTotal = already + amount
  const full = refundedTotal >= paid
  const now = new Date().toISOString()
  await payload.update({
    collection: 'orders',
    id: order.id,
    overrideAccess: true,
    context: { skipLifecycle: true },
    data: {
      refundedTotal,
      paymentStatus: full ? 'refunded' : 'partially-refunded',
      timeline: [
        ...(order.timeline ?? []),
        {
          at: now,
          event: `Refunded Rs ${amount.toLocaleString('en-LK')} ${via}: ${reason}`,
          by: user.email,
        },
      ],
    },
  })
  try {
    const { refundIssued } = await import('../email/templates')
    await payload.sendEmail({
      to: order.contact.email,
      subject: `Refund for order ${order.orderNumber}`,
      html: refundIssued({
        orderNumber: order.orderNumber,
        fullName: order.contact.fullName,
        amount,
        method: via,
        orderUrl: orderPageUrl(order),
      }),
    })
  } catch (err) {
    payload.logger.error({ err, orderId: order.id }, 'Refund email failed')
  }
  return { ok: true, refunded: amount, via }
}

async function record(
  payload: Payload,
  order: Order,
  t: {
    amount: number
    status: 'refunded' | 'refund-failed'
    message: string
    by: number
    providerRef?: string | null
    simulated?: boolean
  },
) {
  const { totalDocs } = await payload.count({
    collection: 'transactions',
    where: { order: { equals: order.id } },
    overrideAccess: true,
  })
  await payload.create({
    collection: 'transactions',
    overrideAccess: true,
    data: {
      reference: `${order.orderNumber}-R${totalDocs + 1}`,
      order: order.id,
      method: order.paymentMethod,
      kind: 'refund',
      status: t.status,
      amount: t.amount,
      currency: 'LKR',
      providerRef: t.providerRef ?? null,
      message: t.message,
      by: t.by,
      simulated: Boolean(t.simulated),
      events: [{ at: new Date().toISOString(), status: t.status }],
    },
  })
}
