import type { CollectionConfig } from 'payload'

import { allowRoles } from '../access/roles'

/**
 * Search analytics (TOS-208): one row per normalised search term per day (Sri Lanka time).
 * Written by `logSearch()` with an upsert; staff read it through the Search insights screen.
 */
export const SearchQueries: CollectionConfig = {
  slug: 'search-queries',
  labels: { singular: 'Search', plural: 'Search log' },
  admin: {
    group: 'Insights',
    useAsTitle: 'term',
    defaultColumns: ['term', 'day', 'count', 'results'],
    description: 'What shoppers search for, per day. Zero-result searches show what to stock or rename.',
  },
  access: {
    read: allowRoles('store-manager', 'marketing'),
    create: () => false,
    update: () => false,
    delete: allowRoles(),
  },
  defaultSort: '-day',
  indexes: [{ fields: ['term', 'day'], unique: true }],
  fields: [
    { name: 'term', type: 'text', required: true, index: true },
    { name: 'day', type: 'text', required: true, index: true, admin: { description: 'YYYY-MM-DD (Asia/Colombo)' } },
    { name: 'count', type: 'number', required: true, defaultValue: 1 },
    { name: 'results', type: 'number', required: true, defaultValue: 0, admin: { description: 'Results shown the last time this was searched' } },
  ],
}
