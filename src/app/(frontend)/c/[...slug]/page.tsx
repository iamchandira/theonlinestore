import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { EmptyListing, ListingPage } from '@/components/catalog/ListingPage'
import { site } from '@/config/site'
import { parseListParams, type RawSearchParams } from '@/lib/catalog/params'
import { BEAUTY_SLUGS, buildFilterChips, getCategoryByPath, getCategoryTree, listProducts } from '@/lib/catalog/server'

type Props = { params: Promise<{ slug: string[] }>; searchParams: Promise<RawSearchParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const cat = await getCategoryByPath(slug)
  if (!cat) return { title: 'Category not found' }
  return {
    title: `${cat.node.name} in Sri Lanka`,
    description: cat.node.description ?? `Shop genuine ${cat.node.name.toLowerCase()} online at ${site.name}. Island-wide delivery, cash on delivery and Koko / Mintpay instalments.`,
    alternates: { canonical: cat.node.href },
  }
}

/** Category listing (TOS-105). /c/skincare, /c/skincare/serums and the virtual /c/beauty department. */
export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const cat = await getCategoryByPath(slug)
  if (!cat) notFound()
  const { node, ids, breadcrumbs } = cat
  const lp = parseListParams(sp)
  const result = await listProducts({
    categoryIds: ids,
    concernSlug: lp.concern,
    tagSlug: lp.tag,
    maxPrice: lp.maxPrice,
    sort: lp.sort,
    page: lp.page,
  })

  // Chips: children of this category, or siblings when we're on a leaf
  const { roots, bySlug } = await getCategoryTree()
  const parent = node.parentId ? [...bySlug.values()].find((n) => n.id === node.parentId) : null
  const chipSource = node.children.length ? node : parent
  const chips = chipSource
    ? [
        { label: `All ${chipSource.name}`, href: chipSource.href, active: chipSource.slug === node.slug },
        ...chipSource.children.map((c) => ({ label: c.name, href: c.href, active: c.slug === node.slug })),
      ]
    : roots.slice(0, 8).map((r) => ({ label: r.name, href: r.href }))

  // Beauty categories sit under the virtual Beauty department in the breadcrumb trail
  const rootSlug = (breadcrumbs[0]?.href ?? node.href).split('/')[2]
  const trail = node.slug === 'beauty' ? [] : BEAUTY_SLUGS.includes(rootSlug) ? [{ name: 'Beauty', href: '/c/beauty' }, ...breadcrumbs] : breadcrumbs

  return (
    <ListingPage
      title={node.name}
      description={node.description ?? node.blurb}
      breadcrumbs={trail}
      tint={node.tint}
      chips={chips}
      filters={await buildFilterChips(node.href, lp.keep)}
      result={result}
      sort={lp.sort}
      basePath={node.href}
      params={lp.keep}
      empty={
        lp.concern || lp.tag || lp.maxPrice ? (
          <EmptyListing title="No matches for these filters" text="Try removing a filter above, or browse the full range." />
        ) : (
          <EmptyListing title={`Our ${node.name.toLowerCase()} range is coming soon`} />
        )
      }
    />
  )
}
