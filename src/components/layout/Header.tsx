'use client'

import {
  IconChevronDown,
  IconHeart,
  IconMenu2,
  IconPackage,
  IconShoppingBag,
  IconTruckDelivery,
  IconUser,
} from '@tabler/icons-react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { Logo } from '@/components/brand/Logo'
import { CountBadge } from '@/components/ui/IconButton'
import { linkIsLive, primaryNav, type MegaKey } from '@/config/navigation'
import { useStoreSettings } from '@/lib/store/StoreSettingsProvider'
import type { NavData } from '@/lib/catalog/server'
import { formatLKR } from '@/lib/format'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useShop } from '@/lib/store/shop'
import { cn } from '@/lib/utils/cn'

import { BeautyMega, BrandsMega, DepartmentMega } from './MegaMenu'
import { MobileMenu } from './MobileMenu'
import { SearchBox } from './SearchBox'

/**
 * Sticky header.
 *  - Row 1: logo · always-visible search · account / wishlist / bag (with running total)
 *  - Row 2 (desktop): category nav with mega-menus; slides away while scrolling down, returns on scroll up
 *  - Mobile: menu · logo · bag, then full-width search
 *
 * IMPORTANT: the header's layout height never changes while scrolling. Hiding the category row or shrinking
 * the bar by changing height/padding made the browser's scroll anchoring shift scrollY, which flipped the
 * scroll direction and toggled the header back: a feedback loop that made the page jump (Sprint 0 bug).
 * The category row is therefore absolutely positioned and moved with transforms only, and an in-flow spacer
 * reserves its space at the top of the page.
 */
export function Header({ nav }: { nav: NavData }) {
  const { deliveryEstimate, categories: catSlugs } = useStoreSettings()
  const available = new Set(catSlugs)
  const nav_ = primaryNav.filter((i) => (i.mega === 'beauty' ? ['beauty', 'skincare', 'hair-care', 'body-care', 'lips'].some((x) => available.has(x)) : linkIsLive(i.href, available)))
  const { itemCount, subtotal, wishlist, setCartOpen, cartIconRef, addPulse } = useShop()
  const { user: authUser } = useAuth()
  const [mega, setMega] = useState<null | MegaKey>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const lastY = useRef(0)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (y) => {
    setCompact(y > 8)
    const delta = y - lastY.current
    // Hysteresis: ignore tiny movements (trackpad noise, momentum settle) so the row never flickers
    if (Math.abs(delta) < 12) return
    lastY.current = y
    const goingDown = delta > 0
    setNavHidden(goingDown && y > 160)
    if (goingDown && mega) setMega(null)
  })

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const openMega = (m: MegaKey) => {
    window.clearTimeout(closeTimer.current)
    setMega(m)
  }
  const scheduleClose = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setMega(null), 140)
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-[60] transition-shadow duration-300',
          compact && (navHidden ? 'shadow-soft' : 'max-lg:shadow-soft'),
        )}
        onKeyDown={(e) => e.key === 'Escape' && setMega(null)}
      >
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[100] focus:rounded-full focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        {/* Top bar sits above the sliding category row (z-10) and has an opaque background so the row hides beneath it */}
        <div className="relative z-10 border-b border-line bg-surface/95 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/85">
        <div className="container-site flex items-center gap-3 py-3 lg:gap-8">
          <button type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)} className="-ml-2 grid size-11 place-items-center rounded-full hover:bg-ink-50 lg:hidden">
            <IconMenu2 size={24} />
          </button>
          <Logo priority className="h-9 lg:h-11" />

          <SearchBox className="hidden max-w-2xl flex-1 md:block" />

          <nav aria-label="Account and bag" className="ml-auto flex items-center gap-0.5 md:ml-0">
            <Link href="/track-order" className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-ink-50 xl:inline-flex">
              <IconPackage size={22} /> Track order
            </Link>
            <Link
              href="/account"
              aria-label={authUser ? `Your account (${authUser.email})` : 'Sign in or create an account'}
              title={authUser ? 'Your account' : 'Sign in'}
              className="hidden size-11 place-items-center rounded-full hover:bg-ink-50 md:grid"
            >
              {authUser ? (
                <span aria-hidden className="grid size-8 place-items-center rounded-full bg-sunset-deep text-sm font-bold text-white">
                  {(authUser.fullName || authUser.email).charAt(0).toUpperCase()}
                </span>
              ) : (
                <IconUser size={23} />
              )}
            </Link>
            <Link href="/wishlist" aria-label={`Wishlist (${wishlist.length})`} className="relative hidden size-11 place-items-center rounded-full hover:bg-ink-50 md:grid">
              <IconHeart size={23} />
              {wishlist.length > 0 && <CountBadge count={wishlist.length} className="bg-rose-600" />}
            </Link>
            <button
              type="button"
              ref={cartIconRef as React.RefObject<HTMLButtonElement>}
              onClick={() => setCartOpen(true)}
              aria-label={`Open bag, ${itemCount} items, ${formatLKR(subtotal)}`}
              className="relative -mr-2 inline-flex h-11 items-center gap-2.5 rounded-full px-2.5 hover:bg-ink-50 md:mr-0 lg:pr-4"
            >
              <motion.span
                key={addPulse}
                initial={{ scale: addPulse ? 1.25 : 1, rotate: addPulse ? -10 : 0 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 12 }}
                className="relative"
              >
                <IconShoppingBag size={24} />
                {itemCount > 0 && <CountBadge count={itemCount} className="-right-2 -top-1.5" />}
              </motion.span>
              <span className="hidden text-left leading-tight lg:block" aria-hidden>
                <span className="block text-[0.6875rem] font-medium text-ink-500">Your bag</span>
                <span className="block text-sm font-bold tabular-nums">{formatLKR(subtotal)}</span>
              </span>
            </button>
          </nav>
        </div>

        {/* Mobile search: always visible, one tap away */}
        <div className="container-site pb-3 md:hidden">
          <SearchBox />
        </div>
        </div>

        {/* Desktop category nav: out of flow, slides with transform only (no layout shift) */}
        <motion.div
          initial={false}
          animate={{ y: navHidden ? '-100%' : '0%', opacity: navHidden ? 0 : 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden={navHidden || undefined}
          inert={navHidden || undefined}
          className={cn(
            'absolute inset-x-0 top-full hidden border-b border-line bg-surface/95 backdrop-blur-xl lg:block supports-[backdrop-filter]:bg-surface/85',
            compact && !navHidden && 'shadow-soft',
          )}
        >
          <div className="container-site flex items-center justify-between">
            <nav aria-label="Shop categories">
              <ul className="flex items-center gap-1" onMouseLeave={scheduleClose}>
                {nav_.map((item) => (
                  <li key={item.label} onMouseEnter={() => (item.mega ? openMega(item.mega) : scheduleClose())}>
                    {item.mega ? (
                      <button
                        type="button"
                        aria-expanded={mega === item.mega}
                        aria-haspopup="true"
                        onClick={() => setMega(mega === item.mega ? null : (item.mega ?? null))}
                        className={cn('inline-flex h-12 items-center gap-1 rounded-md px-3.5 text-[0.9375rem] font-semibold transition-colors hover:text-sunset-600', mega === item.mega && 'text-sunset-600')}
                      >
                        {item.label}
                        <IconChevronDown size={16} className={cn('transition-transform duration-200', mega === item.mega && 'rotate-180')} />
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          'inline-flex h-12 items-center rounded-md px-3.5 text-[0.9375rem] font-semibold transition-colors hover:text-sunset-600',
                          item.highlight && 'text-rose-600',
                        )}
                      >
                        {item.label}
                        {item.highlight && <span className="ml-1.5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase text-white">Sale</span>}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            <p className="flex items-center gap-2 text-sm text-ink-600">
              <IconTruckDelivery size={18} className="text-sunset-600" />
              Island-wide delivery in <strong className="font-semibold text-ink-900">{deliveryEstimate}</strong>
            </p>
          </div>
          <AnimatePresence>
            {mega && (
              <div className="absolute inset-x-0 top-full" onMouseEnter={() => openMega(mega)} onMouseLeave={scheduleClose}>
                {mega === 'beauty' ? (
                  <BeautyMega feature={nav.megaFeature} onNavigate={() => setMega(null)} />
                ) : mega === 'brands' ? (
                  <BrandsMega groups={nav.brandGroups} onNavigate={() => setMega(null)} />
                ) : (
                  <DepartmentMega slug={mega} feature={nav.features[mega] ?? null} onNavigate={() => setMega(null)} />
                )}
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </header>
      {/* Reserves the category row's height at the top of the page (the row itself is absolutely positioned) */}
      <div aria-hidden className="hidden h-12 lg:block" />

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
