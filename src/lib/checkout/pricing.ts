/**
 * Pricing engine (TOS-504). Pure and deterministic: the server feeds it current prices from the
 * database and it returns every total. The browser never decides a price.
 *
 * Order of operations:
 *   1. Line subtotals (unit price × quantity; unit prices are whole rupees)
 *   2. Automatic promotions, by priority, each on what's left of the eligible lines
 *   3. One coupon. If it can't combine with promotions, the better of "promotions" or "coupon" wins
 *   4. Delivery: zone fee + weight surcharge; free over the threshold (after discounts) or with a
 *      free-delivery coupon; same-day is a flat fee and is never free
 *   5. Gift wrap fee
 * Discounts are rounded to the rupee per line, so every line and total is a whole number.
 */

export type PriceLine = {
  sku: string
  productId: number
  name: string
  qty: number
  unitPrice: number
  compareAtPrice: number | null
  categoryIds: number[]
  brandId: number | null
  /** Per unit, grams */
  weightGrams: number
}

export type DiscountRule = {
  id: number
  name: string
  /** Shoppers type `code`; automatic rules apply by themselves */
  mode: 'automatic' | 'code'
  code?: string | null
  type: 'percent' | 'fixed' | 'free-shipping' | 'bogo'
  /** percent: 1–100; fixed: rupees */
  value?: number | null
  /** Cap for percent discounts (rupees) */
  maxDiscount?: number | null
  /** Order subtotal needed before the rule applies (rupees) */
  minSpend?: number | null
  appliesTo: 'all' | 'products' | 'categories' | 'brands'
  productIds?: number[]
  categoryIds?: number[]
  brandIds?: number[]
  excludeSaleItems?: boolean
  /** bogo: buy `buyQty`, get `getQty` at `getPercent`% off (100 = free); the cheapest units are discounted */
  buyQty?: number | null
  getQty?: number | null
  getPercent?: number | null
  /** Coupons only: may it apply on top of automatic promotions? */
  combinable?: boolean
  priority?: number
}

export type DeliveryZone = { name: string; districts: string[]; fee: number; eta: string }
export type DeliverySettings = {
  freeThreshold: number
  zones: DeliveryZone[]
  /** Used when a district isn't in any zone */
  fallback: { name: string; fee: number; eta: string }
  /** Weight included in the zone fee; each extra (started) kg costs perKgFee */
  includedKg: number
  perKgFee: number
  sameDay: { enabled: boolean; districts: string[]; fee: number; eta: string }
}

export type QuoteInput = {
  lines: PriceLine[]
  district?: string | null
  method?: 'standard' | 'same-day'
  /** Is same-day still possible right now (cut-off time)? Decided by the server clock. */
  sameDayOpen?: boolean
  automatic: DiscountRule[]
  coupon?: DiscountRule | null
  delivery: DeliverySettings
  giftWrap?: boolean
  giftWrapFee?: number
}

export type QuoteLine = PriceLine & { lineSubtotal: number; discount: number; lineTotal: number }
export type DiscountLine = { label: string; amount: number; source: 'automatic' | 'coupon'; ruleId: number; code?: string | null; freeDelivery?: boolean }
export type Quote = {
  lines: QuoteLine[]
  subtotal: number
  discounts: DiscountLine[]
  discountTotal: number
  delivery: {
    method: 'standard' | 'same-day'
    zone: string
    fee: number
    /** What delivery would have cost (shown struck through when free) */
    baseFee: number
    free: boolean
    eta: string
    sameDayAvailable: boolean
    sameDayFee: number
    weightKg: number
  }
  freeDeliveryRemaining: number
  giftWrapFee: number
  total: number
  coupon: { code: string; applied: boolean; message?: string } | null
}

const r = (n: number) => Math.round(n)

/* ------------------------------------------------------------- eligibility */

function eligible(rule: DiscountRule, line: PriceLine) {
  if (rule.excludeSaleItems && line.compareAtPrice && line.compareAtPrice > line.unitPrice) return false
  switch (rule.appliesTo) {
    case 'products':
      return (rule.productIds ?? []).includes(line.productId)
    case 'categories':
      return line.categoryIds.some((c) => (rule.categoryIds ?? []).includes(c))
    case 'brands':
      return line.brandId != null && (rule.brandIds ?? []).includes(line.brandId)
    default:
      return true
  }
}

/** Splits `amount` across `bases` in proportion, whole rupees, never more than each base. */
function allocate(amount: number, bases: number[]): number[] {
  const total = bases.reduce((a, b) => a + b, 0)
  if (total <= 0 || amount <= 0) return bases.map(() => 0)
  const capped = Math.min(r(amount), total)
  const out = bases.map((b) => Math.floor((capped * b) / total))
  let rest = capped - out.reduce((a, b) => a + b, 0)
  // Hand out the remaining rupees to the largest bases first
  const order = bases.map((b, i) => [b, i] as const).sort((a, b) => b[0] - a[0])
  for (let k = 0; rest > 0 && k < order.length * 2; k++) {
    const i = order[k % order.length][1]
    if (out[i] < bases[i]) {
      out[i]++
      rest--
    }
  }
  return out
}

type Applied = { perLine: number[]; freeDelivery: boolean; total: number }

/** Discount from one rule, given what's left of each line (`remaining`). */
function applyRule(rule: DiscountRule, lines: PriceLine[], remaining: number[], subtotal: number): Applied | { notApplied: string } {
  if (rule.minSpend && subtotal < rule.minSpend) return { notApplied: `Spend Rs ${rule.minSpend.toLocaleString('en-LK')} or more to use this` }
  const idx = lines.map((l, i) => (eligible(rule, l) && remaining[i] > 0 ? i : -1)).filter((i) => i >= 0)
  const perLine = lines.map(() => 0)
  if (rule.type === 'free-shipping') return { perLine, freeDelivery: true, total: 0 }
  if (!idx.length) return { notApplied: 'Nothing in your bag qualifies for this offer' }

  if (rule.type === 'percent') {
    const pct = Math.min(100, Math.max(0, rule.value ?? 0)) / 100
    let raw = idx.map((i) => r(remaining[i] * pct))
    const sum = raw.reduce((a, b) => a + b, 0)
    if (rule.maxDiscount && sum > rule.maxDiscount) raw = allocate(rule.maxDiscount, idx.map((i) => remaining[i]))
    idx.forEach((i, k) => (perLine[i] = Math.min(raw[k], remaining[i])))
  } else if (rule.type === 'fixed') {
    const parts = allocate(rule.value ?? 0, idx.map((i) => remaining[i]))
    idx.forEach((i, k) => (perLine[i] = parts[k]))
  } else if (rule.type === 'bogo') {
    const buy = Math.max(1, rule.buyQty ?? 1)
    const get = Math.max(1, rule.getQty ?? 1)
    const pct = Math.min(100, Math.max(0, rule.getPercent ?? 100)) / 100
    // Every unit, most expensive first; in each group of (buy + get) the cheapest `get` units are discounted
    const units = idx.flatMap((i) => Array.from({ length: lines[i].qty }, () => ({ i, price: remaining[i] / lines[i].qty }))).sort((a, b) => b.price - a.price)
    const group = buy + get
    for (let g = 0; g + group <= units.length; g += group) {
      for (let k = g + buy; k < g + group; k++) perLine[units[k].i] += units[k].price * pct
    }
    idx.forEach((i) => (perLine[i] = Math.min(r(perLine[i]), remaining[i])))
    if (perLine.every((d) => d === 0)) return { notApplied: `Add ${group} qualifying items to get this offer` }
  }
  return { perLine, freeDelivery: false, total: perLine.reduce((a, b) => a + b, 0) }
}

function runRules(rules: DiscountRule[], lines: PriceLine[], source: DiscountLine['source'], start: number[], subtotal: number) {
  const remaining = [...start]
  const applied: DiscountLine[] = []
  const perLine = lines.map(() => 0)
  let freeDelivery = false
  let lastMessage: string | undefined
  for (const rule of rules) {
    const res = applyRule(rule, lines, remaining, subtotal)
    if ('notApplied' in res) {
      lastMessage = res.notApplied
      continue
    }
    res.perLine.forEach((d, i) => {
      perLine[i] += d
      remaining[i] -= d
    })
    if (res.freeDelivery) freeDelivery = true
    if (res.total > 0 || res.freeDelivery) {
      applied.push({ label: rule.mode === 'code' ? `Code ${rule.code?.toUpperCase()}` : rule.name, amount: res.total, source, ruleId: rule.id, code: rule.code ?? null, freeDelivery: res.freeDelivery || undefined })
    }
  }
  return { remaining, perLine, applied, freeDelivery, total: perLine.reduce((a, b) => a + b, 0), message: lastMessage }
}

/* ------------------------------------------------------------------ quote */

export function quote(input: QuoteInput): Quote {
  const lines = input.lines.filter((l) => l.qty > 0)
  const bases = lines.map((l) => r(l.unitPrice) * l.qty)
  const subtotal = bases.reduce((a, b) => a + b, 0)
  const autoRules = [...input.automatic].filter((x) => x.mode === 'automatic').sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || a.id - b.id)

  // Promotions first
  const auto = runRules(autoRules, lines, 'automatic', bases, subtotal)
  let perLine = auto.perLine
  let discounts = auto.applied
  let freeDelivery = auto.freeDelivery
  let couponState: Quote['coupon'] = null

  if (input.coupon) {
    const code = (input.coupon.code ?? '').toUpperCase()
    if (input.coupon.combinable || auto.total === 0) {
      const c = runRules([input.coupon], lines, 'coupon', auto.remaining, subtotal)
      if (c.applied.length) {
        perLine = perLine.map((d, i) => d + c.perLine[i])
        discounts = [...discounts, ...c.applied]
        freeDelivery = freeDelivery || c.freeDelivery
        couponState = { code, applied: true }
      } else couponState = { code, applied: false, message: c.message }
    } else {
      // Not combinable: the shopper gets whichever is better
      const c = runRules([input.coupon], lines, 'coupon', bases, subtotal)
      if (!c.applied.length) couponState = { code, applied: false, message: c.message }
      else if (c.total > auto.total || (c.freeDelivery && c.total === auto.total)) {
        perLine = c.perLine
        discounts = c.applied
        freeDelivery = c.freeDelivery
        couponState = { code, applied: true, message: 'Replaces the automatic offer (this code can’t be combined)' }
      } else couponState = { code, applied: false, message: 'Your current offer already saves you more' }
    }
  }

  const discountTotal = perLine.reduce((a, b) => a + b, 0)
  const afterDiscounts = subtotal - discountTotal

  // Delivery
  const d = input.delivery
  const zone = d.zones.find((z) => input.district && z.districts.includes(input.district)) ?? null
  const zoneName = zone?.name ?? d.fallback.name
  const zoneFee = zone?.fee ?? d.fallback.fee
  const weightKg = Math.round(lines.reduce((w, l) => w + l.weightGrams * l.qty, 0) / 100) / 10
  const extraKg = Math.max(0, Math.ceil(weightKg - d.includedKg))
  const standardFee = lines.length ? zoneFee + extraKg * d.perKgFee : 0
  const sameDayAvailable = Boolean(d.sameDay.enabled && input.sameDayOpen && input.district && d.sameDay.districts.includes(input.district))
  const method = input.method === 'same-day' && sameDayAvailable ? 'same-day' : 'standard'
  const freeStandard = freeDelivery || afterDiscounts >= d.freeThreshold
  const fee = !lines.length ? 0 : method === 'same-day' ? d.sameDay.fee : freeStandard ? 0 : standardFee
  const giftWrapFee = input.giftWrap && lines.length ? (input.giftWrapFee ?? 0) : 0

  return {
    lines: lines.map((l, i) => ({ ...l, lineSubtotal: bases[i], discount: perLine[i], lineTotal: bases[i] - perLine[i] })),
    subtotal,
    discounts,
    discountTotal,
    delivery: {
      method,
      zone: method === 'same-day' ? 'Same-day' : zoneName,
      fee,
      baseFee: method === 'same-day' ? d.sameDay.fee : standardFee,
      free: lines.length > 0 && fee === 0,
      eta: method === 'same-day' ? d.sameDay.eta : (zone?.eta ?? d.fallback.eta),
      sameDayAvailable,
      sameDayFee: d.sameDay.fee,
      weightKg,
    },
    freeDeliveryRemaining: freeDelivery ? 0 : Math.max(0, d.freeThreshold - afterDiscounts),
    giftWrapFee,
    total: afterDiscounts + fee + giftWrapFee,
    coupon: couponState,
  }
}
