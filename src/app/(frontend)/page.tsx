import { IconClockHour4 } from '@tabler/icons-react'

import { BestSellers } from '@/components/home/BestSellers'
import { BrandMarquee } from '@/components/home/BrandMarquee'
import { CategoryTiles } from '@/components/home/CategoryTiles'
import { ConcernChips } from '@/components/home/ConcernChips'
import { DermSpotlight } from '@/components/home/DermSpotlight'
import { GiftFinder } from '@/components/home/GiftFinder'
import { Hero } from '@/components/home/Hero'
import { Newsletter } from '@/components/home/Newsletter'
import { PromoBanners } from '@/components/home/PromoBanners'
import { RailSection } from '@/components/home/RailSection'
import { UspStrip } from '@/components/home/UspStrip'
import { Countdown } from '@/components/ui/Countdown'
import { collections } from '@/lib/catalog'

/**
 * Home page section order follows the shopper's questions:
 * what do you sell → can I trust you → what's a good deal → what's popular → help me choose → stay in touch.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryTiles />
      <UspStrip />
      <RailSection
        id="deals-title"
        eyebrow="Today only"
        title="Deals of the day"
        action={{ label: 'All offers', href: '/offers' }}
        products={collections.deals}
        headerExtra={
          <div className="flex items-center gap-2 whitespace-nowrap rounded-full bg-rose-50 py-1 pl-3 pr-1 text-sm font-semibold text-rose-700">
            <IconClockHour4 size={18} /> Ends in
            <Countdown endsAt="midnight" tone="dark" compact />
          </div>
        }
      />
      <RailSection
        id="kbeauty-title"
        eyebrow="Seoul to Colombo"
        title="Trending in K-Beauty"
        description="Centella, snail mucin and niacinamide heroes from SKIN1004, Medicube, Anua and COSRX."
        action={{ label: 'Shop K-Beauty', href: '/c/skincare?tag=k-beauty' }}
        products={collections.kbeauty}
        tone="blush"
      />
      <ConcernChips />
      <PromoBanners />
      <BestSellers />
      <DermSpotlight />
      <BrandMarquee />
      <GiftFinder />
      <RailSection
        id="under3000-title"
        eyebrow="Little luxuries"
        title="Under Rs 2,999"
        action={{ label: 'See more', href: '/c/beauty?max=2999' }}
        products={collections.under3000}
        tone="cream"
      />
      <RailSection id="new-title" eyebrow="Just landed" title="New arrivals" action={{ label: 'View all', href: '/c/beauty?sort=new' }} products={collections.newArrivals} />
      <Newsletter />
    </>
  )
}
