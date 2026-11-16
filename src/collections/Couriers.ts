import type { CollectionConfig } from 'payload'

import { allowRoles, isStaff } from '../access/roles'

/**
 * Couriers (Sprint 6, TOS-704/707): who delivers an order, how shoppers track it, and whether the courier
 * collects cash on delivery and pays it back (for the COD reconciliation screen).
 */
export const Couriers: CollectionConfig = {
  slug: 'couriers',
  labels: { singular: 'Courier', plural: 'Couriers' },
  admin: {
    group: 'Settings',
    useAsTitle: 'name',
    defaultColumns: ['name', 'active', 'collectsCod', 'requiresTracking'],
    description: 'Delivery partners. The tracking link is shown to shoppers once an order ships.',
  },
  access: {
    read: ({ req }) => isStaff(req.user),
    create: allowRoles('store-manager'),
    update: allowRoles('store-manager'),
    delete: allowRoles('store-manager'),
  },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    {
      name: 'trackingUrl',
      label: 'Tracking link',
      type: 'text',
      admin: {
        description:
          'Use {tracking} where the tracking number goes, e.g. https://courier.lk/track?no={tracking}. Leave empty if the courier has no tracking page.',
      },
      validate: (v: string | null | undefined) =>
        !v || (/^https:\/\//.test(v) && v.includes('{tracking}'))
          ? true
          : 'Start with https:// and include {tracking}.',
    },
    {
      type: 'row',
      fields: [
        { name: 'active', type: 'checkbox', defaultValue: true, admin: { width: '33%' } },
        {
          name: 'requiresTracking',
          label: 'Needs a tracking number',
          type: 'checkbox',
          defaultValue: true,
          admin: { width: '33%', description: 'Untick for your own riders.' },
        },
        {
          name: 'collectsCod',
          label: 'Collects cash on delivery',
          type: 'checkbox',
          defaultValue: true,
          admin: { width: '34%', description: 'Shown on the COD reconciliation screen.' },
        },
      ],
    },
    { name: 'phone', type: 'text' },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Pickup times, account number, contact person.' },
    },
  ],
}

export const trackingLink = (
  courier: { trackingUrl?: string | null } | null | undefined,
  tracking?: string | null,
) =>
  courier?.trackingUrl && tracking
    ? courier.trackingUrl.replace('{tracking}', encodeURIComponent(tracking.trim()))
    : null
