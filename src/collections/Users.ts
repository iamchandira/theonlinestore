import type { CollectionConfig } from 'payload'

import { fieldAdminOnly, hasRole, isAdminOrSelf, isStaff, ROLES, userRoles } from '../access/roles'

/**
 * Users: staff (admin panel) and customers (storefront accounts) share one auth collection,
 * separated by `roles`. Customers can never reach /admin.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'User', plural: 'Users' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['fullName', 'email', 'roles', 'phone', 'createdAt'],
    group: 'Customers & Staff',
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7, // 7 days
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000, // 15 minutes
  },
  access: {
    // Only staff may use the admin panel
    admin: ({ req }) => isStaff(req.user),
    // Public sign-up creates customers; only admins can create staff (enforced by the roles field access)
    create: () => true,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: ({ req }) => hasRole(req.user, 'admin'),
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // The very first user becomes super-admin (bootstrap); everyone else defaults to customer
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true })
          if (totalDocs === 0) data.roles = ['super-admin']
          else if (!hasRole(req.user, 'admin')) data.roles = ['customer']
        }
        // Only a super-admin may grant or keep super-admin
        if (data.roles?.includes('super-admin') && req.user && !userRoles(req.user).includes('super-admin')) {
          data.roles = data.roles.filter((r: string) => r !== 'super-admin')
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'fullName', type: 'text', label: 'Full name' },
    {
      name: 'phone',
      type: 'text',
      label: 'Mobile number',
      admin: { description: 'Sri Lankan mobile, e.g. +94 77 123 4567. Used for SMS / WhatsApp order updates.' },
      validate: (value: string | null | undefined) =>
        !value || /^(\+94|0)?7\d{8}$/.test(value.replace(/[\s-]/g, '')) || 'Enter a valid Sri Lankan mobile number',
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['customer'],
      saveToJWT: true,
      options: ROLES.map((r) => ({ label: r.label, value: r.value })),
      access: { create: fieldAdminOnly, update: fieldAdminOnly },
      admin: { position: 'sidebar', description: 'Controls what this person can see and do. See docs/06-rbac-matrix.md.' },
    },
    {
      name: 'marketingOptIn',
      type: 'checkbox',
      label: 'Agreed to receive offers (email / SMS / WhatsApp)',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
