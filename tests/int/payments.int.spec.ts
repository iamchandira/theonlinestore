// @vitest-environment node
/**
 * Payments (Sprint 5): PayHere signing, the gateway result rules (signature, amount, idempotency),
 * the PayHere notify endpoint, unpaid-order release, bank slips with staff verification, payment
 * options (limits, COD districts) and who can see payment data.
 * Creates its own product, users and orders, and removes them afterwards.
 */
import { createHash } from 'node:crypto'

import config from '@/payload.config'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { placeEndpoint } from '@/endpoints/checkout'
import {
  orderPaymentEndpoint,
  paymentNotifyEndpoints,
  slipUploadEndpoint,
} from '@/endpoints/payments'
import { paymentOptions } from '@/lib/checkout/server'
import { loadPaymentConfig } from '@/lib/payments/config'
import {
  parsePayhereNotify,
  payhereAmount,
  payhereHash,
  payhereNotifySig,
} from '@/lib/payments/payhere'
import { applyGatewayResult, releaseUnpaidOrders, startAttempt } from '@/lib/payments/service'
import type { Order, User } from '@/payload-types'

let payload: Payload
let admin: User
let productId: number
let categoryId: number
const stamp = Date.now()
const SKU = `PAY-${stamp}`
const users = {} as Record<'manager' | 'marketing' | 'plainAdmin', User>
const orderIds: number[] = []
let ip = 0
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>

const md5 = (s: string) => createHash('md5').update(s).digest('hex').toUpperCase()
const fakeReq = (extra: Partial<PayloadRequest> & Json): PayloadRequest =>
  ({
    payload,
    user: null,
    headers: new Headers({ 'x-real-ip': `10.55.${Math.floor(++ip / 250)}.${ip % 250}` }),
    ...extra,
  }) as unknown as PayloadRequest
const json = async (res: Response) => ({
  status: res.status,
  body: (await res.json().catch(() => ({}))) as Json,
})

async function place(payment: string, qty = 1) {
  const r = await json(
    (await placeEndpoint.handler(
      fakeReq({
        json: async () => ({
          items: [{ sku: SKU, qty }],
          payment,
          acceptTerms: true,
          contact: {
            fullName: 'Pay Test',
            email: `pay-${stamp}@example.test`,
            phone: `07${String(stamp).slice(-8)}`,
          },
          address: { line1: '1 Test Road', city: 'Kandy', district: 'Kandy' },
        }),
      }),
    )) as Response,
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
  return { order: o, redirect: r.body.redirect as string }
}
const reload = async (id: number) =>
  (await payload.findByID({
    collection: 'orders',
    id,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })) as Order
const stock = async () =>
  (
    await payload.findByID({
      collection: 'products',
      id: productId,
      depth: 0,
      overrideAccess: true,
    })
  ).variants?.[0]?.stock

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
      data: { name: `Pay Cat ${stamp}`, slug: `pay-cat-${stamp}`, generateSlug: false },
      user: admin,
      context: { disableRevalidate: true },
    })
  ).id
  productId = (
    await payload.create({
      collection: 'products',
      data: {
        name: `Pay Test ${stamp}`,
        slug: `pay-test-${stamp}`,
        generateSlug: false,
        brand: brand.id,
        categories: [categoryId],
        optionName: 'Size',
        variants: [{ label: 'One', sku: SKU, price: 2000, cost: 800, stock: 20 }],
        _status: 'published',
      },
      user: admin,
      context: { disableRevalidate: true },
    } as never)
  ).id
  for (const [key, role] of [
    ['manager', 'store-manager'],
    ['marketing', 'marketing'],
    ['plainAdmin', 'admin'],
  ] as const) {
    users[key] = (await payload.create({
      collection: 'users',
      data: {
        email: `pay-${key}-${stamp}@example.test`,
        password: `Pw-${stamp}-x!`,
        roles: [role],
        _verified: true,
      } as never,
      user: admin,
    })) as User
  }
})

afterAll(async () => {
  delete process.env.PAYHERE_MERCHANT_ID
  delete process.env.PAYHERE_MERCHANT_SECRET
  for (const id of orderIds) {
    await payload
      .delete({
        collection: 'transactions',
        where: { order: { equals: id } },
        overrideAccess: true,
      })
      .catch(() => {})
    await payload
      .delete({
        collection: 'payment-slips',
        where: { order: { equals: id } },
        overrideAccess: true,
      })
      .catch(() => {})
    await payload.delete({ collection: 'orders', id, overrideAccess: true }).catch(() => {})
  }
  await payload
    .delete({
      collection: 'stock-movements',
      where: { product: { equals: productId } },
      overrideAccess: true,
    })
    .catch(() => {})
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

describe('PayHere signing (published formulas)', () => {
  it('request hash and notify signature', () => {
    expect(payhereAmount(1234.5)).toBe('1234.50')
    expect(payhereHash('1211149', 'ORD-1', 1000, 'LKR', 'secret')).toBe(
      md5('1211149' + 'ORD-1' + '1000.00' + 'LKR' + md5('secret')),
    )
    const f = {
      merchant_id: '1211149',
      order_id: 'ORD-1',
      payhere_amount: '1000.00',
      payhere_currency: 'LKR',
      status_code: '2',
    }
    const sig = payhereNotifySig(f, 'secret')
    expect(sig).toBe(md5('1211149ORD-11000.00LKR2' + md5('secret')))
    expect(parsePayhereNotify({ ...f, md5sig: sig }, '1211149', 'secret')).toMatchObject({
      valid: true,
      result: 'paid',
      amount: 1000,
    })
    expect(parsePayhereNotify({ ...f, md5sig: sig }, '1211149', 'other-secret').valid).toBe(false)
    expect(parsePayhereNotify({ ...f, md5sig: sig }, '9999999', 'secret').valid).toBe(false)
    expect(
      parsePayhereNotify(
        {
          ...f,
          status_code: '-2',
          md5sig: payhereNotifySig({ ...f, status_code: '-2' }, 'secret'),
        },
        '1211149',
        'secret',
      ).result,
    ).toBe('failed')
  })
})

describe('payment options', () => {
  it('limits, instalments and COD districts', async () => {
    const cfg = await loadPaymentConfig(payload)
    cfg.cod.excludedDistricts = ['Jaffna']
    const ids = (o: ReturnType<typeof paymentOptions>) =>
      Object.fromEntries(o.map((p) => [p.id, p.available]))
    expect(ids(paymentOptions(cfg, 5000, 'Kandy'))).toMatchObject({
      payhere: true,
      koko: true,
      mintpay: true,
      cod: true,
      'bank-transfer': true,
    })
    expect(ids(paymentOptions(cfg, 500, 'Kandy'))).toMatchObject({ koko: false, mintpay: false }) // under the Rs 1,000 minimum
    expect(ids(paymentOptions(cfg, 60000, 'Kandy'))).toMatchObject({ cod: false, koko: true })
    expect(ids(paymentOptions(cfg, 5000, 'Jaffna'))).toMatchObject({ cod: false })
    expect(paymentOptions(cfg, 3000, null).find((p) => p.id === 'koko')?.instalment).toBe(1000)
    cfg.methods.mintpay.enabled = false
    expect(paymentOptions(cfg, 3000, null).some((p) => p.id === 'mintpay')).toBe(false)
  })
})

describe('online payment results', () => {
  let order: Order
  let reference: string
  it('placing a card order holds stock, sets a pay-by time and sends the shopper to pay', async () => {
    const before = await stock()
    const r = await place('payhere')
    order = r.order
    expect(r.redirect).toMatch(new RegExp(`^/checkout/pay/${order.orderNumber}\\?t=`))
    expect(order.status).toBe('pending-payment')
    expect(order.paymentStatus).toBe('unpaid')
    expect(new Date(order.paymentDueAt!).getTime()).toBeGreaterThan(Date.now() + 50 * 60_000)
    expect(await stock()).toBe((before ?? 0) - 1)
  })
  it('without credentials the test gateway is used', async () => {
    const launch = await startAttempt(
      payload,
      await loadPaymentConfig(payload),
      order,
      order.accessToken!,
    )
    expect(launch).toMatchObject({ kind: 'redirect' })
    expect((launch as { url: string }).url).toContain('/checkout/pay/test-gateway?ref=')
    reference = `${order.orderNumber}-P1`
  })
  it('a bad signature changes nothing', async () => {
    const out = await applyGatewayResult(payload, {
      reference,
      result: 'paid',
      amount: order.totals!.total!,
      currency: 'LKR',
      valid: false,
    })
    expect(out).toMatchObject({ ok: false, reason: 'bad-signature' })
    expect((await reload(order.id)).paymentStatus).toBe('unpaid')
  })
  it('a declined payment can be retried', async () => {
    await applyGatewayResult(payload, {
      reference,
      result: 'failed',
      amount: order.totals!.total!,
      currency: 'LKR',
      valid: true,
    })
    expect((await reload(order.id)).paymentStatus).toBe('failed')
  })
  it('a confirmed payment marks the order paid, once', async () => {
    const out = await applyGatewayResult(payload, {
      reference,
      result: 'paid',
      amount: order.totals!.total!,
      currency: 'LKR',
      valid: true,
      providerRef: 'PH-1',
    })
    expect(out).toMatchObject({ ok: true, newlyPaid: true })
    const o = await reload(order.id)
    expect(o.paymentStatus).toBe('paid')
    expect(o.status).toBe('processing')
    expect(o.paidAt).toBeTruthy()
    const again = await applyGatewayResult(payload, {
      reference,
      result: 'paid',
      amount: order.totals!.total!,
      currency: 'LKR',
      valid: true,
    })
    expect(again).toMatchObject({ ok: true, reason: 'already-paid' })
    await applyGatewayResult(payload, {
      reference,
      result: 'failed',
      amount: order.totals!.total!,
      currency: 'LKR',
      valid: true,
    })
    expect((await reload(order.id)).paymentStatus).toBe('paid') // a late failure never un-pays
  })
  it('a wrong amount is refused and the order is put on hold', async () => {
    const { order: o2 } = await place('payhere')
    await startAttempt(payload, await loadPaymentConfig(payload), o2, o2.accessToken!)
    const out = await applyGatewayResult(payload, {
      reference: `${o2.orderNumber}-P1`,
      result: 'paid',
      amount: 1,
      currency: 'LKR',
      valid: true,
    })
    expect(out).toMatchObject({ ok: false, reason: 'amount-mismatch' })
    const after = await reload(o2.id)
    expect(after.paymentStatus).not.toBe('paid')
    expect(after.status).toBe('on-hold')
  })
})

describe('PayHere with credentials', () => {
  it('builds a signed checkout form and accepts a signed notification', async () => {
    process.env.PAYHERE_MERCHANT_ID = '1211149'
    process.env.PAYHERE_MERCHANT_SECRET = 'test-secret-123'
    const { order } = await place('payhere')
    const launch = (await startAttempt(
      payload,
      await loadPaymentConfig(payload),
      order,
      order.accessToken!,
    )) as { kind: string; action: string; fields: Record<string, string> }
    expect(launch.kind).toBe('form')
    expect(launch.action).toBe('https://sandbox.payhere.lk/pay/checkout')
    const total = order.totals!.total!
    expect(launch.fields).toMatchObject({
      merchant_id: '1211149',
      order_id: `${order.orderNumber}-P1`,
      currency: 'LKR',
      amount: payhereAmount(total),
      country: 'Sri Lanka',
    })
    expect(launch.fields.hash).toBe(
      payhereHash('1211149', `${order.orderNumber}-P1`, total, 'LKR', 'test-secret-123'),
    )

    const f = {
      merchant_id: '1211149',
      order_id: `${order.orderNumber}-P1`,
      payhere_amount: payhereAmount(total),
      payhere_currency: 'LKR',
      status_code: '2',
    }
    const notify = async (body: Record<string, string>) =>
      (await paymentNotifyEndpoints[0].handler(
        fakeReq({ text: async () => new URLSearchParams(body).toString() }),
      )) as Response
    const forged = await notify({ ...f, md5sig: 'ABC', payment_id: '320001' })
    expect(forged.status).toBe(400)
    expect((await reload(order.id)).paymentStatus).toBe('unpaid')
    const good = await notify({
      ...f,
      md5sig: payhereNotifySig(f, 'test-secret-123'),
      payment_id: '320001',
      card_no: '************1292',
    })
    expect(good.status).toBe(200)
    expect((await reload(order.id)).paymentStatus).toBe('paid')
    const tx = (
      await payload.find({
        collection: 'transactions',
        where: { reference: { equals: f.order_id } },
        overrideAccess: true,
      })
    ).docs[0]
    expect(tx.providerRef).toBe('320001')
    expect(JSON.stringify(tx.events)).not.toContain('1292') // card details are never stored
    delete process.env.PAYHERE_MERCHANT_ID
    delete process.env.PAYHERE_MERCHANT_SECRET
  })
})

describe('unpaid orders', () => {
  it('are cancelled after their pay-by time and the stock comes back; slips waiting are kept', async () => {
    const { order: unpaid } = await place('bank-transfer', 2)
    const { order: withSlip } = await place('bank-transfer', 1)
    const past = new Date(Date.now() - 60_000).toISOString()
    await payload.update({
      collection: 'orders',
      id: unpaid.id,
      data: { paymentDueAt: past },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'orders',
      id: withSlip.id,
      data: { paymentDueAt: past, paymentStatus: 'slip-uploaded' },
      overrideAccess: true,
    })
    const before = await stock()
    await releaseUnpaidOrders(payload)
    expect((await reload(unpaid.id)).status).toBe('cancelled')
    expect((await reload(withSlip.id)).status).toBe('pending-payment')
    expect(await stock()).toBe((before ?? 0) + 2)
  })
})

describe('bank slips', () => {
  let order: Order
  const upload = async (o: Order, token: string, file: File) => {
    const fd = new FormData()
    fd.set('orderNumber', o.orderNumber)
    fd.set('t', token)
    fd.set('file', file)
    return json(
      (await slipUploadEndpoint.handler(fakeReq({ formData: async () => fd }))) as Response,
    )
  }
  const act = async (user: User, o: Order, body: Json) =>
    json(
      (await orderPaymentEndpoint.handler(
        fakeReq({
          user: { ...user, collection: 'users' },
          routeParams: { id: String(o.id) },
          json: async () => body,
        }),
      )) as Response,
    )
  // 1×1 PNG
  const png = () =>
    new File(
      [
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          'base64',
        ),
      ],
      'slip.png',
      { type: 'image/png' },
    )

  it('the shopper uploads a slip with the private link only', async () => {
    order = (await place('bank-transfer')).order
    expect((await upload(order, 'wrong', png())).status).toBe(404)
    expect(
      (await upload(order, order.accessToken!, new File(['x'], 'a.txt', { type: 'text/plain' })))
        .status,
    ).toBe(400)
    const ok = await upload(order, order.accessToken!, png())
    expect(ok.status, JSON.stringify(ok.body)).toBe(200)
    expect((await reload(order.id)).paymentStatus).toBe('slip-uploaded')
  })
  it('only payment roles verify; rejecting needs a reason; verifying pays the order', async () => {
    const slip = (
      await payload.find({
        collection: 'payment-slips',
        where: { order: { equals: order.id } },
        overrideAccess: true,
      })
    ).docs[0]
    expect(
      (await act(users.marketing, order, { action: 'verify-slip', slipId: slip.id })).status,
    ).toBe(403)
    expect(
      (await act(users.manager, order, { action: 'reject-slip', slipId: slip.id })).status,
    ).toBe(400)
    const v = await act(users.manager, order, { action: 'verify-slip', slipId: slip.id })
    expect(v.status, JSON.stringify(v.body)).toBe(200)
    const o = await reload(order.id)
    expect(o.paymentStatus).toBe('paid')
    expect(o.status).toBe('processing')
    expect(
      (await act(users.manager, order, { action: 'verify-slip', slipId: slip.id })).status,
    ).toBe(409)
  })
  it('cash collected is recorded for COD orders only', async () => {
    const { order: cod } = await place('cod')
    expect((await act(users.manager, order, { action: 'cash-collected' })).status).toBe(409) // already paid
    const r = await act(users.manager, cod, { action: 'cash-collected' })
    expect(r.status).toBe(200)
    expect((await reload(cod.id)).paymentStatus).toBe('paid')
  })
})

describe('who sees payment data', () => {
  it('transactions: store manager and support (and admins); not marketing', async () => {
    const can = async (u: User) =>
      payload.find({ collection: 'transactions', limit: 1, user: u, overrideAccess: false }).then(
        () => true,
        () => false,
      )
    expect(await can(users.manager)).toBe(true)
    expect(await can(users.marketing)).toBe(false)
  })
  it('gateway secrets are readable by Super Admins only', async () => {
    await payload.updateGlobal({
      slug: 'payment-settings',
      data: { payhere: { merchantSecret: 'stored-secret' } } as never,
      overrideAccess: true,
    })
    const asAdmin = await payload.findGlobal({
      slug: 'payment-settings',
      user: users.plainAdmin,
      overrideAccess: false,
    })
    expect(asAdmin.payhere?.merchantSecret).toBeUndefined()
    const asSuper = await payload.findGlobal({
      slug: 'payment-settings',
      user: admin,
      overrideAccess: false,
    })
    expect(asSuper.payhere?.merchantSecret).toBe('stored-secret')
    await expect(
      payload.findGlobal({
        slug: 'payment-settings',
        user: users.marketing,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await payload.updateGlobal({
      slug: 'payment-settings',
      data: { payhere: { merchantSecret: '' } } as never,
      overrideAccess: true,
    })
  })
})
