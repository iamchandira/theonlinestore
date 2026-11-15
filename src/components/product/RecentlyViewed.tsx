'use client'

import { RailSection } from '@/components/home/RailSection'
import { useShop } from '@/lib/store/shop'
import { useProductCards } from '@/lib/store/useProductCards'

/** "Recently viewed" rail (TOS-205), from this device's history. Renders nothing until there is history. */
export function RecentlyViewed({ excludeSlug, title = 'Recently viewed' }: { excludeSlug?: string; title?: string }) {
  const { recentlyViewed, hydrated } = useShop()
  const slugs = recentlyViewed.filter((s) => s !== excludeSlug).slice(0, 12)
  const { products } = useProductCards(slugs, hydrated)
  if (!products.length) return null
  return <RailSection id="recently-viewed" eyebrow="Pick up where you left off" title={title} products={products} />
}
