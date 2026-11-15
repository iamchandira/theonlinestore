import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ListingPage } from '@/components/catalog/ListingPage'
import { site } from '@/config/site'
import { parseListParams, type RawSearchParams } from '@/lib/catalog/params'
import { activeFilterChips, categoryFacetOptions, clearFiltersHref, getBrandBySlug, getBrands, getListing } from '@/lib/catalog/server'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> }

export async function generateStaticParams() {
  return (await getBrands()).map((b) => ({ slug: b.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = await getBrandBySlug((await params).slug)
  if (!brand) return { title: 'Brand not found' }
  return {
    title: `${brand.name} in Sri Lanka: genuine products`,
    description: brand.description ?? `Shop 100% genuine ${brand.name} at ${site.name}, with island-wide delivery and cash on delivery.`,
    alternates: { canonical: `/brands/${brand.slug}` },
  }
}

/** Brand listing (TOS-105). */
export default async function BrandPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const brand = await getBrandBySlug(slug)
  if (!brand) notFound()
  const lp = parseListParams(sp)
  const { result, facets, scopeToken } = await getListing({ brandSlug: slug, tagSlug: lp.tag, categoryOptions: await categoryFacetOptions(null) }, lp)
  const basePath = `/brands/${slug}`
  return (
    <ListingPage
      eyebrow="Authorised & genuine"
      title={brand.name}
      description={brand.description ?? `Every ${brand.name} product we sell is 100% genuine, sourced from authorised suppliers.`}
      breadcrumbs={[{ name: 'Brands', href: '/brands' }]}
      tint="sky"
      filters={await activeFilterChips(basePath, lp.keep, facets)}
      clearHref={clearFiltersHref(basePath, lp.keep)}
      facets={facets}
      scopeToken={scopeToken}
      result={result}
      sort={lp.sort}
      basePath={basePath}
      params={lp.keep}
    />
  )
}
