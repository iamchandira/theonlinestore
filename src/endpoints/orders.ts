import type { Endpoint } from 'payload'

import type { Order } from '@/payload-types'

import { hasRole, isStaff } from '../access/roles'
import { ORDER_STATUSES } from '../collections/Orders'

/**
 * Staff order endpoints (Sprint 6):
 *   POST /api/orders/bulk-status     { ids, status }                       TOS-701
 *   POST /api/orders/cod-remittance  { ids, reference, receivedAt? }       TOS-707
 * Both run each order through the normal update (access rules + lifecycle hook) and report per order.
 */

const ids = (v: unknown) =>
  (Array.isArray(v) ? v : [])
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200)

export const bulkStatusEndpoint: Endpoint = {
  path: '/bulk-status',
  method: 'post',
  handler: async (req) => {
    if (!req.user || !isStaff(req.user))
      return Response.json({ error: 'Not allowed' }, { status: 403 })
    const body = ((await req.json?.().catch(() => null)) ?? {}) as {
      ids?: unknown
      status?: string
    }
    const status = ORDER_STATUSES.find((s) => s.value === body.status)?.value
    const list = ids(body.ids)
    if (!status || !list.length)
      return Response.json({ error: 'Choose orders and a status.' }, { status: 400 })
    const results: { id: number; orderNumber?: string; ok: boolean; error?: string }[] = []
    for (const id of list) {
      try {
        const o = await req.payload.update({
          collection: 'orders',
          id,
          data: { status },
          user: req.user,
          overrideAccess: false,
        })
        results.push({ id, orderNumber: o.orderNumber, ok: true })
      } catch (err) {
        const orderNumber = (
          await req.payload
            .findByID({ collection: 'orders', id, depth: 0, overrideAccess: true })
            .catch(() => null)
        )?.orderNumber
        const e = err as { name?: string; message?: string }
        results.push({
          id,
          orderNumber,
          ok: false,
          error: e.name === 'Forbidden' ? 'You can’t change this order.' : (e.message ?? 'Failed'),
        })
      }
    }
    return Response.json({
      updated: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok),
    })
  },
}

export const codRemittanceEndpoint: Endpoint = {
  path: '/cod-remittance',
  method: 'post',
  handler: async (req) => {
    if (!req.user || !hasRole(req.user, 'admin', 'store-manager'))
      return Response.json(
        { error: 'Only store managers record courier payments.' },
        { status: 403 },
      )
    const body = ((await req.json?.().catch(() => null)) ?? {}) as {
      ids?: unknown
      reference?: string
    }
    const reference = String(body.reference ?? '')
      .trim()
      .slice(0, 80)
    const list = ids(body.ids)
    if (!list.length)
      return Response.json({ error: 'Choose the orders this payment covers.' }, { status: 400 })
    if (reference.length < 3)
      return Response.json(
        {
          error: 'Enter the courier’s payment or bank reference.',
          fields: { reference: 'Required' },
        },
        { status: 400 },
      )
    const payload = req.payload
    const now = new Date().toISOString()
    const by = (req.user as { email?: string }).email ?? 'staff'
    let total = 0
    const skipped: string[] = []
    for (const id of list) {
      const o = (await payload
        .findByID({ collection: 'orders', id, depth: 0, overrideAccess: true })
        .catch(() => null)) as Order | null
      if (
        !o ||
        o.paymentMethod !== 'cod' ||
        o.codRemittance?.remittedAt ||
        !['delivered', 'completed'].includes(o.status)
      ) {
        if (o) skipped.push(o.orderNumber)
        continue
      }
      const amount = o.totals?.total ?? 0
      const { totalDocs } = await payload.count({
        collection: 'transactions',
        where: { order: { equals: o.id } },
        overrideAccess: true,
      })
      await payload.create({
        collection: 'transactions',
        overrideAccess: true,
        data: {
          reference: `${o.orderNumber}-C${totalDocs + 1}`,
          order: o.id,
          method: 'cod',
          kind: 'payment',
          status: 'paid',
          amount,
          currency: 'LKR',
          providerRef: reference,
          by: req.user.id,
          message: 'Cash remitted by courier',
          events: [{ at: now, status: 'remitted' }],
        },
      })
      await payload.update({
        collection: 'orders',
        id: o.id,
        overrideAccess: true,
        context: { skipLifecycle: true },
        data: {
          codRemittance: { remittedAt: now, reference },
          ...(o.paymentStatus === 'paid' ? {} : { paymentStatus: 'paid', paidAt: now }),
          timeline: [
            ...(o.timeline ?? []),
            { at: now, event: `Courier paid the cash in (${reference})`, by },
          ],
        },
      })
      total += amount
    }
    const { audit } = await import('../lib/payload/audit')
    await audit(req, {
      action: 'payment',
      collection: 'orders',
      summary: `COD remittance ${reference}: ${list.length - skipped.length} orders, Rs ${total}`,
    })
    return Response.json({ ok: true, recorded: list.length - skipped.length, total, skipped })
  },
}
