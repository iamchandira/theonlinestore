import type { GlobalConfig } from 'payload'

import { allowRoles, anyone } from '../access/roles'

/**
 * Home page merchandising (TOS-108). Marketing picks the hero products and configures product rails
 * without a developer. Sections that aren't configured fall back to sensible automatic rails.
 */
export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Home page',
  admin: { group: 'Content', description: 'Hero products and product rails on the home page.' },
  access: { read: anyone, update: allowRoles('store-manager', 'marketing') },
  hooks: {
    afterChange: [
      async ({ doc, context }) => {
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
    {
      name: 'heroProducts',
      label: 'Hero products',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      maxRows: 4,
      admin: { description: 'Up to 4. The first three float in the hero; the fourth appears on the small rating card.' },
    },
    {
      name: 'rails',
      label: 'Product rails',
      type: 'array',
      labels: { singular: 'Rail', plural: 'Rails' },
      admin: { description: 'Shown in this order, in the upper or lower part of the page.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'eyebrow', type: 'text', admin: { width: '33%', description: 'Small label, e.g. "Today only"' } },
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
            { name: 'limit', type: 'number', defaultValue: 12, min: 4, max: 24, admin: { width: '33%' } },
            {
              name: 'style',
              type: 'select',
              defaultValue: 'plain',
              admin: { width: '34%' },
              options: [
                { label: 'Plain', value: 'plain' },
                { label: 'Blush panel', value: 'blush' },
                { label: 'Cream panel', value: 'cream' },
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
            { name: 'countdown', type: 'checkbox', label: 'Show "ends at midnight" countdown', defaultValue: false, admin: { width: '50%' } },
          ],
        },
        {
          name: 'products',
          type: 'relationship',
          relationTo: 'products',
          hasMany: true,
          admin: { condition: (_, s) => s?.source === 'manual' },
        },
        { name: 'tag', type: 'relationship', relationTo: 'tags', admin: { condition: (_, s) => s?.source === 'tag' } },
        { name: 'category', type: 'relationship', relationTo: 'categories', admin: { condition: (_, s) => s?.source === 'category' } },
        { name: 'maxPrice', type: 'number', admin: { condition: (_, s) => s?.source === 'under', description: 'Rs' } },
      ],
    },
  ],
}
