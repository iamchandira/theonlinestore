import type { FacetFilters } from './facets'
import type { SortKey } from './types'
import { isSortKey } from './utils'

export type RawSearchParams = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined
const SLUG = /^[a-z0-9-]{1,60}$/
const slug = (v?: string) => (v && SLUG.test(v) ? v : undefined)
/** "a,b,c" → ['a','b','c'] (valid slugs only, max 30) */
const list = (v?: string) => {
  const out = (v ?? '').split(',').map((x) => x.trim()).filter((x) => SLUG.test(x)).slice(0, 30)
  return out.length ? [...new Set(out)] : undefined
}
const int = (v?: string) => {
  const n = Number.parseInt(v ?? '', 10)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Multi-value filter params, in the order they're written to the URL. */
export const FILTER_LIST_PARAMS = ['cat', 'brand', 'type', 'concern', 'recipient', 'occasion', 'size', 'colour', 'scent', 'diet'] as const

/**
 * Parses listing query params into safe, typed values.
 * Sort/paging: ?sort=&page=   Search: ?q=   Hidden scope filter: ?tag=
 * Filters (TOS-202): ?brand=cerave,cosrx&concern=acne&min=1000&max=5000&rating=4&stock=1&sale=1&size=eu-38&colour=black…
 */
export function parseListParams(sp: RawSearchParams) {
  const sort = first(sp.sort)
  const page = Math.max(1, Math.min(200, Number.parseInt(first(sp.page) ?? '1', 10) || 1))
  const filters: FacetFilters = {}
  for (const k of FILTER_LIST_PARAMS) {
    const v = list(first(sp[k]))
    if (v) filters[k] = v
  }
  const min = int(first(sp.min))
  const max = int(first(sp.max))
  if (min) filters.min = min
  if (max) filters.max = max
  const rating = int(first(sp.rating))
  if (rating && rating >= 1 && rating <= 5) filters.rating = rating
  if (first(sp.stock) === '1') filters.stock = true
  if (first(sp.sale) === '1') filters.sale = true

  const parsed = {
    sort: (isSortKey(sort) ? sort : 'recommended') as SortKey,
    page,
    tag: slug(first(sp.tag)),
    q: first(sp.q)?.slice(0, 80),
    filters,
    // Single-value shortcuts kept for pages/links that predate multi-select filters
    concern: filters.concern?.[0],
    recipient: filters.recipient?.[0],
    occasion: filters.occasion?.[0],
    maxPrice: filters.max,
  }
  return { ...parsed, keep: filtersToParams(filters, { sort: parsed.sort, tag: parsed.tag, q: parsed.q }), activeFilterCount: countFilters(filters) }
}

/** Filters (+ sort/tag/q) → URL params, in a stable order. */
export function filtersToParams(f: FacetFilters, extra: { sort?: SortKey; tag?: string; q?: string } = {}) {
  const keep: Record<string, string> = {}
  if (extra.q) keep.q = extra.q
  for (const k of FILTER_LIST_PARAMS) if (f[k]?.length) keep[k] = f[k]!.join(',')
  if (f.min) keep.min = String(f.min)
  if (f.max) keep.max = String(f.max)
  if (f.rating) keep.rating = String(f.rating)
  if (f.stock) keep.stock = '1'
  if (f.sale) keep.sale = '1'
  if (extra.tag) keep.tag = extra.tag
  if (extra.sort && extra.sort !== 'recommended') keep.sort = extra.sort
  return keep
}

export const countFilters = (f: FacetFilters) =>
  FILTER_LIST_PARAMS.reduce((n, k) => n + (f[k]?.length ?? 0), 0) + (f.min || f.max ? 1 : 0) + (f.rating ? 1 : 0) + (f.stock ? 1 : 0) + (f.sale ? 1 : 0)
