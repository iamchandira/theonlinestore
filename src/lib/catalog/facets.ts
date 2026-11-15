import type { Payload, Where } from 'payload'

import { catalogVersion } from '@/lib/payload/revalidate'
import type { Product as PProduct } from '@/payload-types'

import type { ListResult, Product, SortKey } from './types'

/**
 * Faceted filtering (TOS-202).
 *
 * Every listing (category, brand, offers, gift shop, search) works on a lightweight in-memory snapshot
 * of the published catalogue ("facet records"). Filtering, counting and sorting happen in one pass
 * over that snapshot; only the products on the current page are loaded in full.
 *
 * Counts are "disjunctive": the counts in a group are computed with every OTHER group's filters
 * applied, so ticking a second brand shows how many products that brand adds, as on Shopify/Zalando.
 *
 * The snapshot is rebuilt when the catalogue changes (see `bumpCatalogVersion`) or after 60 s.
 */

/* ------------------------------------------------------------------ values */

/** URL-safe value for a label ("EU 38" → "eu-38", "Gluten-free" → "gluten-free"). */
export const toValue = (label: string) =>
  label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/* ----------------------------------------------------------------- records */

export type FacetRecord = {
  id: number
  brand: string
  categoryIds: number[]
  concerns: string[]
  recipients: string[]
  occasions: string[]
  tags: string[]
  type: string
  price: number
  inStock: boolean
  onSale: boolean
  rating: number
  reviewCount: number
  sales: number
  created: number
  sizes: string[]
  colours: string[]
  /** Each variant's size/colour values, so "EU 38 + Black" must exist as one variant */
  combos: { size: string | null; colour: string | null; inStock: boolean }[]
  scent: string | null
  diet: string[]
  giftReady: boolean
}

type Labels = Record<'brand' | 'concern' | 'recipient' | 'occasion' | 'size' | 'colour' | 'scent' | 'diet', Map<string, string>>
type Snapshot = { records: FacetRecord[]; labels: Labels }

const TYPE_LABELS: Record<string, string> = {
  beauty: 'Beauty & personal care',
  fragrance: 'Fragrance',
  footwear: 'Footwear',
  gift: 'Gifts & hampers',
  chocolate: 'Chocolates & treats',
  accessory: 'Accessories',
  home: 'Home & living',
}
const SIZE_OPTIONS = new Set(['Shoe size'])
const COLOUR_OPTIONS = new Set(['Colour'])

/** Bump when FacetRecord changes, so a snapshot built by older code (hot reload) is never reused. */
const SNAPSHOT_SCHEMA = 2
const g = globalThis as { __tosFacetSnapshot?: { schema: number; version: number; at: number; data: Promise<Snapshot> } }

async function buildSnapshot(payload: Payload): Promise<Snapshot> {
  const [products, brands, concerns, recipients, occasions, tags] = await Promise.all([
    payload.find({
      collection: 'products',
      where: { _status: { equals: 'published' } },
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: {
        brand: true,
        categories: true,
        concerns: true,
        recipients: true,
        occasions: true,
        tags: true,
        productType: true,
        minPrice: true,
        totalStock: true,
        onSale: true,
        rating: true,
        reviewCount: true,
        salesCount: true,
        createdAt: true,
        optionName: true,
        option2Name: true,
        variants: { label: true, option2: true, stock: true },
        details: { scentFamily: true, dietary: true },
      },
    }),
    ...(['brands', 'concerns', 'recipients', 'occasions', 'tags'] as const).map((collection) =>
      payload.find({ collection, limit: 0, pagination: false, depth: 0, overrideAccess: true, select: { name: true, slug: true } }),
    ),
  ])
  const byId = (res: { docs: { id: number; slug?: string | null; name: string }[] }) => new Map(res.docs.map((d) => [d.id, { slug: d.slug ?? '', name: d.name }]))
  const B = byId(brands)
  const C = byId(concerns)
  const R = byId(recipients)
  const O = byId(occasions)
  const T = byId(tags)
  const id = (v: unknown) => (typeof v === 'object' && v ? (v as { id: number }).id : (v as number))
  const slugs = (list: unknown, map: Map<number, { slug: string; name: string }>) =>
    ((list as unknown[]) ?? []).map((x) => map.get(id(x))?.slug).filter(Boolean) as string[]

  const labels: Labels = {
    brand: new Map([...B.values()].map((b) => [b.slug, b.name])),
    concern: new Map([...C.values()].map((b) => [b.slug, b.name])),
    recipient: new Map([...R.values()].map((b) => [b.slug, b.name])),
    occasion: new Map([...O.values()].map((b) => [b.slug, b.name])),
    size: new Map(),
    colour: new Map(),
    scent: new Map(),
    diet: new Map(),
  }

  const records = (products.docs as PProduct[]).map((p): FacetRecord => {
    const variants = p.variants ?? []
    const sizeOpt = SIZE_OPTIONS.has(p.optionName ?? '')
    const colourFrom1 = COLOUR_OPTIONS.has(p.optionName ?? '')
    const colourFrom2 = COLOUR_OPTIONS.has(p.option2Name ?? '')
    const add = (map: Map<string, string>, label?: string | null) => {
      if (!label) return null
      const v = toValue(label)
      if (!map.has(v)) map.set(v, label)
      return v
    }
    const sizes = sizeOpt ? (variants.map((v) => add(labels.size, v.label)).filter(Boolean) as string[]) : []
    const colours = [
      ...(colourFrom1 ? variants.map((v) => add(labels.colour, v.label)) : []),
      ...(colourFrom2 ? variants.map((v) => add(labels.colour, v.option2)) : []),
    ].filter(Boolean) as string[]
    const combos = variants.map((v) => ({
      size: sizeOpt && v.label ? toValue(v.label) : null,
      colour: colourFrom1 && v.label ? toValue(v.label) : colourFrom2 && v.option2 ? toValue(v.option2) : null,
      inStock: Number(v.stock ?? 0) > 0,
    }))
    const recipientsList = slugs(p.recipients, R)
    const occasionsList = slugs(p.occasions, O)
    return {
      id: p.id,
      brand: B.get(id(p.brand))?.slug ?? '',
      categoryIds: ((p.categories as unknown[]) ?? []).map(id),
      concerns: slugs(p.concerns, C),
      recipients: recipientsList,
      occasions: occasionsList,
      tags: slugs(p.tags, T),
      type: p.productType ?? 'beauty',
      price: Number(p.minPrice ?? 0),
      inStock: Number(p.totalStock ?? 0) > 0,
      onSale: Boolean(p.onSale),
      rating: Number(p.rating ?? 0),
      reviewCount: Number(p.reviewCount ?? 0),
      sales: Number(p.salesCount ?? 0),
      created: new Date(p.createdAt).getTime(),
      sizes: [...new Set(sizes)],
      colours: [...new Set(colours)],
      combos,
      scent: add(labels.scent, p.details?.scentFamily),
      diet: ((p.details?.dietary as string[] | null) ?? []).map((d) => add(labels.diet, d)).filter(Boolean) as string[],
      giftReady: recipientsList.length > 0 || occasionsList.length > 0,
    }
  })
  return { records, labels }
}

export function getSnapshot(payload: Payload) {
  const version = catalogVersion()
  const cached = g.__tosFacetSnapshot
  if (cached && cached.schema === SNAPSHOT_SCHEMA && cached.version === version && Date.now() - cached.at < 60_000) return cached.data
  const data = buildSnapshot(payload).catch((err) => {
    g.__tosFacetSnapshot = undefined
    throw err
  })
  g.__tosFacetSnapshot = { schema: SNAPSHOT_SCHEMA, version, at: Date.now(), data }
  return data
}

/* ------------------------------------------------------------ scope/filters */

/** The fixed context of a listing page (what the page is "about"). */
export type ListScope = {
  categoryIds?: number[]
  brandSlug?: string
  tagSlug?: string
  onSale?: boolean
  giftReady?: boolean
  /** Ordered ids from the search engine (relevance order). An empty array means "no matches". */
  searchIds?: number[]
  /** The search query behind `searchIds` (sent in the scope token instead of the ids) */
  q?: string
  /** Sub-categories offered as the "Category" filter, each with all its descendant ids */
  categoryOptions?: { slug: string; name: string; ids: number[] }[]
}

/** The shopper's filters, all from the URL. */
export type FacetFilters = {
  cat?: string[]
  brand?: string[]
  type?: string[]
  concern?: string[]
  recipient?: string[]
  occasion?: string[]
  size?: string[]
  colour?: string[]
  scent?: string[]
  diet?: string[]
  min?: number
  max?: number
  rating?: number
  stock?: boolean
  sale?: boolean
}

export const LIST_KEYS = ['cat', 'brand', 'type', 'concern', 'recipient', 'occasion', 'size', 'colour', 'scent', 'diet'] as const
type ListKey = (typeof LIST_KEYS)[number]
type GroupKey = ListKey | 'price' | 'rating' | 'stock' | 'sale'

export type FacetOption = { value: string; label: string; count: number; selected: boolean }
export type FacetGroup =
  | { key: ListKey; label: string; kind: 'list'; options: FacetOption[] }
  | { key: 'rating'; label: string; kind: 'rating'; options: FacetOption[] }
  | { key: 'stock' | 'sale'; label: string; kind: 'toggle'; count: number; selected: boolean }
  | { key: 'price'; label: string; kind: 'price'; min: number; max: number; selMin?: number; selMax?: number; buckets: FacetOption[] }

const GROUP_LABELS: Record<ListKey, string> = {
  cat: 'Category',
  brand: 'Brand',
  type: 'Department',
  concern: 'Skin & hair concern',
  recipient: 'Who it’s for',
  occasion: 'Occasion',
  size: 'Shoe size',
  colour: 'Colour',
  scent: 'Scent family',
  diet: 'Dietary',
}

const PRICE_BUCKETS = [
  { value: '0-2000', label: 'Under Rs 2,000', min: 0, max: 2000 },
  { value: '2000-5000', label: 'Rs 2,000 – 5,000', min: 2000, max: 5000 },
  { value: '5000-10000', label: 'Rs 5,000 – 10,000', min: 5000, max: 10000 },
  { value: '10000-', label: 'Rs 10,000 and up', min: 10000, max: undefined },
]

function inScope(r: FacetRecord, s: ListScope, searchSet: Set<number> | null) {
  if (searchSet && !searchSet.has(r.id)) return false
  if (s.categoryIds?.length && !r.categoryIds.some((id) => s.categoryIds!.includes(id))) return false
  if (s.brandSlug && r.brand !== s.brandSlug) return false
  if (s.tagSlug && !r.tags.includes(s.tagSlug)) return false
  if (s.onSale && !r.onSale) return false
  if (s.giftReady && !r.giftReady) return false
  return true
}

/** Does `r` pass the filters, ignoring group `skip` (for disjunctive counts)? */
function passes(r: FacetRecord, f: FacetFilters, s: ListScope, skip?: GroupKey) {
  const any = (have: string[], want?: string[]) => !want?.length || want.some((w) => have.includes(w))
  if (skip !== 'cat' && f.cat?.length) {
    const opts = (s.categoryOptions ?? []).filter((o) => f.cat!.includes(o.slug))
    if (opts.length && !opts.some((o) => r.categoryIds.some((id) => o.ids.includes(id)))) return false
  }
  if (skip !== 'brand' && !any([r.brand], f.brand)) return false
  if (skip !== 'type' && !any([r.type], f.type)) return false
  if (skip !== 'concern' && !any(r.concerns, f.concern)) return false
  if (skip !== 'recipient' && !any(r.recipients, f.recipient)) return false
  if (skip !== 'occasion' && !any(r.occasions, f.occasion)) return false
  // Size and colour must be available together on one variant (and in stock when "In stock only" is on)
  const wantSize = skip !== 'size' && f.size?.length ? f.size : null
  const wantColour = skip !== 'colour' && f.colour?.length ? f.colour : null
  if (wantSize || wantColour) {
    const needStock = Boolean(f.stock) && skip !== 'stock'
    const ok = r.combos.some(
      (c) => (!wantSize || (c.size && wantSize.includes(c.size))) && (!wantColour || (c.colour && wantColour.includes(c.colour))) && (!needStock || c.inStock),
    )
    if (!ok) return false
  }
  if (skip !== 'scent' && !any(r.scent ? [r.scent] : [], f.scent)) return false
  if (skip !== 'diet' && !any(r.diet, f.diet)) return false
  if (skip !== 'price') {
    if (f.min != null && r.price < f.min) return false
    if (f.max != null && r.price > f.max) return false
  }
  if (skip !== 'rating' && f.rating && (r.reviewCount === 0 || r.rating < f.rating)) return false
  if (skip !== 'stock' && f.stock && !r.inStock) return false
  if (skip !== 'sale' && f.sale && !r.onSale) return false
  return true
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

function sortRecords(list: FacetRecord[], sort: SortKey, searchIds?: number[]) {
  const rank = searchIds ? new Map(searchIds.map((id, i) => [id, i])) : null
  const by: Record<SortKey, (a: FacetRecord, b: FacetRecord) => number> = {
    recommended: rank ? (a, b) => rank.get(a.id)! - rank.get(b.id)! : (a, b) => b.sales - a.sales || b.rating - a.rating || a.id - b.id,
    bestsellers: (a, b) => b.sales - a.sales || a.id - b.id,
    new: (a, b) => b.created - a.created || b.id - a.id,
    'price-asc': (a, b) => a.price - b.price || a.id - b.id,
    'price-desc': (a, b) => b.price - a.price || a.id - b.id,
    rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount || a.id - b.id,
  }
  return [...list].sort(by[sort])
}

/* -------------------------------------------------------------------- run */

export type FacetRun = { ids: number[]; total: number; facets: FacetGroup[] }

/** Filters, counts and sorts. Returns all matching ids in order plus the facet groups. */
export async function runFacets(payload: Payload, scope: ListScope, filters: FacetFilters, sort: SortKey): Promise<FacetRun> {
  const { records, labels } = await getSnapshot(payload)
  const searchSet = scope.searchIds ? new Set(scope.searchIds) : null
  const base = records.filter((r) => inScope(r, scope, searchSet))
  const matching = base.filter((r) => passes(r, filters, scope))

  const listGroup = (key: ListKey, valuesOf: (r: FacetRecord) => string[], label: (v: string) => string, order?: (a: FacetOption, b: FacetOption) => number): FacetGroup | null => {
    const pool = base.filter((r) => passes(r, filters, scope, key))
    const counts = new Map<string, number>()
    for (const r of pool) for (const v of new Set(valuesOf(r))) counts.set(v, (counts.get(v) ?? 0) + 1)
    const selected = filters[key] ?? []
    for (const v of selected) if (!counts.has(v)) counts.set(v, 0)
    const options = [...counts.entries()].map(([value, count]) => ({ value, label: label(value), count, selected: selected.includes(value) }))
    options.sort(order ?? ((a, b) => b.count - a.count || collator.compare(a.label, b.label)))
    // A filter with a single choice that every product already has adds nothing
    const useful = options.filter((o) => o.count > 0 && o.count < pool.length).length > 0 || options.length > 1 || selected.length > 0
    return options.length && useful ? { key, label: GROUP_LABELS[key], kind: 'list', options } : null
  }

  const groups: (FacetGroup | null)[] = []
  if (scope.categoryOptions?.length) {
    const opts = scope.categoryOptions
    const pool = base.filter((r) => passes(r, filters, scope, 'cat'))
    const options = opts
      .map((o) => ({ value: o.slug, label: o.name, count: pool.filter((r) => r.categoryIds.some((id) => o.ids.includes(id))).length, selected: Boolean(filters.cat?.includes(o.slug)) }))
      .filter((o) => o.count > 0 || o.selected)
    if (options.length > 1 || options.some((o) => o.selected)) groups.push({ key: 'cat', label: GROUP_LABELS.cat, kind: 'list', options })
  }
  if (!scope.categoryIds?.length) groups.push(listGroup('type', (r) => [r.type], (v) => TYPE_LABELS[v] ?? v))
  if (!scope.brandSlug) groups.push(listGroup('brand', (r) => (r.brand ? [r.brand] : []), (v) => labels.brand.get(v) ?? v, (a, b) => collator.compare(a.label, b.label)))
  groups.push(listGroup('size', (r) => r.sizes, (v) => labels.size.get(v) ?? v, (a, b) => collator.compare(a.label, b.label)))
  groups.push(listGroup('colour', (r) => r.colours, (v) => labels.colour.get(v) ?? v))
  groups.push(listGroup('scent', (r) => (r.scent ? [r.scent] : []), (v) => labels.scent.get(v) ?? v))
  groups.push(listGroup('concern', (r) => r.concerns, (v) => labels.concern.get(v) ?? v))
  groups.push(listGroup('diet', (r) => r.diet, (v) => labels.diet.get(v) ?? v))
  groups.push(listGroup('recipient', (r) => r.recipients, (v) => labels.recipient.get(v) ?? v))
  groups.push(listGroup('occasion', (r) => r.occasions, (v) => labels.occasion.get(v) ?? v))

  // Price: buckets with counts + the price span for the min/max inputs
  {
    const pool = base.filter((r) => passes(r, filters, scope, 'price'))
    const prices = pool.map((r) => r.price).filter((p) => p > 0)
    if (prices.length) {
      const buckets = PRICE_BUCKETS.map((b) => ({
        value: b.value,
        label: b.label,
        count: pool.filter((r) => r.price >= b.min && (b.max == null || r.price < b.max)).length,
        selected: (filters.min ?? 0) === b.min && filters.max === b.max,
      })).filter((b) => b.count > 0 || b.selected)
      groups.push({ key: 'price', label: 'Price', kind: 'price', min: Math.min(...prices), max: Math.max(...prices), selMin: filters.min, selMax: filters.max, buckets })
    }
  }
  // Rating: only once reviews exist in this listing
  {
    const pool = base.filter((r) => passes(r, filters, scope, 'rating'))
    if (pool.some((r) => r.reviewCount > 0) || filters.rating) {
      const options = [4, 3].map((n) => ({ value: String(n), label: `${n}★ & up`, count: pool.filter((r) => r.reviewCount > 0 && r.rating >= n).length, selected: filters.rating === n }))
      groups.push({ key: 'rating', label: 'Customer rating', kind: 'rating', options })
    }
  }
  for (const key of ['stock', 'sale'] as const) {
    if (key === 'sale' && scope.onSale) continue
    const pool = base.filter((r) => passes(r, filters, scope, key))
    const count = pool.filter((r) => (key === 'stock' ? r.inStock : r.onSale)).length
    if (count > 0 || filters[key]) groups.push({ key, label: key === 'stock' ? 'In stock only' : 'On sale', kind: 'toggle', count, selected: Boolean(filters[key]) })
  }

  const sorted = sortRecords(matching, sort, scope.searchIds)
  return { ids: sorted.map((r) => r.id), total: sorted.length, facets: groups.filter((x): x is FacetGroup => Boolean(x)) }
}

/** Loads full products for one page of ids (keeping the order). */
export async function loadPage(payload: Payload, ids: number[], toProduct: (doc: PProduct) => Product, page: number, limit: number): Promise<ListResult> {
  const totalPages = Math.max(1, Math.ceil(ids.length / limit))
  const p = Math.min(Math.max(1, page), totalPages)
  const slice = ids.slice((p - 1) * limit, p * limit)
  let products: Product[] = []
  if (slice.length) {
    const where: Where = { and: [{ id: { in: slice } }, { _status: { equals: 'published' } }] }
    const res = await payload.find({ collection: 'products', where, limit: slice.length, depth: 1, pagination: false })
    const byId = new Map(res.docs.map((d) => [d.id, toProduct(d)]))
    products = slice.map((id) => byId.get(id)).filter(Boolean) as Product[]
  }
  return { products, total: ids.length, page: p, totalPages: ids.length ? totalPages : 0, limit }
}

/* -------------------------------------------------------------- scope token */

/** Compact, URL-safe token so the mobile filter sheet can ask the server for live counts. */
export const encodeScope = ({ searchIds: _ids, ...s }: ListScope) => Buffer.from(JSON.stringify(s)).toString('base64url')

export function decodeScope(token: string | null): ListScope | null {
  if (!token || token.length > 20_000) return null
  try {
    const raw = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as ListScope
    const ints = (v: unknown) => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 2000) : undefined)
    const slug = (v: unknown) => (typeof v === 'string' && /^[a-z0-9-]{1,60}$/.test(v) ? v : undefined)
    return {
      categoryIds: ints(raw.categoryIds),
      brandSlug: slug(raw.brandSlug),
      tagSlug: slug(raw.tagSlug),
      onSale: raw.onSale === true || undefined,
      giftReady: raw.giftReady === true || undefined,
      q: typeof raw.q === 'string' ? raw.q.slice(0, 80) : undefined,
      categoryOptions: Array.isArray(raw.categoryOptions)
        ? raw.categoryOptions
            .slice(0, 60)
            .map((o) => ({ slug: slug(o?.slug) ?? '', name: String(o?.name ?? '').slice(0, 80), ids: ints(o?.ids) ?? [] }))
            .filter((o) => o.slug)
        : undefined,
    }
  } catch {
    return null
  }
}
