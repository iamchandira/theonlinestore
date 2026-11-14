import { APIError, slugField, type CollectionConfig, type Where } from 'payload'

import { catalogAndStock, catalogEditors, fieldRoles, publishedOrStaff } from '../access/roles'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '../lib/payload/revalidate'

type VariantRow = {
  id?: string
  sku?: string
  label?: string
  price?: number
  compareAtPrice?: number | null
  stock?: number
  lowStockThreshold?: number
}

type StockReason = 'initial' | 'adjustment' | 'restock' | 'sale' | 'return' | 'damaged' | 'count'

const OPTION_TYPES = ['Size', 'Shade', 'Scent', 'Flavour', 'Pack', 'Set', 'Colour', 'Shoe size'] as const

const paths = (doc: Record<string, unknown>) => [`/p/${doc.slug}`]

/**
 * Products with variants (TOS-101, TOS-102) and per-variant inventory (TOS-104).
 * Denormalised fields (minPrice, maxPrice, totalStock, lowStock, onSale, searchText) are computed on save
 * so listing pages can sort and filter in the database without loading every variant.
 */
export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Product', plural: 'Products' },
  admin: {
    useAsTitle: 'name',
    group: 'Catalogue',
    defaultColumns: ['name', 'brand', 'minPrice', 'totalStock', 'lowStock', '_status'],
    listSearchableFields: ['name', 'searchText'],
    preview: (doc) => `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/p/${doc.slug}`,
    description: 'Prices are in LKR. A product flagged "Price to be confirmed" shows a warning until its prices are checked.',
  },
  // Drafts + scheduled publishing (TOS-110). The public only ever sees published products.
  versions: { drafts: { schedulePublish: true }, maxPerDoc: 25 },
  access: {
    read: publishedOrStaff,
    create: catalogEditors,
    update: catalogAndStock, // inventory managers can open products to change stock; field access limits the rest
    delete: catalogEditors,
  },
  defaultSort: '-updatedAt',
  hooks: {
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        const variants = (data?.variants ?? []) as VariantRow[]
        const skus = variants.map((v) => v.sku?.trim()).filter(Boolean) as string[]
        const dupInDoc = skus.find((s, i) => skus.indexOf(s) !== i)
        if (dupInDoc) throw new APIError(`SKU "${dupInDoc}" is used twice in this product.`, 400, undefined, true)
        if (skus.length) {
          const where: Where = { 'variants.sku': { in: skus } }
          if (originalDoc?.id) where.id = { not_equals: originalDoc.id }
          const clash = await req.payload.find({ collection: 'products', where, limit: 1, depth: 0, draft: true, overrideAccess: true, req })
          if (clash.docs[0]) throw new APIError(`One of these SKUs is already used by "${clash.docs[0].name}".`, 400, undefined, true)
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, req }) => {
        const variants = (data.variants ?? []) as VariantRow[]
        const prices = variants.map((v) => Number(v.price ?? 0)).filter((n) => n > 0)
        data.minPrice = prices.length ? Math.min(...prices) : null
        data.maxPrice = prices.length ? Math.max(...prices) : null
        data.totalStock = variants.reduce((n, v) => n + Math.max(0, Number(v.stock ?? 0)), 0)
        data.lowStock = variants.some((v) => Number(v.stock ?? 0) <= Number(v.lowStockThreshold ?? 5))
        data.onSale = variants.some((v) => v.compareAtPrice && Number(v.compareAtPrice) > Number(v.price))

        // Search text: brand + name + taxonomy names, so search can match "cerave cleanser" or "dark spots"
        const brandId = typeof data.brand === 'object' ? data.brand?.id : data.brand
        const lookup = async (collection: 'brands' | 'tags' | 'concerns' | 'categories', ids: unknown) => {
          const list = (Array.isArray(ids) ? ids : ids ? [ids] : []).map((x) => (typeof x === 'object' && x ? (x as { id: string | number }).id : x))
          if (!list.length) return []
          const res = await req.payload.find({ collection, where: { id: { in: list } }, limit: 50, depth: 0, overrideAccess: true, req })
          return res.docs.map((d) => (d as { name: string }).name)
        }
        const words = [
          ...(await lookup('brands', brandId)),
          data.name,
          ...(await lookup('categories', data.categories)),
          ...(await lookup('concerns', data.concerns)),
          ...(await lookup('tags', data.tags)),
          ...variants.map((v) => v.label),
        ]
        data.searchText = words.filter(Boolean).join(' ').toLowerCase()
        return data
      },
    ],
    afterChange: [
      // Stock movement log (TOS-104): every stock change on any variant is recorded with who and why
      async ({ doc, previousDoc, operation, req, context }) => {
        if (context?.skipStockLog) return doc
        const before = new Map(((previousDoc?.variants ?? []) as VariantRow[]).map((v) => [v.sku, Number(v.stock ?? 0)]))
        for (const v of (doc.variants ?? []) as VariantRow[]) {
          const prev = operation === 'create' ? 0 : (before.get(v.sku) ?? 0)
          const next = Number(v.stock ?? 0)
          if (next === prev) continue
          await req.payload.create({
            collection: 'stock-movements',
            data: {
              product: doc.id,
              sku: String(v.sku ?? ""),
              variantLabel: v.label,
              change: next - prev,
              resultingStock: next,
              reason: operation === 'create' || !before.has(v.sku) ? 'initial' : ((context?.stockReason as StockReason | undefined) ?? 'adjustment'),
              user: req.user?.id,
            },
            overrideAccess: true,
            req,
          })
          if (next <= Number(v.lowStockThreshold ?? 5)) {
            req.payload.logger.warn(`Low stock: ${doc.name} (${v.label}, ${v.sku}) has ${next} left`)
          }
        }
        return doc
      },
      revalidateStorefront(paths),
    ],
    afterDelete: [revalidateStorefrontOnDelete(paths)],
  },
  endpoints: [
    {
      // GET /api/products/suggest?q=centella → autosuggest for the header search (public, published only)
      path: '/suggest',
      method: 'get',
      handler: async (req) => {
        const q = String(req.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 60)
        if (q.length < 2) return Response.json({ products: [], brands: [] })
        const terms = q.split(/\s+/).filter(Boolean).slice(0, 5)
        const [products, brands] = await Promise.all([
          req.payload.find({
            collection: 'products',
            where: { and: [{ _status: { equals: 'published' } }, ...terms.map((t) => ({ searchText: { like: t } }))] },
            limit: 6,
            depth: 1,
            sort: '-salesCount',
            select: { name: true, slug: true, brand: true, minPrice: true, variants: { image: true } },
            overrideAccess: true,
          }),
          req.payload.find({ collection: 'brands', where: { name: { like: q } }, limit: 3, depth: 0, select: { name: true, slug: true } }),
        ])
        const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
        const rel = (u?: string | null) => (u ? (u.startsWith(origin) ? u.slice(origin.length) : u) : null)
        const imageOf = (img: unknown) => {
          const m = img as { url?: string; sizes?: { thumb?: { url?: string } } } | null
          return rel(m?.sizes?.thumb?.url) || rel(m?.url)
        }
        return Response.json(
          {
            products: products.docs.map((p) => ({
              slug: p.slug,
              name: p.name,
              brand: typeof p.brand === 'object' && p.brand ? p.brand.name : '',
              price: p.minPrice,
              image: imageOf(p.variants?.[0]?.image),
            })),
            brands: brands.docs.map((b) => ({ name: b.name, slug: b.slug })),
          },
          { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
        )
      },
    },
  ],
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Product',
          fields: [
            { name: 'name', type: 'text', required: true, admin: { description: 'Without the brand, e.g. "Hydrating Facial Cleanser".' } },
            {
              type: 'row',
              fields: [
                { name: 'brand', type: 'relationship', relationTo: 'brands', required: true, admin: { width: '50%' } },
                {
                  name: 'categories',
                  type: 'relationship',
                  relationTo: 'categories',
                  hasMany: true,
                  required: true,
                  admin: { width: '50%', description: 'Pick the most specific category (e.g. Serums). The first one is the main category.' },
                },
              ],
            },
            { name: 'shortDescription', type: 'textarea', admin: { description: 'One or two sentences shown near the price.' } },
            { name: 'description', type: 'richText' },
            { name: 'benefits', type: 'textarea', admin: { description: 'One benefit per line.' } },
            { name: 'howToUse', type: 'textarea' },
            { name: 'ingredients', type: 'textarea' },
          ],
        },
        {
          label: 'Variants & stock',
          description: 'Each variant is a sellable SKU with its own price, stock and photo.',
          fields: [
            {
              name: 'optionName',
              type: 'select',
              required: true,
              defaultValue: 'Size',
              options: OPTION_TYPES.map((o) => ({ label: o, value: o })),
              admin: { description: 'What the variants differ by.' },
            },
            {
              name: 'variants',
              type: 'array',
              required: true,
              minRows: 1,
              labels: { singular: 'Variant', plural: 'Variants' },
              admin: { initCollapsed: false },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', required: true, admin: { width: '34%', description: 'e.g. 100 ml, Rose Amour' } },
                    { name: 'sku', type: 'text', required: true, index: true, admin: { width: '33%' } },
                    { name: 'barcode', type: 'text', admin: { width: '33%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'price',
                      type: 'number',
                      required: true,
                      min: 0,
                      admin: { width: '25%', description: 'Selling price (Rs)' },
                      access: { update: fieldRoles('store-manager') },
                    },
                    {
                      name: 'compareAtPrice',
                      type: 'number',
                      min: 0,
                      admin: { width: '25%', description: '"Was" price (Rs), for sales' },
                      access: { update: fieldRoles('store-manager', 'marketing') },
                    },
                    {
                      name: 'cost',
                      type: 'number',
                      min: 0,
                      admin: { width: '25%', description: 'Cost price (staff only)' },
                      access: { read: fieldRoles('store-manager', 'inventory-manager'), update: fieldRoles('store-manager') },
                    },
                    { name: 'weight', type: 'number', min: 0, admin: { width: '25%', description: 'Grams (for delivery fees)' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'stock',
                      type: 'number',
                      required: true,
                      defaultValue: 0,
                      min: 0,
                      admin: { width: '50%' },
                      access: { update: fieldRoles('store-manager', 'inventory-manager') },
                    },
                    {
                      name: 'lowStockThreshold',
                      type: 'number',
                      defaultValue: 5,
                      min: 0,
                      admin: { width: '50%', description: 'Flag as low stock at or below this' },
                      access: { update: fieldRoles('store-manager', 'inventory-manager') },
                    },
                  ],
                },
                { name: 'image', type: 'upload', relationTo: 'media' },
              ],
            },
            { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true, admin: { description: 'Extra photos shown after the variant photo.' } },
          ],
        },
        {
          label: 'Merchandising',
          fields: [
            {
              name: 'badge',
              type: 'select',
              options: [
                { label: 'Bestseller', value: 'bestseller' },
                { label: 'New', value: 'new' },
                { label: 'Trending', value: 'trending' },
                { label: 'Gift idea', value: 'gift' },
                { label: 'Limited', value: 'limited' },
              ],
            },
            { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true },
            { name: 'concerns', type: 'relationship', relationTo: 'concerns', hasMany: true },
            {
              name: 'crossSells',
              label: 'Pairs well with (cross-sells)',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
              admin: { description: 'Shown as "Pairs well with". Leave empty to suggest automatically from the same concerns.' },
            },
            {
              name: 'upsells',
              label: 'Upgrade to (upsells)',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
            },
          ],
        },
      ],
    },
    slugField({ useAsSlug: 'name', overrides: (f) => ({ ...f, admin: { ...f.admin, position: 'sidebar' } }) }),
    {
      name: 'priceTBC',
      label: 'Price to be confirmed',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Imported with placeholder prices. Untick once prices are checked.' },
    },
    // ----- computed / read-only -----
    { name: 'minPrice', type: 'number', index: true, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'maxPrice', type: 'number', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'totalStock', type: 'number', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'lowStock', type: 'checkbox', index: true, admin: { readOnly: true, position: 'sidebar', description: 'A variant is at or below its threshold.' } },
    { name: 'onSale', type: 'checkbox', index: true, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'salesCount',
      type: 'number',
      defaultValue: 0,
      index: true,
      admin: { readOnly: true, position: 'sidebar', description: 'Units sold (updated by orders from Sprint 6). Drives "Bestsellers" sorting.' },
    },
    {
      name: 'rating',
      type: 'number',
      admin: { readOnly: true, position: 'sidebar', description: 'Placeholder until reviews launch (Sprint 2).' },
    },
    { name: 'reviewCount', type: 'number', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'searchText', type: 'text', index: true, admin: { hidden: true } },
  ],
}
