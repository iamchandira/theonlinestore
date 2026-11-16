// @vitest-environment node
/**
 * Orders & delivery (Sprint 6): lifecycle rules, shipping requirements, bulk status, restocking,
 * returns (request → approve → receive → refund), refunds (PayHere API, test gateway, manual) and
 * COD reconciliation. Creates its own products, couriers, users and orders, and removes them afterwards.
 */
import config from '@/payload.config'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { placeEndpoint } from '@/endpoints/checkout'
import { bulkStatusEndpoint, codRemittanceEndpoint } from '@/endpoints/orders'
import { orderPaymentEndpoint } from '@/endpoints/payments'
import { returnActionEndpoint, returnRequestEndpoint } from '@/endpoints/returns'
import { checkTransition, progress } from '@/lib/orders/lifecycle'
import { loadPaymentConfig } from '@/lib/payments/config'
import { payhereRefund } from '@/lib/payments/refunds'
import { applyGatewayResult, startAttempt } from '@/lib/payments/service'
import type { Order, User } from '@/payload-types'

let payload: Payload
let admin: User
const stamp = Date.now()
const SKU = `ORD-${stamp}`
const CHOC = `ORDC-${stamp}`
const products: number[] = []
let categoryId: number
const couriers = {} as Record<'tracked' | 'rider', number>
const users = {} as Record<'manager' | 'fulfilment' | 'marketing' | 'support', User>
const orderIds: number[] = []
let ip = 0
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>

const fakeReq = (extra: Json): PayloadRequest =>
  ({
    payload,
    user: null,
    headers: new Headers({ 'x-real-ip': `10.66.${Math.floor(++ip / 250)}.${ip % 250}` }),
    ...extra,
  }) as unknown as PayloadRequest
const as = (u: User) => ({ ...u, collection: 'users' })
/** Endpoint handlers may return a Response or a Promise of one. */
const call = (r: Response | Promise<Response>) => Promise.resolve(r).then(res)
const res = async (r: unknown) => {
  const resp = r as Response
  return { status: resp.status, body: (await resp.json().catch(() => ({}))) as Json }
}
async function place(payment: string, items = [{ sku: SKU, qty: 2 }]) {
  const r = await res(
    await placeEndpoint.handler(
      fakeReq({
        json: async () => ({
          items,
          payment,
          acceptTerms: true,
          contact: {
            fullName: 'Order Test',
            email: `ord-${stamp}@example.test`,
            phone: `07${String(stamp).slice(-8)}`,
          },
          address: { line1: '2 Test Lane', city: 'Galle', district: 'Galle' },
        }),
      }),
    ),
  )
  expect(r.status, JSON.stringify(r.body)).toBe(200)
  const o = (
    await payload.find({
      collection: 'orders',
      where: { orderNumber: { equals: r.body.orderNumber } },
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })
  ).docs[0] as Order
  orderIds.push(o.id)
  return o
}
const reload = async (id: number) =>
  (await payload.findByID({
    collection: 'orders',
    id,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })) as Order
const stockOf = async (sku: string) => {
  const p = (
    await payload.find({
      collection: 'products',
      where: { 'variants.sku': { equals: sku } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]
  return p.variants?.find((v) => v.sku === sku)?.stock
}
const setStatus = (id: number, status: string, user: User = users.manager, extra: Json = {}) =>
  payload.update({
    collection: 'orders',
    id,
    data: { status, ...extra } as never,
    user,
    overrideAccess: false,
  })
/** COD order taken to delivered by the fulfilment team with the own-rider courier. */
async function delivered(items?: { sku: string; qty: number }[]) {
  const o = await place('cod', items)
  await setStatus(o.id, 'packed', users.fulfilment)
  await setStatus(o.id, 'shipped', users.fulfilment, { shipment: { courier: couriers.rider } })
  await setStatus(o.id, 'delivered', users.fulfilment)
  return reload(o.id)
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
  categoryId = (
    await payload.create({
      collection: 'categories',
      data: { name: `Ord Cat ${stamp}`, slug: `ord-cat-${stamp}`, generateSlug: false },
      user: admin,
      context: { disableRevalidate: true },
    })
  ).id
  for (const [sku, type, price] of [
    [SKU, 'beauty', 1500],
    [CHOC, 'chocolate', 900],
  ] as const) {
    const p = await payload.create({
      collection: 'products',
      data: {
        name: `Ord ${type} ${stamp}`,
        slug: `ord-${type}-${stamp}`,
        generateSlug: false,
        productType: type,
        brand: brand.id,
        categories: [categoryId],
        optionName: 'Size',
        variants: [{ label: 'One', sku, price, cost: 500, stock: 50 }],
        _status: 'published',
      },
      user: admin,
      context: { disableRevalidate: true },
    } as never)
    products.push(p.id)
  }
  couriers.tracked = (
    await payload.create({
      collection: 'couriers',
      data: {
        name: `Test Courier ${stamp}`,
        trackingUrl: 'https://courier.example/track?n={tracking}',
        requiresTracking: true,
        collectsCod: true,
      },
      overrideAccess: true,
    })
  ).id
  couriers.rider = (
    await payload.create({
      collection: 'couriers',
      data: { name: `Test Rider ${stamp}`, requiresTracking: false, collectsCod: true },
      overrideAccess: true,
    })
  ).id
  for (const [key, role] of [
    ['manager', 'store-manager'],
    ['fulfilment', 'order-fulfillment'],
    ['marketing', 'marketing'],
    ['support', 'support'],
  ] as const) {
    users[key] = (await payload.create({
      collection: 'users',
      data: {
        email: `ord-${key}-${stamp}@example.test`,
        password: `Pw-${stamp}-x!`,
        roles: [role],
        _verified: true,
      } as never,
      user: admin,
    })) as User
  }
})

afterAll(async () => {
  vi.unstubAllGlobals()
  for (const id of orderIds) {
    await payload
      .delete({ collection: 'returns', where: { order: { equals: id } }, overrideAccess: true })
      .catch(() => {})
    await payload
      .delete({
        collection: 'transactions',
        where: { order: { equals: id } },
        overrideAccess: true,
      })
      .catch(() => {})
    await payload.delete({ collection: 'orders', id, overrideAccess: true }).catch(() => {})
  }
  for (const id of products) {
    await payload
      .delete({
        collection: 'stock-movements',
        where: { product: { equals: id } },
        overrideAccess: true,
      })
      .catch(() => {})
    await payload
      .delete({
        collection: 'products',
        id,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      .catch(() => {})
  }
  await payload
    .delete({
      collection: 'categories',
      id: categoryId,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    .catch(() => {})
  for (const id of Object.values(couriers))
    await payload.delete({ collection: 'couriers', id, overrideAccess: true }).catch(() => {})
  for (const u of Object.values(users))
    await payload.delete({ collection: 'users', id: u.id, overrideAccess: true }).catch(() => {})
  await payload
    .delete({
      collection: 'audit-logs',
      where: { docId: { in: orderIds.map(String) } },
      overrideAccess: true,
    })
    .catch(() => {})
})

describe('lifecycle rules', () => {
  const base = { paymentMethod: 'cod', paymentStatus: 'unpaid' }
  it('allowed steps, payment and shipping requirements', () => {
    expect(checkTransition({ ...base, status: 'processing' }, 'packed', null)).toBeNull()
    expect(checkTransition({ ...base, status: 'processing' }, 'delivered', null)).toMatch(
      /can’t be moved/,
    )
    expect(checkTransition({ ...base, status: 'delivered' }, 'cancelled', null)).toMatch(
      /Next steps: completed, returned/,
    )
    expect(
      checkTransition(
        { status: 'processing', paymentMethod: 'bank-transfer', paymentStatus: 'unpaid' },
        'packed',
        null,
      ),
    ).toMatch(/isn’t paid/)
    expect(checkTransition({ ...base, status: 'packed' }, 'shipped', null)).toMatch(/courier/)
    expect(
      checkTransition({ ...base, status: 'packed', shipment: { courier: 1 } }, 'shipped', {
        requiresTracking: true,
      }),
    ).toMatch(/tracking number/)
    expect(
      checkTransition({ ...base, status: 'packed', shipment: { courier: 1 } }, 'shipped', {
        requiresTracking: false,
      }),
    ).toBeNull()
    expect(progress('out-for-delivery').step).toBe(3)
    expect(progress('cancelled').stopped).toBe('Cancelled')
  })
})

describe('order status changes', () => {
  it('staff follow the steps; shipping needs courier + tracking; dates are kept', async () => {
    const o = await place('cod')
    await expect(setStatus(o.id, 'delivered')).rejects.toThrow(/can’t be moved/)
    await setStatus(o.id, 'packed', users.fulfilment)
    await expect(
      setStatus(o.id, 'shipped', users.fulfilment, { shipment: { courier: couriers.tracked } }),
    ).rejects.toThrow(/tracking number/)
    await setStatus(o.id, 'shipped', users.fulfilment, {
      shipment: { courier: couriers.tracked, trackingNumber: 'KB123456' },
    })
    const s = await reload(o.id)
    expect(s.status).toBe('shipped')
    expect(s.statusDates?.packedAt).toBeTruthy()
    expect(s.statusDates?.shippedAt).toBeTruthy()
    await expect(setStatus(o.id, 'cancelled')).rejects.toThrow() // it already left
  })
  it('an unpaid bank transfer order can’t be packed', async () => {
    const o = await place('bank-transfer')
    await expect(setStatus(o.id, 'processing')).resolves.toBeTruthy() // e.g. paid off-line, then confirmed
    await expect(setStatus(o.id, 'packed')).rejects.toThrow(/isn’t paid/)
  })
  it('cancelling returns stock once; a failed delivery returned to us restocks too', async () => {
    const before = await stockOf(SKU)
    const a = await place('cod')
    expect(await stockOf(SKU)).toBe(before! - 2)
    await setStatus(a.id, 'cancelled')
    expect(await stockOf(SKU)).toBe(before)
    const b = await place('cod')
    await setStatus(b.id, 'packed')
    await setStatus(b.id, 'shipped', users.manager, { shipment: { courier: couriers.rider } })
    await setStatus(b.id, 'failed-delivery')
    expect(await stockOf(SKU)).toBe(before! - 2) // still with the courier
    await setStatus(b.id, 'returned')
    expect(await stockOf(SKU)).toBe(before)
  })
  it('bulk status reports each order; marketing can’t change orders', async () => {
    const a = await place('cod')
    const b = await place('bank-transfer') // unpaid: can't be packed
    const r = await res(
      await bulkStatusEndpoint.handler(
        fakeReq({
          user: as(users.fulfilment),
          json: async () => ({ ids: [a.id, b.id], status: 'packed' }),
        }),
      ),
    )
    expect(r.body.updated).toBe(1)
    expect(r.body.failed).toHaveLength(1)
    expect(r.body.failed[0].error).toMatch(/can’t be moved|isn’t paid/) // still waiting for payment
    const m = await res(
      await bulkStatusEndpoint.handler(
        fakeReq({
          user: as(users.marketing),
          json: async () => ({ ids: [a.id], status: 'cancelled' }),
        }),
      ),
    )
    expect(m.body.failed[0].error).toMatch(/can’t change/)
  })
})

describe('returns', () => {
  const ask = (o: Order, body: Json) =>
    call(
      returnRequestEndpoint.handler(
        fakeReq({ json: async () => ({ orderNumber: o.orderNumber, t: o.accessToken, ...body }) }),
      ),
    )
  const act = (u: User, id: number, body: Json) =>
    call(
      returnActionEndpoint.handler(
        fakeReq({ user: as(u), routeParams: { id: String(id) }, json: async () => body }),
      ),
    )

  it('only after delivery, not food, not more than bought', async () => {
    const early = await place('cod')
    expect(
      (await ask(early, { items: [{ sku: SKU, qty: 1 }], reason: 'changed-mind' })).status,
    ).toBe(409)
    const o = await delivered([
      { sku: SKU, qty: 2 },
      { sku: CHOC, qty: 1 },
    ])
    expect(
      (await ask(o, { items: [{ sku: CHOC, qty: 1 }], reason: 'changed-mind' })).body.error,
    ).toMatch(/food/)
    expect((await ask(o, { items: [{ sku: SKU, qty: 3 }], reason: 'changed-mind' })).status).toBe(
      400,
    )
    expect(
      (await ask(o, { items: [{ sku: SKU, qty: 1 }], reason: 'damaged' })).body.fields?.details,
    ).toBeTruthy()
    expect(
      (
        await ask(
          { ...o, accessToken: 'nope' },
          { items: [{ sku: SKU, qty: 1 }], reason: 'changed-mind' },
        )
      ).status,
    ).toBe(404)
  })

  it('request → approve → receive (restock) → refund; the order is returned when everything came back', async () => {
    const o = await delivered([{ sku: SKU, qty: 2 }])
    // COD: the courier paid the cash in, so there's money to refund
    await res(
      await orderPaymentEndpoint.handler(
        fakeReq({
          user: as(users.manager),
          routeParams: { id: String(o.id) },
          json: async () => ({ action: 'cash-collected' }),
        }),
      ),
    )
    const r = await ask(o, { items: [{ sku: SKU, qty: 2 }], reason: 'changed-mind' })
    expect(r.status, JSON.stringify(r.body)).toBe(200)
    const ret = (
      await payload.find({
        collection: 'returns',
        where: { returnNumber: { equals: r.body.returnNumber } },
        depth: 0,
        overrideAccess: true,
      })
    ).docs[0]
    expect(ret.items[0].unitRefund).toBe(1500)

    expect((await act(users.marketing, ret.id, { action: 'approve' })).status).toBe(403)
    expect((await act(users.support, ret.id, { action: 'reject' })).status).toBe(400) // needs a note
    expect((await act(users.support, ret.id, { action: 'approve' })).status).toBe(200)
    expect((await act(users.support, ret.id, { action: 'refund' })).status).toBe(403) // refunds: store manager
    const before = await stockOf(SKU)
    expect((await act(users.fulfilment, ret.id, { action: 'receive', restock: true })).status).toBe(
      200,
    )
    expect(await stockOf(SKU)).toBe(before! + 2)
    expect((await reload(o.id)).status).toBe('returned')

    expect((await act(users.manager, ret.id, { action: 'refund' })).body.error).toMatch(
      /bank transfer reference/,
    )
    const ok = await act(users.manager, ret.id, { action: 'refund', reference: 'BOC-889911' })
    expect(ok.status, JSON.stringify(ok.body)).toBe(200)
    const after = await reload(o.id)
    expect(after.refundedTotal).toBe(3000)
    expect(after.paymentStatus).toBe('partially-refunded') // delivery fee kept
    expect(
      (await payload.findByID({ collection: 'returns', id: ret.id, overrideAccess: true })).status,
    ).toBe('refunded')
  })
})

describe('refunds', () => {
  it('a test-gateway card payment is refunded on the test gateway, never above what was paid', async () => {
    const o = await place('payhere')
    await startAttempt(payload, await loadPaymentConfig(payload), o, o.accessToken!)
    await applyGatewayResult(payload, {
      reference: `${o.orderNumber}-P1`,
      result: 'paid',
      amount: o.totals!.total!,
      currency: 'LKR',
      valid: true,
    })
    const refund = (body: Json, u = users.manager) =>
      call(
        orderPaymentEndpoint.handler(
          fakeReq({
            user: as(u),
            routeParams: { id: String(o.id) },
            json: async () => ({ action: 'refund', ...body }),
          }),
        ),
      )
    expect((await refund({ amount: 100, reason: 'out of stock' }, users.support)).status).toBe(403)
    expect((await refund({ amount: o.totals!.total! + 1, reason: 'too much' })).body.error).toMatch(
      /up to/,
    )
    expect((await refund({ amount: o.totals!.total!, reason: 'Item out of stock' })).status).toBe(
      200,
    )
    const after = await reload(o.id)
    expect(after.paymentStatus).toBe('refunded')
    const tx = (
      await payload.find({
        collection: 'transactions',
        where: { and: [{ order: { equals: o.id } }, { kind: { equals: 'refund' } }] },
        overrideAccess: true,
      })
    ).docs[0]
    expect(tx).toMatchObject({ status: 'refunded', simulated: true, amount: o.totals!.total! })
  })

  it('PayHere Refund API: token with App ID and secret, then the refund with the amount', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response(
        JSON.stringify(
          url.endsWith('/oauth/token')
            ? { access_token: 'tok-1' }
            : { status: 1, msg: 'Successfully submitted', data: 160001 },
        ),
      )
    })
    const out = await payhereRefund(
      { mode: 'test', appId: 'app', appSecret: 'sec' },
      '320027',
      100.5,
      'Item is out of stock',
    )
    vi.unstubAllGlobals()
    expect(out).toEqual({ ok: true, ref: '160001' })
    expect(calls[0].url).toBe('https://sandbox.payhere.lk/merchant/v1/oauth/token')
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('app:sec').toString('base64')}`,
    )
    expect(calls[0].init.body).toBe('grant_type=client_credentials')
    expect(calls[1].url).toBe('https://sandbox.payhere.lk/merchant/v1/payment/refund')
    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1')
    expect(JSON.parse(String(calls[1].init.body))).toEqual({
      payment_id: '320027',
      description: 'Item is out of stock',
      amount: '100.50',
    })
  })
})

describe('COD reconciliation', () => {
  it('records a courier payment for delivered COD orders only; store managers only', async () => {
    const a = await delivered()
    const notYet = await place('cod')
    const post = (u: User, body: Json) =>
      call(codRemittanceEndpoint.handler(fakeReq({ user: as(u), json: async () => body })))
    expect((await post(users.support, { ids: [a.id], reference: 'REM-1' })).status).toBe(403)
    expect((await post(users.manager, { ids: [a.id] })).status).toBe(400)
    const r = await post(users.manager, { ids: [a.id, notYet.id], reference: 'KOOMBIYO-REM-77' })
    expect(r.body).toMatchObject({ ok: true, recorded: 1 })
    expect(r.body.skipped).toEqual([notYet.orderNumber])
    const after = await reload(a.id)
    expect(after.paymentStatus).toBe('paid')
    expect(after.codRemittance?.reference).toBe('KOOMBIYO-REM-77')
    expect((await post(users.manager, { ids: [a.id], reference: 'AGAIN' })).body.recorded).toBe(0) // never twice
  })
})
