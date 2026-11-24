import { slugField, type CollectionConfig } from 'payload'

import { anyone, catalogDeleters, catalogEditors } from '../access/roles'
import { auditDelete } from '../lib/payload/audit'
import { section } from '../fields/section'

const taxonomy = (slug: string, singular: string, plural: string, description: string): CollectionConfig => ({
  slug,
  labels: { singular, plural },
  admin: { useAsTitle: 'name', group: 'Catalogue', description, hideAPIURL: true },
  access: { read: anyone, create: catalogEditors, update: catalogEditors, delete: catalogDeleters },
  hooks: { afterDelete: [auditDelete(slug, (d) => String(d.name))] },
  defaultSort: 'name',
  fields: [section(singular, 'The name shoppers see and its web address.', [{ name: 'name', type: 'text', required: true, unique: true }, slugField({ useAsSlug: 'name' })])],
})

export const Tags = taxonomy('tags', 'Tag', 'Tags', 'Merchandising tags such as K-beauty, Derm, Bestseller, New, Gift.')
export const Concerns = taxonomy('concerns', 'Concern', 'Concerns', 'Skin and hair concerns shoppers filter by, e.g. Acne, Brightening, Hair fall.')
export const Occasions = taxonomy('occasions', 'Occasion', 'Occasions', 'Gifting occasions, e.g. Birthday, Avurudu, Valentine’s Day. Powers the Gift Finder.')
export const Recipients = taxonomy('recipients', 'Recipient', 'Recipients', 'Who a product suits, e.g. For her, For him, For kids. Powers the Gift Finder.')
