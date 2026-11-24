import type { GlobalConfig } from 'payload'

import { allowRoles, anyone } from '../access/roles'
import { audit } from '../lib/payload/audit'
import { ANNOUNCEMENT_ICON_KEYS, NO_ICON } from '../lib/store/announcementIconKeys'
import { section } from '../fields/section'

/**
 * Store details (launch prep): name, contact details, social links, announcement bar and the default
 * description, all editable in Admin › Settings › Store details. Read by the storefront, emails and
 * printed documents (lib/store/settings.ts); saving refreshes the storefront.
 */
export const StoreSettings: GlobalConfig = {
  slug: 'store-settings',
  label: 'Store details',
  admin: { group: 'Settings', hideAPIURL: true, description: 'Contact details, social links and the announcement bar shown across the store, emails and invoices.' },
  access: { read: anyone, update: allowRoles('store-manager') },
  hooks: {
    afterChange: [
      async ({ req }) => {
        const { refreshStoreSettings } = await import('../lib/store/refresh')
        refreshStoreSettings()
        if (req.user) await audit(req, { action: 'content-change', collection: 'store-settings', summary: 'Store details updated' })
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Store',
          fields: [
            section('Store', 'The store name, description and usual delivery time.', [
              { name: 'storeName', type: 'text', required: true, defaultValue: 'The Online Store' },
              {
                name: 'description',
                type: 'textarea',
                maxLength: 300,
                defaultValue: 'Genuine skincare, haircare, fragrances, footwear, gifts and chocolates, delivered island-wide in Sri Lanka.',
                admin: { description: 'Used by search engines and link previews when a page has no description of its own.' },
              },
              { name: 'deliveryEstimate', label: 'Usual delivery time', type: 'text', defaultValue: '2–4 working days', admin: { description: 'Shown on product pages, e.g. "2–4 working days".' } },
                      ]),
          ],
        },
        {
          label: 'Contact',
          fields: [
            section('Contact details', 'Shown in the footer, on invoices and in emails.', [
              {
                name: 'contact',
                type: 'group',
                label: false,
                fields: [
                  {
                    type: 'row',
                    fields: [
                      { name: 'phone', type: 'text', admin: { width: '50%', description: 'As shoppers should see it, e.g. +94 77 123 4567' } },
                      {
                        name: 'whatsapp',
                        label: 'WhatsApp number',
                        type: 'text',
                        admin: { width: '50%', description: 'Digits only with country code, e.g. 94771234567. Leave empty to hide the WhatsApp button.' },
                        validate: (v: string | null | undefined) => (!v || /^94\d{9}$/.test(v) ? true : 'Use 94 followed by 9 digits, e.g. 94771234567.'),
                      },
                    ],
                  },
                  {
                    type: 'row',
                    fields: [
                      { name: 'email', type: 'email', admin: { width: '50%' } },
                      { name: 'hours', label: 'Opening hours', type: 'text', admin: { width: '50%', description: 'e.g. Mon–Sat, 9.00am – 6.00pm' } },
                    ],
                  },
                  { name: 'address', type: 'textarea', admin: { description: 'Shown in the footer and on invoices.' } },
                  { name: 'businessRegistration', label: 'Business registration no.', type: 'text', admin: { description: 'Optional. Printed on invoices.' } },
                ],
              },
                      ]),
          ],
        },
        {
          label: 'Social',
          fields: [
            section('Social links', 'Icons in the footer. Leave a link empty to hide its icon.', [
              {
                name: 'social',
                type: 'group',
                label: false,
                admin: { description: 'Full links to your pages. Leave empty to hide an icon.' },
                fields: ['facebook', 'instagram', 'tiktok', 'youtube'].map((name) => ({
                  name,
                  type: 'text' as const,
                  validate: (v: string | null | undefined) => (!v || /^https:\/\//.test(v) ? true : 'Use the full link starting with https://'),
                })),
              },
                      ]),
          ],
        },
        {
          label: 'Announcement bar',
          fields: [
            section('Announcement bar', 'Short messages across the top of every page. Leave empty to hide the bar.', [
              {
                name: 'announcements',
                type: 'array',
                labels: { singular: 'Message', plural: 'Messages' },
                defaultValue: [
                  { text: 'Island-wide delivery', icon: 'delivery' },
                  { text: 'Cash on delivery available across Sri Lanka', icon: 'cash' },
                  { text: '100% genuine brands, sourced from authorised suppliers', icon: 'genuine' },
                ],
                admin: {
                  description: 'Short messages that scroll across the top of every page. Leave empty to hide the bar. Only promise what is switched on (e.g. instalments).',
                  components: { RowLabel: '/components/admin/fields/AnnouncementRowLabel#AnnouncementRowLabel' },
                },
                fields: [
                  { name: 'text', type: 'text', required: true, maxLength: 90 },
                  {
                    name: 'icon',
                    type: 'select',
                    options: [...ANNOUNCEMENT_ICON_KEYS, NO_ICON].map((v) => ({ label: v, value: v })),
                    admin: { components: { Field: '/components/admin/fields/IconPicker#IconPicker' } },
                  },
                ],
              },
                      ]),
          ],
        },
      ],
    },
  ],
}
