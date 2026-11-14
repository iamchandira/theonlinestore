/** Pure catalogue helpers, safe in both Server and Client Components. */
import type { Product, SortKey } from './types'

export const minPrice = (p: Product) => Math.min(...p.variants.map((v) => v.price))

/** The cheapest in-stock variant (falls back to the cheapest overall). */
export const primaryVariant = (p: Product) => {
  const inStock = p.variants.filter((v) => v.stock > 0)
  const pool = inStock.length ? inStock : p.variants
  return pool.reduce((a, b) => (b.price < a.price ? b : a), pool[0])
}

export const isOnSale = (p: Product) => p.variants.some((v) => v.compareAtPrice && v.compareAtPrice > v.price)

export const productHref = (p: Pick<Product, 'slug'>) => `/p/${p.slug}`

export const brandHref = (slug: string) => `/brands/${slug}`

export const brandSlug = (brand: string) =>
  brand
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'bestsellers', label: 'Bestsellers' },
  { value: 'new', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
]

export const isSortKey = (v: unknown): v is SortKey => SORT_OPTIONS.some((o) => o.value === v)
