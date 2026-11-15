import type { CollectionConfig } from 'payload'

import { allowRoles } from '../access/roles'
import { paymentNotifyEndpoints } from '../endpoints/payments'

export const PAYMENT_METHODS = [
  { label: 'Card (PayHere)', value: 'payhere' },
  { label: 'Koko', value: 'koko' },
  { label: 'Mintpay', value: 'mintpay' },
  { label: 'Cash on delivery', value: 'cod' },
  { label: 'Bank transfer', value: 'bank-transfer' },
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']
export const ONLINE_METHODS = ['payhere', 'koko', 'mintpay'] as const
export type OnlineMethod = (typeof ONLINE_METHODS)[number]
export const isOnline = (m: string): m is OnlineMethod =>
  (ONLINE_METHODS as readonly string[]).includes(m)

/**
 * Transactions (Sprint 5, TOS-607): every payment attempt, gateway callback, bank slip decision and
 * cash collection, kept for reconciliation. Written only by the server; nobody can edit or delete them.
 */
export const Transactions: CollectionConfig = {
  slug: 'transactions',
  labels: { singular: 'Transaction', plural: 'Transactions' },
  admin: {
    group: 'Sales',
    useAsTitle: 'reference',
    defaultColumns: ['createdAt', 'reference', 'method', 'status', 'amount', 'signatureValid'],
    description:
      'Every payment attempt and gateway callback. Read-only: written by checkout, gateways and payment actions on an order.',
  },
  access: {
    read: allowRoles('store-manager', 'support'),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  defaultSort: '-createdAt',
  endpoints: paymentNotifyEndpoints,
  fields: [
    {
      name: 'reference',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Sent to the gateway as its order id (order number + attempt).' },
    },
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true, index: true },
    {
      type: 'row',
      fields: [
        {
          name: 'method',
          type: 'select',
          required: true,
          options: [...PAYMENT_METHODS],
          admin: { width: '33%' },
        },
        {
          name: 'kind',
          type: 'select',
          required: true,
          defaultValue: 'payment',
          options: [
            { label: 'Payment', value: 'payment' },
            { label: 'Refund', value: 'refund' },
          ],
          admin: { width: '33%' },
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          index: true,
          defaultValue: 'initiated',
          options: [
            { label: 'Started', value: 'initiated' },
            { label: 'Pending at gateway', value: 'pending' },
            { label: 'Paid', value: 'paid' },
            { label: 'Failed', value: 'failed' },
            { label: 'Cancelled by shopper', value: 'cancelled' },
            { label: 'Charged back', value: 'chargeback' },
            { label: 'Slip to verify', value: 'slip-uploaded' },
            { label: 'Slip rejected', value: 'rejected' },
          ],
          admin: { width: '34%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'amount',
          label: 'Amount (Rs)',
          type: 'number',
          required: true,
          admin: { width: '33%' },
        },
        { name: 'currency', type: 'text', defaultValue: 'LKR', admin: { width: '33%' } },
        {
          name: 'providerRef',
          label: 'Gateway payment id',
          type: 'text',
          index: true,
          admin: { width: '34%' },
        },
      ],
    },
    { name: 'message', type: 'text' },
    {
      name: 'signatureValid',
      label: 'Signature checked',
      type: 'checkbox',
      admin: {
        description: 'The last gateway message for this attempt passed the signature check.',
      },
    },
    {
      name: 'simulated',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Made with the built-in test gateway (never real money).' },
    },
    { name: 'slip', type: 'relationship', relationTo: 'payment-slips' },
    {
      name: 'by',
      label: 'Recorded by',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'Staff member, for slip decisions and cash collected.' },
    },
    {
      name: 'events',
      type: 'array',
      admin: {
        description: 'Each message from the gateway, as received (card details are never stored).',
      },
      fields: [
        {
          name: 'at',
          type: 'date',
          required: true,
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        { name: 'status', type: 'text' },
        { name: 'valid', type: 'checkbox' },
        { name: 'ip', type: 'text' },
        {
          name: 'data',
          type: 'json',
          access: {
            read: ({ req }) =>
              Boolean(
                req.user &&
                (req.user as { roles?: string[] }).roles?.some(
                  (r) => r === 'admin' || r === 'super-admin',
                ),
              ),
          },
        },
      ],
    },
  ],
  timestamps: true,
}
