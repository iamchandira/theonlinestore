'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getPayloadClient } from '@/lib/catalog/server'
import { loadLines, type LineView } from '@/lib/checkout/server'
import { getShopperOrder } from '@/lib/payments/shopperOrder'
import { allow, clientIp } from '@/lib/server/rateLimit'

const norm = (p: string) =>
  p
    .replace(/[\s-]/g, '')
    .replace(/^\+94/, '0')
    .replace(/^94(?=7)/, '0')

/** `values` refills the form: React resets a form after each submit. */
export type TrackState = {
  error?: string
  fields?: Record<string, string>
  values?: { orderNumber: string; phone: string }
} | null

/**
 * Guest order tracking (TOS-705): order number + the mobile number used at checkout. On a match, the
 * shopper is sent to the order page with its private link. The answer is the same for a wrong number
 * and an unknown order, and lookups are rate-limited, so order numbers can't be probed.
 */
export async function trackOrderAction(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const values = {
    orderNumber: String(formData.get('orderNumber') ?? '').slice(0, 30),
    phone: String(formData.get('phone') ?? '').slice(0, 20),
  }
  const ip = clientIp(await headers())
  if (!allow(`track:${ip}`, 10, 10 * 60_000))
    return { error: 'Too many tries. Please wait a few minutes.', values }
  const orderNumber = String(formData.get('orderNumber') ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s/g, '')
    .slice(0, 30)
  const phone = norm(String(formData.get('phone') ?? '')).slice(0, 15)
  const fields: Record<string, string> = {}
  if (!/^TOS-\d{6}-[A-Z0-9]{4}$/.test(orderNumber))
    fields.orderNumber = 'Order numbers look like TOS-261115-J7MT.'
  if (!/^07\d{8}$/.test(phone))
    fields.phone = 'Enter the mobile number you used, e.g. 077 123 4567.'
  if (Object.keys(fields).length)
    return { error: 'Please check the highlighted fields.', fields, values }
  const payload = await getPayloadClient()
  const o = (
    await payload.find({
      collection: 'orders',
      where: { orderNumber: { equals: orderNumber } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })
  ).docs[0]
  const matches =
    o && [o.contact.phone, o.shippingAddress?.phone].some((p) => p && norm(p) === phone)
  if (!o || !matches || !o.accessToken)
    return {
      error:
        'We couldn’t find an order with that number and mobile. Check both, or message us on WhatsApp.',
      values,
    }
  redirect(`/orders/${o.orderNumber}?t=${o.accessToken}`)
}

/** Reorder (TOS-305): this order's items at today's prices, limited to what's in stock. */
export async function reorderAction(
  orderNumber: string,
  token: string,
): Promise<{ views: LineView[]; issues: { message: string }[] } | { error: string }> {
  const found = await getShopperOrder(String(orderNumber).slice(0, 40), String(token).slice(0, 100))
  if (!found) return { error: 'We couldn’t find that order.' }
  const { views, issues } = await loadLines(
    found.payload,
    found.order.items.map((i) => ({ sku: i.sku, qty: i.quantity })),
  )
  return { views, issues }
}
