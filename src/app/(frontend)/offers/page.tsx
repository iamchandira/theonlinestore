import type { Metadata } from 'next'

import { ListingPage } from '@/components/catalog/ListingPage'
import { parseListParams, type RawSearchParams } from '@/lib/catalog/params'
import { activeFilterChips, categoryFacetOptions, clearFiltersHref, getListing } from '@/lib/catalog/server'

export const metadata: Metadata = {
  title: 'Offers & deals',
  description: 'Today’s best deals on genuine skincare, haircare and body care in Sri Lanka.',
  alternates: { canonical: '/offers' },
}

export default async function OffersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const lp = parseListParams(await searchParams)
  const { result, facets, scopeToken } = await getListing({ onSale: true, tagSlug: lp.tag, categoryOptions: await categoryFacetOptions(null) }, lp)
  return (
    <ListingPage
      eyebrow="Limited time"
      title="Offers"
      description="Genuine brands at their best prices this week. Stock is limited, so deals end when they sell out."
      breadcrumbs={[]}
      tint="lips"
      filters={await activeFilterChips('/offers', lp.keep, facets)}
      clearHref={clearFiltersHref('/offers', lp.keep)}
      facets={facets}
      scopeToken={scopeToken}
      result={result}
      sort={lp.sort}
      basePath="/offers"
      params={lp.keep}
    />
  )
}
