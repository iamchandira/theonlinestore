import { slugField, type CollectionConfig } from 'payload'

import { anyone, catalogDeleters, catalogEditors } from '../access/roles'
import { auditDelete } from '../lib/payload/audit'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '../lib/payload/revalidate'

const paths = (doc: Record<string, unknown>) => ['/brands', `/brands/${doc.slug}`]

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: {
    useAsTitle: 'name',
    group: 'Catalogue',
    defaultColumns: ['name', 'group', 'featured', 'updatedAt'],
    description: 'Brands on the store. Featured brands appear on the home page and in the Brands menu.',
  },
  access: { read: anyone, create: catalogEditors, update: catalogEditors, delete: catalogDeleters },
  defaultSort: 'name',
  hooks: { afterChange: [revalidateStorefront(paths)], afterDelete: [revalidateStorefrontOnDelete(paths), auditDelete('brands', (d) => String(d.name))] },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    slugField({ useAsSlug: 'name' }),
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
      admin: { position: 'sidebar', description: 'Used to group brands in the Brands menu.' },
    },
    { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'description', type: 'textarea' },
  ],
}
