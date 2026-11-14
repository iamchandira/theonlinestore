import 'server-only'

import config from '@payload-config'
import { getPayload, type Where } from 'payload'
import { cache } from 'react'

import type { Brand, Category, Concern, Media, Product as PProduct, Tag } from '@/payload-types'

import type { BrandSummary, CategoryNode, Crumb, ListResult, Product, ProductDetail, SortKey } from './types'

/**
 * Server-only catalogue access through Payload's Local API (no HTTP hop).
 * Functions are wrapped in React `cache()` so repeated calls in one render share a single query.
 * Only published products are ever returned to the storefront.
 */

export const getPayloadClient = cache(async () => getPayload({ config }))

const PUBLISHED: Where = { _status: { equals: 'published' } }
/** Virtual "Beauty" department = these top-level categories. */
export const BEAUTY_SLUGS = ['skincare', 'hair-care', 'body-care', 'lips']

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
    rating: doc.rating ?? 0,
    reviewCount: doc.reviewCount ?? 0,
    priceTBC: Boolean(doc.priceTBC),
    variants: (doc.variants ?? []).map((v) => {
      const { image, imageLarge } = mediaUrls(v.image)
      return {
        sku: v.sku,
        option: doc.optionName ?? 'Size',
        label: v.label,
        price: v.price,
        compareAtPrice: v.compareAtPrice ?? null,
        stock: v.stock ?? 0,
        image,
        imageLarge,
      }
    }),
  }
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
const idsBySlug = cache(async (collection: 'brands' | 'tags' | 'concerns', slug: string) => {
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
  style: 'plain' | 'blush' | 'cream'
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
    // Two product photos per beauty category tile
    Promise.all(
      BEAUTY_SLUGS.map(async (slug) => {
        const node = tree.bySlug.get(slug)
        if (!node) return [slug, [] as string[]] as const
        const top = await listProducts({ categoryIds: descendantIds(node), sort: 'bestsellers', limit: 2 })
        return [slug, top.products.map((p) => p.variants[0]?.image).filter(Boolean)] as const
      }),
    ),
    listProducts({ onSale: true, categoryIds: tree.bySlug.get('body-care') ? descendantIds(tree.bySlug.get('body-care')!) : [], sort: 'bestsellers', limit: 1 }),
    listProducts({ tagSlug: 'gift', sort: 'bestsellers', limit: 1 }),
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
  const [brands, feature] = await Promise.all([getBrands(), listProducts({ tagSlug: 'trending', sort: 'bestsellers', limit: 1 })])
  const groups: Record<string, { name: string; slug: string }[]> = {}
  for (const b of brands) (groups[BRAND_GROUP_LABELS[b.group] ?? 'More brands'] ??= []).push({ name: b.name, slug: b.slug })
  return { brandGroups: groups, megaFeature: feature.products[0] ?? null }
})

export type NavData = Awaited<ReturnType<typeof getNavData>>

/** Small add-ons for the bag drawer ("Add a little extra"). */
export const getBagSuggestions = cache(async () => {
  const res = await listProducts({ maxPrice: 2999, sort: 'bestsellers', limit: 12 })
  return res.products.filter((p) => p.variants.length === 1).slice(0, 6)
})

/** Display name for a tag or concern slug (used by filter chips). */
export const getTaxonomyName = cache(async (collection: 'tags' | 'concerns', slug: string) => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  return res.docs[0]?.name ?? null
})

/** Active-filter chips for listing pages: each one links to the same page without that filter. */
export async function buildFilterChips(basePath: string, keep: Record<string, string>) {
  const chips: { label: string; removeHref: string }[] = []
  const without = (key: string) => {
    const q = new URLSearchParams(keep)
    q.delete(key)
    return `${basePath}${q.size ? `?${q}` : ''}`
  }
  if (keep.concern) chips.push({ label: `Concern: ${(await getTaxonomyName('concerns', keep.concern)) ?? keep.concern}`, removeHref: without('concern') })
  if (keep.tag) chips.push({ label: (await getTaxonomyName('tags', keep.tag)) ?? keep.tag, removeHref: without('tag') })
  if (keep.max) chips.push({ label: `Under Rs ${Number(keep.max).toLocaleString('en-LK')}`, removeHref: without('max') })
  return chips
}
