import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

/**
 * Playwright global teardown: e2e shoppers use @theonlinestore.test addresses. Their orders reserve real
 * stock, so after the suite each one is cancelled (the order hook puts the stock back) and then removed
 * with its transactions, slips and returns. Without this, repeated runs sell the demo products out.
 */
export default async function cleanupE2EOrders() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'orders',
    where: { 'contact.email': { like: '@theonlinestore.test' } },
    depth: 0,
    limit: 1000,
    overrideAccess: true,
  })
  for (const o of docs) {
    try {
      if (!o.stockReturned && !['cancelled', 'returned', 'refunded'].includes(o.status)) {
        // No user: a system change, so the lifecycle rules don't block cancelling a shipped test order
        await payload.update({ collection: 'orders', id: o.id, data: { status: 'cancelled' }, overrideAccess: true, context: { skipEmail: true } })
      }
      for (const collection of ['returns', 'transactions', 'payment-slips'] as const) {
        await payload.delete({ collection, where: { order: { equals: o.id } }, overrideAccess: true })
      }
      await payload.delete({ collection: 'orders', id: o.id, overrideAccess: true })
    } catch (err) {
      payload.logger.warn({ err, order: o.orderNumber }, 'e2e order cleanup failed')
    }
  }
  if (docs.length) payload.logger.info(`e2e teardown: released ${docs.length} test orders`)
}
