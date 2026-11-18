'use server'

import { headers } from 'next/headers'

import { isOnline } from '@/collections/Transactions'
import { loadPaymentConfig } from '@/lib/payments/config'
import { startAttempt, type Launch } from '@/lib/payments/service'
import { getShopperOrder, payable } from '@/lib/payments/shopperOrder'
import { allow, clientIp } from '@/lib/server/rateLimit'

/** Starts a payment attempt for an unpaid card / instalment order (Sprint 5). */
export async function startPaymentAction(
  orderNumber: string,
  token: string,
): Promise<Launch | { error: string }> {
  const ip = clientIp(await headers())
  if (!allow(`pay:${ip}`, 20, 10 * 60_000))
    return { error: 'Too many attempts. Please wait a few minutes.' }
  const found = await getShopperOrder(String(orderNumber).slice(0, 40), String(token).slice(0, 100))
  if (!found) return { error: 'We couldn’t find that order.' }
  const { order, payload } = found
  if (!isOnline(order.paymentMethod)) return { error: 'This order isn’t paid online.' }
  const p = payable(order)
  if (!p.ok)
    return {
      error:
        p.reason === 'paid'
          ? 'This order is already paid.'
          : p.reason === 'expired'
            ? 'The time to pay for this order has passed. Please order again.'
            : 'This order can’t be paid any more.',
    }
  const cfg = await loadPaymentConfig(payload)
  return startAttempt(payload, cfg, order, found.token)
}
