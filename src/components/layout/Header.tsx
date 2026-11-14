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
import { primaryNav } from '@/config/navigation'
import { site } from '@/config/site'
import { formatLKR } from '@/lib/format'
import { useShop } from '@/lib/store/shop'
import { cn } from '@/lib/utils/cn'

import { BeautyMega, BrandsMega } from './MegaMenu'
import { MobileMenu } from './MobileMenu'
import { SearchBox } from './SearchBox'

/**
 * Sticky header.
 *  - Row 1: logo · always-visible search · account / wishlist / bag (with running total)
 *  - Row 2 (desktop): category nav with mega-menus; hides while scrolling down, returns on scroll up
 *  - Mobile: menu · logo · bag, then full-width search
 */
export function Header() {
  const { itemCount, subtotal, wishlist, setCartOpen, cartIconRef, addPulse } = useShop()
  const [mega, setMega] = useState<null | 'beauty' | 'brands'>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setCompact(y > 24)
    setNavHidden(y > 180 && y > prev)
    if (y > prev && mega) setMega(null)
  })

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const openMega = (m: 'beauty' | 'brands') => {
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
          'sticky top-0 z-[60] border-b bg-surface/90 backdrop-blur-xl transition-[border-color,box-shadow] duration-300 supports-[backdrop-filter]:bg-surface/80',
          compact ? 'border-line shadow-soft' : 'border-transparent',
        )}
        onKeyDown={(e) => e.key === 'Escape' && setMega(null)}
      >
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[100] focus:rounded-full focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <div className={cn('container-site flex items-center gap-3 transition-[padding] duration-300 lg:gap-8', compact ? 'py-2' : 'py-3 lg:py-4')}>
          <button type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)} className="-ml-2 grid size-11 place-items-center rounded-full hover:bg-ink-50 lg:hidden">
            <IconMenu2 size={24} />
          </button>
          <Logo priority className={cn('transition-[height] duration-300', compact ? 'h-9 lg:h-10' : 'h-9 lg:h-12')} />

          <SearchBox className="hidden max-w-2xl flex-1 md:block" />

          <nav aria-label="Account and bag" className="ml-auto flex items-center gap-0.5 md:ml-0">
            <Link href="/track-order" className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-ink-50 xl:inline-flex">
              <IconPackage size={22} /> Track order
            </Link>
            <Link href="/account" aria-label="Account" className="hidden size-11 place-items-center rounded-full hover:bg-ink-50 md:grid">
              <IconUser size={23} />
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

        {/* Desktop category nav */}
        <motion.div
          initial={false}
          animate={{ height: navHidden ? 0 : 'auto', opacity: navHidden ? 0 : 1 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="hidden overflow-hidden lg:block"
        >
          <div className="container-site flex items-center justify-between border-t border-line">
            <nav aria-label="Shop categories">
              <ul className="flex items-center gap-1" onMouseLeave={scheduleClose}>
                {primaryNav.map((item) => (
                  <li key={item.label} onMouseEnter={() => (item.mega ? openMega(item.mega) : scheduleClose())}>
                    {item.mega ? (
                      <button
                        type="button"
                        aria-expanded={mega === item.mega}
                        aria-haspopup="true"
                        onClick={() => setMega(mega === item.mega ? null : item.mega)}
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
              Island-wide delivery in <strong className="font-semibold text-ink-900">{site.deliveryEstimate}</strong>
            </p>
          </div>
        </motion.div>

        <AnimatePresence>
          {mega && (
            <div className="absolute inset-x-0 top-full hidden lg:block" onMouseEnter={() => openMega(mega)} onMouseLeave={scheduleClose}>
              {mega === 'beauty' ? <BeautyMega onNavigate={() => setMega(null)} /> : <BrandsMega onNavigate={() => setMega(null)} />}
            </div>
          )}
        </AnimatePresence>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
