import type { Metadata } from 'next'

import { WishlistView } from '@/components/product/WishlistView'
import type { RawSearchParams } from '@/lib/catalog/params'

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false, follow: false } }

/**
 * Wishlist (TOS-203). Saved on this device for guests; merged into the account at sign-in (Sprint 3).
 * `?items=slug,slug` opens a list someone shared, with "Save all to my wishlist".
 */
export default async function WishlistPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = (await searchParams).items
  const items = (Array.isArray(raw) ? raw[0] : raw)
    ?.split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{1,120}$/.test(s))
    .slice(0, 60)
  return <WishlistView shared={items?.length ? items : null} />
}
