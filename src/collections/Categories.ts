import { createBreadcrumbsField, createParentField } from '@payloadcms/plugin-nested-docs'
import { slugField, type CollectionConfig } from 'payload'

import { anyone, catalogDeleters, catalogEditors } from '../access/roles'
import { auditDelete } from '../lib/payload/audit'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '../lib/payload/revalidate'
import { section } from '../fields/section'
import { seoSection } from '../fields/seo'

/** `breadcrumbs` (kept up to date by the nested-docs plugin, see payload.config.ts) give the category's URL. */
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
    hideAPIURL: true,
  },
  access: { read: anyone, create: catalogEditors, update: catalogEditors, delete: catalogDeleters },
  defaultSort: 'order',
  hooks: { afterChange: [revalidateStorefront(paths)], afterDelete: [revalidateStorefrontOnDelete(paths), auditDelete('categories', (d) => String(d.name))] },
  // Edit page: section cards (src/fields/section.ts); field names and stored data unchanged.
  // `parent` and `breadcrumbs` are defined here (inside the cards) instead of by the nested-docs plugin.
  fields: [
    section('Category', 'Shown at the top of the category page and on its tile.', [
      { name: 'name', type: 'text', required: true },
      { name: 'blurb', type: 'text', admin: { description: 'Short line shown on category tiles, e.g. "K-beauty and derm favourites".' } },
      { name: 'description', type: 'textarea', admin: { description: 'Intro shown at the top of the category page (also used for SEO).' } },
      { name: 'image', type: 'upload', relationTo: 'media' },
    ]),
    seoSection(),
    // ----- sidebar -----
    section('Place in the menu', 'Put it under a parent category to make a sub-category.', [
      createParentField('categories', {
        admin: { description: 'Leave empty for a top-level department.' },
        // Same rule the plugin uses: a category can't sit under itself or its own sub-categories
        filterOptions: ({ id }) => (id ? { id: { not_equals: id }, 'breadcrumbs.doc': { not_in: [id] } } : true),
      }),
      { name: 'order', type: 'number', defaultValue: 0, admin: { description: 'Lower numbers come first.' } },
      slugField({ useAsSlug: 'name' }),
      createBreadcrumbsField('categories', { admin: { hidden: true } }),
    ], { sidebar: true }),
    section('Look', 'The colour mood used on its tile and page.', [
      {
        name: 'tint',
        type: 'select',
        defaultValue: 'skincare',
        options: ['skincare', 'hair', 'body', 'lips', 'fragrance', 'chocolate', 'footwear', 'gifts', 'sky'].map((v) => ({ label: v, value: v })),
        admin: { description: 'Category mood tint (design system).' },
      },
    ], { sidebar: true }),
  ],
}
