import type { Endpoint } from 'payload'

/**
 * Public storefront endpoints mounted on the products collection (/api/products/…).
 * Heavy modules are imported lazily so seed scripts and tests can load the collection config
 * without pulling in Next.js server code.
 */

const origin = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const rel = (u?: string | null) => (u ? (u.startsWith(origin()) ? u.slice(origin().length) : u) : null)
const CACHE_SHORT = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }

/** GET /api/products/suggest?q= → header autosuggest: products, brands and categories (typo tolerant). */
export const suggestEndpoint: Endpoint = {
  path: '/suggest',
  method: 'get',
  handler: async (req) => {
    const q = String(req.searchParams.get('q') ?? '').slice(0, 60)
    const { normalizeQuery, searchProductIds, suggestTaxonomies, didYouMean } = await import('../lib/catalog/search')
    if (normalizeQuery(q).length < 2) return Response.json({ products: [], brands: [], categories: [], total: 0 })
    const [found, tax] = await Promise.all([searchProductIds(req.payload, q, 60), suggestTaxonomies(req.payload, q)])
    // Nothing matched: try a spelling correction ("cervae" → "cerave")
    let ids = found
    let corrected: string | null = null
    if (!found.length) {
      corrected = await didYouMean(req.payload, q)
      ids = corrected ? await searchProductIds(req.payload, corrected, 60) : []
      if (!ids.length) corrected = null
    }
    const top = ids.slice(0, 6)
    const docs = top.length
      ? (
          await req.payload.find({
            collection: 'products',
            where: { id: { in: top } },
            limit: top.length,
            depth: 1,
            pagination: false,
            overrideAccess: true,
            select: { name: true, slug: true, brand: true, minPrice: true, variants: { image: true } },
          })
        ).docs
      : []
    const byId = new Map(docs.map((d) => [d.id, d]))
    const imageOf = (img: unknown) => {
      const m = img as { url?: string; sizes?: { thumb?: { url?: string } } } | null
      return rel(m?.sizes?.thumb?.url) || rel(m?.url)
    }
    // Category hrefs come from the category tree (breadcrumb paths)
    const { getCategoryTree } = await import('../lib/catalog/server')
    const { bySlug } = await getCategoryTree()
    return Response.json(
      {
        total: ids.length,
        corrected,
        products: top
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((p) => ({
            slug: p!.slug,
            name: p!.name,
            brand: typeof p!.brand === 'object' && p!.brand ? p!.brand.name : '',
            price: p!.minPrice,
            image: imageOf(p!.variants?.[0]?.image),
          })),
        brands: tax.brands,
        categories: tax.categories.map((c) => ({ name: c.name, href: bySlug.get(c.slug)?.href ?? `/c/${c.slug}` })),
      },
      { headers: CACHE_SHORT },
    )
  },
}

/** GET /api/products/facets?scope=TOKEN&brand=…&min=… → live result count + facet counts (mobile filter sheet). */
export const facetsEndpoint: Endpoint = {
  path: '/facets',
  method: 'get',
  handler: async (req) => {
    const { decodeScope, runFacets } = await import('../lib/catalog/facets')
    const { parseListParams } = await import('../lib/catalog/params')
    const scope = decodeScope(req.searchParams.get('scope'))
    if (!scope) return Response.json({ error: 'Invalid scope' }, { status: 400 })
    if (scope.q) {
      const { searchProductIds } = await import('../lib/catalog/search')
      scope.searchIds = await searchProductIds(req.payload, scope.q)
    }
    const lp = parseListParams(Object.fromEntries(req.searchParams.entries()))
    const run = await runFacets(req.payload, scope, lp.filters, lp.sort)
    return Response.json({ total: run.total, facets: run.facets }, { headers: CACHE_SHORT })
  },
}

/** GET /api/products/cards?slugs=a,b,c → product cards for the wishlist and "recently viewed" (published only, in order). */
export const cardsEndpoint: Endpoint = {
  path: '/cards',
  method: 'get',
  handler: async (req) => {
    const slugs = String(req.searchParams.get('slugs') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^[a-z0-9-]{1,120}$/.test(s))
      .slice(0, 60)
    if (!slugs.length) return Response.json({ products: [] })
    const { toProduct } = await import('../lib/catalog/server')
    const res = await req.payload.find({
      collection: 'products',
      where: { and: [{ slug: { in: slugs } }, { _status: { equals: 'published' } }] },
      limit: slugs.length,
      depth: 1,
      pagination: false,
      overrideAccess: true,
    })
    const bySlug = new Map(res.docs.map((d) => [d.slug, toProduct(d)]))
    return Response.json({ products: slugs.map((s) => bySlug.get(s)).filter(Boolean) }, { headers: CACHE_SHORT })
  },
}

/** GET /api/products/pairs?slug= → "Pairs well with" for the bag drawer (cross-sells of the last item added). */
export const pairsEndpoint: Endpoint = {
  path: '/pairs',
  method: 'get',
  handler: async (req) => {
    const slug = String(req.searchParams.get('slug') ?? '')
    if (!/^[a-z0-9-]{1,120}$/.test(slug)) return Response.json({ products: [] })
    const { getCrossSells } = await import('../lib/catalog/server')
    return Response.json({ products: (await getCrossSells(slug, 6)).filter((p) => p.variants.some((v) => v.stock > 0)) }, { headers: CACHE_SHORT })
  },
}
