import { slugField, type CollectionConfig } from 'payload'

import { anyone, catalogDeleters, catalogEditors } from '../access/roles'
import { auditDelete } from '../lib/payload/audit'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '../lib/payload/revalidate'
import { section } from '../fields/section'
import { seoSection } from '../fields/seo'

const paths = (doc: Record<string, unknown>) => ['/brands', `/brands/${doc.slug}`]

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: {
    useAsTitle: 'name',
    group: 'Catalogue',
    defaultColumns: ['name', 'group', 'featured', 'updatedAt'],
    description: 'Brands on the store. Featured brands appear on the home page and in the Brands menu.',
    hideAPIURL: true,
  },
  access: { read: anyone, create: catalogEditors, update: catalogEditors, delete: catalogDeleters },
  defaultSort: 'name',
  hooks: { afterChange: [revalidateStorefront(paths)], afterDelete: [revalidateStorefrontOnDelete(paths), auditDelete('brands', (d) => String(d.name))] },
  // Edit page: section cards (src/fields/section.ts); field names and stored data unchanged
  fields: [
    section('Brand', 'Shown on the brand page and next to its products.', [
      { name: 'name', type: 'text', required: true, unique: true },
      { name: 'logo', type: 'upload', relationTo: 'media' },
      { name: 'description', type: 'textarea' },
    ]),
    seoSection(),
    // ----- sidebar -----
    section('Menu & home page', 'Where the brand appears on the store.', [
      {
        name: 'group',
        type: 'select',
        required: true,
        defaultValue: 'everyday',
        options: [
          { label: 'K-Beauty', value: 'k-beauty' },
          { label: 'Derm & Pharmacy', value: 'derm' },
          { label: 'Everyday Favourites', value: 'everyday' },
          { label: 'Fragrance', value: 'fragrance' },
          { label: 'Footwear', value: 'footwear' },
          { label: 'Gifts & Chocolates', value: 'gifts' },
        ],
        admin: { description: 'Used to group brands in the Brands menu.' },
      },
      { name: 'featured', type: 'checkbox', defaultValue: false, admin: { description: 'Shown on the home page and at the top of the Brands menu.' } },
      slugField({ useAsSlug: 'name' }),
    ], { sidebar: true }),
  ],
}
