import { APIError, type CollectionConfig } from 'payload'

import { allowRoles } from '../access/roles'
import { audit, auditDelete } from '../lib/payload/audit'

/**
 * Discounts (TOS-503/504): coupon codes AND automatic promotions in one place.
 * The pricing engine (lib/checkout/pricing.ts) applies them in priority order; see its header for
 * the full rules. Usage is counted when an order is placed.
 */
export const Discounts: CollectionConfig = {
  slug: 'discounts',
  labels: { singular: 'Discount', plural: 'Discounts' },
  admin: {
    group: 'Sales',
    useAsTitle: 'name',
    defaultColumns: ['name', 'code', 'offer', 'active', 'usedCount', 'endsAt'],
    description: 'Coupon codes and automatic promotions. Every discount shows as its own line at checkout.',
  },
  access: {
    // Read by the checkout on the server only (Local API); staff who run promotions manage them
    read: allowRoles('store-manager', 'marketing', 'support'),
    create: allowRoles('store-manager', 'marketing'),
    update: allowRoles('store-manager', 'marketing'),
    delete: allowRoles('store-manager', 'marketing'),
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (data.mode === 'code') {
          data.code = String(data.code ?? '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '')
          if (!/^[A-Z0-9_-]{3,30}$/.test(data.code)) throw new APIError('Codes are 3–30 letters, numbers, - or _ (e.g. AVURUDU25).', 400, undefined, true)
        } else data.code = null
        if (data.type === 'percent' && !(Number(data.value) > 0 && Number(data.value) <= 100)) throw new APIError('Percent must be between 1 and 100.', 400, undefined, true)
        if (data.type === 'fixed' && !(Number(data.value) > 0)) throw new APIError('Enter the amount off in rupees.', 400, undefined, true)
        if (data.startsAt && data.endsAt && new Date(data.startsAt) > new Date(data.endsAt)) throw new APIError('The end date is before the start date.', 400, undefined, true)
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'create' || previousDoc?.active !== doc.active || previousDoc?.value !== doc.value) {
          await audit(req, {
            action: 'content-change',
            collection: 'discounts',
            docId: doc.id,
            summary: `Discount “${doc.name}”${doc.code ? ` (${doc.code})` : ''} ${operation === 'create' ? 'created' : 'updated'}: ${doc.type} ${doc.value ?? ''}, ${doc.active ? 'active' : 'inactive'}`,
          })
        }
        return doc
      },
    ],
    afterDelete: [auditDelete('discounts', (d) => String(d.name))],
  },
  fields: [
    {
      // Plain-language summary for the list view ("10% off", "Buy 2, get 1 free"). Computed, never stored.
      name: 'offer',
      type: 'text',
      virtual: true,
      admin: { readOnly: true, position: 'sidebar', description: 'Summary of this discount.' },
      hooks: {
        afterRead: [
          ({ siblingData: d }) => {
            const min = d.minSpend ? ` over Rs ${Number(d.minSpend).toLocaleString('en-LK')}` : ''
            if (d.type === 'percent') return `${d.value ?? 0}% off${min}`
            if (d.type === 'fixed') return `Rs ${Number(d.value ?? 0).toLocaleString('en-LK')} off${min}`
            if (d.type === 'free-shipping') return `Free delivery${min}`
            if (d.type === 'bogo') return `Buy ${d.buyQty ?? 2}, get ${d.getQty ?? 1} ${Number(d.getPercent ?? 100) >= 100 ? 'free' : `${d.getPercent}% off`}`
            return ''
          },
        ],
      },
    },
    { name: 'name', type: 'text', required: true, admin: { description: 'Shown to shoppers on the discount line, e.g. “Avurudu 10% off”.' } },
    {
      type: 'row',
      fields: [
        {
          name: 'mode',
          type: 'select',
          required: true,
          defaultValue: 'code',
          options: [
            { label: 'Coupon code', value: 'code' },
            { label: 'Automatic promotion', value: 'automatic' },
          ],
          admin: { width: '50%' },
        },
        { name: 'code', type: 'text', unique: true, index: true, admin: { width: '50%', condition: (d) => d?.mode === 'code', description: 'What shoppers type. Saved in capitals.' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'percent',
          options: [
            { label: 'Percent off', value: 'percent' },
            { label: 'Amount off (Rs)', value: 'fixed' },
            { label: 'Free delivery', value: 'free-shipping' },
            { label: 'Buy X, get Y', value: 'bogo' },
          ],
          admin: { width: '34%' },
        },
        { name: 'value', type: 'number', min: 0, admin: { width: '33%', condition: (d) => d?.type === 'percent' || d?.type === 'fixed', description: 'Percent (1–100) or rupees' } },
        { name: 'maxDiscount', label: 'Cap (Rs)', type: 'number', min: 0, admin: { width: '33%', condition: (d) => d?.type === 'percent', description: 'Optional maximum saving' } },
      ],
    },
    {
      type: 'row',
      admin: { condition: (d) => d?.type === 'bogo' },
      fields: [
        { name: 'buyQty', label: 'Buy', type: 'number', min: 1, defaultValue: 2, admin: { width: '33%' } },
        { name: 'getQty', label: 'Get', type: 'number', min: 1, defaultValue: 1, admin: { width: '33%' } },
        { name: 'getPercent', label: '% off the “get” items', type: 'number', min: 1, max: 100, defaultValue: 100, admin: { width: '34%', description: '100 = free' } },
      ],
    },
    {
      type: 'collapsible',
      label: 'Who and what it applies to',
      fields: [
        {
          name: 'appliesTo',
          type: 'select',
          required: true,
          defaultValue: 'all',
          options: [
            { label: 'Everything', value: 'all' },
            { label: 'Specific products', value: 'products' },
            { label: 'Specific categories', value: 'categories' },
            { label: 'Specific brands', value: 'brands' },
          ],
        },
        { name: 'products', type: 'relationship', relationTo: 'products', hasMany: true, admin: { condition: (d) => d?.appliesTo === 'products' } },
        { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true, admin: { condition: (d) => d?.appliesTo === 'categories', description: 'Includes sub-categories' } },
        { name: 'brands', type: 'relationship', relationTo: 'brands', hasMany: true, admin: { condition: (d) => d?.appliesTo === 'brands' } },
        { name: 'excludeSaleItems', type: 'checkbox', defaultValue: false, admin: { description: 'Don’t discount items already on sale.' } },
        {
          type: 'row',
          fields: [
            { name: 'minSpend', label: 'Minimum spend (Rs)', type: 'number', min: 0, admin: { width: '50%' } },
            { name: 'firstOrderOnly', type: 'checkbox', defaultValue: false, admin: { width: '50%', description: 'Only for customers who haven’t ordered before' } },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Limits',
      admin: { condition: (d) => d?.mode === 'code' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'usageLimit', label: 'Total uses', type: 'number', min: 1, admin: { width: '50%', description: 'Leave empty for unlimited' } },
            { name: 'usagePerCustomer', label: 'Uses per customer', type: 'number', min: 1, defaultValue: 1, admin: { width: '50%', description: 'Counted by email and phone' } },
          ],
        },
        { name: 'combinable', label: 'Can be combined with automatic promotions', type: 'checkbox', defaultValue: false },
      ],
    },
    { name: 'priority', type: 'number', defaultValue: 10, admin: { condition: (d) => d?.mode === 'automatic', description: 'Lower runs first' } },
    // ----- sidebar -----
    { name: 'active', type: 'checkbox', defaultValue: true, index: true, admin: { position: 'sidebar' } },
    { name: 'startsAt', type: 'date', admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'endsAt', type: 'date', admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' }, description: 'Optional end date and time' } },
    { name: 'usedCount', type: 'number', defaultValue: 0, admin: { position: 'sidebar', readOnly: true, description: 'Orders that used it' } },
    { name: 'internalNote', type: 'textarea', admin: { position: 'sidebar' } },
  ],
}
