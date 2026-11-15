import { createHmac, timingSafeEqual } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'

import type { Order, Transaction } from '@/payload-types'

import type { OnlineMethod } from '../../collections/Transactions'
import { gatewayRoute, type PaymentConfig } from './config'
import { PAYHERE_URL, payhereForm, type GatewayResult } from './payhere'

/**
 * Payments service (Sprint 5). One place that:
 *  - starts a payment attempt (a `transactions` row whose reference is the gateway's order id),
 *  - applies a gateway result to the attempt and the order, once, inside a transaction,
 *  - releases orders that were never paid.
 * Gateways and the built-in test gateway both go through applyGatewayResult, so the same checks run.
 */

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
type Exec = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }> }
const execFor = (payload: Payload, transactionID?: string | number | null) => {
  const adapter = payload.db as unknown as {
    drizzle: Exec
    sessions: Record<string | number, { db: Exec }>
  }
  return transactionID != null ? adapter.sessions[transactionID].db : adapter.drizzle
}

export const orderUrl = (o: Pick<Order, 'orderNumber'>, token: string, extra = '') =>
  `${SITE()}/checkout/success/${o.orderNumber}?t=${token}${extra}`
export const payUrl = (o: Pick<Order, 'orderNumber'>, token: string, extra = '') =>
  `${SITE()}/checkout/pay/${o.orderNumber}?t=${token}${extra}`

/* ------------------------------------------------------------------ test gateway signing */

/** Secret for the built-in test gateway, derived from PAYLOAD_SECRET so it is never stored or sent anywhere. */
export const simulatorSecret = () =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || 'dev')
    .update('tos-test-gateway')
    .digest('hex')
export const SIMULATOR_MERCHANT = 'TOS-TEST-GATEWAY'

export function signSimulated(fields: {
  reference: string
  result: GatewayResult
  amount: string
}) {
  return createHmac('sha256', simulatorSecret())
    .update(`${fields.reference}|${fields.result}|${fields.amount}|LKR`)
    .digest('hex')
}
export function verifySimulated(
  fields: { reference: string; result: GatewayResult; amount: string },
  sig: string,
) {
  const a = Buffer.from(signSimulated(fields))
  const b = Buffer.from(String(sig))
  return a.length === b.length && timingSafeEqual(a, b)
}

/* ------------------------------------------------------------------ attempts */

export type Launch =
  | { kind: 'form'; action: string; fields: Record<string, string> }
  | { kind: 'redirect'; url: string }

/** Creates a new attempt for an unpaid online order and says how the browser should continue. */
export async function startAttempt(
  payload: Payload,
  cfg: PaymentConfig,
  order: Order,
  token: string,
): Promise<Launch | { error: string }> {
  const method = order.paymentMethod as OnlineMethod
  const route = gatewayRoute(cfg, method)
  if (!route) return { error: 'This payment method isn’t available right now. Please contact us.' }
  const { totalDocs } = await payload.count({
    collection: 'transactions',
    where: { order: { equals: order.id } },
    overrideAccess: true,
  })
  const reference = `${order.orderNumber}-P${totalDocs + 1}`
  const amount = order.totals?.total ?? 0
  await payload.create({
    collection: 'transactions',
    overrideAccess: true,
    data: {
      reference,
      order: order.id,
      method,
      kind: 'payment',
      status: 'initiated',
      amount,
      currency: 'LKR',
      simulated: route === 'simulator',
      events: [{ at: new Date().toISOString(), status: 'initiated' }],
    },
  })

  if (route === 'simulator')
    return {
      kind: 'redirect',
      url: `${SITE()}/checkout/pay/test-gateway?ref=${encodeURIComponent(reference)}&t=${encodeURIComponent(token)}`,
    }

  // Real gateway (PayHere only for now; see gatewayRoute)
  const [firstName, ...rest] = order.contact.fullName.split(' ')
  const a = order.shippingAddress
  return {
    kind: 'form',
    action: PAYHERE_URL[cfg.mode],
    fields: payhereForm({
      merchantId: cfg.payhere.merchantId,
      secret: cfg.payhere.merchantSecret,
      reference,
      amount,
      items: `Order ${order.orderNumber} (${order.items.reduce((n, i) => n + i.quantity, 0)} items)`,
      returnUrl: orderUrl(order, token, '&from=gateway'),
      cancelUrl: payUrl(order, token, '&cancelled=1'),
      notifyUrl: `${SITE()}/api/transactions/notify/payhere`,
      customer: {
        firstName,
        lastName: rest.join(' '),
        email: order.contact.email,
        phone: order.contact.phone,
        address: [a.line1, a.line2].filter(Boolean).join(', '),
        city: a.city,
      },
    }),
  }
}

/* ------------------------------------------------------------------ results */

export type GatewayMessage = {
  reference: string
  result: GatewayResult
  amount: number
  currency: string
  providerRef?: string
  message?: string
  valid: boolean
  ip?: string
  data?: Record<string, unknown>
}

export type ApplyOutcome = { ok: boolean; reason?: string; orderId?: number; newlyPaid?: boolean }

const PAYMENT_LABEL: Record<string, string> = {
  payhere: 'card (PayHere)',
  koko: 'Koko',
  mintpay: 'Mintpay',
}

/**
 * Applies one gateway message. Idempotent: a repeated or late message never pays twice or un-pays an order.
 * An invalid signature or a wrong amount is recorded and changes nothing else.
 */
export async function applyGatewayResult(
  payload: Payload,
  msg: GatewayMessage,
): Promise<ApplyOutcome> {
  const transactionID = await payload.db.beginTransaction()
  const req = { transactionID } as unknown as PayloadRequest
  try {
    const exec = execFor(payload, transactionID)
    // Serialise messages for the same attempt
    const locked = await exec.execute(
      sql`SELECT id FROM transactions WHERE reference = ${msg.reference} FOR UPDATE`,
    )
    const txId = locked.rows[0]?.id as number | undefined
    if (!txId) {
      await payload.db.rollbackTransaction(transactionID!)
      return { ok: false, reason: 'unknown-reference' }
    }
    const tx = (await payload.findByID({
      collection: 'transactions',
      id: txId,
      depth: 0,
      overrideAccess: true,
      req,
    })) as Transaction
    const event = {
      at: new Date().toISOString(),
      status: msg.result,
      valid: msg.valid,
      ip: msg.ip ?? null,
      data: msg.data ?? null,
    }
    const events = [...(tx.events ?? []), event]

    const record = async (data: Partial<Transaction>) =>
      payload.update({
        collection: 'transactions',
        id: tx.id,
        data: { ...data, events } as never,
        overrideAccess: true,
        req,
      })

    if (!msg.valid) {
      await record({ signatureValid: false, message: 'Rejected: signature check failed' })
      await payload.db.commitTransaction(transactionID!)
      return { ok: false, reason: 'bad-signature' }
    }
    if (tx.status === 'paid' && msg.result !== 'chargeback') {
      await record({})
      await payload.db.commitTransaction(transactionID!)
      return { ok: true, reason: 'already-paid', orderId: tx.order as number }
    }
    if (
      msg.result === 'paid' &&
      (Math.abs(msg.amount - tx.amount) > 0.009 || msg.currency !== 'LKR')
    ) {
      await record({
        status: 'failed',
        signatureValid: true,
        message: `Amount mismatch: gateway said ${msg.currency} ${msg.amount}, expected LKR ${tx.amount}`,
      })
      const order = (await payload.findByID({
        collection: 'orders',
        id: tx.order as number,
        depth: 0,
        overrideAccess: true,
        req,
      })) as Order
      await payload.update({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
        req,
        data: {
          status: 'on-hold',
          timeline: [
            ...(order.timeline ?? []),
            {
              at: event.at,
              event: `Payment amount didn’t match (${msg.currency} ${msg.amount}). Check with the gateway.`,
              by: 'gateway',
            },
          ],
        },
      })
      await payload.db.commitTransaction(transactionID!)
      return { ok: false, reason: 'amount-mismatch', orderId: order.id }
    }

    await record({
      status: msg.result,
      signatureValid: true,
      providerRef: msg.providerRef || tx.providerRef,
      message: msg.message || null,
    })

    const order = (await payload.findByID({
      collection: 'orders',
      id: tx.order as number,
      depth: 0,
      overrideAccess: true,
      req,
    })) as Order
    const how = PAYMENT_LABEL[tx.method] ?? tx.method
    const timeline = [...(order.timeline ?? [])]
    const data: Partial<Order> = {}
    let newlyPaid = false
    if (msg.result === 'paid' && order.paymentStatus !== 'paid') {
      newlyPaid = true
      data.paymentStatus = 'paid'
      data.paidAt = event.at
      if (order.status === 'pending-payment') data.status = 'processing'
      timeline.push({
        at: event.at,
        event:
          order.status === 'cancelled'
            ? `Paid by ${how} AFTER the order was cancelled: refund or reinstate it`
            : `Paid by ${how}${msg.providerRef ? ` (payment ${msg.providerRef})` : ''}`,
        by: 'gateway',
      })
    } else if (msg.result === 'pending' && order.paymentStatus !== 'paid') {
      data.paymentStatus = 'pending'
      timeline.push({
        at: event.at,
        event: `Payment by ${how} is processing at the gateway`,
        by: 'gateway',
      })
    } else if (
      (msg.result === 'failed' || msg.result === 'cancelled') &&
      order.paymentStatus !== 'paid'
    ) {
      data.paymentStatus = 'failed'
      timeline.push({
        at: event.at,
        event:
          msg.result === 'cancelled'
            ? `Shopper cancelled the ${how} payment`
            : `${how[0].toUpperCase()}${how.slice(1)} payment failed${msg.message ? `: ${msg.message}` : ''}`,
        by: 'gateway',
      })
    } else if (msg.result === 'chargeback') {
      data.paymentStatus = 'refunded'
      data.status = 'on-hold'
      timeline.push({
        at: event.at,
        event: `Charged back through ${how}. Order on hold.`,
        by: 'gateway',
      })
    }
    if (Object.keys(data).length)
      await payload.update({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
        req,
        data: { ...data, timeline },
      })
    await payload.db.commitTransaction(transactionID!)
    return { ok: true, orderId: order.id, newlyPaid }
  } catch (err) {
    await payload.db.rollbackTransaction(transactionID!)
    throw err
  }
}

/** Marks a still-open attempt as cancelled when the shopper comes back from the gateway's cancel link. */
export async function cancelOpenAttempts(payload: Payload, orderId: number) {
  const open = await payload.find({
    collection: 'transactions',
    where: { and: [{ order: { equals: orderId } }, { status: { equals: 'initiated' } }] },
    depth: 0,
    limit: 20,
    overrideAccess: true,
  })
  for (const t of open.docs) {
    await payload.update({
      collection: 'transactions',
      id: t.id,
      overrideAccess: true,
      data: {
        status: 'cancelled',
        message: 'Shopper returned from the gateway without paying',
        events: [...(t.events ?? []), { at: new Date().toISOString(), status: 'cancelled' }],
      },
    })
  }
  return open.docs.length
}

/* ------------------------------------------------------------------ unpaid orders */

/**
 * Cancels orders that are still unpaid after their pay-by time and returns the stock (via the order hook).
 * Orders with a slip waiting to be checked, or a payment still processing at a gateway, are left alone.
 */
export async function releaseUnpaidOrders(payload: Payload, now = new Date()) {
  const due = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { status: { equals: 'pending-payment' } },
        { paymentStatus: { in: ['unpaid', 'failed'] } },
        { paymentDueAt: { less_than: now.toISOString() } },
      ],
    },
    depth: 0,
    limit: 100,
    overrideAccess: true,
  })
  for (const o of due.docs) {
    await payload.update({
      collection: 'orders',
      id: o.id,
      overrideAccess: true,
      data: {
        status: 'cancelled',
        timeline: [
          ...(o.timeline ?? []),
          {
            at: now.toISOString(),
            event: 'Not paid in time: cancelled and stock returned',
            by: 'system',
          },
        ],
      },
    })
  }
  return due.docs.length
}
