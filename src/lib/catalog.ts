/**
 * Sprint 0 catalogue access. Reads the seed extracted from the client's PDF catalogues.
 * Sprint 1 replaces these functions with Payload Local API queries that keep the same return shapes.
 */
import seed from '../../seed/catalogue/products.json'

export type Variant = {
  sku: string
  option: string
  label: string
  price: number
  compareAtPrice: number | null
  stock: number
  image: string
}

export type Product = {
  id: number
  slug: string
  brand: string
  name: string
  category: string
  subcategory: string
  concerns: string[]
  tags: string[]
  badge: 'bestseller' | 'new' | 'trending' | 'gift' | 'limited' | null
  rating: number
  reviewCount: number
  priceTBC: boolean
  variants: Variant[]
}

export const products = seed.products as Product[]

const bySlug = new Map(products.map((p) => [p.slug, p]))

export const getProduct = (slug: string) => bySlug.get(slug)

export const getProducts = (slugs: string[]) =>
  slugs.map((s) => bySlug.get(s)).filter((p): p is Product => Boolean(p))

export const minPrice = (p: Product) => Math.min(...p.variants.map((v) => v.price))

export const primaryVariant = (p: Product) =>
  p.variants.reduce((a, b) => (b.price < a.price ? b : a), p.variants[0])

export const isOnSale = (p: Product) => p.variants.some((v) => v.compareAtPrice && v.compareAtPrice > v.price)

export const productHref = (p: Pick<Product, 'slug'>) => `/p/${p.slug}`

export const brandSlug = (brand: string) =>
  brand
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const brands = Array.from(new Set(products.map((p) => p.brand))).sort((a, b) => a.localeCompare(b))

export const brandGroups = {
  'K-Beauty': ['Anua', 'COSRX', 'Celimax', 'Dr. Althea', 'Medicube', 'SKIN1004'],
  'Derm & Pharmacy': ['CeraVe', 'Cetaphil', 'La Roche-Posay', 'The Ordinary'],
  'Everyday Favourites': ['Dove', 'Esse Naturals', "L'Oréal Paris", 'Mielle', 'NIVEA', 'OGX', 'Shiseido Fino', 'Vaseline'],
}

/** Curated home-page collections (Sprint 1: driven by admin-managed collections). */
export const collections = {
  heroPicks: getProducts([
    'anua-peach-70-niacin-serum',
    'mielle-rosemary-mint-scalp-hair-oil',
    'lrp-anthelios-ultra-fluid-spf50',
    'cosrx-advanced-snail-96-mucin-essence',
  ]),
  deals: products.filter(isOnSale).slice(0, 12),
  kbeauty: products.filter((p) => p.tags.includes('k-beauty')).slice(0, 12),
  bestsellers: products.filter((p) => p.badge === 'bestseller' || p.tags.includes('bestseller')),
  newArrivals: products.filter((p) => p.tags.includes('new') || p.tags.includes('trending')).slice(0, 12),
  derm: getProducts([
    'cerave-hydrating-facial-cleanser',
    'lrp-anthelios-ultra-fluid-spf50',
    'cetaphil-gentle-skin-cleanser',
    'the-ordinary-hyaluronic-acid-2-b5',
  ]),
  under3000: products.filter((p) => minPrice(p) <= 2999).slice(0, 12),
}

/** Lightweight client-side search used by the autosuggest until Postgres FTS lands (Sprint 2). */
export function searchProducts(query: string, limit = 6): Product[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const terms = q.split(/\s+/)
  return products
    .map((p) => {
      const hay = `${p.brand} ${p.name} ${p.subcategory} ${p.concerns.join(' ')} ${p.tags.join(' ')}`.toLowerCase()
      const score = terms.reduce((s, t) => (hay.includes(t) ? s + (p.brand.toLowerCase().startsWith(t) ? 3 : 1) : s - 5), 0)
      return { p, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p)
}
