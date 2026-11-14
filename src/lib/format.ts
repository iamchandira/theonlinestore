/** Formatting helpers for Sri Lankan Rupee pricing and discounts. */

const lkr = new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 })

/** `4750` → `Rs 4,750` (cents shown only when present). */
export function formatLKR(amount: number): string {
  if (!Number.isFinite(amount)) return 'Rs —'
  const hasCents = Math.round(amount * 100) % 100 !== 0
  const value = hasCents
    ? new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
    : lkr.format(amount)
  return `Rs ${value}`
}

/** Whole-number % off between compare-at and selling price. Returns 0 if not discounted. */
export function percentOff(price: number, compareAt?: number | null): number {
  if (!compareAt || compareAt <= price) return 0
  return Math.round(((compareAt - price) / compareAt) * 100)
}

/** Instalment amount for BNPL providers (Koko / Mintpay split into 3). Rounded up to the rupee. */
export function instalment(price: number, parts = 3): number {
  return Math.ceil(price / parts)
}

/** Pluralise simple English nouns: `pluralize(2, 'size')` → `2 sizes`. */
export function pluralize(count: number, noun: string, plural?: string): string {
  return `${count} ${count === 1 ? noun : (plural ?? `${noun}s`)}`
}
