import 'server-only'

import type { Order } from '@/payload-types'

import { isStaff } from '../../access/roles'
import { getCurrentUser } from '../auth/server'
import { getPayloadClient } from '../catalog/server'

/** Order lookup for storefront pages and actions: private link token, signed-in owner, or staff. */
export async function getShopperOrder(orderNumber: string, token?: string | null) {
  const payload = await getPayloadClient()
  const order = (
    await payload.find({
      collection: 'orders',
      where: { orderNumber: { equals: orderNumber } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })
  ).docs[0] as Order | undefined
  if (!order) return null
  const user = await getCurrentUser()
  const owner = Boolean(user && typeof order.customer === 'number' && order.customer === user.id)
  const tokenOk = Boolean(token && order.accessToken && token === order.accessToken)
  if (!tokenOk && !owner && !(user && isStaff(user))) return null
  return { order, payload, token: order.accessToken ?? '' }
}

/** Can this order still be paid online right now? */
export function payable(order: Order) {
  if (order.paymentStatus === 'paid') return { ok: false as const, reason: 'paid' as const }
  if (order.status !== 'pending-payment') return { ok: false as const, reason: 'closed' as const }
  if (order.paymentDueAt && new Date(order.paymentDueAt).getTime() < Date.now())
    return { ok: false as const, reason: 'expired' as const }
  return { ok: true as const }
}
