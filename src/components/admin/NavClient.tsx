'use client'

import { useNav, usePreferences } from '@payloadcms/ui'
import {
  IconAdjustmentsHorizontal,
  IconBuildingStore,
  IconCategory,
  IconChartBar,
  IconCreditCard,
  IconArrowsExchange,
  IconArrowBackUp,
  IconCoins,
  IconTruck,
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
  IconChevronDown,
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
import { useEffect, useRef, useState, type ComponentType } from 'react'

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
  transactions: IconArrowsExchange,
  returns: IconArrowBackUp,
  cod: IconCoins,
  couriers: IconTruck,
  store: IconBuildingStore,
  policies: IconFileText,
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
  /** …and the opposite: not active when the query contains this */
  unless?: string
  badge?: string
  badgeTone?: 'danger'
  soon?: string
  /** Pages inside this area (shown as a sub menu) */
  children?: NavItemDef[]
}

export function NavClient({
  items,
  user,
}: {
  items: NavItemDef[]
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

  const isActive = (item: NavItemDef): boolean => {
    if (item.children) return item.children.some(isActive)
    if (!item.href) return false
    const path = item.href.split('?')[0]
    if (item.exact) return pathname === path
    const onPath = [path, ...(item.also ?? [])].some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
    if (!onPath) return false
    if (item.match) return query.includes(item.match)
    if (item.unless) return !query.includes(item.unless)
    return true
  }

  /**
   * Sub menus: the area holding the current page opens by itself; anything the user opens or closes is
   * remembered (per user, like the sidebar itself).
   */
  const activeArea = items.find((i) => i.children && isActive(i))?.label
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  useEffect(() => {
    void getPreference<Record<string, boolean> | null>('tos-nav-areas').then((saved) => {
      if (!saved || typeof saved !== 'object') return
      // The area you're in always opens, even if it was closed last time
      const { [activeArea ?? '']: _current, ...rest } = saved
      setToggled((t) => ({ ...rest, ...(activeArea && saved[activeArea] ? { [activeArea]: true } : {}), ...t }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Arriving in an area (from a link, search or the dashboard) always shows its pages
  const [seenArea, setSeenArea] = useState(activeArea)
  if (activeArea !== seenArea) {
    setSeenArea(activeArea)
    if (activeArea && toggled[activeArea] === false) setToggled({ ...toggled, [activeArea]: true })
  }
  const isOpen = (label: string) => toggled[label] ?? label === activeArea
  const toggle = (label: string) => {
    const next = { ...toggled, [label]: !isOpen(label) }
    setToggled(next)
    void setPreference('tos-nav-areas', next, true)
  }

  const renderLink = (item: NavItemDef, sub = false) => {
    const Icon = ICONS[item.icon] ?? IconBox
    const cls = `tos-nav__link${sub ? ' tos-nav__link--sub' : ''}`
    if (item.soon || !item.href) {
      return (
        <span key={item.label} className={`${cls} tos-nav__link--soon`} title={`Coming in ${item.soon}`} aria-disabled="true">
          {!sub && <Icon size={19} stroke={1.75} />}
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
        className={`${cls}${active ? ' tos-nav__link--active' : ''}`}
        aria-current={active ? 'page' : undefined}
      >
        {!sub && <Icon size={19} stroke={1.75} />}
        {item.label}
        {item.badge && (
          <span className={`tos-nav__badge${item.badgeTone === 'danger' ? '' : ' tos-nav__badge--soon'}`}>{item.badge}</span>
        )}
      </Link>
    )
  }

  const renderArea = (area: NavItemDef) => {
    const Icon = ICONS[area.icon] ?? IconBox
    const open = isOpen(area.label)
    const active = isActive(area)
    const id = `tos-nav-${area.label.toLowerCase().replace(/[^a-z]+/g, '-')}`
    // Closed areas still show that something needs attention (orders to process, slips, low stock…)
    const alerts = (area.children ?? []).filter((c) => c.badge && c.badgeTone === 'danger').length
    return (
      <div key={area.label} className={`tos-nav__area${open ? ' tos-nav__area--open' : ''}`}>
        <button
          type="button"
          className={`tos-nav__link tos-nav__area-toggle${active ? ' tos-nav__area-toggle--active' : ''}`}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => toggle(area.label)}
        >
          <Icon size={19} stroke={1.75} />
          {area.label}
          {!open && alerts > 0 && <span className="tos-nav__dot" aria-label="Needs attention" />}
          <IconChevronDown size={16} stroke={2} className="tos-nav__chevron" />
        </button>
        <div id={id} className="tos-nav__sub" hidden={!open}>
          {area.children!.map((c) => renderLink(c, true))}
        </div>
      </div>
    )
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

          <div className="tos-nav__group">
            {items.map((item) => (item.children ? renderArea(item) : renderLink(item)))}
          </div>

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
