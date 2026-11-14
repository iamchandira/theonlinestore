import type { Metadata } from 'next'

import { EmptyListing, ListingPage } from '@/components/catalog/ListingPage'
import { parseListParams, type RawSearchParams } from '@/lib/catalog/params'
import { listProducts } from '@/lib/catalog/server'

export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } }

/** Basic search results (word matching on brand, name, category and concerns). Typo tolerance arrives in Sprint 2 (TOS-201). */
export default async function SearchPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const lp = parseListParams(await searchParams)
  const result = lp.q
    ? await listProducts({ q: lp.q, sort: lp.sort, page: lp.page })
    : { products: [], total: 0, page: 1, totalPages: 0, limit: 24 }
  return (
    <ListingPage
      eyebrow="Search results"
      title={lp.q ? `“${lp.q}”` : 'Search'}
      breadcrumbs={[]}
      result={result}
      sort={lp.sort}
      basePath="/search"
      params={lp.keep}
      empty={
        <EmptyListing
          title={lp.q ? `No matches for “${lp.q}” yet` : 'What are you looking for?'}
          text="Try a brand (CeraVe), a product type (sunscreen) or a concern (dark spots). Can’t find it? Ask us on WhatsApp and we’ll help."
        />
      }
    />
  )
}
