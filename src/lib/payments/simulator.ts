import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Built-in test gateway (development only). Everything about it lives here and in
 * app/(frontend)/checkout/pay/test-gateway/, so the production branch replaces this file with a stub
 * (scripts/make-production.sh) and deletes that folder: the live code has no test gateway at all.
 */

type Result = 'paid' | 'pending' | 'cancelled' | 'failed' | 'chargeback'

/**
 * Runs only in Test mode, and only in a development build, or a production build served from localhost
 * with ALLOW_TEST_GATEWAY=true (local end-to-end tests). On a real domain it is always off.
 */
export function simulatorPermitted(mode: 'test' | 'live', setting: boolean) {
  if (!setting || mode !== 'test') return false
  if (process.env.NODE_ENV !== 'production') return true
  let host = ''
  try {
    host = new URL(process.env.NEXT_PUBLIC_SITE_URL || '').hostname
  } catch {
    /* no URL: not local */
  }
  return (
    (process.env.ALLOW_TEST_GATEWAY ?? '').trim() === 'true' &&
    ['localhost', '127.0.0.1'].includes(host)
  )
}

/** Secret for the test gateway, derived from PAYLOAD_SECRET so it is never stored or sent anywhere. */
export const simulatorSecret = () =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || 'dev')
    .update('tos-test-gateway')
    .digest('hex')
export const SIMULATOR_MERCHANT = 'TOS-TEST-GATEWAY'

export function signSimulated(fields: { reference: string; result: Result; amount: string }) {
  return createHmac('sha256', simulatorSecret())
    .update(`${fields.reference}|${fields.result}|${fields.amount}|LKR`)
    .digest('hex')
}
export function verifySimulated(
  fields: { reference: string; result: Result; amount: string },
  sig: string,
) {
  const a = Buffer.from(signSimulated(fields))
  const b = Buffer.from(String(sig))
  return a.length === b.length && timingSafeEqual(a, b)
}
