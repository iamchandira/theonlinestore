import type { SortKey } from './types'
import { isSortKey } from './utils'

export type RawSearchParams = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined

/** Parses listing query params (?sort=&page=&concern=&tag=&max=&q=) into safe, typed values. */
export function parseListParams(sp: RawSearchParams) {
  const sort = first(sp.sort)
  const page = Math.max(1, Math.min(200, Number.parseInt(first(sp.page) ?? '1', 10) || 1))
  const max = Number.parseInt(first(sp.max) ?? '', 10)
  const slug = (v?: string) => (v && /^[a-z0-9-]{1,60}$/.test(v) ? v : undefined)
  const parsed = {
    sort: (isSortKey(sort) ? sort : 'recommended') as SortKey,
    page,
    concern: slug(first(sp.concern)),
    tag: slug(first(sp.tag)),
    maxPrice: Number.isFinite(max) && max > 0 ? max : undefined,
    q: first(sp.q)?.slice(0, 80),
  }
  // Params to carry into pagination / sort links
  const keep: Record<string, string> = {}
  if (parsed.sort !== 'recommended') keep.sort = parsed.sort
  if (parsed.concern) keep.concern = parsed.concern
  if (parsed.tag) keep.tag = parsed.tag
  if (parsed.maxPrice) keep.max = String(parsed.maxPrice)
  if (parsed.q) keep.q = parsed.q
  return { ...parsed, keep }
}
