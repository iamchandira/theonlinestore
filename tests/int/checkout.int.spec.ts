// @vitest-environment node
/**
 * Checkout (Sprint 4): the quote and place endpoints called directly, against the real database.
 * Covers server-side pricing, validation, price-change detection, stock reservation (including two shoppers
 * racing for the last unit), coupon usage, COD limits, restock on cancellation and order privacy.
 * Creates its own products, coupon and users, and removes them afterwards.
 */
import config from '@/payload.config'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { placeEndpoint, quoteEndpoint } from '@/endpoints/checkout'
import type { Order, User } from '@/payload-types'

let payload: Payload
let admin: User
let shopper: User
let other: User
let productId: number
let categoryId: number
let couponId: number
const stamp = Date.now()
const SKU_CHEAP = `CHK-A-${stamp}` // Rs 1,000, 3 in stock
const SKU_DEAR = `CHK-B-${stamp}` // Rs 30,000, 5 in stock (COD limit tests)
const CODE = `CHK${String(stamp).slice(-6)}`
const orderIds: number[] = []
let ipSeq = 0
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>

/** Calls an endpoint handler the way Payload would, from a fresh IP so rate limits never interfere. */
async function call(endpoint: typeof placeEndpoint, body: unknown, user: User | null = null) {
  const req = {
    payload,
    user: user ? { ...user, collection: 'users' } : null,
    headers: new Headers({ 'x-real-ip': `10.44.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}` }),
    json: async () => body,
  } as unknown as PayloadRequest
  const res = (await endpoint.handler(req)) as Response
  return { status: res.status, body: (await res.json()) as Json }
}

const contact = {
  fullName: 'Checkout Test',
  email: `checkout-${stamp}@example.test`,
  phone: '0771234567',
}
const address = { line1: '12 Temple Road', city: 'Kandy', district: 'Kandy' }
const order = (over: Record<string, unknown> = {}) => ({
  items: [{ sku: SKU_CHEAP, qty: 1 }],
  payment: 'cod',
  acceptTerms: true,
  contact,
  address,
  ...over,
})
const stockOf = async (sku: string) => {
  const p = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
    overrideAccess: true,
  })
  return p.variants?.find((v) => v.sku === sku)?.stock
}
const placed = async (body: Json) => {
  const o = (
    await payload.find({
      collection: 'orders',
      where: { orderNumber: { equals: body.orderNumber } },
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] as Order
  orderIds.push(o.id)
  return o
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  admin = (
    await payload.find({
      collection: 'users',
      where: { roles: { contains: 'super-admin' } },
      limit: 1,
      depth: 0,
    })
  ).docs[0] as User
  expect(admin, 'run `pnpm seed:admin` first').toBeTruthy()
  const brand = (await payload.find({ collection: 'brands', limit: 1, depth: 0 })).docs[0]
  const cat = await payload.create({
    collection: 'categories',
    data: { name: `Checkout Cat ${stamp}`, slug: `checkout-cat-${stamp}`, generateSlug: false },
    user: admin,
    context: { disableRevalidate: true },
  })
  categoryId = cat.id
  const p = await payload.create({
    collection: 'products',
    data: {
      name: `Checkout Test ${stamp}`,
      slug: `checkout-test-${stamp}`,
      generateSlug: false,
      brand: brand.id,
      categories: [cat.id],
      optionName: 'Size',
      variants: [
        { label: 'Small', sku: SKU_CHEAP, price: 1000, cost: 400, stock: 3, weight: 200 },
        { label: 'Large', sku: SKU_DEAR, price: 30000, cost: 10000, stock: 5, weight: 200 },
      ],
      _status: 'published',
    },
    user: admin,
    context: { disableRevalidate: true },
  } as never)
  productId = p.id
  const coupon = await payload.create({
    collection: 'discounts',
    data: {
      name: `Checkout test ${stamp}`,
      mode: 'code',
      code: CODE,
      type: 'fixed',
      value: 200,
      active: true,
      usageLimit: 1,
    } as never,
    overrideAccess: true,
  })
  couponId = coupon.id
  for (const [i, ref] of [0, 1].entries()) {
    const u = await payload.create({
      collection: 'users',
      data: {
        email: `checkout-u${i}-${stamp}@example.test`,
        password: `Pw-${stamp}-x!`,
        fullName: `Checkout User ${i}`,
        roles: ['customer'],
        _verified: true,
      } as never,
      overrideAccess: true,
    })
    if (ref === 0) shopper = u as User
    else other = u as User
  }
})

afterAll(async () => {
  for (const id of orderIds)
    await payload.delete({ collection: 'orders', id, overrideAccess: true }).catch(() => {})
  await payload
    .delete({
      collection: 'products',
      id: productId,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    .catch(() => {})
  await payload
    .delete({
      collection: 'categories',
      id: categoryId,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    .catch(() => {})
  await payload
    .delete({ collection: 'discounts', id: couponId, overrideAccess: true })
    .catch(() => {})
  for (const u of [shopper, other])
    if (u)
      await payload.delete({ collection: 'users', id: u.id, overrideAccess: true }).catch(() => {})
  await payload
    .delete({
      collection: 'stock-movements',
      where: { product: { equals: productId } },
      overrideAccess: true,
    })
    .catch(() => {})
  await payload
    .delete({
      collection: 'audit-logs',
      where: { summary: { like: String(stamp) } },
      overrideAccess: true,
    })
    .catch(() => {})
})

describe('quote', () => {
  it('prices from the database, ignoring any price the client sends', async () => {
    const r = await call(quoteEndpoint, {
      items: [{ sku: SKU_CHEAP, qty: 2, price: 1 }],
      district: 'Kandy',
      giftWrap: true,
    })
    expect(r.status).toBe(200)
    expect(r.body.quote.subtotal).toBe(2000)
    expect(r.body.quote.giftWrapFee).toBeGreaterThan(0)
    expect(r.body.quote.total).toBe(2000 + r.body.quote.delivery.fee + r.body.quote.giftWrapFee)
  })
  it('explains an unknown coupon instead of failing', async () => {
    const r = await call(quoteEndpoint, {
      items: [{ sku: SKU_CHEAP, qty: 1 }],
      couponCode: 'NOPE-NOT-REAL',
    })
    expect(r.body.couponError).toBeTruthy()
    expect(r.body.quote.discountTotal).toBe(0)
  })
  it('turns off cash on delivery above the COD limit', async () => {
    const r = await call(quoteEndpoint, { items: [{ sku: SKU_DEAR, qty: 2 }], district: 'Kandy' })
    expect(r.body.payments.find((p: { id: string }) => p.id === 'cod').available).toBe(false)
    expect(r.body.payments.find((p: { id: string }) => p.id === 'bank-transfer').available).toBe(
      true,
    )
  })
})

describe('place', () => {
  it('rejects an incomplete form with a message for each field', async () => {
    const r = await call(placeEndpoint, {
      items: [{ sku: SKU_CHEAP, qty: 1 }],
      contact: { email: 'bad' },
    })
    expect(r.status).toBe(400)
    expect(Object.keys(r.body.fields)).toEqual(
      expect.arrayContaining([
        'fullName',
        'email',
        'phone',
        'line1',
        'city',
        'district',
        'payment',
        'terms',
      ]),
    )
  })
  it('refuses cash on delivery over the limit', async () => {
    const r = await call(placeEndpoint, order({ items: [{ sku: SKU_DEAR, qty: 2 }] }))
    expect(r.status).toBe(400)
    expect(r.body.fields.payment).toBeTruthy()
    expect(await stockOf(SKU_DEAR)).toBe(5)
  })
  it('stops when the total changed since the shopper last saw it', async () => {
    const r = await call(placeEndpoint, order({ expectedTotal: 1 }))
    expect(r.status).toBe(409)
    expect(r.body.priceChanged).toBe(true)
    expect(await stockOf(SKU_CHEAP)).toBe(3)
  })
  it('places a COD order: stock goes down, coupon is counted, totals are stored', async () => {
    const q = await call(quoteEndpoint, {
      items: [{ sku: SKU_CHEAP, qty: 1 }],
      district: 'Kandy',
      couponCode: CODE,
      payment: 'cod',
      giftWrap: true,
    })
    const r = await call(
      placeEndpoint,
      order({
        couponCode: CODE,
        expectedTotal: q.body.quote.total,
        gift: { wrap: true, message: 'Happy birthday' },
      }),
    )
    expect(r.status, JSON.stringify(r.body)).toBe(200)
    expect(r.body.orderNumber).toMatch(/^TOS-\d{6}-[A-Z0-9]{4}$/)
    expect(r.body.redirect).toContain('?t=')
    const o = await placed(r.body)
    expect(o.status).toBe('processing')
    expect(o.paymentMethod).toBe('cod')
    expect(o.totals?.subtotal).toBe(1000)
    expect(o.totals?.discountTotal).toBe(200)
    expect(o.totals?.total).toBe(q.body.quote.total)
    expect(o.gift?.wrap).toBe(true)
    expect(o.termsAcceptedAt).toBeTruthy()
    expect(await stockOf(SKU_CHEAP)).toBe(2)
    const c = await payload.findByID({
      collection: 'discounts',
      id: couponId,
      overrideAccess: true,
    })
    expect(c.usedCount).toBe(1)
  })
  it('a used-up coupon is refused', async () => {
    const r = await call(placeEndpoint, order({ couponCode: CODE }))
    expect(r.status).toBe(400)
    expect(r.body.fields.coupon).toBeTruthy()
  })
  it('two shoppers racing for the last units: one wins, nothing oversells', async () => {
    // 2 left. Both ask for 2 at the same moment.
    const [a, b] = await Promise.all([
      call(placeEndpoint, order({ items: [{ sku: SKU_CHEAP, qty: 2 }] })),
      call(placeEndpoint, order({ items: [{ sku: SKU_CHEAP, qty: 2 }] })),
    ])
    const statuses = [a.status, b.status].sort()
    expect(statuses).toEqual([200, 409])
    await placed(a.status === 200 ? a.body : b.body)
    expect(await stockOf(SKU_CHEAP)).toBe(0)
  })
  it('sold-out items are reported, not ordered', async () => {
    const r = await call(placeEndpoint, order())
    expect(r.status).toBe(409)
    expect(r.body.issues?.length).toBeGreaterThan(0)
  })
  it('bank transfer orders wait for payment and the signed-in shopper is linked', async () => {
    const r = await call(
      placeEndpoint,
      order({ items: [{ sku: SKU_DEAR, qty: 1 }], payment: 'bank-transfer' }),
      shopper,
    )
    expect(r.status, JSON.stringify(r.body)).toBe(200)
    const o = await placed(r.body)
    expect(o.status).toBe('pending-payment')
    expect(typeof o.customer === 'object' ? o.customer?.id : o.customer).toBe(shopper.id)
    expect(await stockOf(SKU_DEAR)).toBe(4)
  })
})

describe('after the order', () => {
  it('customers see only their own orders, and never the access token', async () => {
    const mine = await payload.find({
      collection: 'orders',
      user: shopper,
      overrideAccess: false,
      depth: 0,
    })
    expect(mine.docs.length).toBe(1)
    expect((mine.docs[0] as Order & { accessToken?: string }).accessToken).toBeUndefined()
    const theirs = await payload.find({
      collection: 'orders',
      user: other,
      overrideAccess: false,
      depth: 0,
    })
    expect(theirs.docs.length).toBe(0)
  })
  it('nobody can create an order outside checkout', async () => {
    await expect(
      payload.create({
        collection: 'orders',
        user: admin,
        overrideAccess: false,
        data: {} as never,
      }),
    ).rejects.toThrow()
  })
  it('cancelling puts the stock back exactly once', async () => {
    const o = (
      await payload.find({
        collection: 'orders',
        where: { id: { in: orderIds }, 'items.sku': { equals: SKU_DEAR } },
        depth: 0,
        overrideAccess: true,
      })
    ).docs[0] as Order
    await payload.update({
      collection: 'orders',
      id: o.id,
      data: { status: 'cancelled' },
      user: admin,
      overrideAccess: true,
    })
    expect(await stockOf(SKU_DEAR)).toBe(5)
    await payload.update({
      collection: 'orders',
      id: o.id,
      data: { staffNotes: 'checked twice' },
      user: admin,
      overrideAccess: true,
    })
    expect(await stockOf(SKU_DEAR)).toBe(5)
    const after = await payload.findByID({
      collection: 'orders',
      id: o.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(after.stockReturned).toBe(true)
    expect(after.timeline?.some((t) => /cancel/i.test(t.event ?? ''))).toBe(true)
  })
})
