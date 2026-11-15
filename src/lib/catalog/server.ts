import 'server-only'

import config from '@payload-config'
import { getPayload, type Where } from 'payload'
import { after } from 'next/server'
import { cache } from 'react'

import type { Brand, Category, Concern, Media, Occasion, Product as PProduct, Recipient, Tag } from '@/payload-types'

import { encodeScope, loadPage, runFacets, type FacetGroup, type ListScope } from './facets'
import type { parseListParams } from './params'
import { didYouMean, logSearch, searchProductIds } from './search'
import type { BrandSummary, CategoryNode, Crumb, ListResult, Product, ProductDetail, SortKey } from './types'

/**
 * Server-only catalogue access through Payload's Local API (no HTTP hop).
 * Functions are wrapped in React `cache()` so repeated calls in one render share a single query.
 * Only published products are ever returned to the storefront.
 */

export const getPayloadClient = cache(async () => getPayload({ config }))

const PUBLISHED: Where = { _status: { equals: 'published' } }
import { BEAUTY_SLUGS } from '@/config/navigation'
export { BEAUTY_SLUGS }

/* ------------------------------------------------------------------ mapping */

const asObj = <T,>(v: unknown): T | null => (v && typeof v === 'object' ? (v as T) : null)

/**
 * Payload returns absolute media URLs (it knows its serverURL). Same-site URLs are made relative so
 * next/image treats them as local files on every environment; remote URLs (a future CDN) pass through.
 */
const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const relativeUrl = (u?: string | null) => (u ? (u.startsWith(SITE_ORIGIN) ? u.slice(SITE_ORIGIN.length) : u) : '')

function mediaUrls(m: unknown) {
  const media = asObj<Media>(m)
  const url = relativeUrl(media?.url)
  return {
    image: relativeUrl(media?.sizes?.card?.url) || url,
    imageLarge: relativeUrl(media?.sizes?.large?.url) || url,
    alt: media?.alt ?? '',
  }
}

function categoryInfo(cats: PProduct['categories']) {
  const first = asObj<Category>(cats?.[0])
  const crumbs = first?.breadcrumbs ?? []
  const topUrl = crumbs[0]?.url ?? (first ? `/${first.slug}` : '')
  return {
    category: topUrl.replace(/^\//, '').split('/')[0] || 'skincare',
    subcategory: first?.slug ?? '',
    breadcrumbs: crumbs.map((c) => ({ name: c.label ?? '', href: `/c${c.url}` })) as Crumb[],
  }
}

export function toProduct(doc: PProduct): Product {
  const brand = asObj<Brand>(doc.brand)
  const { category, subcategory } = categoryInfo(doc.categories)
  return {
    id: doc.id,
    slug: doc.slug ?? String(doc.id),
    brand: brand?.name ?? '',
    brandSlug: brand?.slug ?? '',
    name: doc.name,
    category,
    subcategory,
    concerns: (doc.concerns ?? []).map((c) => asObj<Concern>(c)?.slug).filter(Boolean) as string[],
    tags: (doc.tags ?? []).map((t) => asObj<Tag>(t)?.slug).filter(Boolean) as string[],
    badge: (doc.badge ?? null) as Product['badge'],
    productType: (doc.productType ?? 'beauty') as Product['productType'],
    isDemo: Boolean(doc.isDemo),
    recipients: (doc.recipients ?? []).map((r) => asObj<Recipient>(r)?.slug).filter(Boolean) as string[],
    occasions: (doc.occasions ?? []).map((o) => asObj<Occasion>(o)?.slug).filter(Boolean) as string[],
    rating: doc.rating ?? 0,
    reviewCount: doc.reviewCount ?? 0,
    priceTBC: Boolean(doc.priceTBC),
    variants: (doc.variants ?? []).map((v) => {
      const { image, imageLarge } = mediaUrls(v.image)
      return {
        sku: v.sku,
        option: doc.optionName ?? 'Size',
        label: v.label,
        option2Name: doc.option2Name ?? null,
        option2: v.option2 ?? null,
        price: v.price,
        compareAtPrice: v.compareAtPrice ?? null,
        stock: v.stock ?? 0,
        image,
        imageLarge,
      }
    }),
  }
}

const GENDER: Record<string, string> = { women: 'Women', men: 'Men', unisex: 'Unisex', kids: 'Kids' }

/** Key facts per product type, shown as a compact "Details" list on the product page. */
function productFacts(doc: PProduct): [string, string][] {
  const d = doc.details ?? {}
  const facts: [string, string | null | undefined][] = []
  switch (doc.productType) {
    case 'fragrance':
      facts.push(['Concentration', d.concentration], ['Scent family', d.scentFamily], ['Longevity', d.longevity], ['For', d.gender ? GENDER[d.gender] : null])
      break
    case 'footwear':
      facts.push(['Style', d.footwearStyle], ['Material', d.material], ['For', d.gender ? GENDER[d.gender] : null], ['Sizes', d.sizeSystem ? `${d.sizeSystem} sizing` : null])
      break
    case 'chocolate':
      facts.push(
        ['Net weight', d.netWeight ? `${d.netWeight} g` : null],
        ['Cocoa', d.cocoaPercent ? `${d.cocoaPercent}%` : null],
        ['Origin', d.origin],
        ['Dietary', d.dietary?.length ? d.dietary.join(', ') : null],
      )
      break
    case 'gift':
      facts.push(['Gift-wrapped', d.giftWrapped ? 'Yes, arrives ready to give' : null], ['Personalisation', d.personalisable ? 'Free message card' : null])
      break
    case 'accessory':
      facts.push(['For', d.gender ? GENDER[d.gender] : null])
      break
  }
  return facts.filter((f): f is [string, string] => Boolean(f[1]))
}

function toDetail(doc: PProduct): ProductDetail {
  const base = toProduct(doc)
  const { breadcrumbs } = categoryInfo(doc.categories)
  const variantImages = new Set(base.variants.map((v) => v.image))
  return {
    ...base,
    shortDescription: doc.shortDescription ?? '',
    description: doc.description ?? null,
    benefits: (doc.benefits ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
    howToUse: doc.howToUse ?? '',
    ingredients: doc.ingredients ?? '',
    gallery: (doc.gallery ?? []).map(mediaUrls).filter((g) => g.image && !variantImages.has(g.image)),
    breadcrumbs,
    concernLabels: (doc.concerns ?? []).map((c) => asObj<Concern>(c)).filter(Boolean).map((c) => ({ slug: c!.slug ?? '', name: c!.name })),
    recipientLabels: (doc.recipients ?? []).map((c) => asObj<Recipient>(c)).filter(Boolean).map((c) => ({ slug: c!.slug ?? '', name: c!.name })),
    occasionLabels: (doc.occasions ?? []).map((c) => asObj<Occasion>(c)).filter(Boolean).map((c) => ({ slug: c!.slug ?? '', name: c!.name })),
    facts: productFacts(doc),
    notes:
      doc.details?.topNotes || doc.details?.heartNotes || doc.details?.baseNotes
        ? { top: doc.details?.topNotes ?? '', heart: doc.details?.heartNotes ?? '', base: doc.details?.baseNotes ?? '' }
        : null,
    contents: (doc.details?.contents ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
    fit: doc.details?.fit ?? '',
    storage: doc.details?.storage ?? '',
    allergens: doc.details?.allergens ?? '',
    metaTitle: doc.meta?.title ?? null,
    metaDescription: doc.meta?.description ?? null,
    updatedAt: doc.updatedAt,
  }
}

/* --------------------------------------------------------------- categories */

export const getCategoryTree = cache(async (): Promise<{ roots: CategoryNode[]; bySlug: Map<string, CategoryNode> }> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'categories', limit: 0, pagination: false, depth: 0, sort: 'order' })
  const nodes = new Map<number, CategoryNode>()
  for (const c of docs) {
    const url = c.breadcrumbs?.at(-1)?.url ?? `/${c.slug}`
    nodes.set(c.id, {
      id: c.id,
      slug: c.slug ?? '',
      name: c.name,
      blurb: c.blurb ?? null,
      description: c.description ?? null,
      tint: c.tint ?? 'skincare',
      href: `/c${url}`,
      parentId: typeof c.parent === 'number' ? c.parent : (asObj<Category>(c.parent)?.id ?? null),
      children: [],
    })
  }
  const roots: CategoryNode[] = []
  for (const n of nodes.values()) {
    const parent = n.parentId ? nodes.get(n.parentId) : null
    if (parent) parent.children.push(n)
    else roots.push(n)
  }
  const bySlug = new Map([...nodes.values()].map((n) => [n.slug, n]))
  return { roots, bySlug }
})

const descendantIds = (node: CategoryNode): number[] => [node.id, ...node.children.flatMap(descendantIds)]

/** Resolve /c/[...segments]; "beauty" is a virtual department spanning the beauty categories. */
export const getCategoryByPath = cache(async (segments: string[]) => {
  const { bySlug } = await getCategoryTree()
  const last = segments.at(-1) ?? ''
  if (last === 'beauty' && segments.length === 1) {
    const children = BEAUTY_SLUGS.map((s) => bySlug.get(s)).filter(Boolean) as CategoryNode[]
    return {
      node: {
        id: 0,
        slug: 'beauty',
        name: 'Beauty',
        blurb: 'Skincare, haircare, body care and lips',
        description: 'Genuine K-beauty, derm-approved skincare and everyday favourites, delivered island-wide.',
        tint: 'skincare',
        href: '/c/beauty',
        parentId: null,
        children,
      } satisfies CategoryNode,
      ids: children.flatMap(descendantIds),
      breadcrumbs: [] as Crumb[],
    }
  }
  const node = bySlug.get(last)
  if (!node) return null
  const trail: Crumb[] = []
  let cur: CategoryNode | undefined = node
  while (cur) {
    trail.unshift({ name: cur.name, href: cur.href })
    cur = cur.parentId ? [...bySlug.values()].find((n) => n.id === cur!.parentId) : undefined
  }
  return { node, ids: descendantIds(node), breadcrumbs: trail.slice(0, -1) }
})

/* ----------------------------------------------------------------- products */

const SORTS: Record<SortKey, string> = {
  recommended: '-salesCount',
  bestsellers: '-salesCount',
  new: '-createdAt',
  'price-asc': 'minPrice',
  'price-desc': '-minPrice',
  rating: '-rating',
}

export type ListOptions = {
  categoryIds?: number[]
  brandSlug?: string
  tagSlug?: string
  concernSlug?: string
  recipientSlug?: string
  occasionSlug?: string
  productType?: string
  /** Only gift-worthy products (those with a recipient or occasion set) */
  giftReady?: boolean
  onSale?: boolean
  maxPrice?: number
  q?: string
  slugs?: string[]
  excludeIds?: number[]
  sort?: SortKey
  page?: number
  limit?: number
}

/** Slug → id, memoised per request (filters on brand / tag / concern need the id). */
const idsBySlug = cache(async (collection: 'brands' | 'tags' | 'concerns' | 'recipients' | 'occasions', slug: string) => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0, select: { slug: true } })
  return res.docs[0]?.id ?? -1
})

export const listProducts = cache(async (opts: ListOptions = {}): Promise<ListResult> => {
  const payload = await getPayloadClient()
  const and: Where[] = [PUBLISHED]
  if (opts.categoryIds?.length) and.push({ categories: { in: opts.categoryIds } })
  if (opts.brandSlug) and.push({ brand: { equals: await idsBySlug('brands', opts.brandSlug) } })
  if (opts.tagSlug) and.push({ tags: { in: [await idsBySlug('tags', opts.tagSlug)] } })
  if (opts.concernSlug) and.push({ concerns: { in: [await idsBySlug('concerns', opts.concernSlug)] } })
  if (opts.recipientSlug) and.push({ recipients: { in: [await idsBySlug('recipients', opts.recipientSlug)] } })
  if (opts.occasionSlug) and.push({ occasions: { in: [await idsBySlug('occasions', opts.occasionSlug)] } })
  if (opts.productType) and.push({ productType: { equals: opts.productType } })
  if (opts.giftReady) and.push({ or: [{ recipients: { exists: true } }, { occasions: { exists: true } }] })
  if (opts.onSale) and.push({ onSale: { equals: true } })
  if (opts.maxPrice) and.push({ minPrice: { less_than_equal: opts.maxPrice } })
  if (opts.slugs?.length) and.push({ slug: { in: opts.slugs } })
  if (opts.excludeIds?.length) and.push({ id: { not_in: opts.excludeIds } })
  if (opts.q) {
    for (const term of opts.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6)) and.push({ searchText: { like: term } })
  }
  const limit = opts.limit ?? 24
  const res = await payload.find({
    collection: 'products',
    where: { and },
    sort: SORTS[opts.sort ?? 'recommended'],
    limit,
    page: opts.page ?? 1,
    depth: 1,
  })
  let products = res.docs.map(toProduct)
  // Keep hand-picked order when listing by slugs
  if (opts.slugs?.length) products = opts.slugs.map((s) => products.find((p) => p.slug === s)).filter(Boolean) as Product[]
  return { products, total: res.totalDocs, page: res.page ?? 1, totalPages: res.totalPages, limit }
})

export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'products', where: { and: [PUBLISHED, { slug: { equals: slug } }] }, limit: 1, depth: 2 })
  return res.docs[0] ? toDetail(res.docs[0]) : null
})

/** "Pairs well with": hand-picked cross-sells, else products sharing a concern in other subcategories. */
export const getCrossSells = cache(async (slug: string, limit = 8): Promise<Product[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'products', where: { and: [PUBLISHED, { slug: { equals: slug } }] }, limit: 1, depth: 2 })
  const doc = res.docs[0]
  if (!doc) return []
  const picked = (doc.crossSells ?? []).map((c) => asObj<PProduct>(c)).filter((p): p is PProduct => Boolean(p && p._status === 'published'))
  if (picked.length) return picked.slice(0, limit).map(toProduct)
  const concernIds = (doc.concerns ?? []).map((c) => (typeof c === 'number' ? c : c.id))
  const firstCat = doc.categories?.[0]
  const catId = typeof firstCat === 'number' ? firstCat : firstCat?.id
  if (!concernIds.length) return []
  const auto = await payload.find({
    collection: 'products',
    where: { and: [PUBLISHED, { id: { not_equals: doc.id } }, { concerns: { in: concernIds } }, ...(catId ? [{ categories: { not_in: [catId] } }] : [])] },
    sort: '-salesCount',
    limit,
    depth: 1,
  })
  return auto.docs.map(toProduct)
})

/**
 * "Upgrade your pick" (upsells, TOS-204): hand-picked upsells, else bestsellers from the same
 * sub-category priced 15%–200% above this product (a natural step up, not a different budget).
 */
export const getUpsells = cache(async (product: Product, limit = 8): Promise<Product[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'products', where: { and: [PUBLISHED, { id: { equals: product.id } }] }, limit: 1, depth: 2, select: { upsells: true } })
  const picked = ((res.docs[0]?.upsells as unknown[]) ?? []).map((u) => asObj<PProduct>(u)).filter((p): p is PProduct => Boolean(p && p._status === 'published'))
  if (picked.length) return picked.slice(0, limit).map(toProduct)
  const { bySlug } = await getCategoryTree()
  const leaf = bySlug.get(product.subcategory)
  if (!leaf) return []
  const base = Math.min(...product.variants.map((v) => v.price))
  const pool = await listProducts({ categoryIds: descendantIds(leaf), excludeIds: [product.id], sort: 'bestsellers', limit: 40 })
  return pool.products
    .filter((p) => {
      const price = Math.min(...p.variants.map((v) => v.price))
      return price >= base * 1.15 && price <= base * 3 && p.variants.some((v) => v.stock > 0)
    })
    .slice(0, limit)
})

/** "You may also like": same main category, best sellers first. */
export const getRelated = cache(async (product: Product, limit = 12): Promise<Product[]> => {
  const { bySlug } = await getCategoryTree()
  const node = bySlug.get(product.subcategory) ?? bySlug.get(product.category)
  if (!node) return []
  const parent = node.parentId ? [...bySlug.values()].find((n) => n.id === node.parentId) : node
  const ids = descendantIds(parent ?? node)
  return (await listProducts({ categoryIds: ids, excludeIds: [product.id], sort: 'bestsellers', limit })).products
})

export const getAllProductSlugs = cache(async () => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'products', where: PUBLISHED, limit: 0, pagination: false, depth: 0, select: { slug: true } })
  return res.docs.map((d) => d.slug).filter(Boolean) as string[]
})

/* ------------------------------------------------------------------- brands */

export const getBrands = cache(async (): Promise<BrandSummary[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'brands', limit: 0, pagination: false, depth: 0, sort: 'name' })
  return res.docs.map((b) => ({ id: b.id, name: b.name, slug: b.slug ?? '', group: b.group, description: b.description ?? null }))
})

export const getBrandBySlug = cache(async (slug: string) => (await getBrands()).find((b) => b.slug === slug) ?? null)

export const BRAND_GROUP_LABELS: Record<string, string> = {
  'k-beauty': 'K-Beauty',
  derm: 'Derm & Pharmacy',
  everyday: 'Everyday Favourites',
  fragrance: 'Fragrance',
  footwear: 'Footwear',
  gifts: 'Gifts & Chocolates',
}

/* ---------------------------------------------------------- page-level data */

type HomeRail = {
  id: string
  eyebrow?: string | null
  title: string
  description?: string | null
  linkLabel?: string | null
  href: string
  style: 'plain' | 'blush' | 'cream' | 'lilac'
  countdown: boolean
  products: Product[]
}

/** Everything the home page needs, driven by the Home page global (TOS-108) with automatic fallbacks. */
export const getHomeData = cache(async () => {
  const payload = await getPayloadClient()
  const home = await payload.findGlobal({ slug: 'home-page', depth: 2 })
  const tree = await getCategoryTree()

  const heroPicks = (home.heroProducts ?? [])
    .map((p) => asObj<PProduct>(p))
    .filter((p): p is PProduct => Boolean(p && p._status === 'published'))
    .map(toProduct)

  type Rail = HomeRail & { placement: 'top' | 'bottom' }
  const buildRail = async (r: NonNullable<typeof home.rails>[number], i: number): Promise<Rail | null> => {
    const limit = r.limit ?? 12
    let list: Product[] = []
    let href = '/c/beauty'
    switch (r.source) {
      case 'manual':
        list = (r.products ?? []).map((p) => asObj<PProduct>(p)).filter((p): p is PProduct => Boolean(p && p._status === 'published')).map(toProduct)
        break
      case 'sale':
        list = (await listProducts({ onSale: true, sort: 'bestsellers', limit })).products
        href = '/offers'
        break
      case 'bestsellers':
        list = (await listProducts({ sort: 'bestsellers', limit })).products
        href = '/c/beauty?sort=bestsellers'
        break
      case 'new':
        list = (await listProducts({ sort: 'new', limit })).products
        href = '/c/beauty?sort=new'
        break
      case 'tag': {
        const tag = asObj<Tag>(r.tag)
        if (tag?.slug) list = (await listProducts({ tagSlug: tag.slug, sort: 'bestsellers', limit })).products
        href = `/c/beauty?tag=${tag?.slug ?? ''}`
        break
      }
      case 'category': {
        const cat = asObj<Category>(r.category)
        const node = cat?.slug ? tree.bySlug.get(cat.slug) : null
        if (node) list = (await listProducts({ categoryIds: descendantIds(node), sort: 'bestsellers', limit })).products
        href = node?.href ?? href
        break
      }
      case 'under':
        list = (await listProducts({ maxPrice: r.maxPrice ?? 2999, sort: 'bestsellers', limit })).products
        href = `/c/beauty?max=${r.maxPrice ?? 2999}`
        break
    }
    if (!list.length) return null
    return {
      id: r.id ?? `rail-${i}`,
      eyebrow: r.eyebrow,
      title: r.title,
      description: r.description,
      linkLabel: r.linkLabel,
      href,
      style: (r.style ?? 'plain') as HomeRail['style'],
      countdown: Boolean(r.countdown),
      placement: (r.placement ?? 'top') as 'top' | 'bottom',
      products: list,
    }
  }
  // All rails are fetched in parallel
  const rails = (await Promise.all((home.rails ?? []).map(buildRail))).filter((r): r is Rail => Boolean(r))

  const [bestsellers, derm, tiles, saleFeature, giftFeature] = await Promise.all([
    listProducts({ sort: 'bestsellers', limit: 24 }),
    listProducts({ tagSlug: 'derm', sort: 'bestsellers', limit: 4 }),
    // Two product photos per department tile (beauty and lifestyle)
    Promise.all(
      tree.roots.map((r) => r.slug).map(async (slug) => {
        const node = tree.bySlug.get(slug)
        if (!node) return [slug, [] as string[]] as const
        const top = await listProducts({ categoryIds: descendantIds(node), sort: 'bestsellers', limit: 2 })
        return [slug, top.products.map((p) => p.variants[0]?.image).filter(Boolean)] as const
      }),
    ),
    listProducts({ onSale: true, categoryIds: tree.bySlug.get('body-care') ? descendantIds(tree.bySlug.get('body-care')!) : [], sort: 'bestsellers', limit: 1 }),
    tree.bySlug.get('gifts')
      ? listProducts({ categoryIds: descendantIds(tree.bySlug.get('gifts')!), sort: 'bestsellers', limit: 1 })
      : listProducts({ tagSlug: 'gift', sort: 'bestsellers', limit: 1 }),
  ])

  return {
    heroPicks: heroPicks.length ? heroPicks : bestsellers.products.slice(0, 4),
    railsTop: rails.filter((r) => r.placement === 'top'),
    railsBottom: rails.filter((r) => r.placement === 'bottom'),
    bestsellers: bestsellers.products.filter((p) => p.badge === 'bestseller').slice(0, 24),
    derm: derm.products,
    tileImages: Object.fromEntries(tiles) as Record<string, string[]>,
    saleFeature: saleFeature.products[0] ?? null,
    giftFeature: giftFeature.products[0] ?? null,
  }
})

export type HomeData = Awaited<ReturnType<typeof getHomeData>>

/** Header data: brand groups for the Brands mega-menu and a featured product for the Beauty mega-menu. */
export const getNavData = cache(async () => {
  const { bySlug } = await getCategoryTree()
  const departments = ['fragrances', 'footwear', 'gifts', 'chocolates']
  const [brands, beautyFeature, ...deptFeatures] = await Promise.all([
    getBrands(),
    listProducts({ tagSlug: 'trending', sort: 'bestsellers', limit: 1 }),
    ...departments.map((d) => {
      const node = bySlug.get(d)
      return node ? listProducts({ categoryIds: descendantIds(node), sort: 'bestsellers', limit: 1 }) : Promise.resolve(null)
    }),
  ])
  const groups: Record<string, { name: string; slug: string }[]> = {}
  for (const b of brands) (groups[BRAND_GROUP_LABELS[b.group] ?? 'More brands'] ??= []).push({ name: b.name, slug: b.slug })
  const features: Record<string, Product | null> = { beauty: beautyFeature.products[0] ?? null }
  departments.forEach((d, i) => (features[d] = deptFeatures[i]?.products[0] ?? null))
  return { brandGroups: groups, megaFeature: features.beauty, features }
})

export type NavData = Awaited<ReturnType<typeof getNavData>>

/** Small add-ons for the bag drawer ("Add a little extra"). */
export const getBagSuggestions = cache(async () => {
  const res = await listProducts({ maxPrice: 2999, sort: 'bestsellers', limit: 12 })
  return res.products.filter((p) => p.variants.length === 1).slice(0, 6)
})

/** Display name for a tag or concern slug (used by filter chips). */
export const getTaxonomyName = cache(async (collection: 'tags' | 'concerns' | 'recipients' | 'occasions', slug: string) => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  return res.docs[0]?.name ?? null
})

/* ------------------------------------------------------- faceted listings */

type ListParams = ReturnType<typeof parseListParams>

/**
 * The "Category" filter for a listing: the children of the current category, or (for listings that
 * span the store: search, offers, brands, gift shop) the top-level departments.
 */
export const categoryFacetOptions = cache(async (node?: CategoryNode | null) => {
  const { roots, bySlug } = await getCategoryTree()
  const source = node ? node.children : [...BEAUTY_SLUGS.map((s) => bySlug.get(s)).filter(Boolean), ...roots.filter((r) => !BEAUTY_SLUGS.includes(r.slug))]
  return (source as CategoryNode[]).map((c) => ({ slug: c.slug, name: c.name, ids: descendantIds(c) }))
})

/** Runs a faceted listing: filters, facet counts, sort, then loads the current page (24 per page). */
export async function getListing(scope: ListScope, lp: ListParams) {
  const payload = await getPayloadClient()
  const run = await runFacets(payload, scope, lp.filters, lp.sort)
  const result = await loadPage(payload, run.ids, toProduct, lp.page, 24)
  return { result, facets: run.facets, scopeToken: encodeScope(scope) }
}

/**
 * Search results page: typo-tolerant search, then the same facets as any listing; logs the search.
 * When nothing matches but a spelling correction does ("cervae" → "cerave"), the corrected results
 * are shown instead, Google-style.
 */
export async function getSearchListing(lp: ListParams) {
  const payload = await getPayloadClient()
  const q = lp.q ?? ''
  let searchIds = q ? await searchProductIds(payload, q) : []
  let corrected: string | null = null
  if (q && !searchIds.length) {
    const fix = await didYouMean(payload, q)
    const alt = fix ? await searchProductIds(payload, fix) : []
    if (fix && alt.length) {
      corrected = fix
      searchIds = alt
    }
  }
  const scope: ListScope = { searchIds, q: corrected ?? q, categoryOptions: await categoryFacetOptions(null) }
  const listing = await getListing(scope, lp)
  // Only the first page of an unfiltered search counts as "a search" for analytics
  if (q && lp.page === 1 && !lp.activeFilterCount) after(() => logSearch(payload, q, searchIds.length))
  return { ...listing, corrected, matched: searchIds.length }
}

const fmtRs = (n: number) => `Rs ${n.toLocaleString('en-LK')}`

/** Removable chips for every active filter (and the hidden ?tag= scope filter). */
export async function activeFilterChips(basePath: string, keep: Record<string, string>, facets: FacetGroup[]) {
  const chips: { label: string; removeHref: string }[] = []
  const href = (q: URLSearchParams) => `${basePath}${q.size ? `?${q}` : ''}`
  const without = (key: string, value?: string) => {
    const q = new URLSearchParams(keep)
    q.delete('page')
    if (value) {
      const rest = (q.get(key) ?? '').split(',').filter((v) => v && v !== value)
      if (rest.length) q.set(key, rest.join(','))
      else q.delete(key)
    } else q.delete(key)
    return href(q)
  }
  for (const g of facets) {
    if (g.kind === 'list') for (const o of g.options.filter((x) => x.selected)) chips.push({ label: o.label, removeHref: without(g.key, o.value) })
    if (g.kind === 'rating') for (const o of g.options.filter((x) => x.selected)) chips.push({ label: o.label, removeHref: without('rating') })
    if (g.kind === 'toggle' && g.selected) chips.push({ label: g.key === 'stock' ? 'In stock' : 'On sale', removeHref: without(g.key) })
    if (g.kind === 'price' && (g.selMin || g.selMax)) {
      const q = new URLSearchParams(keep)
      q.delete('min')
      q.delete('max')
      q.delete('page')
      const label = g.selMin && g.selMax ? `${fmtRs(g.selMin)} – ${fmtRs(g.selMax)}` : g.selMax ? `Under ${fmtRs(g.selMax)}` : `From ${fmtRs(g.selMin!)}`
      chips.push({ label, removeHref: href(q) })
    }
  }
  if (keep.tag) chips.push({ label: (await getTaxonomyName('tags', keep.tag)) ?? keep.tag, removeHref: without('tag') })
  return chips
}

/** Link that keeps only the page's scope (?q= / ?tag=) and sort, dropping every filter. */
export const clearFiltersHref = (basePath: string, keep: Record<string, string>) => {
  const q = new URLSearchParams()
  for (const k of ['q', 'sort']) if (keep[k]) q.set(k, keep[k])
  return `${basePath}${q.size ? `?${q}` : ''}`
}

/* ------------------------------------------------------------------ reviews */

export type ReviewSort = 'recent' | 'helpful' | 'highest' | 'lowest'
export type PublicReview = {
  id: number
  rating: number
  title: string | null
  body: string
  authorName: string
  verifiedBuyer: boolean
  isSample: boolean
  helpfulCount: number
  reply: string | null
  createdAt: string
  photos: { thumb: string; large: string }[]
}
export type ReviewSummary = { count: number; average: number; histogram: Record<1 | 2 | 3 | 4 | 5, number>; withPhotos: number; samplesOnly: boolean }

const REVIEW_SORTS: Record<ReviewSort, string> = { recent: '-createdAt', helpful: '-helpfulCount', highest: '-rating', lowest: 'rating' }

export function toPublicReview(r: Record<string, unknown>): PublicReview {
  const photos = ((r.photos as unknown[]) ?? [])
    .map((p) => asObj<{ url?: string; sizes?: { thumb?: { url?: string }; large?: { url?: string } } }>(p))
    .filter(Boolean)
    .map((p) => ({ thumb: relativeUrl(p!.sizes?.thumb?.url) || relativeUrl(p!.url), large: relativeUrl(p!.sizes?.large?.url) || relativeUrl(p!.url) }))
    .filter((p) => p.thumb)
  return {
    id: r.id as number,
    rating: Number(r.rating),
    title: (r.title as string) || null,
    body: String(r.body ?? ''),
    authorName: String(r.authorName ?? 'Customer'),
    verifiedBuyer: Boolean(r.verifiedBuyer),
    isSample: Boolean(r.isSample),
    helpfulCount: Number(r.helpfulCount ?? 0),
    reply: (r.reply as string) || null,
    createdAt: String(r.createdAt),
    photos,
  }
}

/** Approved reviews for a product: summary + the first page (TOS-206). */
export const getProductReviews = cache(async (productId: number, limit = 6) => {
  const payload = await getPayloadClient()
  const where: Where = { and: [{ product: { equals: productId } }, { status: { equals: 'approved' } }] }
  const [all, first] = await Promise.all([
    payload.find({ collection: 'reviews', where, limit: 0, pagination: false, depth: 0, select: { rating: true, photos: true, isSample: true } }),
    payload.find({ collection: 'reviews', where, sort: REVIEW_SORTS.recent, limit, depth: 1 }),
  ])
  const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewSummary['histogram']
  for (const r of all.docs) histogram[Math.min(5, Math.max(1, Math.round(r.rating))) as 1] += 1
  const count = all.docs.length
  const summary: ReviewSummary = {
    count,
    average: count ? Math.round((all.docs.reduce((n, r) => n + r.rating, 0) / count) * 10) / 10 : 0,
    histogram,
    withPhotos: all.docs.filter((r) => (r.photos as unknown[] | null)?.length).length,
    samplesOnly: count > 0 && all.docs.every((r) => r.isSample),
  }
  return { summary, reviews: first.docs.map((d) => toPublicReview(d as unknown as Record<string, unknown>)), totalPages: first.totalPages }
})
