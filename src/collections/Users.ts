import { APIError, type Access, type CollectionConfig, type FieldAccess, type Where } from 'payload'

import { fieldAdminOnly, hasRole, isStaff, ROLES, userRoles } from '../access/roles'
import { DISTRICT_NAMES } from '../config/districts'
import { audit } from '../lib/payload/audit'
import { resetPassword, verifyEmail } from '../lib/email/templates'
import { allow, clientIp } from '../lib/server/rateLimit'

/**
 * Users: staff (admin panel) and customers (storefront accounts) share one auth collection,
 * separated by `roles`. Customers can never reach /admin.
 *
 * Access follows docs/06-rbac-matrix.md (TOS-401):
 * - Admins see and edit everyone (only super-admins can grant super-admin).
 * - Store managers and support read and edit customers; fulfilment and marketing read customers.
 * - Everyone else, customers included, sees and edits only their own account.
 */

const CUSTOMER_READERS = ['store-manager', 'order-fulfillment', 'marketing', 'support'] as const
const CUSTOMER_EDITORS = ['store-manager', 'support'] as const

const scoped =
  (roles: readonly (typeof CUSTOMER_READERS)[number][]): Access =>
  ({ req }) => {
    if (!req.user) return false
    if (hasRole(req.user, 'admin')) return true
    const self: Where = { id: { equals: req.user.id } }
    if (hasRole(req.user, ...roles)) return { or: [{ roles: { contains: 'customer' } }, self] }
    return self
  }

/** Staff-only fields (internal notes, deletion status) */
const staffOnly: FieldAccess = ({ req }) => isStaff(req.user)

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'User', plural: 'Users' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['fullName', 'email', 'roles', 'phone', 'createdAt'],
    group: 'Customers & Staff',
    description: 'Customers and staff accounts. Roles control what each staff member can see and do.',
    // Customers / Staff tabs with clean addresses (?view=staff) instead of a role filter in the URL
    components: { views: { list: { Component: '/components/admin/views/UsersList#UsersList' } } },
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30, // 30 days ("Remember me"); without it the cookie ends with the browser session
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000, // 15 minutes
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
    // TOS-301: customers confirm their email before they can sign in
    verify: {
      generateEmailSubject: () => 'Confirm your email · The Online Store',
      generateEmailHTML: ({ token, user }) => verifyEmail((user as { fullName?: string }).fullName, token ?? ''),
    },
    // TOS-303: one-time reset link, valid for 1 hour
    forgotPassword: {
      expiration: 60 * 60 * 1000,
      generateEmailSubject: () => 'Reset your password · The Online Store',
      generateEmailHTML: (args) => {
        const user = args?.user as { fullName?: string; roles?: string[] } | undefined
        return resetPassword(user?.fullName, args?.token ?? '', isStaff(user as never))
      },
    },
  },
  access: {
    // Only staff may use the admin panel (customers get a 403)
    admin: ({ req }) => isStaff(req.user),
    // Public sign-up creates customers; only admins can create staff (enforced by the roles field + hook)
    create: () => true,
    read: scoped(CUSTOMER_READERS),
    update: scoped(CUSTOMER_EDITORS),
    delete: ({ req }) => hasRole(req.user, 'admin'),
  },
  hooks: {
    beforeOperation: [
      async ({ args, operation, req }) => {
        // The very first account (the owner, from /admin's "Create first user") is confirmed straight away,
        // so don't send it a "confirm your email" message. Payload would otherwise send one and, if email
        // isn't working yet on a new server, fail the whole sign-up.
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true, req })
          if (totalDocs === 0) return { ...args, disableVerificationEmail: true }
        }
        return args
      },
    ],
    beforeChange: [
      async ({ data, operation, req, originalDoc }) => {
        // The very first user becomes super-admin (bootstrap); everyone else defaults to customer
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true })
          if (totalDocs === 0) data.roles = ['super-admin']
          else if (!hasRole(req.user, 'admin')) data.roles = ['customer']
          // Staff created by an admin don't need to verify their email
          if (isStaff({ roles: data.roles } as never) && hasRole(req.user, 'admin')) data._verified = true
        }
        // Only a super-admin may grant or keep super-admin
        const grantsSuper = data.roles?.includes('super-admin') && !originalDoc?.roles?.includes('super-admin')
        if (grantsSuper && req.user && !userRoles(req.user).includes('super-admin')) {
          throw new APIError('Only a Super Admin can give someone the Super Admin role.', 403, undefined, true)
        }
        // Consent timestamps (PDPA): when marketing consent changes, record when
        if (data.marketingOptIn !== undefined && data.marketingOptIn !== originalDoc?.marketingOptIn) {
          data.marketingConsentAt = new Date().toISOString()
        }
        // One default address at most
        if (Array.isArray(data.addresses)) {
          let seen = false
          for (const a of data.addresses) {
            if (a.isDefault && !seen) seen = true
            else a.isDefault = false
          }
          if (!seen && data.addresses[0]) data.addresses[0].isDefault = true
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const before = (previousDoc?.roles ?? []) as string[]
        const after = (doc.roles ?? []) as string[]
        if (operation === 'create' && isStaff({ roles: after } as never)) {
          await audit(req, { action: 'staff-created', collection: 'users', docId: doc.id, summary: `Staff account ${doc.email} created (${after.join(', ')})` })
        } else if (operation === 'update' && [...before].sort().join() !== [...after].sort().join()) {
          await audit(req, {
            action: 'role-change',
            collection: 'users',
            docId: doc.id,
            summary: `Roles for ${doc.email}: ${before.join(', ') || 'none'} → ${after.join(', ')}`,
            changes: { from: before, to: after },
          })
        }
        if (operation === 'update' && doc.deletionRequestedAt && !previousDoc?.deletionRequestedAt) {
          await audit(req, { action: 'deletion-request', collection: 'users', docId: doc.id, summary: `${doc.email} asked for their account to be deleted` })
        }
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await audit(req, { action: 'delete', collection: 'users', docId: doc.id, summary: `User ${doc.email} deleted` })
        return doc
      },
    ],
  },
  endpoints: [
    {
      // POST /api/users/cart { items: [{ sku, qty }], mode: 'merge' | 'replace' } → the account's bag, re-priced (TOS-501)
      path: '/cart',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return Response.json({ error: 'Sign in first' }, { status: 401 })
        if (!allow(`cart:${clientIp(req.headers)}:${req.user.id}`, 120, 60 * 1000)) return Response.json({ error: 'Slow down' }, { status: 429 })
        const body = (await req.json?.().catch(() => null)) as { items?: unknown; mode?: string } | null
        const incoming = (Array.isArray(body?.items) ? body.items : [])
          .map((i) => ({ sku: String((i as { sku?: unknown }).sku ?? '').slice(0, 80), qty: Math.floor(Number((i as { qty?: unknown }).qty) || 0) }))
          .filter((i) => i.sku && i.qty > 0)
          .slice(0, 60)
        const me = await req.payload.findByID({ collection: 'users', id: req.user.id, depth: 0, overrideAccess: true })
        const current = (Array.isArray(me.cart) ? me.cart : []) as { sku: string; qty: number }[]
        let next = incoming
        if (body?.mode !== 'replace') {
          // Merge: keep the larger quantity of each item
          const map = new Map(current.map((i) => [i.sku, i.qty]))
          for (const i of incoming) map.set(i.sku, Math.max(map.get(i.sku) ?? 0, i.qty))
          next = [...map].map(([sku, qty]) => ({ sku, qty }))
        }
        const { loadLines } = await import('../lib/checkout/server')
        const { views, issues } = await loadLines(req.payload, next)
        const saved = views.map((v) => ({ sku: v.sku, qty: v.qty }))
        if (JSON.stringify(saved) !== JSON.stringify(current)) {
          await req.payload.update({ collection: 'users', id: req.user.id, data: { cart: saved }, overrideAccess: true, req })
        }
        return Response.json({ lines: views, issues })
      },
    },
    {
      // POST /api/users/wishlist { slugs: string[], mode: 'merge' | 'replace' } → the account's wishlist (TOS-203)
      path: '/wishlist',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return Response.json({ error: 'Sign in first' }, { status: 401 })
        if (!allow(`wishlist:${clientIp(req.headers)}:${req.user.id}`, 120, 60 * 1000)) return Response.json({ error: 'Slow down' }, { status: 429 })
        const body = (await req.json?.().catch(() => null)) as { slugs?: unknown; mode?: string } | null
        const incoming = (Array.isArray(body?.slugs) ? body.slugs : []).filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]{1,120}$/.test(s))
        const me = await req.payload.findByID({ collection: 'users', id: req.user.id, depth: 0, overrideAccess: true })
        const current = Array.isArray(me.wishlist) ? (me.wishlist as string[]) : []
        const next = (body?.mode === 'replace' ? incoming : [...new Set([...current, ...incoming])]).slice(0, 200)
        if (next.join() !== current.join()) {
          await req.payload.update({ collection: 'users', id: req.user.id, data: { wishlist: next }, overrideAccess: true, req })
        }
        return Response.json({ slugs: next })
      },
    },
  ],
  fields: [
    { name: 'fullName', type: 'text', label: 'Full name', maxLength: 80 },
    {
      name: 'phone',
      type: 'text',
      label: 'Mobile number',
      admin: { description: 'Sri Lankan mobile, e.g. +94 77 123 4567. Used for SMS / WhatsApp order updates.' },
      validate: (value: string | null | undefined) =>
        !value || /^(\+94|0)?7\d{8}$/.test(value.replace(/[\s-]/g, '')) || 'Enter a valid Sri Lankan mobile number',
    },
    {
      name: 'addresses',
      type: 'array',
      maxRows: 10,
      labels: { singular: 'Address', plural: 'Address book' },
      admin: { description: 'Delivery addresses (TOS-304). The default one is pre-selected at checkout.', initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', defaultValue: 'Home', maxLength: 30, admin: { width: '30%' } },
            { name: 'recipientName', type: 'text', required: true, maxLength: 80, admin: { width: '40%' } },
            {
              name: 'phone',
              type: 'text',
              required: true,
              admin: { width: '30%' },
              validate: (v: string | null | undefined) => !v || /^(\+94|0)?7\d{8}$/.test(v.replace(/[\s-]/g, '')) || 'Enter a valid Sri Lankan mobile number',
            },
          ],
        },
        { name: 'line1', label: 'Address line 1', type: 'text', required: true, maxLength: 120 },
        { name: 'line2', label: 'Address line 2', type: 'text', maxLength: 120 },
        {
          type: 'row',
          fields: [
            { name: 'city', type: 'text', required: true, maxLength: 60, admin: { width: '35%' } },
            { name: 'district', type: 'select', required: true, options: DISTRICT_NAMES, admin: { width: '35%' } },
            { name: 'postalCode', type: 'text', maxLength: 10, admin: { width: '30%' } },
          ],
        },
        { name: 'landmark', type: 'text', maxLength: 120, admin: { description: 'Helps the courier, e.g. "Opposite the Cargills Food City".' } },
        { name: 'isDefault', type: 'checkbox', defaultValue: false },
      ],
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
      label: 'Agreed to receive offers',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'marketingChannels',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Email', value: 'email' },
        { label: 'SMS', value: 'sms' },
        { label: 'WhatsApp', value: 'whatsapp' },
      ],
      admin: { position: 'sidebar', condition: (data) => Boolean(data?.marketingOptIn) },
    },
    { name: 'marketingConsentAt', type: 'date', admin: { position: 'sidebar', readOnly: true, description: 'When consent was last given or withdrawn (PDPA).' } },
    {
      name: 'deletionRequestedAt',
      type: 'date',
      access: { update: ({ req, id }) => isStaff(req.user) || String(req.user?.id) === String(id) },
      admin: { position: 'sidebar', readOnly: true, description: 'Customer asked for their account to be deleted (process within 14 days).' },
    },
    { name: 'wishlist', type: 'json', admin: { hidden: true } },
    { name: 'cart', type: 'json', admin: { hidden: true } },
    { name: 'staffNote', type: 'textarea', access: { read: staffOnly, update: staffOnly }, admin: { position: 'sidebar' } },
  ],
  timestamps: true,
}
