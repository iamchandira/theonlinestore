import type { CollectionConfig } from 'payload'

import { allowRoles } from '../access/roles'
import { returnActionEndpoint, returnRequestEndpoint } from '../endpoints/returns'
import { section } from '../fields/section'

export const RETURN_REASONS = [
  { label: 'Arrived damaged or faulty', value: 'damaged' },
  { label: 'Wrong item sent', value: 'wrong-item' },
  { label: 'Doesn’t fit (footwear)', value: 'size' },
  { label: 'Changed my mind (unopened)', value: 'changed-mind' },
  { label: 'Something else', value: 'other' },
] as const

export const RETURN_STATUSES = [
  { label: 'Requested', value: 'requested' },
  { label: 'Approved: waiting for items', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Items received', value: 'received' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Closed', value: 'closed' },
] as const

/**
 * Returns (Sprint 6, TOS-706). Shoppers ask from their order page within 7 days of delivery (food can't be
 * returned); staff approve or reject, mark the items received (back into stock if resellable) and refund.
 * Changed only through POST /api/returns/:id/action so each step is checked, logged and emailed.
 */
export const Returns: CollectionConfig = {
  slug: 'returns',
  labels: { singular: 'Return', plural: 'Returns' },
  admin: {
    hideAPIURL: true,
    group: 'Sales',
    useAsTitle: 'returnNumber',
    defaultColumns: ['returnNumber', 'createdAt', 'status', 'reason', 'refundAmount'],
    description:
      'Return requests from shoppers. Use the Return panel to approve, receive and refund.',
  },
  access: {
    read: allowRoles('store-manager', 'support', 'order-fulfillment'),
    create: () => false,
    update: () => false,
    delete: allowRoles(),
  },
  defaultSort: '-createdAt',
  endpoints: [returnRequestEndpoint, returnActionEndpoint],
  fields: [
    // Edit page: section cards (src/fields/section.ts); field names and stored data unchanged
    section('Return', 'The order and the items coming back.', [
      {
        name: 'returnNumber',
        type: 'text',
        required: true,
        unique: true,
        index: true,
        admin: { readOnly: true },
      },
      {
        name: 'order',
        type: 'relationship',
        relationTo: 'orders',
        required: true,
        index: true,
        admin: { readOnly: true },
      },
      {
        name: 'items',
        type: 'array',
        required: true,
        admin: { readOnly: true },
        fields: [
          {
            type: 'row',
            fields: [
              { name: 'sku', type: 'text', required: true, admin: { width: '25%' } },
              { name: 'name', type: 'text', required: true, admin: { width: '35%' } },
              { name: 'quantity', type: 'number', required: true, min: 1, admin: { width: '15%' } },
              {
                name: 'unitRefund',
                label: 'Refund each (Rs)',
                type: 'number',
                admin: { width: '25%', description: 'Price paid after discounts' },
              },
            ],
          },
          { name: 'restocked', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
        ],
      },
    ]),
    section('Reason', 'Why the shopper is returning them, and where the return is up to.', [
      {
        type: 'row',
        fields: [
          {
            name: 'reason',
            type: 'select',
            required: true,
            options: [...RETURN_REASONS],
            admin: { readOnly: true, width: '50%' },
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'requested',
            index: true,
            options: [...RETURN_STATUSES],
            admin: { readOnly: true, width: '50%' },
          },
        ],
      },
      {
        name: 'details',
        label: 'Shopper’s explanation',
        type: 'textarea',
        admin: { readOnly: true },
      },
    ]),
    section('Timeline', 'Everything that happened to this return, newest last.', [
      {
        name: 'timeline',
        type: 'array',
        admin: { readOnly: true },
        fields: [
          {
            type: 'row',
            fields: [
              {
                name: 'at',
                type: 'date',
                admin: { width: '30%', date: { pickerAppearance: 'dayAndTime' } },
              },
              { name: 'event', type: 'text', admin: { width: '45%' } },
              { name: 'by', type: 'text', admin: { width: '25%' } },
            ],
          },
        ],
      },
    ]),
    section('Decision & refund', 'Approve, receive and refund from here.', [
      {
        name: 'panel',
        type: 'ui',
        admin: {
          components: { Field: '/components/admin/ReturnPanel#ReturnPanel' },
        },
      },
      {
        name: 'refundAmount',
        label: 'Refunded (Rs)',
        type: 'number',
        admin: { readOnly: true },
      },
      {
        name: 'decisionNote',
        label: 'Note to the shopper',
        type: 'textarea',
        admin: { readOnly: true },
      },
    ], { sidebar: true }),
  ],
  timestamps: true,
}
