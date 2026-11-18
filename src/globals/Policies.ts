import type { GlobalConfig } from 'payload'

import { allowRoles, anyone } from '../access/roles'
import { PRODUCT_TYPES } from '../collections/Products'
import { audit } from '../lib/payload/audit'

const page = (name: string, title: string) => [
  { name: `${name}Title`, label: 'Page title', type: 'text' as const, defaultValue: title },
  { name: `${name}Body`, label: 'Text', type: 'richText' as const, admin: { description: 'Until this is written, the store shows a short placeholder summary.' } },
]

/**
 * Policies (launch prep): terms & conditions, returns & refunds and privacy, written in the admin and shown
 * at /terms, /returns and /privacy. The terms version is saved on every order with the time the shopper
 * accepted it; the return window and non-returnable product types drive the Returns feature.
 */
export const Policies: GlobalConfig = {
  slug: 'policies',
  label: 'Policies',
  admin: { group: 'Settings', description: 'Terms & conditions, returns & refunds, and privacy pages.' },
  access: { read: anyone, update: allowRoles('store-manager') },
  hooks: {
    afterChange: [
      async ({ req, doc, previousDoc }) => {
        const { refreshStoreSettings } = await import('../lib/store/refresh')
        refreshStoreSettings()
        if (req.user) await audit(req, { action: 'content-change', collection: 'policies', summary: `Policies updated${doc.termsVersion !== previousDoc?.termsVersion ? ` (terms version ${doc.termsVersion})` : ''}` })
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Terms & conditions',
          fields: [
            ...page('terms', 'Terms & conditions'),
            {
              name: 'termsVersion',
              label: 'Version',
              type: 'text',
              required: true,
              defaultValue: '2026-11',
              admin: { description: 'Saved on every order with the time the shopper accepted the terms. Change it whenever the terms change, e.g. 2027-01.' },
            },
          ],
        },
        {
          label: 'Returns & refunds',
          fields: [
            ...page('returns', 'Returns & refunds'),
            {
              type: 'row',
              fields: [
                { name: 'returnWindowDays', label: 'Return window (days after delivery)', type: 'number', min: 0, max: 60, defaultValue: 7, admin: { width: '50%', description: '0 turns online return requests off.' } },
                {
                  name: 'nonReturnableTypes',
                  label: 'Can’t be returned',
                  type: 'select',
                  hasMany: true,
                  options: PRODUCT_TYPES.map((t) => ({ label: t.label, value: t.value })),
                  defaultValue: ['chocolate'],
                  admin: { width: '50%', description: 'Product types shoppers can’t request a return for (e.g. food).' },
                },
              ],
            },
          ],
        },
        { label: 'Privacy', fields: page('privacy', 'Privacy policy') },
      ],
    },
  ],
}
