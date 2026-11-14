'use client'

import { IconCategory, IconHeart, IconHome, IconShoppingBag, IconUser } from '@tabler/icons-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { CountBadge } from '@/components/ui/IconButton'
import { useShop } from '@/lib/store/shop'
import { cn } from '@/lib/utils/cn'

/**
 * Thumb-zone navigation for phones. Five destinations, labels always visible,
 * active indicator animates between tabs with a shared layoutId.
 */
export function MobileBottomNav() {
  const pathname = usePathname()
  const { itemCount, wishlist, setCartOpen } = useShop()

  const items = [
    { href: '/', label: 'Home', icon: IconHome },
    { href: '/categories', label: 'Categories', icon: IconCategory },
    { href: '/wishlist', label: 'Wishlist', icon: IconHeart, count: wishlist.length },
    { href: '#bag', label: 'Bag', icon: IconShoppingBag, count: itemCount, onClick: () => setCartOpen(true) },
    { href: '/account', label: 'Account', icon: IconUser },
  ]

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-[55] border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, count, onClick }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const inner = (
            <>
              {active && <motion.span layoutId="bottom-nav-pill" className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-sunset-600" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
              <span className="relative">
                <Icon size={23} stroke={active ? 2.2 : 1.8} />
                {count ? <CountBadge count={count} className="-right-2.5 -top-1.5" /> : null}
              </span>
              <span className="text-[0.6875rem] font-semibold">{label}</span>
            </>
          )
          const cls = cn('relative flex h-16 flex-col items-center justify-center gap-0.5', active ? 'text-sunset-700' : 'text-ink-600')
          return (
            <li key={label}>
              {onClick ? (
                <button type="button" onClick={onClick} className={cn(cls, 'w-full')} aria-label={`${label} (${count ?? 0} items)`}>
                  {inner}
                </button>
              ) : (
                <Link href={href} className={cls} aria-current={active ? 'page' : undefined}>
                  {inner}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
