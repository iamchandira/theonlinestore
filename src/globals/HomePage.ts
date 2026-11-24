import type { GlobalConfig } from 'payload'

import { allowRoles, anyone } from '../access/roles'
import { audit } from '../lib/payload/audit'
import { section } from '../fields/section'

/**
 * Home page merchandising (TOS-108). Marketing picks the hero products and configures product rails
 * without a developer. Sections that aren't configured fall back to sensible automatic rails.
 */
export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Home page',
  admin: {
    hideAPIURL: true,
    group: 'Content',
    description: 'Hero products, product rails, banners and messages on the home page.',
  },
  access: { read: anyone, update: allowRoles('store-manager', 'marketing') },
  hooks: {
    afterChange: [
      async ({ doc, context, req }) => {
        if (req.user)
          await audit(req, {
            action: 'content-change',
            collection: 'home-page',
            summary: 'Home page merchandising updated (hero products / rails)',
          })
        if (context?.disableRevalidate) return doc
        try {
          const { revalidatePath } = await import('next/cache')
          revalidatePath('/', 'page')
        } catch {
          /* outside Next.js */
        }
        return doc
      },
    ],
  },
  fields: [
    // Edit page: tabs of section cards (src/fields/section.ts); field names and stored data unchanged
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Products',
          fields: [
            section('Hero products', 'The products shown in the large hero at the top of the home page.', [
              {
                name: 'heroProducts',
                label: 'Hero products',
                type: 'relationship',
                relationTo: 'products',
                hasMany: true,
                maxRows: 4,
                admin: {
                  description:
                    'Up to 4. The first three float in the hero; the fourth appears on the small rating card.',
                },
              },
            ]),
            section('Product rails', 'Rows of products on the home page, in order.', [
              {
                name: 'rails',
                label: 'Product rails',
                type: 'array',
                labels: { singular: 'Rail', plural: 'Rails' },
                admin: { description: 'Shown in this order, in the upper or lower part of the page. Open a rail to edit it.', initCollapsed: true, components: { RowLabel: '/components/admin/TitleRowLabel#TitleRowLabel' } },
                fields: [
                  {
                    type: 'row',
                    fields: [
                      {
                        name: 'eyebrow',
                        type: 'text',
                        admin: { width: '33%', description: 'Small label, e.g. "Today only"' },
                      },
                      { name: 'title', type: 'text', required: true, admin: { width: '33%' } },
                      { name: 'linkLabel', type: 'text', defaultValue: 'View all', admin: { width: '34%' } },
                    ],
                  },
                  { name: 'description', type: 'text' },
                  {
                    type: 'row',
                    fields: [
                      {
                        name: 'source',
                        type: 'select',
                        required: true,
                        defaultValue: 'manual',
                        admin: { width: '33%' },
                        options: [
                          { label: 'Hand-picked products', value: 'manual' },
                          { label: 'On sale (deals)', value: 'sale' },
                          { label: 'Bestsellers', value: 'bestsellers' },
                          { label: 'Newest', value: 'new' },
                          { label: 'By tag', value: 'tag' },
                          { label: 'By category', value: 'category' },
                          { label: 'Under a price', value: 'under' },
                        ],
                      },
                      {
                        name: 'limit',
                        type: 'number',
                        defaultValue: 12,
                        min: 4,
                        max: 24,
                        admin: { width: '33%' },
                      },
                      {
                        name: 'style',
                        type: 'select',
                        defaultValue: 'plain',
                        admin: { width: '34%' },
                        options: [
                          { label: 'Plain', value: 'plain' },
                          { label: 'Blush panel', value: 'blush' },
                          { label: 'Cream panel', value: 'cream' },
                          { label: 'Lilac panel', value: 'lilac' },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'row',
                    fields: [
                      {
                        name: 'placement',
                        type: 'select',
                        defaultValue: 'top',
                        admin: { width: '50%' },
                        options: [
                          { label: 'Upper page (after categories)', value: 'top' },
                          { label: 'Lower page (after Gift Finder)', value: 'bottom' },
                        ],
                      },
                      {
                        name: 'countdown',
                        type: 'checkbox',
                        label: 'Show "ends at midnight" countdown',
                        defaultValue: false,
                        admin: { width: '50%' },
                      },
                    ],
                  },
                  {
                    name: 'products',
                    type: 'relationship',
                    relationTo: 'products',
                    hasMany: true,
                    admin: { condition: (_, s) => s?.source === 'manual' },
                  },
                  {
                    name: 'tag',
                    type: 'relationship',
                    relationTo: 'tags',
                    admin: { condition: (_, s) => s?.source === 'tag' },
                  },
                  {
                    name: 'category',
                    type: 'relationship',
                    relationTo: 'categories',
                    admin: { condition: (_, s) => s?.source === 'category' },
                  },
                  {
                    name: 'maxPrice',
                    type: 'number',
                    admin: { condition: (_, s) => s?.source === 'under', description: 'Rs' },
                  },
                ],
              },
            ]),
          ],
        },
        {
          label: 'Banners & messages',
          fields: [
            section('Banners & messages', 'The hero badge, sale and gift banners and other text on the home page. Each can be switched off.', [
              {
                name: 'sections',
                label: 'Banners & messages',
                type: 'group',
                admin: {
                  description:
                    'Promotional text on the home page. Only promise what the store actually offers.',
                },
                fields: [
                  {
                    name: 'heroBadge',
                    label: 'Hero badge',
                    type: 'text',
                    maxLength: 70,
                    admin: {
                      description:
                        'Small “New” pill above the headline, e.g. “Avurudu gift hampers are here”. Leave empty to hide.',
                    },
                  },
                  {
                    name: 'sale',
                    label: 'Sale banner',
                    type: 'group',
                    fields: [
                      {
                        name: 'show',
                        type: 'checkbox',
                        defaultValue: false,
                        admin: { description: 'Off by default. Turn on while a real sale runs.' },
                      },
                      {
                        type: 'row',
                        fields: [
                          {
                            name: 'label',
                            type: 'text',
                            defaultValue: 'Flash sale',
                            admin: { width: '33%', condition: (_, s) => Boolean(s?.show) },
                          },
                          {
                            name: 'title',
                            type: 'text',
                            admin: {
                              width: '67%',
                              placeholder: 'e.g. Up to 25% off body care',
                              condition: (_, s) => Boolean(s?.show),
                            },
                          },
                        ],
                      },
                      {
                        type: 'row',
                        fields: [
                          {
                            name: 'buttonLabel',
                            type: 'text',
                            defaultValue: 'Shop the sale',
                            admin: { width: '33%', condition: (_, s) => Boolean(s?.show) },
                          },
                          {
                            name: 'link',
                            type: 'text',
                            defaultValue: '/offers',
                            admin: { width: '33%', condition: (_, s) => Boolean(s?.show) },
                          },
                          {
                            name: 'endsAt',
                            label: 'Ends at (countdown)',
                            type: 'date',
                            admin: {
                              width: '34%',
                              date: { pickerAppearance: 'dayAndTime' },
                              description: 'Optional. The banner hides itself after this.',
                              condition: (_, s) => Boolean(s?.show),
                            },
                          },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'gift',
                    label: 'Gift banner',
                    type: 'group',
                    fields: [
                      { name: 'show', type: 'checkbox', defaultValue: true },
                      {
                        name: 'title',
                        type: 'text',
                        defaultValue: 'Gifts they’ll actually love',
                        admin: { condition: (_, s) => Boolean(s?.show) },
                      },
                      {
                        name: 'text',
                        type: 'text',
                        defaultValue: 'Gift sets, wrapping and a handwritten note on request.',
                        admin: { condition: (_, s) => Boolean(s?.show) },
                      },
                      {
                        name: 'link',
                        type: 'text',
                        defaultValue: '/gifts',
                        admin: { condition: (_, s) => Boolean(s?.show) },
                      },
                    ],
                  },
                  {
                    name: 'giftFinderText',
                    label: 'Gift finder text',
                    type: 'text',
                    defaultValue: 'Gift wrapping and a handwritten note on request. We deliver island-wide.',
                  },
                  {
                    name: 'newsletter',
                    type: 'group',
                    fields: [
                      { name: 'show', type: 'checkbox', defaultValue: true },
                      {
                        name: 'title',
                        type: 'text',
                        defaultValue: 'Be the first to know',
                        admin: {
                          description:
                            'Only offer a discount here if a matching welcome code exists in Sales › Discounts.',
                          condition: (_, s) => Boolean(s?.show),
                        },
                      },
                      {
                        name: 'text',
                        type: 'text',
                        defaultValue:
                          'New arrivals, restocks and members-only deals. No spam, unsubscribe anytime.',
                        admin: { condition: (_, s) => Boolean(s?.show) },
                      },
                    ],
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
