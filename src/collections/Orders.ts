import {
  APIError,
  type Access,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type Field,
} from 'payload'

import { allowRoles, isStaff } from '../access/roles'
import { DISTRICT_NAMES } from '../config/districts'
import { placeEndpoint, quoteEndpoint } from '../endpoints/checkout'
import { bulkStatusEndpoint, codRemittanceEndpoint } from '../endpoints/orders'
import {
  orderPaymentEndpoint,
  orderStatusEndpoint,
  slipUploadEndpoint,
} from '../endpoints/payments'
import {
  checkTransition,
  DATE_FIELD,
  type LifecycleOrder,
  type Status,
} from '../lib/orders/lifecycle'
import { audit } from '../lib/payload/audit'
import { PAYMENT_METHODS } from './Transactions'

/**
 * Orders (Sprint 4). Created only by the checkout (`POST /api/orders/place`, see endpoints/checkout.ts):
 * prices, discounts and fees are always calculated on the server. Stock is reserved when the order is
 * placed and returned if it's cancelled. Fulfilment, courier tracking, invoices and returns: Sprint 6.
 */

export const ORDER_STATUSES = [
  { label: 'Pending payment', value: 'pending-payment' },
  { label: 'Processing', value: 'processing' },
  { label: 'Packed', value: 'packed' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Out for delivery', value: 'out-for-delivery' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Completed', value: 'completed' },
  { label: 'On hold', value: 'on-hold' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Returned', value: 'returned' },
  { label: 'Failed delivery', value: 'failed-delivery' },
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]['value']

export const PAYMENT_STATUSES = [
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Payment processing', value: 'pending' },
  { label: 'Slip to verify', value: 'slip-uploaded' },
  { label: 'Paid', value: 'paid' },
  { label: 'Payment failed', value: 'failed' },
  { label: 'Partly refunded', value: 'partially-refunded' },
  { label: 'Refunded', value: 'refunded' },
] as const

/** RBAC matrix: staff read all orders; customers read their own; guests use the private confirmation link. */
const readOrders: Access = ({ req }) => {
  if (!req.user) return false
  if (isStaff(req.user)) return true
  return { customer: { equals: req.user.id } }
}
const staffOnly = ({ req }: { req: { user?: unknown } }) => isStaff(req.user as never)

const money = (name: string, label?: string): Field => ({
  name,
  label,
  type: 'number',
  min: 0,
  defaultValue: 0,
  admin: { readOnly: true },
})

const addressFields: Field[] = [
  {
    type: 'row',
    fields: [
      { name: 'recipientName', type: 'text', required: true, admin: { width: '50%' } },
      { name: 'phone', type: 'text', required: true, admin: { width: '50%' } },
    ],
  },
  { name: 'line1', type: 'text', required: true },
  { name: 'line2', type: 'text' },
  {
    type: 'row',
    fields: [
      { name: 'city', type: 'text', required: true, admin: { width: '34%' } },
      {
        name: 'district',
        type: 'select',
        required: true,
        options: DISTRICT_NAMES,
        admin: { width: '33%' },
      },
      { name: 'postalCode', type: 'text', admin: { width: '33%' } },
    ],
  },
  { name: 'landmark', type: 'text' },
]

/**
 * Lifecycle (TOS-702): staff changes must follow the allowed steps (lib/orders/lifecycle.ts), shipping needs a
 * courier and tracking number, and each step's time is kept in statusDates. System changes (gateways, the
 * unpaid-order job) have no user and are trusted.
 */
const enforceLifecycle: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  operation,
  context,
}) => {
  if (operation !== 'update' || !originalDoc || !data.status || data.status === originalDoc.status)
    return data
  const to = data.status as Status
  if (req.user && !context?.skipLifecycle) {
    const merged = {
      ...originalDoc,
      ...data,
      shipment: { ...(originalDoc.shipment ?? {}), ...(data.shipment ?? {}) },
      status: originalDoc.status, // judge the step from where the order is now
    } as LifecycleOrder
    const courierId =
      typeof merged.shipment?.courier === 'object'
        ? (merged.shipment?.courier as { id?: number })?.id
        : merged.shipment?.courier
    const courier = courierId
      ? await req.payload
          .findByID({
            collection: 'couriers',
            id: courierId as number,
            depth: 0,
            overrideAccess: true,
            req,
          })
          .catch(() => null)
      : null
    const problem = checkTransition(
      merged,
      to,
      courier ? { requiresTracking: courier.requiresTracking !== false } : null,
    )
    if (problem) throw new APIError(problem, 400, undefined, true)
  }
  const key = DATE_FIELD[to]
  if (key)
    data.statusDates = {
      ...(originalDoc.statusDates ?? {}),
      ...(data.statusDates ?? {}),
      [key]: new Date().toISOString(),
    }
  return data
}

/** Status changes are added to the order's timeline (who and when). */
const timelineOnStatus: CollectionBeforeChangeHook = ({ data, originalDoc, req, operation }) => {
  if (operation === 'update' && originalDoc && data.status && data.status !== originalDoc.status) {
    const label = ORDER_STATUSES.find((s) => s.value === data.status)?.label ?? data.status
    data.timeline = [
      ...((data.timeline ?? originalDoc.timeline ?? []) as unknown[]),
      {
        at: new Date().toISOString(),
        event: `Status changed to ${label}`,
        by: (req.user as { email?: string } | null)?.email ?? 'system',
      },
    ]
  }
  return data
}

/** Cancelling an order returns its reserved stock, once. */
const restockOnCancel: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  // Stock comes back when an order is cancelled before it leaves, or when a failed delivery is returned to us.
  // Returns after delivery restock only the items received (Returns screen).
  const back =
    previousDoc &&
    previousDoc.status !== doc.status &&
    (doc.status === 'cancelled' ||
      (doc.status === 'returned' && previousDoc.status === 'failed-delivery'))
  if (!back || doc.stockReturned) return doc
  const { restockItems } = await import('../lib/orders/stock')
  await restockItems(
    req.payload,
    ((doc.items ?? []) as { sku: string; quantity: number }[]).map((i) => ({
      sku: i.sku,
      quantity: i.quantity,
    })),
    `Order ${doc.orderNumber} ${doc.status}`,
    req,
  )
  await req.payload.update({
    collection: 'orders',
    id: doc.id,
    data: { stockReturned: true },
    overrideAccess: true,
    req,
    context: { skipHooks: true },
  })
  await audit(req, {
    action: 'content-change',
    collection: 'orders',
    docId: doc.id,
    summary: `Order ${doc.orderNumber} ${doc.status}: stock returned`,
  })
  return doc
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Order', plural: 'Orders' },
  admin: {
    group: 'Sales',
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'createdAt', 'contact', 'status', 'paymentMethod', 'totals'],
    description:
      'Every order placed at checkout. Totals are calculated by the server and can’t be edited.',
    components: { views: { list: { Component: '/components/admin/views/OrdersList#OrdersList' } } },
  },
  access: {
    read: readOrders,
    create: () => false, // only the checkout endpoint creates orders
    update: allowRoles('store-manager', 'order-fulfillment', 'support'),
    delete: allowRoles(),
  },
  defaultSort: '-createdAt',
  endpoints: [
    quoteEndpoint,
    placeEndpoint,
    orderStatusEndpoint,
    slipUploadEndpoint,
    bulkStatusEndpoint,
    codRemittanceEndpoint,
    orderPaymentEndpoint,
  ],
  hooks: {
    beforeChange: [enforceLifecycle, timelineOnStatus],
    afterChange: [
      async (args) => {
        if (args.context?.skipHooks) return args.doc
        return restockOnCancel(args)
      },
      async ({ doc, previousDoc, req, context }) => {
        // Email after the change is saved; never inside the request's transaction
        if (!context?.skipEmail && doc.status === 'shipped' && previousDoc?.status !== 'shipped') {
          const { sendShippedEmail } = await import('../lib/orders/notify')
          void sendShippedEmail(req.payload, doc as never)
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Order',
          fields: [
            {
              name: 'items',
              type: 'array',
              required: true,
              admin: { readOnly: true },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'product',
                      type: 'relationship',
                      relationTo: 'products',
                      admin: { width: '50%' },
                    },
                    { name: 'sku', type: 'text', required: true, admin: { width: '25%' } },
                    {
                      name: 'quantity',
                      type: 'number',
                      required: true,
                      min: 1,
                      admin: { width: '25%' },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '50%' } },
                    { name: 'brand', type: 'text', admin: { width: '25%' } },
                    { name: 'variant', type: 'text', admin: { width: '25%' } },
                  ],
                },
                { name: 'image', type: 'text', admin: { hidden: true } },
                {
                  type: 'row',
                  fields: [
                    {
                      ...money('unitPrice', 'Unit price'),
                      admin: { readOnly: true, width: '25%' },
                    } as Field,
                    {
                      ...money('lineSubtotal', 'Subtotal'),
                      admin: { readOnly: true, width: '25%' },
                    } as Field,
                    { ...money('discount'), admin: { readOnly: true, width: '25%' } } as Field,
                    {
                      ...money('lineTotal', 'Line total'),
                      admin: { readOnly: true, width: '25%' },
                    } as Field,
                  ],
                },
              ],
            },
            {
              name: 'discounts',
              type: 'array',
              admin: { readOnly: true },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', admin: { width: '50%' } },
                    { name: 'code', type: 'text', admin: { width: '25%' } },
                    { ...money('amount'), admin: { readOnly: true, width: '25%' } } as Field,
                  ],
                },
                { name: 'discount', type: 'relationship', relationTo: 'discounts' },
              ],
            },
            {
              name: 'totals',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { ...money('subtotal'), admin: { readOnly: true, width: '20%' } } as Field,
                    {
                      ...money('discountTotal', 'Discounts'),
                      admin: { readOnly: true, width: '20%' },
                    } as Field,
                    { ...money('delivery'), admin: { readOnly: true, width: '20%' } } as Field,
                    {
                      ...money('giftWrap', 'Gift wrap'),
                      admin: { readOnly: true, width: '20%' },
                    } as Field,
                    {
                      ...money('paymentFee', 'Payment fee'),
                      admin: { readOnly: true, width: '20%', description: 'Cash on delivery or instalment fee' },
                    } as Field,
                    { ...money('total'), admin: { readOnly: true, width: '20%' } } as Field,
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Customer & delivery',
          fields: [
            {
              name: 'contact',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'fullName', type: 'text', required: true, admin: { width: '34%' } },
                    {
                      name: 'email',
                      type: 'email',
                      required: true,
                      index: true,
                      admin: { width: '33%' },
                    },
                    {
                      name: 'phone',
                      type: 'text',
                      required: true,
                      index: true,
                      admin: { width: '33%' },
                    },
                  ],
                },
              ],
            },
            { name: 'shippingAddress', type: 'group', fields: addressFields },
            {
              name: 'delivery',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'method',
                      type: 'select',
                      options: ['standard', 'same-day'],
                      defaultValue: 'standard',
                      admin: { width: '34%' },
                    },
                    { name: 'zone', type: 'text', admin: { width: '33%' } },
                    { name: 'eta', type: 'text', admin: { width: '33%' } },
                  ],
                },
              ],
            },
            {
              name: 'gift',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'wrap', type: 'checkbox', admin: { width: '33%' } },
                    {
                      name: 'hidePrices',
                      label: 'Hide prices on the packing slip',
                      type: 'checkbox',
                      admin: { width: '67%' },
                    },
                  ],
                },
                { name: 'message', type: 'textarea', maxLength: 300 },
              ],
            },
            {
              name: 'customerNote',
              label: 'Note from the customer',
              type: 'textarea',
              maxLength: 500,
              admin: { readOnly: true },
            },
            {
              name: 'shipment',
              type: 'group',
              admin: {
                description:
                  'Needed before the order can be marked Shipped. Shoppers see the tracking link.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'courier',
                      type: 'relationship',
                      relationTo: 'couriers',
                      filterOptions: { active: { equals: true } },
                      admin: { width: '50%' },
                    },
                    { name: 'trackingNumber', type: 'text', index: true, admin: { width: '50%' } },
                  ],
                },
                { name: 'deliveryNote', label: 'Note for the courier', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Timeline & notes',
          fields: [
            {
              name: 'timeline',
              type: 'array',
              admin: { readOnly: true },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'at',
                      type: 'date',
                      admin: { width: '30%', date: { pickerAppearance: 'dayAndTime' } },
                    },
                    { name: 'event', type: 'text', admin: { width: '45%' } },
                    { name: 'by', type: 'text', admin: { width: '25%' } },
                  ],
                },
              ],
            },
            {
              name: 'staffNotes',
              type: 'textarea',
              access: { read: staffOnly, update: staffOnly },
              admin: { description: 'Internal only' },
            },
          ],
        },
      ],
    },
    // ----- sidebar -----
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending-payment',
      index: true,
      options: [...ORDER_STATUSES],
      admin: { position: 'sidebar' },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      options: [...PAYMENT_METHODS],
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'unpaid',
      options: [...PAYMENT_STATUSES],
      // Changed by gateways, slip decisions and the Payment panel (POST /api/orders/:id/payment), which keep the transactions log
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'paymentDueAt',
      label: 'Pay by',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Unpaid card, instalment and bank transfer orders are cancelled after this.',
      },
    },
    {
      name: 'paidAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'refundedTotal',
      label: 'Refunded (Rs)',
      type: 'number',
      min: 0,
      defaultValue: 0,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'statusDates',
      type: 'group',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Set automatically as the order moves along.',
      },
      fields: [
        'packedAt',
        'shippedAt',
        'deliveredAt',
        'completedAt',
        'cancelledAt',
        'returnedAt',
      ].map(
        (name) =>
          ({
            name,
            type: 'date',
            admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
          }) as Field,
      ),
    },
    {
      name: 'codRemittance',
      label: 'COD remittance',
      type: 'group',
      admin: { position: 'sidebar', readOnly: true, condition: (d) => d?.paymentMethod === 'cod' },
      fields: [
        { name: 'remittedAt', type: 'date', admin: { readOnly: true } },
        { name: 'reference', type: 'text', admin: { readOnly: true } },
      ],
    },
    {
      name: 'paymentPanel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/components/admin/OrderPayment#OrderPayment' },
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'coupon',
      type: 'relationship',
      relationTo: 'discounts',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'termsAcceptedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'termsVersion', type: 'text', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'stockReturned',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', readOnly: true },
    },
    // Private link for guests to view their order confirmation (never shown to staff UI)
    {
      name: 'accessToken',
      type: 'text',
      index: true,
      admin: { hidden: true },
      access: { read: () => false },
    },
    {
      name: 'clientIp',
      type: 'text',
      admin: { position: 'sidebar', readOnly: true },
      access: { read: staffOnly },
    },
  ],
  timestamps: true,
}
