import type { Access, CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionConfig, Field } from 'payload'

import { allowRoles, hasRole, isStaff } from '../access/roles'
import { DISTRICT_NAMES } from '../config/districts'
import { placeEndpoint, quoteEndpoint } from '../endpoints/checkout'
import { audit } from '../lib/payload/audit'

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

/** RBAC matrix: staff read all orders; customers read their own; guests use the private confirmation link. */
const readOrders: Access = ({ req }) => {
  if (!req.user) return false
  if (isStaff(req.user)) return true
  return { customer: { equals: req.user.id } }
}
const staffOnly = ({ req }: { req: { user?: unknown } }) => isStaff(req.user as never)

const money = (name: string, label?: string): Field => ({ name, label, type: 'number', min: 0, defaultValue: 0, admin: { readOnly: true } })

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
      { name: 'district', type: 'select', required: true, options: DISTRICT_NAMES, admin: { width: '33%' } },
      { name: 'postalCode', type: 'text', admin: { width: '33%' } },
    ],
  },
  { name: 'landmark', type: 'text' },
]

/** Status changes are added to the order's timeline (who and when). */
const timelineOnStatus: CollectionBeforeChangeHook = ({ data, originalDoc, req, operation }) => {
  if (operation === 'update' && originalDoc && data.status && data.status !== originalDoc.status) {
    const label = ORDER_STATUSES.find((s) => s.value === data.status)?.label ?? data.status
    data.timeline = [
      ...((data.timeline ?? originalDoc.timeline ?? []) as unknown[]),
      { at: new Date().toISOString(), event: `Status changed to ${label}`, by: (req.user as { email?: string } | null)?.email ?? 'system' },
    ]
  }
  return data
}

/** Cancelling an order returns its reserved stock, once. */
const restockOnCancel: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const cancelled = ['cancelled', 'failed-delivery'].includes(doc.status) && previousDoc && !['cancelled', 'failed-delivery'].includes(previousDoc.status)
  if (!cancelled || doc.stockReturned) return doc
  const bySku = new Map<string, number>()
  for (const item of (doc.items ?? []) as { sku: string; quantity: number }[]) bySku.set(item.sku, (bySku.get(item.sku) ?? 0) + item.quantity)
  const products = await req.payload.find({ collection: 'products', where: { 'variants.sku': { in: [...bySku.keys()] } }, limit: 0, pagination: false, depth: 0, overrideAccess: true, req })
  for (const p of products.docs) {
    const variants = (p.variants ?? []).map((v) => (bySku.has(v.sku) ? { ...v, stock: (v.stock ?? 0) + bySku.get(v.sku)! } : v))
    await req.payload.update({
      collection: 'products',
      id: p.id,
      data: { variants },
      overrideAccess: true,
      req,
      context: { stockReason: 'return', stockNote: `Order ${doc.orderNumber} ${doc.status}` },
    })
  }
  await req.payload.update({ collection: 'orders', id: doc.id, data: { stockReturned: true }, overrideAccess: true, req, context: { skipHooks: true } })
  await audit(req, { action: 'content-change', collection: 'orders', docId: doc.id, summary: `Order ${doc.orderNumber} ${doc.status}: stock returned` })
  return doc
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Order', plural: 'Orders' },
  admin: {
    group: 'Sales',
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'createdAt', 'contact', 'status', 'paymentMethod', 'totals'],
    description: 'Every order placed at checkout. Totals are calculated by the server and can’t be edited.',
    components: { views: { list: { Component: '/components/admin/views/OrdersList#OrdersList' } } },
  },
  access: {
    read: readOrders,
    create: () => false, // only the checkout endpoint creates orders
    update: allowRoles('store-manager', 'order-fulfillment', 'support'),
    delete: allowRoles(),
  },
  defaultSort: '-createdAt',
  endpoints: [quoteEndpoint, placeEndpoint],
  hooks: {
    beforeChange: [timelineOnStatus],
    afterChange: [
      async (args) => {
        if (args.context?.skipHooks) return args.doc
        return restockOnCancel(args)
      },
    ],
  },
  fields: [
    { name: 'orderNumber', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
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
                    { name: 'product', type: 'relationship', relationTo: 'products', admin: { width: '50%' } },
                    { name: 'sku', type: 'text', required: true, admin: { width: '25%' } },
                    { name: 'quantity', type: 'number', required: true, min: 1, admin: { width: '25%' } },
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
                    { ...money('unitPrice', 'Unit price'), admin: { readOnly: true, width: '25%' } } as Field,
                    { ...money('lineSubtotal', 'Subtotal'), admin: { readOnly: true, width: '25%' } } as Field,
                    { ...money('discount'), admin: { readOnly: true, width: '25%' } } as Field,
                    { ...money('lineTotal', 'Line total'), admin: { readOnly: true, width: '25%' } } as Field,
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
                    { ...money('discountTotal', 'Discounts'), admin: { readOnly: true, width: '20%' } } as Field,
                    { ...money('delivery'), admin: { readOnly: true, width: '20%' } } as Field,
                    { ...money('giftWrap', 'Gift wrap'), admin: { readOnly: true, width: '20%' } } as Field,
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
                    { name: 'email', type: 'email', required: true, index: true, admin: { width: '33%' } },
                    { name: 'phone', type: 'text', required: true, index: true, admin: { width: '33%' } },
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
                    { name: 'method', type: 'select', options: ['standard', 'same-day'], defaultValue: 'standard', admin: { width: '34%' } },
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
                    { name: 'hidePrices', label: 'Hide prices on the packing slip', type: 'checkbox', admin: { width: '67%' } },
                  ],
                },
                { name: 'message', type: 'textarea', maxLength: 300 },
              ],
            },
            { name: 'customerNote', label: 'Note from the customer', type: 'textarea', maxLength: 500, admin: { readOnly: true } },
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
                    { name: 'at', type: 'date', admin: { width: '30%', date: { pickerAppearance: 'dayAndTime' } } },
                    { name: 'event', type: 'text', admin: { width: '45%' } },
                    { name: 'by', type: 'text', admin: { width: '25%' } },
                  ],
                },
              ],
            },
            { name: 'staffNotes', type: 'textarea', access: { read: staffOnly, update: staffOnly }, admin: { description: 'Internal only' } },
          ],
        },
      ],
    },
    // ----- sidebar -----
    { name: 'status', type: 'select', required: true, defaultValue: 'pending-payment', index: true, options: [...ORDER_STATUSES], admin: { position: 'sidebar' } },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      options: [
        { label: 'Cash on delivery', value: 'cod' },
        { label: 'Bank transfer', value: 'bank-transfer' },
      ],
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'unpaid',
      options: [
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Paid', value: 'paid' },
        { label: 'Refunded', value: 'refunded' },
      ],
      admin: { position: 'sidebar' },
      access: { update: ({ req }) => hasRole(req.user, 'admin', 'store-manager') },
    },
    { name: 'customer', type: 'relationship', relationTo: 'users', index: true, admin: { position: 'sidebar', readOnly: true } },
    { name: 'coupon', type: 'relationship', relationTo: 'discounts', admin: { position: 'sidebar', readOnly: true } },
    { name: 'termsAcceptedAt', type: 'date', admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'termsVersion', type: 'text', admin: { position: 'sidebar', readOnly: true } },
    { name: 'stockReturned', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', readOnly: true } },
    // Private link for guests to view their order confirmation (never shown to staff UI)
    { name: 'accessToken', type: 'text', index: true, admin: { hidden: true }, access: { read: () => false } },
    { name: 'clientIp', type: 'text', admin: { position: 'sidebar', readOnly: true }, access: { read: staffOnly } },
  ],
  timestamps: true,
}
