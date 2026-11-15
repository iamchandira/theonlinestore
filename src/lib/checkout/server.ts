import type { Payload, PayloadRequest, Where } from 'payload'

import type { CheckoutSetting, Discount, Product } from '@/payload-types'

import { quote, type DeliverySettings, type DiscountRule, type PriceLine, type Quote } from './pricing'

/**
 * Checkout service (Sprint 4): turns { sku, qty } pairs into a server-priced quote using current
 * prices and stock, the active promotions and an optional coupon. Used by the quote, place-order
 * and bag-sync endpoints, so the shopper always sees the same numbers the order will be saved with.
 */

export type BagItem = { sku: string; qty: number }

/** What the bag/checkout UI shows for a line (snapshot of current product data). */
export type LineView = {
  sku: string
  slug: string
  productId: number
  name: string
  brand: string
  category: string
  image: string
  option: string
  label: string
  multi: boolean
  price: number
  compareAtPrice: number | null
  stock: number
  qty: number
}

export type Issue = { sku: string; message: string }

const ORIGIN = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const rel = (u?: string | null) => (u ? (u.startsWith(ORIGIN()) ? u.slice(ORIGIN().length) : u) : '')
const DEFAULT_WEIGHT_G = 300

/* ---------------------------------------------------------------- settings */

export type CheckoutConfig = {
  delivery: DeliverySettings
  cutoffHour: number
  giftWrapFee: number
  termsVersion: string
  cod: { enabled: boolean; maxOrder: number; fee: number }
  bankTransfer: { enabled: boolean; instructions: string; holdHours: number }
}

export async function loadCheckoutConfig(payload: Payload, req?: Partial<PayloadRequest>): Promise<CheckoutConfig> {
  const s = (await payload.findGlobal({ slug: 'checkout-settings', depth: 0, overrideAccess: true, req })) as CheckoutSetting
  return {
    delivery: {
      freeThreshold: s.freeThreshold ?? 10000,
      zones: (s.zones ?? []).map((z) => ({ name: z.name, districts: (z.districts ?? []) as string[], fee: z.fee, eta: z.eta })),
      fallback: { name: 'Island-wide', fee: s.fallbackFee ?? 450, eta: s.fallbackEta ?? '2–4 working days' },
      includedKg: s.includedKg ?? 1,
      perKgFee: s.perKgFee ?? 100,
      sameDay: {
        enabled: Boolean(s.sameDay?.enabled ?? true),
        districts: (s.sameDay?.districts ?? ['Colombo']) as string[],
        fee: s.sameDay?.fee ?? 650,
        eta: s.sameDay?.eta ?? 'Today, by 9 pm',
      },
    },
    cutoffHour: s.sameDay?.cutoffHour ?? 12,
    giftWrapFee: s.giftWrapFee ?? 250,
    termsVersion: s.termsVersion ?? '2026-11',
    cod: { enabled: Boolean(s.cod?.enabled ?? true), maxOrder: s.cod?.maxOrder ?? 50000, fee: s.cod?.fee ?? 0 },
    bankTransfer: { enabled: Boolean(s.bankTransfer?.enabled ?? true), instructions: s.bankTransfer?.instructions ?? '', holdHours: s.bankTransfer?.holdHours ?? 48 },
  }
}

/** Same-day orders must be in before the cut-off (Sri Lanka time), Monday to Saturday. */
export function sameDayOpen(cutoffHour: number, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', hour: 'numeric', hour12: false, weekday: 'short' }).formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const day = parts.find((p) => p.type === 'weekday')?.value
  return day !== 'Sun' && hour < cutoffHour
}

/* ------------------------------------------------------------------- lines */

export async function loadLines(payload: Payload, items: BagItem[], req?: Partial<PayloadRequest>) {
  const wanted = new Map<string, number>()
  for (const i of items) if (i?.sku && Number(i.qty) > 0) wanted.set(String(i.sku), Math.min(99, (wanted.get(String(i.sku)) ?? 0) + Math.floor(Number(i.qty))))
  const skus = [...wanted.keys()].slice(0, 60)
  const issues: Issue[] = []
  if (!skus.length) return { priceLines: [] as PriceLine[], views: [] as LineView[], issues }

  const res = await payload.find({
    collection: 'products',
    where: { and: [{ 'variants.sku': { in: skus } }, { _status: { equals: 'published' } }] },
    limit: 0,
    pagination: false,
    depth: 1,
    overrideAccess: true,
    req,
  })
  const priceLines: PriceLine[] = []
  const views: LineView[] = []
  for (const sku of skus) {
    const p = res.docs.find((d) => d.variants?.some((v) => v.sku === sku)) as Product | undefined
    const v = p?.variants?.find((x) => x.sku === sku)
    if (!p || !v) {
      issues.push({ sku, message: 'This item is no longer available and was removed from your bag.' })
      continue
    }
    const stock = Math.max(0, v.stock ?? 0)
    let qty = wanted.get(sku)!
    if (stock <= 0) {
      issues.push({ sku, message: `${p.name}${v.label ? ` (${v.label})` : ''} just sold out and was removed from your bag.` })
      continue
    }
    if (qty > stock) {
      issues.push({ sku, message: `Only ${stock} left of ${p.name}${v.label ? ` (${v.label})` : ''}. We’ve updated the quantity.` })
      qty = stock
    }
    const brand = p.brand && typeof p.brand === 'object' ? p.brand : null
    const cats = (p.categories ?? []).map((c) => (typeof c === 'object' && c ? c : null)).filter(Boolean) as { id: number; slug?: string | null; breadcrumbs?: { url?: string | null }[] | null }[]
    const img = v.image && typeof v.image === 'object' ? v.image : null
    priceLines.push({
      sku,
      productId: p.id,
      name: p.name,
      qty,
      unitPrice: Math.round(v.price),
      compareAtPrice: v.compareAtPrice ?? null,
      categoryIds: cats.map((c) => c.id),
      brandId: brand?.id ?? null,
      weightGrams: v.weight ?? DEFAULT_WEIGHT_G,
    })
    views.push({
      sku,
      slug: p.slug ?? '',
      productId: p.id,
      name: p.name,
      brand: brand?.name ?? '',
      category: (cats[0]?.breadcrumbs?.[0]?.url ?? '').replace(/^\//, '').split('/')[0] || 'skincare',
      image: rel(img?.sizes?.card?.url) || rel(img?.url),
      option: p.option2Name ? `${p.optionName ?? 'Size'} / ${p.option2Name}` : (p.optionName ?? 'Size'),
      label: [v.label, v.option2].filter(Boolean).join(' / '),
      multi: (p.variants?.length ?? 0) > 1,
      price: Math.round(v.price),
      compareAtPrice: v.compareAtPrice ?? null,
      stock,
      qty,
    })
  }
  return { priceLines, views, issues }
}

/* --------------------------------------------------------------- discounts */

async function categoryDescendants(payload: Payload) {
  const { docs } = await payload.find({ collection: 'categories', limit: 0, pagination: false, depth: 0, overrideAccess: true, select: { parent: true } })
  const children = new Map<number, number[]>()
  for (const c of docs) {
    const parent = typeof c.parent === 'object' && c.parent ? c.parent.id : (c.parent as number | null)
    if (parent) children.set(parent, [...(children.get(parent) ?? []), c.id])
  }
  return (ids: number[]) => {
    const out = new Set<number>()
    const walk = (id: number) => {
      if (out.has(id)) return
      out.add(id)
      for (const k of children.get(id) ?? []) walk(k)
    }
    ids.forEach(walk)
    return [...out]
  }
}

const idsOf = (list: unknown) => ((list as unknown[]) ?? []).map((x) => (typeof x === 'object' && x ? (x as { id: number }).id : (x as number)))

async function toRule(payload: Payload, d: Discount): Promise<DiscountRule> {
  const expand = d.appliesTo === 'categories' ? await categoryDescendants(payload) : null
  return {
    id: d.id,
    name: d.name,
    mode: d.mode,
    code: d.code,
    type: d.type,
    value: d.value,
    maxDiscount: d.maxDiscount,
    minSpend: d.minSpend,
    appliesTo: d.appliesTo,
    productIds: idsOf(d.products),
    categoryIds: expand ? expand(idsOf(d.categories)) : [],
    brandIds: idsOf(d.brands),
    excludeSaleItems: Boolean(d.excludeSaleItems),
    buyQty: d.buyQty,
    getQty: d.getQty,
    getPercent: d.getPercent,
    combinable: Boolean(d.combinable),
    priority: d.priority ?? 10,
  }
}

const liveNow = (now: Date): Where => ({
  and: [
    { active: { equals: true } },
    { or: [{ startsAt: { exists: false } }, { startsAt: { less_than_equal: now.toISOString() } }] },
    { or: [{ endsAt: { exists: false } }, { endsAt: { greater_than: now.toISOString() } }] },
  ],
})

export async function loadAutomatic(payload: Payload, customer: { isFirstOrder: boolean }, req?: Partial<PayloadRequest>) {
  const { docs } = await payload.find({ collection: 'discounts', where: { and: [liveNow(new Date()), { mode: { equals: 'automatic' } }] }, limit: 50, depth: 0, overrideAccess: true, req })
  return Promise.all(docs.filter((d) => !d.firstOrderOnly || customer.isFirstOrder).map((d) => toRule(payload, d)))
}

/** Finds a coupon and checks dates and limits for this shopper. */
export async function loadCoupon(
  payload: Payload,
  code: string,
  shopper: { email?: string | null; phone?: string | null; userId?: number | null; isFirstOrder: boolean },
  req?: Partial<PayloadRequest>,
): Promise<{ rule: DiscountRule; doc: Discount } | { error: string }> {
  const clean = code.trim().toUpperCase().replace(/\s+/g, '')
  if (!/^[A-Z0-9_-]{3,30}$/.test(clean)) return { error: 'That code doesn’t look right.' }
  const { docs } = await payload.find({ collection: 'discounts', where: { and: [{ code: { equals: clean } }, { mode: { equals: 'code' } }] }, limit: 1, depth: 0, overrideAccess: true, req })
  const d = docs[0]
  const now = new Date()
  if (!d || !d.active) return { error: `We couldn’t find the code ${clean}.` }
  if (d.startsAt && new Date(d.startsAt) > now) return { error: `${clean} isn’t active yet.` }
  if (d.endsAt && new Date(d.endsAt) <= now) return { error: `${clean} has expired.` }
  if (d.usageLimit && (d.usedCount ?? 0) >= d.usageLimit) return { error: `${clean} has been fully used.` }
  if (d.firstOrderOnly && !shopper.isFirstOrder) return { error: `${clean} is for first orders only.` }
  if (d.usagePerCustomer && (shopper.email || shopper.phone || shopper.userId)) {
    const who: Where[] = []
    if (shopper.email) who.push({ 'contact.email': { equals: shopper.email.toLowerCase() } })
    if (shopper.phone) who.push({ 'contact.phone': { equals: shopper.phone } })
    if (shopper.userId) who.push({ customer: { equals: shopper.userId } })
    const used = await payload.count({ collection: 'orders', where: { and: [{ coupon: { equals: d.id } }, { status: { not_in: ['cancelled'] } }, { or: who }] }, overrideAccess: true, req })
    if (used.totalDocs >= d.usagePerCustomer) return { error: `You’ve already used ${clean}.` }
  }
  return { rule: await toRule(payload, d), doc: d }
}

/** Has this shopper (by account, email or phone) ordered before? */
export async function isFirstOrder(payload: Payload, shopper: { email?: string | null; phone?: string | null; userId?: number | null }, req?: Partial<PayloadRequest>) {
  const who: Where[] = []
  if (shopper.email) who.push({ 'contact.email': { equals: shopper.email.toLowerCase() } })
  if (shopper.phone) who.push({ 'contact.phone': { equals: shopper.phone } })
  if (shopper.userId) who.push({ customer: { equals: shopper.userId } })
  if (!who.length) return true
  const n = await payload.count({ collection: 'orders', where: { and: [{ status: { not_in: ['cancelled'] } }, { or: who }] }, overrideAccess: true, req })
  return n.totalDocs === 0
}

/* ------------------------------------------------------------------- quote */

export type CheckoutQuoteInput = {
  items: BagItem[]
  district?: string | null
  method?: 'standard' | 'same-day'
  couponCode?: string | null
  giftWrap?: boolean
  payment?: 'cod' | 'bank-transfer' | null
  shopper: { email?: string | null; phone?: string | null; userId?: number | null }
}

export type PaymentOption = { id: 'cod' | 'bank-transfer'; label: string; available: boolean; note?: string; fee: number }

export type CheckoutQuote = {
  quote: Quote
  views: LineView[]
  issues: Issue[]
  couponError: string | null
  couponDoc: Discount | null
  payments: PaymentOption[]
  /** Cash-on-delivery fee included in quote.total (0 unless COD is chosen and has a fee) */
  codFee: number
  config: CheckoutConfig
}

export async function quoteCheckout(payload: Payload, input: CheckoutQuoteInput, req?: Partial<PayloadRequest>): Promise<CheckoutQuote> {
  const config = await loadCheckoutConfig(payload, req)
  const [{ priceLines, views, issues }, first] = await Promise.all([loadLines(payload, input.items, req), isFirstOrder(payload, input.shopper, req)])
  const automatic = await loadAutomatic(payload, { isFirstOrder: first }, req)
  let couponRule: DiscountRule | null = null
  let couponDoc: Discount | null = null
  let couponError: string | null = null
  if (input.couponCode) {
    const c = await loadCoupon(payload, input.couponCode, { ...input.shopper, isFirstOrder: first }, req)
    if ('error' in c) couponError = c.error
    else {
      couponRule = c.rule
      couponDoc = c.doc
    }
  }
  const q = quote({
    lines: priceLines,
    district: input.district,
    method: input.method,
    sameDayOpen: sameDayOpen(config.cutoffHour),
    automatic,
    coupon: couponRule,
    delivery: config.delivery,
    giftWrap: input.giftWrap,
    giftWrapFee: config.giftWrapFee,
  })
  if (couponRule && q.coupon && !q.coupon.applied) couponError = q.coupon.message ?? 'This code can’t be used on this order.'

  // Cash on delivery: fee and order limit; bank transfer: always available when enabled
  const codFee = config.cod.fee
  const payments: PaymentOption[] = [
    {
      id: 'cod',
      label: 'Cash on delivery',
      available: config.cod.enabled && q.total + codFee <= config.cod.maxOrder,
      note: !config.cod.enabled ? 'Not available right now' : q.total + codFee > config.cod.maxOrder ? `Available on orders up to Rs ${config.cod.maxOrder.toLocaleString('en-LK')}` : 'Pay the courier in cash or by card when it arrives',
      fee: codFee,
    },
    { id: 'bank-transfer', label: 'Bank transfer', available: config.bankTransfer.enabled, note: config.bankTransfer.enabled ? 'We’ll send our bank details. Your order ships once the payment is in.' : 'Not available right now', fee: 0 },
  ]
  const appliedCodFee = input.payment === 'cod' && codFee && payments[0].available ? codFee : 0
  q.total += appliedCodFee
  return { quote: q, views, issues, couponError, couponDoc, payments, codFee: appliedCodFee, config }
}
