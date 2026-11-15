import type { ServerProps } from 'payload'

import { ROLES, type Role } from '../../access/roles'
import { NavClient, type NavGroupDef } from './NavClient'

/**
 * The Online Store admin sidebar (replaces Payload's default Nav).
 * Built on the server so it can show only what the signed-in role can access, plus live badges.
 * Modules that arrive in later sprints are listed (muted, "Soon") so staff can see the roadmap.
 */
export async function Nav(props: ServerProps) {
  const { payload, user, visibleEntities } = props
  if (!payload || !user) return null
  const can = (slug: string) => visibleEntities?.collections?.includes(slug as never) ?? false
  const canGlobal = (slug: string) => visibleEntities?.globals?.includes(slug as never) ?? false

  const [lowStock, drafts, pendingReviews] = await Promise.all([
    can('products') ? payload.count({ collection: 'products', where: { and: [{ lowStock: { equals: true } }, { _status: { equals: 'published' } }] } }) : null,
    can('products') ? payload.count({ collection: 'products', where: { _status: { equals: 'draft' } } }) : null,
    can('reviews') ? payload.count({ collection: 'reviews', where: { status: { equals: 'pending' } } }) : null,
  ])

  const groups: NavGroupDef[] = [
    {
      items: [{ label: 'Home', href: '/admin', icon: 'home', exact: true }],
    },
    {
      label: 'Sales',
      items: [
        { label: 'Orders', icon: 'orders', soon: 'Sprint 4' },
        ...(can('users') ? [{ label: 'Customers', href: '/admin/collections/users?where[roles][contains]=customer', icon: 'customers', match: 'customer' }] : []),
        { label: 'Discounts', icon: 'discounts', soon: 'Sprint 4' },
      ],
    },
    {
      label: 'Catalogue',
      items: [
        ...(can('products') ? [{ label: 'Products', href: '/admin/collections/products', icon: 'products', badge: drafts?.totalDocs ? `${drafts.totalDocs} draft` : undefined }] : []),
        ...(can('products') ? [{ label: 'Inventory', href: '/admin/inventory', icon: 'inventory', badge: lowStock?.totalDocs ? String(lowStock.totalDocs) : undefined, badgeTone: 'danger' as const }] : []),
        ...(can('reviews')
          ? [{ label: 'Reviews', href: '/admin/collections/reviews', icon: 'reviews', badge: pendingReviews?.totalDocs ? String(pendingReviews.totalDocs) : undefined, badgeTone: 'danger' as const }]
          : []),
        ...(can('products') ? [{ label: 'Import / export', href: '/admin/import-export', icon: 'import' }] : []),
        ...(can('categories') ? [{ label: 'Categories', href: '/admin/collections/categories', icon: 'categories' }] : []),
        ...(can('brands') ? [{ label: 'Brands', href: '/admin/collections/brands', icon: 'brands' }] : []),
        ...(can('tags') ? [{ label: 'Tags', href: '/admin/collections/tags', icon: 'tags' }] : []),
        ...(can('occasions') ? [{ label: 'Occasions', href: '/admin/collections/occasions', icon: 'gift' }] : []),
        ...(can('recipients') ? [{ label: 'Recipients', href: '/admin/collections/recipients', icon: 'recipients' }] : []),
        ...(can('concerns') ? [{ label: 'Beauty concerns', href: '/admin/collections/concerns', icon: 'concerns' }] : []),
      ],
    },
    {
      label: 'Content',
      items: [
        ...(canGlobal('home-page') ? [{ label: 'Home page', href: '/admin/globals/home-page', icon: 'homepage' }] : []),
        ...(can('media') ? [{ label: 'Media library', href: '/admin/collections/media', icon: 'media' }] : []),
        { label: 'Pages & blog', icon: 'pages', soon: 'Sprint 9' },
      ],
    },
    {
      label: 'Insights',
      items: [
        ...(can('search-queries') ? [{ label: 'Search insights', href: '/admin/search-insights', icon: 'search' }] : []),
        { label: 'Analytics', icon: 'analytics', soon: 'Sprint 8' },
        ...(can('stock-movements') ? [{ label: 'Stock history', href: '/admin/collections/stock-movements', icon: 'history' }] : []),
      ],
    },
    {
      label: 'Settings',
      items: [
        ...(can('users') ? [{ label: 'Staff & roles', href: '/admin/collections/users?where[roles][not_in]=customer', icon: 'staff', match: 'not_in' }] : []),
        { label: 'Payments', icon: 'payments', soon: 'Sprint 5' },
        { label: 'Shipping', icon: 'shipping', soon: 'Sprint 4' },
        { label: 'Notifications', icon: 'notifications', soon: 'Sprint 7' },
      ],
    },
  ]

  const u = user as { email?: string; fullName?: string | null; roles?: Role[]; id: number | string }
  const roleLabel = ROLES.find((r) => u.roles?.includes(r.value))?.label ?? 'Staff'
  const name = u.fullName || u.email?.split('@')[0] || 'Staff'

  return (
    <NavClient
      groups={groups.filter((g) => g.items.length)}
      user={{ name, email: u.email ?? '', role: roleLabel, initials: name.slice(0, 2).toUpperCase(), href: `/admin/collections/users/${u.id}` }}
    />
  )
}
