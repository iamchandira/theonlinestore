import type { GlobalConfig } from 'payload'

import { allowRoles, anyone } from '../access/roles'
import { DISTRICT_NAMES } from '../config/districts'
import { audit } from '../lib/payload/audit'

/**
 * Checkout settings (Sprint 4): delivery zones and fees (TOS-505), same-day, gift wrap and the T&C version
 * (TOS-507). Payment methods moved to the Payments settings page in Sprint 5 (globals/PaymentSettings.ts).
 * Defaults are used until an admin saves this page.
 */
export const CheckoutSettings: GlobalConfig = {
  slug: 'checkout-settings',
  label: 'Checkout settings',
  admin: { group: 'Settings', description: 'Delivery fees, same-day, gift wrap and terms version. Payment methods are under Settings › Payments.' },
  access: { read: anyone, update: allowRoles('store-manager') },
  hooks: {
    afterChange: [
      async ({ req }) => {
        if (req.user) await audit(req, { action: 'content-change', collection: 'checkout-settings', summary: 'Checkout settings updated (delivery, gift wrap or terms)' })
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Delivery',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'freeThreshold', label: 'Free delivery from (Rs)', type: 'number', min: 0, defaultValue: 10000, admin: { width: '34%', description: 'After discounts. Standard delivery only.' } },
                { name: 'includedKg', label: 'Weight included (kg)', type: 'number', min: 0, defaultValue: 1, admin: { width: '33%' } },
                { name: 'perKgFee', label: 'Each extra kg (Rs)', type: 'number', min: 0, defaultValue: 100, admin: { width: '33%' } },
              ],
            },
            {
              name: 'zones',
              type: 'array',
              labels: { singular: 'Zone', plural: 'Delivery zones' },
              admin: { description: 'Districts not in any zone use the island-wide fee below.' },
              defaultValue: [
                { name: 'Colombo', districts: ['Colombo'], fee: 350, eta: '1–2 working days' },
                { name: 'Western Province', districts: ['Gampaha', 'Kalutara'], fee: 400, eta: '2–3 working days' },
              ],
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '34%' } },
                    { name: 'fee', label: 'Fee (Rs)', type: 'number', required: true, min: 0, admin: { width: '33%' } },
                    { name: 'eta', label: 'Delivery time', type: 'text', required: true, admin: { width: '33%' } },
                  ],
                },
                { name: 'districts', type: 'select', hasMany: true, required: true, options: DISTRICT_NAMES },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'fallbackFee', label: 'Island-wide fee (Rs)', type: 'number', min: 0, defaultValue: 450, admin: { width: '50%' } },
                { name: 'fallbackEta', label: 'Island-wide delivery time', type: 'text', defaultValue: '2–4 working days', admin: { width: '50%' } },
              ],
            },
            {
              name: 'sameDay',
              type: 'group',
              label: 'Same-day delivery',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'enabled', type: 'checkbox', defaultValue: true, admin: { width: '25%' } },
                    { name: 'fee', label: 'Fee (Rs)', type: 'number', min: 0, defaultValue: 650, admin: { width: '25%' } },
                    { name: 'cutoffHour', label: 'Order before (hour, 0–23)', type: 'number', min: 0, max: 23, defaultValue: 12, admin: { width: '25%' } },
                    { name: 'eta', type: 'text', defaultValue: 'Today, by 9 pm', admin: { width: '25%' } },
                  ],
                },
                { name: 'districts', type: 'select', hasMany: true, options: DISTRICT_NAMES, defaultValue: ['Colombo'] },
              ],
            },
          ],
        },
        {
          label: 'Gifts & terms',
          fields: [
            { name: 'giftWrapFee', label: 'Gift wrap fee (Rs)', type: 'number', min: 0, defaultValue: 250 },
            { name: 'termsVersion', label: 'Terms & conditions version', type: 'text', defaultValue: '2026-11', admin: { description: 'Recorded on every order with the time the shopper accepted it. Change it when the terms change.' } },
          ],
        },
      ],
    },
  ],
}
