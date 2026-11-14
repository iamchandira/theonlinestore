import { IconClockHour4 } from '@tabler/icons-react'

import { BestSellers } from '@/components/home/BestSellers'
import { BrandMarquee } from '@/components/home/BrandMarquee'
import { CategoryTiles } from '@/components/home/CategoryTiles'
import { OccasionChips } from '@/components/home/OccasionChips'
import { DermSpotlight } from '@/components/home/DermSpotlight'
import { GiftFinder } from '@/components/home/GiftFinder'
import { Hero } from '@/components/home/Hero'
import { Newsletter } from '@/components/home/Newsletter'
import { PromoBanners } from '@/components/home/PromoBanners'
import { RailSection } from '@/components/home/RailSection'
import { UspStrip } from '@/components/home/UspStrip'
import { Countdown } from '@/components/ui/Countdown'
import { getBrands, getHomeData, type HomeData } from '@/lib/catalog/server'

/** Re-rendered at most every 10 minutes; catalogue and Home page edits revalidate it immediately. */
export const revalidate = 600

function Rails({ rails }: { rails: HomeData['railsTop'] }) {
  return rails.map((r) => (
    <RailSection
      key={r.id}
      id={`rail-${r.id}`}
      eyebrow={r.eyebrow ?? undefined}
      title={r.title}
      description={r.description ?? undefined}
      action={{ label: r.linkLabel || 'View all', href: r.href }}
      products={r.products}
      tone={r.style}
      headerExtra={
        r.countdown ? (
          <div className="flex items-center gap-2 whitespace-nowrap rounded-full bg-rose-50 py-1 pl-3 pr-1 text-sm font-semibold text-rose-700">
            <IconClockHour4 size={18} /> Ends in
            <Countdown endsAt="midnight" tone="dark" compact />
          </div>
        ) : undefined
      }
    />
  ))
}

/**
 * Home page section order follows the shopper's questions:
 * what do you sell → can I trust you → what's a good deal → what's popular → help me choose → stay in touch.
 * Hero products and rails are managed in the admin (Content › Home page).
 */
export default async function HomePage() {
  const [data, brands] = await Promise.all([getHomeData(), getBrands()])
  return (
    <>
      <Hero picks={data.heroPicks} />
      <CategoryTiles tileImages={data.tileImages} />
      <UspStrip />
      <Rails rails={data.railsTop} />
      <GiftFinder />
      <OccasionChips />
      <PromoBanners sale={data.saleFeature} gift={data.giftFeature} />
      <BestSellers products={data.bestsellers} />
      <Rails rails={data.railsBottom} />
      <DermSpotlight products={data.derm} />
      <BrandMarquee brands={brands.map((b) => ({ name: b.name, slug: b.slug }))} />
      <Newsletter />
    </>
  )
}
