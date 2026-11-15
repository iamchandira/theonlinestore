import type { CollectionConfig } from 'payload'

import { allowRoles } from '../access/roles'

/**
 * Bank transfer slips (Sprint 5, TOS-605). Uploaded by the shopper from their order page (private link
 * or account) through POST /api/orders/slip; never public. Staff verify or reject them from the order.
 */
export const PaymentSlips: CollectionConfig = {
  slug: 'payment-slips',
  labels: { singular: 'Payment slip', plural: 'Payment slips' },
  admin: {
    group: 'Sales',
    defaultColumns: ['createdAt', 'orderNumber', 'status', 'filename'],
    description:
      'Bank transfer slips from shoppers. Verify or reject them from the order’s Payment panel.',
  },
  access: {
    read: allowRoles('store-manager', 'support', 'order-fulfillment'),
    create: () => false,
    update: () => false,
    delete: allowRoles(),
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    { name: 'orderNumber', type: 'text', index: true, admin: { readOnly: true } },
    { name: 'note', label: 'Shopper’s note', type: 'textarea', admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'To verify', value: 'pending' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'reason',
      label: 'Reason (if rejected)',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
  upload: {
    staticDir: 'private/payment-slips',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
    // Shoppers' phone photos can be large; keep a readable copy for staff
    imageSizes: [{ name: 'preview', width: 1400, withoutEnlargement: true }],
  },
}
