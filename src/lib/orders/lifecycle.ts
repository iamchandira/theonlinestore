/**
 * Order lifecycle (Sprint 6, TOS-702): which status may follow which, and what each step needs.
 * Pure, so the admin, bulk actions and tests share the same rules.
 *
 *  pending-payment → processing → packed → shipped → out-for-delivery → delivered → completed
 *                         ↘ on-hold ↙        ↘ failed-delivery → (shipped again | returned)
 *  cancelled is allowed until the parcel leaves; returns after delivery go through the Returns screen.
 */

export type Status =
  | 'pending-payment'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out-for-delivery'
  | 'delivered'
  | 'completed'
  | 'on-hold'
  | 'cancelled'
  | 'refunded'
  | 'returned'
  | 'failed-delivery'

export const NEXT: Record<Status, Status[]> = {
  'pending-payment': ['processing', 'on-hold', 'cancelled'],
  processing: ['packed', 'on-hold', 'cancelled'],
  packed: ['shipped', 'processing', 'on-hold', 'cancelled'],
  shipped: ['out-for-delivery', 'delivered', 'failed-delivery'],
  'out-for-delivery': ['delivered', 'failed-delivery'],
  'failed-delivery': ['shipped', 'returned', 'cancelled'],
  delivered: ['completed', 'returned'],
  completed: ['returned'],
  'on-hold': ['pending-payment', 'processing', 'packed', 'cancelled'],
  cancelled: [],
  refunded: [],
  returned: [],
}

/** When each step happened, kept on the order (statusDates.<key>) for tracking and reports. */
export const DATE_FIELD: Partial<
  Record<
    Status,
    'packedAt' | 'shippedAt' | 'deliveredAt' | 'completedAt' | 'cancelledAt' | 'returnedAt'
  >
> = {
  packed: 'packedAt',
  shipped: 'shippedAt',
  delivered: 'deliveredAt',
  completed: 'completedAt',
  cancelled: 'cancelledAt',
  returned: 'returnedAt',
}

export type LifecycleOrder = {
  status: Status
  paymentMethod: string
  paymentStatus: string
  shipment?: { courier?: unknown; trackingNumber?: string | null } | null
}

export type CourierInfo = { requiresTracking: boolean } | null

/** Returns a sentence explaining why the change isn't allowed, or null when it is. */
export function checkTransition(
  order: LifecycleOrder,
  to: Status,
  courier: CourierInfo,
): string | null {
  if (order.status === to) return null
  if (!NEXT[order.status]?.includes(to)) {
    const allowed = NEXT[order.status] ?? []
    return `An order that is ${label(order.status)} can’t be moved to ${label(to)}.${allowed.length ? ` Next steps: ${allowed.map(label).join(', ')}.` : ''}`
  }
  const paidOrCod = order.paymentStatus === 'paid' || order.paymentMethod === 'cod'
  if ((to === 'packed' || to === 'shipped') && !paidOrCod)
    return 'This order isn’t paid yet. Confirm the payment before packing or shipping it.'
  if (to === 'shipped') {
    if (!order.shipment?.courier) return 'Choose the courier before marking it shipped.'
    if (courier?.requiresTracking !== false && !order.shipment?.trackingNumber?.trim())
      return 'Add the tracking number before marking it shipped.'
  }
  return null
}

const LABELS: Record<Status, string> = {
  'pending-payment': 'pending payment',
  processing: 'processing',
  packed: 'packed',
  shipped: 'shipped',
  'out-for-delivery': 'out for delivery',
  delivered: 'delivered',
  completed: 'completed',
  'on-hold': 'on hold',
  cancelled: 'cancelled',
  refunded: 'refunded',
  returned: 'returned',
  'failed-delivery': 'failed delivery',
}
export const label = (s: Status) => LABELS[s] ?? s

/** Shopper-facing progress: four steps, and how far the order has got. */
export function progress(status: Status): { step: 0 | 1 | 2 | 3 | 4; stopped?: string } {
  if (status === 'cancelled') return { step: 0, stopped: 'Cancelled' }
  if (status === 'returned' || status === 'refunded') return { step: 4, stopped: 'Returned' }
  if (status === 'on-hold') return { step: 1, stopped: 'On hold: we’ll contact you' }
  if (status === 'failed-delivery')
    return { step: 3, stopped: 'Delivery attempt failed: we’ll try again or contact you' }
  const order: Status[] = ['pending-payment', 'processing', 'packed', 'shipped', 'delivered']
  const map: Record<string, 0 | 1 | 2 | 3 | 4> = {
    'pending-payment': 0,
    processing: 1,
    packed: 2,
    shipped: 3,
    'out-for-delivery': 3,
    delivered: 4,
    completed: 4,
  }
  return { step: map[status] ?? (order.indexOf(status) as 0) }
}
