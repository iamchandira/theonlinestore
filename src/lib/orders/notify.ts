import type { Payload } from 'payload'

import type { Order } from '@/payload-types'

import { trackingLink } from '../../collections/Couriers'

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

/** The shopper's order page (tracking, invoice, returns): private link, or signed in. */
export const orderPageUrl = (o: Pick<Order, 'orderNumber' | 'accessToken'>) =>
  `${SITE()}/orders/${o.orderNumber}${o.accessToken ? `?t=${o.accessToken}` : ''}`

/** "On its way" email when an order is marked shipped (Sprint 6). Failures are logged, never block the change. */
export async function sendShippedEmail(payload: Payload, o: Order) {
  try {
    // Uses the saved document from the hook: the request's transaction may not be committed yet
    const c = o.shipment?.courier
    const courier =
      typeof c === 'object'
        ? c
        : c
          ? await payload
              .findByID({ collection: 'couriers', id: c, depth: 0, overrideAccess: true })
              .catch(() => null)
          : null
    const { orderShipped } = await import('../email/templates')
    await payload.sendEmail({
      to: o.contact.email,
      subject: `Order ${o.orderNumber} is on its way`,
      html: orderShipped({
        orderNumber: o.orderNumber,
        fullName: o.contact.fullName,
        courier: courier?.name ?? 'our courier',
        trackingNumber: o.shipment?.trackingNumber,
        trackingUrl: trackingLink(courier, o.shipment?.trackingNumber),
        orderUrl: orderPageUrl(o),
        eta: o.delivery?.eta,
      }),
    })
  } catch (err) {
    payload.logger.error({ err, orderId: o.id }, 'Shipped email failed')
  }
}
