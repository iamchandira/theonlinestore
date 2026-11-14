import type { Metadata } from 'next'

import { EmptyListing, ListingPage } from '@/components/catalog/ListingPage'
import { occasions, recipients } from '@/config/navigation'
import { parseListParams, type RawSearchParams } from '@/lib/catalog/params'
import { buildFilterChips, listProducts } from '@/lib/catalog/server'

type Props = { searchParams: Promise<RawSearchParams> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const lp = parseListParams(await searchParams)
  const r = recipients.find((x) => x.slug === lp.recipient)
  const o = occasions.find((x) => x.slug === lp.occasion)
  return {
    title: r ? `Gifts ${r.label.toLowerCase()}` : o ? `${o.label} gifts` : 'Gift shop',
    description: 'Gift ideas from every department: perfume, footwear, beauty, hampers and chocolates, delivered island-wide with free gift wrapping.',
    alternates: { canonical: '/gifts' },
  }
}

/**
 * Gift shop: products from EVERY department that suit a recipient, occasion or budget
 * (the Gift Finder, occasion chips and "Perfect for" links land here).
 */
export default async function GiftShopPage({ searchParams }: Props) {
  const lp = parseListParams(await searchParams)
  const anyFilter = lp.recipient || lp.occasion || lp.maxPrice
  const result = await listProducts({
    recipientSlug: lp.recipient,
    occasionSlug: lp.occasion,
    maxPrice: lp.maxPrice,
    // Without a filter, show the gift-ready range (anything tagged with a recipient or occasion is gift-worthy)
    giftReady: !anyFilter,
    sort: lp.sort,
    page: lp.page,
  })
  const r = recipients.find((x) => x.slug === lp.recipient)
  const o = occasions.find((x) => x.slug === lp.occasion)
  const title = r ? `Gifts ${r.label.toLowerCase()}` : o ? `${o.label} gifts` : 'Gift shop'
  return (
    <ListingPage
      eyebrow="Gifting made easy"
      title={title}
      description="Ideas from every department, with free gift wrapping and a handwritten note on request. Delivered island-wide."
      breadcrumbs={lp.recipient || lp.occasion ? [{ name: 'Gift shop', href: '/gifts' }] : []}
      tint="gifts"
      chips={[
        { label: 'All gifts', href: '/gifts', active: !lp.recipient && !lp.occasion },
        ...recipients.map((x) => ({ label: x.label, href: `/gifts?recipient=${x.slug}`, active: x.slug === lp.recipient })),
      ]}
      filters={await buildFilterChips('/gifts', lp.keep)}
      result={result}
      sort={lp.sort}
      basePath="/gifts"
      params={lp.keep}
      empty={<EmptyListing title="No gifts match these filters yet" text="Try another recipient or occasion, or ask us on WhatsApp for a personal recommendation." />}
    />
  )
}
