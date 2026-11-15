import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyListing, ListingPage } from '@/components/catalog/ListingPage'
import { RailSection } from '@/components/home/RailSection'
import { RecentlyViewed } from '@/components/product/RecentlyViewed'
import { popularSearches } from '@/config/navigation'
import { parseListParams, type RawSearchParams } from '@/lib/catalog/params'
import { activeFilterChips, clearFiltersHref, getSearchListing, listProducts } from '@/lib/catalog/server'

type Props = { searchParams: Promise<RawSearchParams> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = parseListParams(await searchParams).q
  return { title: q ? `Search: ${q}` : 'Search', robots: { index: false, follow: true } }
}

/**
 * Search results (TOS-201/207): typo-tolerant matching on brand, name, category, concerns and gift
 * taxonomies, best match first, with the same filters as any listing. Zero results never dead-end:
 * an automatic spelling correction, popular searches, bestsellers and recently viewed products.
 */
export default async function SearchPage({ searchParams }: Props) {
  const lp = parseListParams(await searchParams)
  const { result, facets, scopeToken, corrected, matched } = await getSearchListing(lp)
  const noMatch = Boolean(lp.q) && matched === 0
  const fallback = noMatch ? (await listProducts({ sort: 'bestsellers', limit: 12 })).products : []

  return (
    <>
      <ListingPage
        eyebrow={lp.q ? 'Search results' : undefined}
        title={corrected ? `“${corrected}”` : lp.q ? `“${lp.q}”` : 'Search'}
        breadcrumbs={[]}
        result={result}
        sort={lp.sort}
        basePath="/search"
        params={lp.keep}
        facets={matched ? facets : []}
        scopeToken={scopeToken}
        filters={await activeFilterChips('/search', lp.keep, facets)}
        clearHref={clearFiltersHref('/search', lp.keep)}
        notice={
          corrected ? (
            <p className="mb-5 rounded-xl bg-sunset-50 px-4 py-3 text-ink-800">
              No exact matches for <strong>“{lp.q}”</strong>. Showing results for{' '}
              <Link href={`/search?q=${encodeURIComponent(corrected)}`} className="font-bold text-sunset-700 underline underline-offset-4">
                {corrected}
              </Link>
              .
            </p>
          ) : null
        }
        empty={
          noMatch ? (
            <div className="flex flex-col gap-6">
              <EmptyListing
                title={`No matches for “${lp.q}”`}
                text="Check the spelling, try a brand (CeraVe), a product type (sunscreen, sneakers) or a concern (dark spots). Can’t find it? Ask us on WhatsApp and we’ll source it."
              />
              <div>
                <p className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-500">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((s) => (
                    <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="inline-flex h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-medium hover:border-ink-900">
                      {s}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : lp.q ? (
            <EmptyListing title="No matches for these filters" text="Try removing a filter, or clear them all to see every match." />
          ) : (
            <EmptyListing title="What are you looking for?" text="Search by brand, product, category or concern, e.g. “centella”, “sneakers” or “birthday gifts”." />
          )
        }
      />
      {fallback.length > 0 && <RailSection id="search-bestsellers" eyebrow="Shoppers love these" title="Bestsellers right now" products={fallback} tone="cream" />}
      {(noMatch || !lp.q) && <RecentlyViewed />}
    </>
  )
}
