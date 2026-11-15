import type { CollectionConfig } from 'payload'

import { allowRoles } from '../access/roles'

/** Audit log (TOS-402): read-only record of sensitive actions. Written only by the server (see lib/payload/audit.ts). */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Audit entry', plural: 'Audit log' },
  admin: {
    group: 'Settings',
    useAsTitle: 'summary',
    defaultColumns: ['createdAt', 'action', 'summary', 'userEmail'],
    description: 'Who changed roles, prices, reviews and content, and when. Entries can’t be edited or deleted.',
  },
  access: {
    read: allowRoles(), // admins (and super-admins)
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'action',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Role change', value: 'role-change' },
        { label: 'Staff account created', value: 'staff-created' },
        { label: 'Price change', value: 'price-change' },
        { label: 'Deleted', value: 'delete' },
        { label: 'Review moderation', value: 'review-moderation' },
        { label: 'Account deletion request', value: 'deletion-request' },
        { label: 'Content change', value: 'content-change' },
        { label: 'CSV import', value: 'csv-import' },
        { label: 'Payment', value: 'payment' },
      ],
    },
    { name: 'summary', type: 'text', required: true },
    { name: 'resource', type: 'text', index: true },
    { name: 'docId', type: 'text' },
    { name: 'changes', type: 'json' },
    { name: 'user', type: 'relationship', relationTo: 'users' },
    { name: 'userEmail', type: 'text' },
    { name: 'ip', type: 'text' },
  ],
  timestamps: true,
}
