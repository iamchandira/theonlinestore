import type { Access, FieldAccess, PayloadRequest } from 'payload'

/**
 * Role-based access control (RBAC). Full matrix: docs/06-rbac-matrix.md
 * Roles are stored on the user (saved to the JWT), and a user may hold several.
 */
export const ROLES = [
  { label: 'Super Admin', value: 'super-admin' },
  { label: 'Admin', value: 'admin' },
  { label: 'Store Manager', value: 'store-manager' },
  { label: 'Inventory Manager', value: 'inventory-manager' },
  { label: 'Order Fulfilment', value: 'order-fulfillment' },
  { label: 'Marketing & Content', value: 'marketing' },
  { label: 'Customer Support', value: 'support' },
  { label: 'Customer', value: 'customer' },
] as const

export type Role = (typeof ROLES)[number]['value']

/** Every role except `customer` may sign in to /admin. */
export const STAFF_ROLES: Role[] = ['super-admin', 'admin', 'store-manager', 'inventory-manager', 'order-fulfillment', 'marketing', 'support']

type MaybeUser = PayloadRequest['user']

export const userRoles = (user: MaybeUser): Role[] => ((user as { roles?: Role[] } | null)?.roles ?? []) as Role[]

export const hasRole = (user: MaybeUser, ...roles: Role[]) => {
  const mine = userRoles(user)
  // super-admin implicitly holds every role
  return mine.includes('super-admin') || roles.some((r) => mine.includes(r))
}

export const isStaff = (user: MaybeUser) => userRoles(user).some((r) => STAFF_ROLES.includes(r))

/* ---------- Collection-level helpers ---------- */
export const anyone: Access = () => true
export const isSuperAdmin: Access = ({ req }) => userRoles(req.user).includes('super-admin')
export const isAdmin: Access = ({ req }) => hasRole(req.user, 'admin')
export const allowRoles =
  (...roles: Role[]): Access =>
  ({ req }) =>
    hasRole(req.user, 'admin', ...roles)

/** Admins see everyone; other signed-in users see only themselves (row-level security). */
export const isAdminOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (hasRole(req.user, 'admin', 'support')) return true
  return { id: { equals: req.user.id } }
}

/* ---------- Field-level helpers ---------- */
export const fieldAdminOnly: FieldAccess = ({ req }) => hasRole(req.user, 'admin')
export const fieldSuperAdminOnly: FieldAccess = ({ req }) => userRoles(req.user).includes('super-admin')
