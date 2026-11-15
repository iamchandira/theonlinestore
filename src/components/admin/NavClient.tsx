'use client'

import { useNav, usePreferences } from '@payloadcms/ui'
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
  IconHeartHandshake,
  IconLayoutSidebarLeftCollapse,
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
  IconFileText,
  IconFileImport,
  IconFileCertificate,
  IconListSearch,
  IconMessageStar,
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, type ComponentType } from 'react'

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
  recipients: IconHeartHandshake,
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
  reviews: IconMessageStar,
  import: IconFileImport,
  search: IconListSearch,
  audit: IconFileCertificate,
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

export function NavClient({
  groups,
  user,
}: {
  groups: NavGroupDef[]
  user: { name: string; email: string; role: string; initials: string; href: string }
}) {
  const { navOpen, hydrated, shouldAnimate, navRef, setNavOpen } = useNav()
  const { getPreference, setPreference } = usePreferences()
  const pathname = usePathname()
  const search = useSearchParams()
  const query = decodeURIComponent(search.toString())

  /**
   * Shopify-style: on desktop (≥1025 px) the sidebar stays open unless the user collapsed it.
   * Payload closes the nav on every screen ≤1440 px and only remembers the choice above that,
   * so we keep our own "collapsed by the user" flag, backed by the same `nav` preference.
   */
  const navPref = useRef<'unknown' | 'open' | 'collapsed'>('unknown')
  const isDesktop = () => window.matchMedia('(min-width: 1025px)').matches
  useEffect(() => {
    let alive = true
    void getPreference<{ open?: boolean } | null>('nav').then((pref) => {
      // Ignore a late answer if the user already toggled the sidebar themselves
      if (!alive || navPref.current !== 'unknown') return
      navPref.current = pref?.open === false ? 'collapsed' : 'open'
      if (isDesktop()) setNavOpen(navPref.current === 'open')
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    // Nothing is decided until the saved preference has loaded
    if (!hydrated || navPref.current === 'unknown' || !isDesktop()) return
    if (navOpen && navPref.current === 'collapsed') {
      // Reopened with Payload's toggle (it only saves the choice above 1440 px)
      navPref.current = 'open'
      void setPreference('nav', { open: true }, true)
    } else if (!navOpen && navPref.current === 'open') {
      // Payload auto-closed it on a ≤1440 px screen: keep the sidebar
      setNavOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, navOpen])
  useEffect(() => {
    // A click on Payload's menu button is always the user's choice: save it straight away, even before the
    // saved preference has loaded (otherwise a slow answer would close the sidebar they just opened).
    const onClick = (e: MouseEvent) => {
      if (!isDesktop() || !(e.target as Element | null)?.closest?.('.template-default__nav-toggler')) return
      const next = !navOpen
      navPref.current = next ? 'open' : 'collapsed'
      void setPreference('nav', { open: next }, true)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navOpen])

  // Phones/tablets: the sidebar is a drawer over the page; tapping outside it closes it
  useEffect(() => {
    if (!navOpen || isDesktop()) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      if (!navRef.current?.contains(t) && !t.closest('.nav-toggler')) setNavOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [navOpen, navRef, setNavOpen])

  const collapse = () => {
    if (isDesktop()) {
      navPref.current = 'collapsed'
      void setPreference('nav', { open: false }, true)
    }
    setNavOpen(false)
  }

  const isActive = (item: NavItemDef) => {
    if (!item.href) return false
    const path = item.href.split('?')[0]
    if (item.exact) return pathname === path
    const onPath = [path, ...(item.also ?? [])].some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
    if (!onPath) return false
    if (item.match) return query.includes(item.match) || pathname !== path
    // Users list without a role filter: don't highlight both Customers and Staff
    return true
  }

  const classes = [
    'nav',
    'tos-nav',
    navOpen && 'nav--nav-open',
    shouldAnimate && 'nav--nav-animate',
    hydrated && 'nav--nav-hydrated',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={classes} inert={!navOpen ? true : undefined}>
      <div className="nav__scroll" ref={navRef}>
        <nav className="tos-nav__inner" aria-label="Admin">
          <div className="tos-nav__brand">
            <Link href="/admin" aria-label="Dashboard">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-header.png" alt="The Online Store" />
            </Link>
            <button
              type="button"
              className="tos-nav__collapse"
              onClick={collapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <IconLayoutSidebarLeftCollapse size={20} stroke={1.75} />
            </button>
          </div>
          <button
            type="button"
            className="tos-nav__search"
            onClick={() => window.dispatchEvent(new Event('tos:cmdk'))}
            aria-keyshortcuts="Meta+K Control+K"
          >
            <IconSearch size={17} stroke={1.75} className="tos-nav__search-icon" />
            <span className="tos-nav__search-text">Search</span>
            <span className="tos-nav__search-keys" aria-hidden>
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </span>
          </button>

          {groups.map((g, gi) => (
            <div key={g.label ?? gi} className="tos-nav__group">
              {g.label && <div className="tos-nav__label">{g.label}</div>}
              {g.items.map((item) => {
                const Icon = ICONS[item.icon] ?? IconBox
                if (item.soon || !item.href) {
                  return (
                    <span
                      key={item.label}
                      className="tos-nav__link tos-nav__link--soon"
                      title={`Coming in ${item.soon}`}
                      aria-disabled="true"
                    >
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
                    {item.badge && (
                      <span
                        className={`tos-nav__badge${item.badgeTone === 'danger' ? '' : ' tos-nav__badge--soon'}`}
                      >
                        {item.badge}
                      </span>
                    )}
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
