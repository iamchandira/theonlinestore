import { createHash } from 'node:crypto'

/**
 * PayHere Checkout API (https://support.payhere.lk/api-&-mobile-sdk/checkout-api).
 *   request hash = UPPER(MD5(merchant_id + order_id + amount + currency + UPPER(MD5(merchant_secret))))
 *   notify md5sig = UPPER(MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + UPPER(MD5(merchant_secret))))
 *   status_code: 2 success · 0 pending · -1 cancelled · -2 failed · -3 charged back
 * Amounts are sent with two decimals ("1234.00").
 */

export const PAYHERE_URL = {
  test: 'https://sandbox.payhere.lk/pay/checkout',
  live: 'https://www.payhere.lk/pay/checkout',
} as const

const md5 = (s: string) => createHash('md5').update(s, 'utf8').digest('hex').toUpperCase()
export const payhereAmount = (n: number) => (Math.round(n * 100) / 100).toFixed(2)

export function payhereHash(
  merchantId: string,
  orderId: string,
  amount: number,
  currency: string,
  secret: string,
) {
  return md5(merchantId + orderId + payhereAmount(amount) + currency + md5(secret))
}

export function payhereNotifySig(
  p: {
    merchant_id: string
    order_id: string
    payhere_amount: string
    payhere_currency: string
    status_code: string
  },
  secret: string,
) {
  return md5(
    p.merchant_id +
      p.order_id +
      p.payhere_amount +
      p.payhere_currency +
      p.status_code +
      md5(secret),
  )
}

export type GatewayResult = 'paid' | 'pending' | 'cancelled' | 'failed' | 'chargeback'
const STATUS: Record<string, GatewayResult> = {
  '2': 'paid',
  '0': 'pending',
  '-1': 'cancelled',
  '-2': 'failed',
  '-3': 'chargeback',
}

export type PayhereNotify = Record<string, string>

/** Checks a notify POST. `valid` is false for a wrong merchant or signature; nothing is trusted then. */
export function parsePayhereNotify(body: PayhereNotify, merchantId: string, secret: string) {
  const fields = {
    merchant_id: body.merchant_id ?? '',
    order_id: body.order_id ?? '',
    payhere_amount: body.payhere_amount ?? '',
    payhere_currency: body.payhere_currency ?? '',
    status_code: body.status_code ?? '',
  }
  const expected = payhereNotifySig(fields, secret)
  const valid =
    Boolean(secret) &&
    fields.merchant_id === merchantId &&
    typeof body.md5sig === 'string' &&
    body.md5sig.toUpperCase() === expected
  return {
    valid,
    reference: fields.order_id,
    result: STATUS[fields.status_code] ?? ('failed' as GatewayResult),
    amount: Number(fields.payhere_amount),
    currency: fields.payhere_currency,
    providerRef: body.payment_id ?? '',
    message: body.status_message ?? '',
    method: body.method ?? '',
  }
}

/** Hidden form fields for the browser to POST to PayHere. */
export function payhereForm(input: {
  merchantId: string
  secret: string
  reference: string
  amount: number
  items: string
  returnUrl: string
  cancelUrl: string
  notifyUrl: string
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
    address: string
    city: string
  }
}) {
  return {
    merchant_id: input.merchantId,
    return_url: input.returnUrl,
    cancel_url: input.cancelUrl,
    notify_url: input.notifyUrl,
    order_id: input.reference,
    items: input.items.slice(0, 250),
    currency: 'LKR',
    amount: payhereAmount(input.amount),
    first_name: input.customer.firstName,
    last_name: input.customer.lastName || '-',
    email: input.customer.email,
    phone: input.customer.phone,
    address: input.customer.address,
    city: input.customer.city,
    country: 'Sri Lanka',
    hash: payhereHash(input.merchantId, input.reference, input.amount, 'LKR', input.secret),
  }
}
