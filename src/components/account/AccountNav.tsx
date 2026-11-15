'use client'

import { IconHeart, IconLayoutDashboard, IconLogout, IconMapPin, IconPackage, IconShieldLock, IconUserCircle } from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useTransition } from 'react'

import { useAuth } from '@/lib/auth/AuthProvider'
import { cn } from '@/lib/utils/cn'

const LINKS = [
  { href: '/account', label: 'Overview', icon: IconLayoutDashboard, exact: true },
  { href: '/account/orders', label: 'Orders', icon: IconPackage },
  { href: '/account/addresses', label: 'Addresses', icon: IconMapPin },
  { href: '/wishlist', label: 'Wishlist', icon: IconHeart },
  { href: '/account/profile', label: 'Profile & password', icon: IconUserCircle },
  { href: '/account/privacy', label: 'Privacy & data', icon: IconShieldLock },
]

/** Account section navigation: a vertical list on desktop, a scrollable pill row on phones. */
export function AccountNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const [pending, start] = useTransition()
  // Phones: keep the current section's pill in view in the scrollable row
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [pathname])
  return (
    <nav ref={navRef} aria-label="Account" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-col md:gap-1 md:overflow-visible md:pb-0">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-11 shrink-0 items-center gap-3 rounded-full px-4 text-sm font-semibold transition-colors md:rounded-xl',
              active ? 'bg-ink-900 text-white md:bg-sunset-50 md:text-sunset-800' : 'border border-line-strong bg-surface text-ink-700 hover:border-ink-900 md:border-transparent md:bg-transparent md:hover:bg-ink-50',
            )}
          >
            <Icon size={19} className="shrink-0" aria-hidden />
            {label}
          </Link>
        )
      })}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await signOut()
            router.push('/')
            router.refresh()
          })
        }
        className="flex h-11 shrink-0 items-center gap-3 rounded-full border border-line-strong px-4 text-sm font-semibold text-ink-700 hover:border-ink-900 disabled:opacity-60 md:mt-3 md:rounded-xl md:border-transparent md:hover:bg-ink-50"
      >
        <IconLogout size={19} aria-hidden /> {pending ? 'Signing out…' : 'Sign out'}
      </button>
    </nav>
  )
}
