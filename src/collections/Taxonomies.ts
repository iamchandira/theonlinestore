import { slugField, type CollectionConfig } from 'payload'

import { anyone, catalogEditors } from '../access/roles'

const taxonomy = (slug: string, singular: string, plural: string, description: string): CollectionConfig => ({
  slug,
  labels: { singular, plural },
  admin: { useAsTitle: 'name', group: 'Catalogue', description },
  access: { read: anyone, create: catalogEditors, update: catalogEditors, delete: catalogEditors },
  defaultSort: 'name',
  fields: [{ name: 'name', type: 'text', required: true, unique: true }, slugField({ useAsSlug: 'name' })],
})

export const Tags = taxonomy('tags', 'Tag', 'Tags', 'Merchandising tags such as K-beauty, Derm, Bestseller, New, Gift.')
export const Concerns = taxonomy('concerns', 'Concern', 'Concerns', 'Skin and hair concerns shoppers filter by, e.g. Acne, Brightening, Hair fall.')
