'use client'

import { useNav } from '@payloadcms/ui'
import {
  IconAdjustmentsHorizontal,
  IconBuildingStore,
  IconCategory,
  IconChartBar,
  IconCreditCard,
  IconDiscount,
  IconExternalLink,
  IconGift,
  IconHistory,
  IconHome,
  IconLayoutDashboard,
  IconLogout,
  IconPhoto,
  IconBell,
  IconBox,
  IconPackages,
  IconReceipt,
  IconSearch,
  IconShieldLock,
  IconSparkles,
  IconTag,
  IconTruckDelivery,
  IconUsers,
  IconX,
  IconFileText,
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, type ComponentType } from 'react'

const ICONS: Record<string, ComponentType<{ size?: number; stroke?: number }>> = {
  home: IconHome,
  orders: IconReceipt,
  customers: IconUsers,
  discounts: IconDiscount,
  products: IconBox,
  inventory: IconPackages,
  categories: IconCategory,
  brands: IconBuildingStore,
  tags: IconTag,
  gift: IconGift,
  concerns: IconSparkles,
  homepage: IconLayoutDashboard,
  media: IconPhoto,
  pages: IconFileText,
  analytics: IconChartBar,
  history: IconHistory,
  staff: IconShieldLock,
  payments: IconCreditCard,
  shipping: IconTruckDelivery,
  notifications: IconBell,
  settings: IconAdjustmentsHorizontal,
}

export type NavItemDef = {
  label: string
  href?: string
  icon: string
  exact?: boolean
  /** Extra paths that should also mark this item active */
  also?: string[]
  /** Distinguishes two links to the same collection by query (customers vs staff) */
  match?: string
  badge?: string
  badgeTone?: 'danger'
  soon?: string
}
export type NavGroupDef = { label?: string; items: NavItemDef[] }

export function NavClient({ groups, user }: { groups: NavGroupDef[]; user: { name: string; email: string; role: string; initials: string; href: string } }) {
  const { navOpen, hydrated, shouldAnimate, navRef, setNavOpen } = useNav()
  const pathname = usePathname()
  const search = useSearchParams()
  const query = decodeURIComponent(search.toString())

  // Shopify-style: the sidebar is always there on desktop (Payload may have remembered a collapsed state)
  useEffect(() => {
    if (hydrated && !navOpen && window.matchMedia('(min-width: 1025px)').matches) setNavOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  const isActive = (item: NavItemDef) => {
    if (!item.href) return false
    const path = item.href.split('?')[0]
    if (item.exact) return pathname === path
    const onPath = [path, ...(item.also ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`))
    if (!onPath) return false
    if (item.match) return query.includes(item.match) || pathname !== path
    // Users list without a role filter: don't highlight both Customers and Staff
    return true
  }

  const classes = ['nav', 'tos-nav', navOpen && 'nav--nav-open', shouldAnimate && 'nav--nav-animate', hydrated && 'nav--nav-hydrated'].filter(Boolean).join(' ')

  return (
    <aside className={classes} inert={!navOpen ? true : undefined}>
      <div className="nav__scroll" ref={navRef}>
        <nav className="tos-nav__inner" aria-label="Admin">
          <div className="tos-nav__brand">
            <Link href="/admin" aria-label="Dashboard">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-header.png" alt="The Online Store" />
            </Link>
            <button type="button" className="tos-nav__close" onClick={() => setNavOpen(false)} aria-label="Close menu">
              <IconX size={20} />
            </button>
          </div>
          <button type="button" className="tos-nav__search" onClick={() => window.dispatchEvent(new Event('tos:cmdk'))}>
            <IconSearch size={16} />
            <span>Search…</span>
            <kbd>⌘K</kbd>
          </button>

          {groups.map((g, gi) => (
            <div key={g.label ?? gi} className="tos-nav__group">
              {g.label && <div className="tos-nav__label">{g.label}</div>}
              {g.items.map((item) => {
                const Icon = ICONS[item.icon] ?? IconBox
                if (item.soon || !item.href) {
                  return (
                    <span key={item.label} className="tos-nav__link tos-nav__link--soon" title={`Coming in ${item.soon}`} aria-disabled="true">
                      <Icon size={19} stroke={1.75} />
                      {item.label}
                      <span className="tos-nav__badge tos-nav__badge--soon">Soon</span>
                    </span>
                  )
                }
                const active = isActive(item)
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    prefetch={false}
                    className={`tos-nav__link${active ? ' tos-nav__link--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={19} stroke={1.75} />
                    {item.label}
                    {item.badge && <span className={`tos-nav__badge${item.badgeTone === 'danger' ? '' : ' tos-nav__badge--soon'}`}>{item.badge}</span>}
                  </Link>
                )
              })}
            </div>
          ))}

          <div className="tos-nav__footer">
            <a className="tos-nav__link" href="/" target="_blank" rel="noopener noreferrer">
              <IconExternalLink size={19} stroke={1.75} />
              View store
            </a>
            <Link className="tos-nav__link" href="/admin/logout" prefetch={false}>
              <IconLogout size={19} stroke={1.75} />
              Log out
            </Link>
            <Link className="tos-nav__user" href={user.href} prefetch={false}>
              <span className="tos-avatar" aria-hidden>
                {user.initials}
              </span>
              <span>
                <span className="tos-nav__user-name">{user.name}</span>
                <span className="tos-nav__user-role">{user.role}</span>
              </span>
            </Link>
          </div>
        </nav>
      </div>
    </aside>
  )
}
