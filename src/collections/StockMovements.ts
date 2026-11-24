import type { CollectionConfig } from 'payload'

import { allowRoles } from '../access/roles'
import { section } from '../fields/section'

/**
 * Inventory audit log (TOS-104). Rows are written automatically by the Products afterChange hook
 * (and later by orders, returns and manual stock counts). Nobody edits or deletes history.
 */
export const StockMovements: CollectionConfig = {
  slug: 'stock-movements',
  labels: { singular: 'Stock movement', plural: 'Stock history' },
  admin: {
    hideAPIURL: true,
    group: 'Catalogue',
    useAsTitle: 'sku',
    defaultColumns: [
      'createdAt',
      'product',
      'variantLabel',
      'change',
      'resultingStock',
      'reason',
      'user',
    ],
    description:
      'Every stock change, who made it and why. Written automatically; adjust stock from Inventory.',
  },
  access: {
    read: allowRoles('store-manager', 'inventory-manager', 'order-fulfillment', 'support'),
    create: allowRoles('store-manager', 'inventory-manager'),
    update: () => false,
    delete: () => false,
  },
  defaultSort: '-createdAt',
  fields: [
    // Edit page: section cards (src/fields/section.ts); field names and stored data unchanged
    section('Stock change', 'Recorded automatically whenever stock changes. Can’t be edited.', [
      {
        name: 'product',
        type: 'relationship',
        relationTo: 'products',
        index: true,
        admin: {
          description:
            'Empty once the product has been deleted; the SKU and variant keep the history readable.',
        },
      },
      { name: 'sku', type: 'text', required: true, index: true },
      { name: 'variantLabel', type: 'text' },
      {
        name: 'change',
        type: 'number',
        required: true,
        admin: { description: 'Positive = stock in, negative = stock out' },
      },
      { name: 'resultingStock', type: 'number', required: true },
      {
        name: 'reason',
        type: 'select',
        required: true,
        defaultValue: 'adjustment',
        options: [
          { label: 'Opening stock', value: 'initial' },
          { label: 'Manual adjustment', value: 'adjustment' },
          { label: 'Restock / delivery', value: 'restock' },
          { label: 'Sale', value: 'sale' },
          { label: 'Return', value: 'return' },
          { label: 'Damaged / expired', value: 'damaged' },
          { label: 'Stock count correction', value: 'count' },
        ],
      },
      { name: 'note', type: 'text' },
      {
        name: 'user',
        type: 'relationship',
        relationTo: 'users',
        admin: { description: 'Who made the change (empty = system).' },
      },
    ]),
  ],
}
