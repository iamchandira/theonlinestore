import { slugField, type CollectionConfig } from 'payload'

import { anyone, catalogDeleters, catalogEditors } from '../access/roles'
import { auditDelete } from '../lib/payload/audit'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '../lib/payload/revalidate'

/** `breadcrumbs` and `parent` are added by the nested-docs plugin (see payload.config.ts). */
const paths = (doc: Record<string, unknown>) => {
  const crumbs = (doc.breadcrumbs as { url?: string }[] | undefined) ?? []
  const url = crumbs.at(-1)?.url
  return ['/categories', ...(url ? [`/c${url}`] : [])]
}

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    group: 'Catalogue',
    defaultColumns: ['name', 'slug', 'parent', 'order'],
    description: 'Departments and sub-categories shoppers browse by. Nest a category under a parent to build the menu.',
  },
  access: { read: anyone, create: catalogEditors, update: catalogEditors, delete: catalogDeleters },
  defaultSort: 'order',
  hooks: { afterChange: [revalidateStorefront(paths)], afterDelete: [revalidateStorefrontOnDelete(paths), auditDelete('categories', (d) => String(d.name))] },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField({ useAsSlug: 'name' }),
    { name: 'blurb', type: 'text', admin: { description: 'Short line shown on category tiles, e.g. "K-beauty and derm favourites".' } },
    { name: 'description', type: 'textarea', admin: { description: 'Intro shown at the top of the category page (also used for SEO).' } },
    {
      name: 'tint',
      type: 'select',
      defaultValue: 'skincare',
      options: ['skincare', 'hair', 'body', 'lips', 'fragrance', 'chocolate', 'footwear', 'gifts', 'sky'].map((v) => ({ label: v, value: v })),
      admin: { position: 'sidebar', description: 'Category mood tint (design system).' },
    },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
