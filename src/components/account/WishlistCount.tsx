'use client'

import { IconArrowRight, IconHeart } from '@tabler/icons-react'
import Link from 'next/link'

import { useShop } from '@/lib/store/shop'

export function WishlistCount() {
  const { wishlist, hydrated } = useShop()
  return (
    <Link href="/wishlist" className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-soft transition-shadow hover:shadow-card">
      <span className="flex items-center justify-between">
        <span className="grid size-11 place-items-center rounded-full bg-rose-50 text-rose-600">
          <IconHeart size={22} />
        </span>
        <IconArrowRight size={18} className="text-ink-400 transition-transform group-hover:translate-x-1" />
      </span>
      <span className="text-lg font-bold">Wishlist</span>
      <span className="text-sm text-ink-600">
        {!hydrated ? 'Loading…' : wishlist.length ? `${wishlist.length} saved product${wishlist.length === 1 ? '' : 's'}, synced to your account` : 'Tap the heart on any product to save it.'}
      </span>
    </Link>
  )
}
