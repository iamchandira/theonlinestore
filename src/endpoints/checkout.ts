import { randomBytes } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import type { Endpoint, PayloadRequest } from 'payload'

import { isOnline, PAYMENT_METHODS, type PaymentMethod } from '../collections/Transactions'
import { DISTRICT_NAMES } from '../config/districts'
import { allow, clientIp } from '../lib/server/rateLimit'

/**
 * Checkout endpoints (Sprint 4), mounted on the orders collection:
 *   POST /api/orders/quote → server-priced totals for the checkout page (no side effects)
 *   POST /api/orders/place → validates, re-prices, reserves stock and creates the order in ONE transaction
 * Prices always come from the database; the client's total is only used to detect a price change.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^(\+94|0)?7\d{8}$/
const normPhone = (p: unknown) => String(p ?? '').replace(/[\s-]/g, '').slice(0, 15)
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
const shopperUser = (req: PayloadRequest) => (req.user && req.user.collection === 'users' ? req.user : null)
const paymentOf = (v: unknown): PaymentMethod | null => (PAYMENT_METHODS.some((m) => m.value === v) ? (v as PaymentMethod) : null)
const items = (v: unknown) => (Array.isArray(v) ? v : []).slice(0, 60).map((i) => ({ sku: str((i as { sku?: string }).sku, 80), qty: Number((i as { qty?: number }).qty) || 0 }))

export const quoteEndpoint: Endpoint = {
  path: '/quote',
  method: 'post',
  handler: async (req) => {
    if (!allow(`quote:${clientIp(req.headers)}`, 120, 60_000)) return Response.json({ error: 'Too many requests' }, { status: 429 })
    const body = ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>
    const { quoteCheckout } = await import('../lib/checkout/server')
    const user = shopperUser(req)
    const res = await quoteCheckout(req.payload, {
      items: items(body.items),
      district: DISTRICT_NAMES.includes(str(body.district, 40)) ? str(body.district, 40) : null,
      method: body.method === 'same-day' ? 'same-day' : 'standard',
      couponCode: str(body.couponCode, 40) || null,
      giftWrap: Boolean(body.giftWrap),
      payment: paymentOf(body.payment),
      shopper: { email: str(body.email, 120).toLowerCase() || user?.email, phone: normPhone(body.phone) || null, userId: user?.id ?? null },
    })
    return Response.json({
      quote: res.quote,
      views: res.views,
      issues: res.issues,
      couponError: res.couponError,
      payments: res.payments,
      paymentFee: res.paymentFee,
      paymentFeeLabel: res.paymentFeeLabel,
      giftWrapFee: res.config.giftWrapFee,
    })
  },
}

const ORDER_CHARS = 'ACDEFGHJKMNPQRTUVWXY3479'
function orderNumber() {
  const d = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }).replace(/-/g, '').slice(2) // YYMMDD
  const bytes = randomBytes(4)
  return `TOS-${d}-${[...bytes].map((b) => ORDER_CHARS[b % ORDER_CHARS.length]).join('')}`
}

type Exec = { execute: (q: ReturnType<typeof sql>) => Promise<unknown> }

export const placeEndpoint: Endpoint = {
  path: '/place',
  method: 'post',
  handler: async (req) => {
    const ip = clientIp(req.headers)
    // 30 per 10 min: mobile networks put many shoppers behind one address (CGNAT)
    if (!allow(`place:${ip}`, 30, 10 * 60_000)) return Response.json({ error: 'Too many orders from this connection. Please wait a few minutes.' }, { status: 429 })
    const body = ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>
    const user = shopperUser(req)
    const payload = req.payload

    /* -------- validate the form -------- */
    const c = (body.contact ?? {}) as Record<string, unknown>
    const contact = { fullName: str(c.fullName, 80), email: str(c.email, 120).toLowerCase(), phone: normPhone(c.phone) }
    const fields: Record<string, string> = {}
    if (contact.fullName.length < 2) fields.fullName = 'Enter your name.'
    if (!EMAIL.test(contact.email)) fields.email = 'Enter a valid email address for your receipt.'
    if (!PHONE.test(contact.phone)) fields.phone = 'Enter a Sri Lankan mobile number, e.g. 077 123 4567.'

    let address: Record<string, string | null> | null = null
    const addressId = str(body.addressId, 40)
    if (addressId && user) {
      const me = await payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true })
      const a = me.addresses?.find((x) => x.id === addressId)
      if (a) address = { recipientName: a.recipientName, phone: a.phone, line1: a.line1, line2: a.line2 ?? null, city: a.city, district: a.district, postalCode: a.postalCode ?? null, landmark: a.landmark ?? null }
    }
    if (!address) {
      const a = (body.address ?? {}) as Record<string, unknown>
      address = {
        recipientName: str(a.recipientName, 80) || contact.fullName,
        phone: normPhone(a.phone) || contact.phone,
        line1: str(a.line1, 120),
        line2: str(a.line2, 120) || null,
        city: str(a.city, 60),
        district: str(a.district, 40),
        postalCode: str(a.postalCode, 10) || null,
        landmark: str(a.landmark, 120) || null,
      }
      if (address.line1!.length < 3) fields.line1 = 'Enter the house number and street.'
      if (address.city!.length < 2) fields.city = 'Enter the town or city.'
      if (!DISTRICT_NAMES.includes(address.district!)) fields.district = 'Choose a district.'
      if (address.postalCode && !/^\d{5}$/.test(address.postalCode)) fields.postalCode = 'Postal codes have 5 digits.'
      if (!PHONE.test(address.phone!)) fields.addressPhone = 'Enter a Sri Lankan mobile number for the courier.'
    }
    const payment = paymentOf(body.payment)
    if (!payment) fields.payment = 'Choose how you’d like to pay.'
    if (body.acceptTerms !== true) fields.terms = 'Please accept the terms and conditions to place your order.'
    const gift = { wrap: Boolean((body.gift as Record<string, unknown>)?.wrap), message: str((body.gift as Record<string, unknown>)?.message, 300) || null, hidePrices: Boolean((body.gift as Record<string, unknown>)?.hidePrices) }
    const note = str(body.note, 500) || null
    if (Object.keys(fields).length) return Response.json({ error: 'Please check the highlighted fields.', fields }, { status: 400 })

    /* -------- price it on the server -------- */
    const { quoteCheckout } = await import('../lib/checkout/server')
    const input = {
      items: items(body.items),
      district: address.district,
      method: (body.method === 'same-day' ? 'same-day' : 'standard') as 'standard' | 'same-day',
      couponCode: str(body.couponCode, 40) || null,
      giftWrap: gift.wrap,
      payment,
      shopper: { email: contact.email, phone: contact.phone, userId: user?.id ?? null },
    }
    let q = await quoteCheckout(payload, input)
    if (!q.views.length) return Response.json({ error: 'Your bag is empty.', issues: q.issues }, { status: 409 })
    if (q.issues.length) return Response.json({ error: 'Your bag changed. Please review it before ordering.', issues: q.issues, quote: q.quote, views: q.views }, { status: 409 })
    if (input.couponCode && q.couponError) return Response.json({ error: q.couponError, fields: { coupon: q.couponError } }, { status: 400 })
    if (!q.payments.find((p) => p.id === payment)?.available) return Response.json({ error: q.payments.find((p) => p.id === payment)?.note ?? 'That payment method isn’t available.', fields: { payment: 'Choose another way to pay.' } }, { status: 400 })
    if (input.method === 'same-day' && q.quote.delivery.method !== 'same-day') return Response.json({ error: 'Same-day delivery is no longer available for today. Please choose standard delivery.', fields: { method: 'Same-day closed' } }, { status: 409 })
    if (typeof body.expectedTotal === 'number' && body.expectedTotal !== q.quote.total) {
      return Response.json({ error: `The total changed to Rs ${q.quote.total.toLocaleString('en-LK')}. Please check your order and place it again.`, quote: q.quote, views: q.views, priceChanged: true }, { status: 409 })
    }

    /* -------- reserve stock + create the order, all or nothing -------- */
    const transactionID = await payload.db.beginTransaction()
    if (transactionID == null) return Response.json({ error: 'Checkout is unavailable right now. Please try again.' }, { status: 503 })
    const txReq = { ...req, transactionID } as PayloadRequest
    const number = orderNumber()
    const token = randomBytes(24).toString('base64url')
    let orderId: number
    try {
      const adapter = payload.db as unknown as { sessions: Record<string | number, { db: Exec }> }
      const tx = adapter.sessions[transactionID as string | number].db
      const productIds = [...new Set(q.quote.lines.map((l) => l.productId))]
      // Lock these product rows: two shoppers can't both buy the last unit
      await tx.execute(sql`SELECT id FROM products WHERE id IN (${sql.join(productIds.map((id) => sql`${id}`), sql`, `)}) ORDER BY id FOR UPDATE`)
      // Re-price inside the lock with the transaction's view of stock
      q = await quoteCheckout(payload, input, txReq)
      if (q.issues.length) throw Object.assign(new Error('stock'), { issues: q.issues })

      for (const productId of productIds) {
        const p = await payload.findByID({ collection: 'products', id: productId, depth: 0, overrideAccess: true, req: txReq })
        const want = new Map(q.quote.lines.filter((l) => l.productId === productId).map((l) => [l.sku, l.qty]))
        const variants = (p.variants ?? []).map((v) => (want.has(v.sku) ? { ...v, stock: (v.stock ?? 0) - want.get(v.sku)! } : v))
        if (variants.some((v) => (v.stock ?? 0) < 0)) throw Object.assign(new Error('stock'), { issues: [{ sku: '', message: `${p.name} just sold out.` }] })
        const sold = [...want.values()].reduce((a, b) => a + b, 0)
        await payload.update({
          collection: 'products',
          id: productId,
          data: { variants, salesCount: (p.salesCount ?? 0) + sold },
          overrideAccess: true,
          req: txReq,
          context: { stockReason: 'sale', stockNote: `Order ${number}` },
        })
      }

      const viewByS = new Map(q.views.map((v) => [v.sku, v]))
      const now = new Date().toISOString()
      const order = await payload.create({
        collection: 'orders',
        overrideAccess: true,
        req: txReq,
        data: {
          orderNumber: number,
          status: payment === 'cod' ? 'processing' : 'pending-payment',
          paymentDueAt:
            payment === 'cod'
              ? null
              : new Date(Date.now() + (isOnline(payment!) ? q.payConfig.onlineHoldMinutes * 60_000 : q.payConfig.bankTransfer.holdHours * 3_600_000)).toISOString(),
          paymentMethod: payment!,
          paymentStatus: 'unpaid',
          customer: user?.id,
          contact,
          shippingAddress: address as never,
          delivery: { method: q.quote.delivery.method, zone: q.quote.delivery.zone, eta: q.quote.delivery.eta },
          items: q.quote.lines.map((l) => ({
            product: l.productId,
            sku: l.sku,
            quantity: l.qty,
            name: l.name,
            brand: viewByS.get(l.sku)?.brand,
            variant: viewByS.get(l.sku)?.multi ? viewByS.get(l.sku)?.label : null,
            image: viewByS.get(l.sku)?.image,
            unitPrice: l.unitPrice,
            lineSubtotal: l.lineSubtotal,
            discount: l.discount,
            lineTotal: l.lineTotal,
          })),
          discounts: q.quote.discounts.map((d) => ({ label: d.label, code: d.code ?? null, amount: d.amount, discount: d.ruleId })),
          totals: {
            subtotal: q.quote.subtotal,
            discountTotal: q.quote.discountTotal,
            delivery: q.quote.delivery.fee,
            paymentFee: q.paymentFee,
            giftWrap: q.quote.giftWrapFee,
            total: q.quote.total,
          },
          coupon: q.couponDoc && q.quote.coupon?.applied ? q.couponDoc.id : undefined,
          gift,
          customerNote: note,
          termsAcceptedAt: now,
          termsVersion: q.config.termsVersion,
          accessToken: token,
          clientIp: ip,
          timeline: [
            {
              at: now,
              event: payment === 'cod' ? 'Order placed (cash on delivery)' : payment === 'bank-transfer' ? 'Order placed, waiting for bank transfer' : `Order placed, waiting for ${{ payhere: 'card (PayHere)', koko: 'Koko', mintpay: 'Mintpay' }[payment as string] ?? payment} payment`,
              by: contact.email,
            },
          ],
        },
      })
      orderId = order.id
      if (q.couponDoc && q.quote.coupon?.applied) {
        await payload.update({ collection: 'discounts', id: q.couponDoc.id, data: { usedCount: (q.couponDoc.usedCount ?? 0) + 1 }, overrideAccess: true, req: txReq, context: { skipAudit: true } })
      }
      if (user) await payload.update({ collection: 'users', id: user.id, data: { cart: [] }, overrideAccess: true, req: txReq })
      await payload.db.commitTransaction(transactionID)
    } catch (err) {
      await payload.db.rollbackTransaction(transactionID)
      const issues = (err as { issues?: unknown }).issues
      if (issues) return Response.json({ error: 'Some items sold out while you were checking out.', issues }, { status: 409 })
      payload.logger.error({ err }, 'Place order failed')
      return Response.json({ error: 'We couldn’t place your order. Nothing was charged. Please try again.' }, { status: 500 })
    }

    // Card and instalment orders continue to the gateway; their confirmation email goes once payment is confirmed
    if (isOnline(payment!)) return Response.json({ ok: true, orderNumber: number, redirect: `/checkout/pay/${number}?t=${token}` })

    /* -------- confirmation email (after commit; never blocks the order) -------- */
    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
    const viewUrl = `${site}/checkout/success/${number}?t=${token}`
    try {
      const { orderConfirmation } = await import('../lib/email/templates')
      await payload.sendEmail({
        to: contact.email,
        subject: `Order ${number} confirmed · The Online Store`,
        html: orderConfirmation({
          orderNumber: number,
          fullName: contact.fullName,
          items: q.quote.lines.map((l) => ({ name: l.name, brand: q.views.find((v) => v.sku === l.sku)?.brand, variant: q.views.find((v) => v.sku === l.sku)?.label, quantity: l.qty, lineTotal: l.lineTotal })),
          totals: { subtotal: q.quote.subtotal, discountTotal: q.quote.discountTotal, delivery: q.quote.delivery.fee, paymentFee: q.paymentFee, giftWrap: q.quote.giftWrapFee, total: q.quote.total },
          discounts: q.quote.discounts.map((d) => ({ label: d.label, amount: d.amount })),
          address: address as never,
          delivery: { method: q.quote.delivery.method, eta: q.quote.delivery.eta },
          paymentMethod: payment!,
          bankInstructions: q.payConfig.bankTransfer.instructions,
          bankAccounts: q.payConfig.bankTransfer.accounts,
          viewUrl,
        }),
      })
    } catch (err) {
      payload.logger.error({ err, orderId }, 'Order confirmation email failed')
    }
    return Response.json({ ok: true, orderNumber: number, redirect: `/checkout/success/${number}?t=${token}` })
  },
}
