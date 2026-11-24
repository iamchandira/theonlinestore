import type { ServerProps } from 'payload'

import { hasRole, ROLES, type Role } from '../../access/roles'
import { NavClient, type NavItemDef } from './NavClient'

/**
 * The Online Store admin sidebar (replaces Payload's default Nav).
 * Built on the server so it can show only what the signed-in role can access, plus live badges.
 * Areas (Orders, Products, Settings…) open into sub menus; the area holding the current page opens by itself.
 * Modules that arrive in later sprints are listed (muted, "Soon") so staff can see the roadmap.
 */
export async function Nav(props: ServerProps) {
  const { payload, user, visibleEntities } = props
  if (!payload || !user) return null
  const can = (slug: string) => visibleEntities?.collections?.includes(slug as never) ?? false
  const canGlobal = (slug: string) => visibleEntities?.globals?.includes(slug as never) ?? false

  const [lowStock, drafts, pendingReviews, openOrders, slipsToCheck, openReturns] = await Promise.all([
    can('products') ? payload.count({ collection: 'products', where: { and: [{ lowStock: { equals: true } }, { _status: { equals: 'published' } }] } }) : null,
    can('products') ? payload.count({ collection: 'products', where: { _status: { equals: 'draft' } } }) : null,
    can('reviews') ? payload.count({ collection: 'reviews', where: { status: { equals: 'pending' } } }) : null,
    can('orders') ? payload.count({ collection: 'orders', where: { status: { in: ['processing', 'pending-payment'] } }, overrideAccess: true }) : null,
    can('payment-slips') ? payload.count({ collection: 'payment-slips', where: { status: { equals: 'pending' } }, overrideAccess: true }) : null,
    can('returns') ? payload.count({ collection: 'returns', where: { status: { in: ['requested', 'approved'] } }, overrideAccess: true }) : null,
  ])

  const badge = (n?: number | null) => (n ? String(n) : undefined)
  const danger = 'danger' as const
  const when = <T,>(ok: boolean, item: T): T[] => (ok ? [item] : [])

  // Sidebar: a few top-level areas, each opening into its pages (sub menus). Empty areas are dropped.
  const items: NavItemDef[] = [
    { label: 'Home', href: '/admin', icon: 'home', exact: true },
    {
      label: 'Orders',
      icon: 'orders',
      children: [
        ...when(can('orders'), { label: 'All orders', href: '/admin/collections/orders', icon: 'orders', badge: badge(openOrders?.totalDocs), badgeTone: danger }),
        ...when(can('returns'), { label: 'Returns', href: '/admin/collections/returns', icon: 'returns', badge: badge(openReturns?.totalDocs), badgeTone: danger }),
        ...when(can('transactions'), {
          label: 'Transactions',
          href: '/admin/collections/transactions',
          icon: 'transactions',
          also: ['/admin/collections/payment-slips'],
          badge: slipsToCheck?.totalDocs ? `${slipsToCheck.totalDocs} slip${slipsToCheck.totalDocs > 1 ? 's' : ''}` : undefined,
          badgeTone: danger,
        }),
        ...when(can('orders') && hasRole(user, 'admin', 'store-manager', 'support', 'order-fulfillment'), { label: 'COD reconciliation', href: '/admin/cod', icon: 'cod' }),
      ],
    },
    ...when(can('users'), { label: 'Customers', href: '/admin/collections/users', icon: 'customers', unless: 'view=staff' }),
    {
      label: 'Products',
      icon: 'products',
      children: [
        ...when(can('products'), { label: 'All products', href: '/admin/collections/products', icon: 'products', badge: drafts?.totalDocs ? `${drafts.totalDocs} draft` : undefined }),
        // Inventory is for roles that work with stock (RBAC matrix)
        ...when(can('products') && hasRole(user, 'admin', 'store-manager', 'inventory-manager', 'order-fulfillment', 'support'), {
          label: 'Inventory',
          href: '/admin/inventory',
          icon: 'inventory',
          badge: badge(lowStock?.totalDocs),
          badgeTone: danger,
        }),
        ...when(can('stock-movements'), { label: 'Stock history', href: '/admin/collections/stock-movements', icon: 'history' }),
        ...when(can('reviews'), { label: 'Reviews', href: '/admin/collections/reviews', icon: 'reviews', badge: badge(pendingReviews?.totalDocs), badgeTone: danger }),
        ...when(can('products'), { label: 'Import / export', href: '/admin/import-export', icon: 'import' }),
      ],
    },
    {
      label: 'Catalogue setup',
      icon: 'categories',
      children: [
        ...when(can('categories'), { label: 'Categories', href: '/admin/collections/categories', icon: 'categories' }),
        ...when(can('brands'), { label: 'Brands', href: '/admin/collections/brands', icon: 'brands' }),
        ...when(can('tags'), { label: 'Tags', href: '/admin/collections/tags', icon: 'tags' }),
        ...when(can('occasions'), { label: 'Occasions', href: '/admin/collections/occasions', icon: 'gift' }),
        ...when(can('recipients'), { label: 'Recipients', href: '/admin/collections/recipients', icon: 'recipients' }),
        ...when(can('concerns'), { label: 'Beauty concerns', href: '/admin/collections/concerns', icon: 'concerns' }),
      ],
    },
    ...when(can('discounts'), { label: 'Discounts', href: '/admin/collections/discounts', icon: 'discounts' }),
    {
      label: 'Content',
      icon: 'homepage',
      children: [
        ...when(canGlobal('home-page'), { label: 'Home page', href: '/admin/globals/home-page', icon: 'homepage' }),
        ...when(can('media'), { label: 'Media library', href: '/admin/collections/media', icon: 'media' }),
        { label: 'Pages & blog', icon: 'pages', soon: 'Sprint 9' },
      ],
    },
    {
      label: 'Insights',
      icon: 'analytics',
      children: [
        ...when(can('search-queries'), { label: 'Search insights', href: '/admin/search-insights', icon: 'search' }),
        ...when(can('chat-conversations'), { label: 'Chat conversations', href: '/admin/collections/chat-conversations', icon: 'chat' }),
        ...when(can('chat-blocks'), { label: 'Chat blocks', href: '/admin/collections/chat-blocks', icon: 'block' }),
        { label: 'Analytics', icon: 'analytics', soon: 'Sprint 8' },
      ],
    },
    {
      label: 'Settings',
      icon: 'settings',
      children: [
        ...when(canGlobal('store-settings'), { label: 'Store details', href: '/admin/globals/store-settings', icon: 'store' }),
        ...when(canGlobal('payment-settings'), { label: 'Payments', href: '/admin/globals/payment-settings', icon: 'payments' }),
        ...when(canGlobal('checkout-settings'), { label: 'Checkout & delivery', href: '/admin/globals/checkout-settings', icon: 'shipping' }),
        ...when(can('couriers'), { label: 'Couriers', href: '/admin/collections/couriers', icon: 'couriers' }),
        ...when(canGlobal('policies'), { label: 'Policies', href: '/admin/globals/policies', icon: 'policies' }),
        ...when(canGlobal('chat-settings'), { label: 'Chat assistant', href: '/admin/globals/chat-settings', icon: 'assistant' }),
        ...when(can('users'), { label: 'Staff & roles', href: '/admin/collections/users?view=staff', icon: 'staff', match: 'view=staff' }),
        ...when(can('audit-logs'), { label: 'Audit log', href: '/admin/collections/audit-logs', icon: 'audit' }),
        { label: 'Notifications', icon: 'notifications', soon: 'Sprint 7' },
      ],
    },
  ]
  // An area with nothing this role can open (only "Soon" entries, or nothing at all) is left out
  const visible = items.filter((i) => !i.children || i.children.some((c) => c.href))

  const u = user as { email?: string; fullName?: string | null; roles?: Role[]; id: number | string }
  const roleLabel = ROLES.find((r) => u.roles?.includes(r.value))?.label ?? 'Staff'
  const name = u.fullName || u.email?.split('@')[0] || 'Staff'

  return (
    <NavClient
      items={visible}
      user={{ name, email: u.email ?? '', role: roleLabel, initials: name.slice(0, 2).toUpperCase(), href: `/admin/collections/users/${u.id}` }}
    />
  )
}
