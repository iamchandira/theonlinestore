import type { Metadata } from 'next'

import { ListingPage } from '@/components/catalog/ListingPage'
import { parseListParams, type RawSearchParams } from '@/lib/catalog/params'
import { buildFilterChips, listProducts } from '@/lib/catalog/server'

export const metadata: Metadata = {
  title: 'Offers & deals',
  description: 'Today’s best deals on genuine skincare, haircare and body care in Sri Lanka.',
  alternates: { canonical: '/offers' },
}

export default async function OffersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const lp = parseListParams(await searchParams)
  const result = await listProducts({ onSale: true, concernSlug: lp.concern, tagSlug: lp.tag, maxPrice: lp.maxPrice, sort: lp.sort, page: lp.page })
  return (
    <ListingPage
      eyebrow="Limited time"
      title="Offers"
      description="Genuine brands at their best prices this week. Stock is limited, so deals end when they sell out."
      breadcrumbs={[]}
      tint="lips"
      filters={await buildFilterChips('/offers', lp.keep)}
      result={result}
      sort={lp.sort}
      basePath="/offers"
      params={lp.keep}
    />
  )
}
