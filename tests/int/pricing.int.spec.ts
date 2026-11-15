// @vitest-environment node
/**
 * Pricing engine (TOS-504): pure unit tests, no database. AC: at least 20 scenarios.
 */
import { describe, expect, it } from 'vitest'

import { quote, type DeliverySettings, type DiscountRule, type PriceLine } from '@/lib/checkout/pricing'

const delivery: DeliverySettings = {
  freeThreshold: 10000,
  zones: [
    { name: 'Colombo', districts: ['Colombo'], fee: 350, eta: '1–2 working days' },
    { name: 'Western Province', districts: ['Gampaha', 'Kalutara'], fee: 400, eta: '2–3 working days' },
  ],
  fallback: { name: 'Island-wide', fee: 450, eta: '2–4 working days' },
  includedKg: 1,
  perKgFee: 100,
  sameDay: { enabled: true, districts: ['Colombo'], fee: 650, eta: 'Today, by 9 pm' },
}

const line = (sku: string, unitPrice: number, qty = 1, extra: Partial<PriceLine> = {}): PriceLine => ({
  sku,
  productId: Number(sku.replace(/\D/g, '')) || 1,
  name: sku,
  qty,
  unitPrice,
  compareAtPrice: null,
  categoryIds: [10],
  brandId: 100,
  weightGrams: 200,
  ...extra,
})

const rule = (r: Partial<DiscountRule> & Pick<DiscountRule, 'type'>): DiscountRule => ({ id: 1, name: 'Promo', mode: 'automatic', appliesTo: 'all', ...r })
const coupon = (r: Partial<DiscountRule> & Pick<DiscountRule, 'type'>): DiscountRule => ({ id: 99, name: 'Coupon', mode: 'code', code: 'SAVE', appliesTo: 'all', ...r })
const base = { automatic: [] as DiscountRule[], delivery, district: 'Colombo' }

describe('subtotals and delivery', () => {
  it('1. sums lines and adds the Colombo fee', () => {
    const q = quote({ ...base, lines: [line('A1', 1500, 2), line('B2', 900)] })
    expect(q.subtotal).toBe(3900)
    expect(q.delivery.fee).toBe(350)
    expect(q.total).toBe(4250)
  })
  it('2. uses the zone for the district', () => {
    expect(quote({ ...base, district: 'Gampaha', lines: [line('A1', 1000)] }).delivery.fee).toBe(400)
  })
  it('3. falls back to island-wide for other districts', () => {
    const q = quote({ ...base, district: 'Jaffna', lines: [line('A1', 1000)] })
    expect(q.delivery.fee).toBe(450)
    expect(q.delivery.zone).toBe('Island-wide')
  })
  it('4. free delivery at the threshold', () => {
    const q = quote({ ...base, lines: [line('A1', 10000)] })
    expect(q.delivery.fee).toBe(0)
    expect(q.delivery.free).toBe(true)
    expect(q.delivery.baseFee).toBe(350)
  })
  it('5. just under the threshold pays, and shows how much is left', () => {
    const q = quote({ ...base, lines: [line('A1', 9999)] })
    expect(q.delivery.fee).toBe(350)
    expect(q.freeDeliveryRemaining).toBe(1)
  })
  it('6. the threshold applies after discounts', () => {
    const q = quote({ ...base, lines: [line('A1', 10500)], automatic: [rule({ type: 'fixed', value: 1000 })] })
    expect(q.subtotal - q.discountTotal).toBe(9500)
    expect(q.delivery.fee).toBe(350)
  })
  it('7. weight over 1 kg adds Rs 100 per started kg', () => {
    const q = quote({ ...base, lines: [line('A1', 1000, 1, { weightGrams: 2300 })] })
    expect(q.delivery.weightKg).toBe(2.3)
    expect(q.delivery.fee).toBe(350 + 2 * 100)
  })
  it('8. same-day in Colombo before the cut-off is a flat fee, even over the threshold', () => {
    const q = quote({ ...base, method: 'same-day', sameDayOpen: true, lines: [line('A1', 12000)] })
    expect(q.delivery.method).toBe('same-day')
    expect(q.delivery.fee).toBe(650)
  })
  it('9. same-day falls back to standard after the cut-off or outside Colombo', () => {
    expect(quote({ ...base, method: 'same-day', sameDayOpen: false, lines: [line('A1', 2000)] }).delivery.method).toBe('standard')
    expect(quote({ ...base, district: 'Kandy', method: 'same-day', sameDayOpen: true, lines: [line('A1', 2000)] }).delivery.sameDayAvailable).toBe(false)
  })
  it('10. an empty bag costs nothing', () => {
    const q = quote({ ...base, lines: [] })
    expect(q.total).toBe(0)
    expect(q.delivery.fee).toBe(0)
  })
  it('11. gift wrap adds its fee', () => {
    const q = quote({ ...base, giftWrap: true, giftWrapFee: 250, lines: [line('A1', 1000)] })
    expect(q.giftWrapFee).toBe(250)
    expect(q.total).toBe(1000 + 350 + 250)
  })
})

describe('discounts', () => {
  it('12. percent off rounds to the rupee per line', () => {
    const q = quote({ ...base, lines: [line('A1', 1999), line('B2', 999)], automatic: [rule({ type: 'percent', value: 15 })] })
    expect(q.lines.map((l) => l.discount)).toEqual([300, 150]) // 299.85 → 300, 149.85 → 150
    expect(q.discountTotal).toBe(450)
    expect(q.lines.every((l) => Number.isInteger(l.lineTotal))).toBe(true)
  })
  it('13. percent off respects a cap', () => {
    const q = quote({ ...base, lines: [line('A1', 20000)], automatic: [rule({ type: 'percent', value: 20, maxDiscount: 2500 })] })
    expect(q.discountTotal).toBe(2500)
  })
  it('14. fixed amount is split across lines in proportion and never exceeds the subtotal', () => {
    const q = quote({ ...base, lines: [line('A1', 3000), line('B2', 1000)], automatic: [rule({ type: 'fixed', value: 1000 })] })
    expect(q.lines.map((l) => l.discount)).toEqual([750, 250])
    const big = quote({ ...base, lines: [line('A1', 500)], automatic: [rule({ type: 'fixed', value: 2000 })] })
    expect(big.discountTotal).toBe(500)
    expect(big.lines[0].lineTotal).toBe(0)
  })
  it('15. minimum spend', () => {
    const r1 = rule({ type: 'fixed', value: 500, minSpend: 5000 })
    expect(quote({ ...base, lines: [line('A1', 4999)], automatic: [r1] }).discountTotal).toBe(0)
    expect(quote({ ...base, lines: [line('A1', 5000)], automatic: [r1] }).discountTotal).toBe(500)
  })
  it('16. category, brand and product scopes', () => {
    const lines = [line('A1', 1000, 1, { categoryIds: [10], brandId: 100 }), line('B2', 2000, 1, { categoryIds: [20], brandId: 200, productId: 2 })]
    expect(quote({ ...base, lines, automatic: [rule({ type: 'percent', value: 10, appliesTo: 'categories', categoryIds: [20] })] }).lines.map((l) => l.discount)).toEqual([0, 200])
    expect(quote({ ...base, lines, automatic: [rule({ type: 'percent', value: 10, appliesTo: 'brands', brandIds: [100] })] }).lines.map((l) => l.discount)).toEqual([100, 0])
    expect(quote({ ...base, lines, automatic: [rule({ type: 'percent', value: 10, appliesTo: 'products', productIds: [2] })] }).discountTotal).toBe(200)
  })
  it('17. sale items can be excluded', () => {
    const lines = [line('A1', 1000, 1, { compareAtPrice: 1500 }), line('B2', 1000)]
    expect(quote({ ...base, lines, automatic: [rule({ type: 'percent', value: 10, excludeSaleItems: true })] }).lines.map((l) => l.discount)).toEqual([0, 100])
  })
  it('18. buy 2 get 1 free discounts the cheapest unit in each group', () => {
    const q = quote({ ...base, lines: [line('A1', 3000), line('B2', 2000), line('C3', 1000)], automatic: [rule({ type: 'bogo', buyQty: 2, getQty: 1 })] })
    expect(q.discountTotal).toBe(1000)
    expect(q.lines.find((l) => l.sku === 'C3')!.discount).toBe(1000)
  })
  it('19. buy 1 get 1 half price across quantities of one product', () => {
    const q = quote({ ...base, lines: [line('A1', 1200, 4)], automatic: [rule({ type: 'bogo', buyQty: 1, getQty: 1, getPercent: 50 })] })
    expect(q.discountTotal).toBe(1200) // two of four units at half price
  })
  it('20. bogo with too few items gives nothing and says why', () => {
    const q = quote({ ...base, lines: [line('A1', 1200)], automatic: [], coupon: coupon({ type: 'bogo', buyQty: 2, getQty: 1 }) })
    expect(q.discountTotal).toBe(0)
    expect(q.coupon).toMatchObject({ applied: false })
    expect(q.coupon?.message).toMatch(/Add 3 qualifying items/)
  })
  it('21. promotions stack by priority, each on what is left', () => {
    const q = quote({
      ...base,
      lines: [line('A1', 10000)],
      automatic: [rule({ id: 2, name: 'Rs 1,000 off', type: 'fixed', value: 1000, priority: 2 }), rule({ id: 1, name: '10% off', type: 'percent', value: 10, priority: 1 })],
    })
    expect(q.discounts.map((x) => [x.label, x.amount])).toEqual([
      ['10% off', 1000],
      ['Rs 1,000 off', 1000],
    ])
    expect(q.discountTotal).toBe(2000)
  })
  it('22. a combinable coupon adds to the promotion', () => {
    const q = quote({ ...base, lines: [line('A1', 10000)], automatic: [rule({ type: 'percent', value: 10 })], coupon: coupon({ type: 'fixed', value: 500, combinable: true }) })
    expect(q.discountTotal).toBe(1500)
    expect(q.coupon).toMatchObject({ code: 'SAVE', applied: true })
  })
  it('23. a non-combinable coupon replaces a smaller promotion', () => {
    const q = quote({ ...base, lines: [line('A1', 10000)], automatic: [rule({ type: 'percent', value: 5 })], coupon: coupon({ type: 'percent', value: 20, combinable: false }) })
    expect(q.discountTotal).toBe(2000)
    expect(q.discounts).toHaveLength(1)
    expect(q.discounts[0].source).toBe('coupon')
  })
  it('24. a non-combinable coupon is refused when the promotion is better', () => {
    const q = quote({ ...base, lines: [line('A1', 10000)], automatic: [rule({ type: 'percent', value: 25 })], coupon: coupon({ type: 'fixed', value: 1000, combinable: false }) })
    expect(q.discountTotal).toBe(2500)
    expect(q.coupon).toMatchObject({ applied: false })
  })
  it('25. free-delivery coupon removes the standard fee only', () => {
    const lines = [line('A1', 2000)]
    expect(quote({ ...base, lines, coupon: coupon({ type: 'free-shipping' }) }).delivery.fee).toBe(0)
    expect(quote({ ...base, lines, method: 'same-day', sameDayOpen: true, coupon: coupon({ type: 'free-shipping' }) }).delivery.fee).toBe(650)
  })
  it('26. coupon below its minimum spend explains why', () => {
    const q = quote({ ...base, lines: [line('A1', 2000)], coupon: coupon({ type: 'fixed', value: 500, minSpend: 5000 }) })
    expect(q.coupon?.applied).toBe(false)
    expect(q.coupon?.message).toMatch(/Spend Rs 5,000/)
  })
  it('27. totals always add up', () => {
    const q = quote({
      ...base,
      giftWrap: true,
      giftWrapFee: 250,
      lines: [line('A1', 1999, 3), line('B2', 349, 2, { weightGrams: 900 })],
      automatic: [rule({ type: 'percent', value: 12.5 })],
      coupon: coupon({ type: 'fixed', value: 333, combinable: true }),
    })
    expect(q.total).toBe(q.subtotal - q.discountTotal + q.delivery.fee + q.giftWrapFee)
    expect(q.discountTotal).toBe(q.lines.reduce((n, l) => n + l.discount, 0))
    expect(q.discountTotal).toBe(q.discounts.reduce((n, d) => n + d.amount, 0))
  })
})
