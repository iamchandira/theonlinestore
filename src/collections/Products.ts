import { MetaDescriptionField, MetaImageField, MetaTitleField, OverviewField, PreviewField } from '@payloadcms/plugin-seo/fields'
import { APIError, slugField, type CollectionConfig, type Where } from 'payload'
import { exportEndpoint, importEndpoint } from '../endpoints/productsCsv'
import { cardsEndpoint, facetsEndpoint, pairsEndpoint, suggestEndpoint } from '../endpoints/storefront'

import { catalogAndStock, catalogDeleters, catalogEditors, fieldRoles, publishedOrStaff } from '../access/roles'
import { audit, auditDelete } from '../lib/payload/audit'
import { revalidateStorefront, revalidateStorefrontOnDelete } from '../lib/payload/revalidate'

type VariantRow = {
  id?: string
  sku?: string
  label?: string
  option2?: string | null
  price?: number
  compareAtPrice?: number | null
  cost?: number | null
  stock?: number
  lowStockThreshold?: number
}

type StockReason = 'initial' | 'adjustment' | 'restock' | 'sale' | 'return' | 'damaged' | 'count'

const OPTION_TYPES = ['Size', 'Shade', 'Scent', 'Flavour', 'Pack', 'Set', 'Colour', 'Shoe size', 'Weight', 'Style'] as const

/** Product types: drive which detail fields, filters and page sections apply (a lifestyle store, not only beauty). */
export const PRODUCT_TYPES = [
  { label: 'Beauty & personal care', value: 'beauty' },
  { label: 'Fragrance', value: 'fragrance' },
  { label: 'Footwear', value: 'footwear' },
  { label: 'Gift / hamper', value: 'gift' },
  { label: 'Chocolate & treats', value: 'chocolate' },
  { label: 'Accessory', value: 'accessory' },
  { label: 'Home & living', value: 'home' },
] as const

const isType =
  (...types: string[]) =>
  (data: Record<string, unknown>) =>
    types.includes(String(data?.productType ?? 'beauty'))

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
    hideAPIURL: true,
    components: {
      views: { list: { Component: '/components/admin/views/ProductsList#ProductsList' } },
      // Coloured status pill (Published / Draft / Unpublished changes) and "Unsaved changes" in the action bar
      edit: { beforeDocumentControls: ['/components/admin/product/ProductStatus#ProductStatus'] },
    },
  },
  // Drafts + scheduled publishing (TOS-110). The public only ever sees published products.
  versions: { drafts: { schedulePublish: true }, maxPerDoc: 25 },
  access: {
    read: publishedOrStaff,
    create: catalogEditors,
    update: catalogAndStock, // inventory managers can open products to change stock; field access limits the rest
    delete: catalogDeleters,
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
        const lookup = async (collection: 'brands' | 'tags' | 'concerns' | 'categories' | 'recipients' | 'occasions', ids: unknown) => {
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
          ...(await lookup('recipients', data.recipients)),
          ...(await lookup('occasions', data.occasions)),
          ...variants.flatMap((v) => [v.label, v.option2]),
          PRODUCT_TYPES.find((t) => t.value === data.productType)?.label,
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
              variantLabel: [v.label, v.option2].filter(Boolean).join(' / '),
              change: next - prev,
              resultingStock: next,
              reason: operation === 'create' || !before.has(v.sku) ? 'initial' : ((context?.stockReason as StockReason | undefined) ?? 'adjustment'),
              user: req.user?.id,
              note: (context?.stockNote as string | undefined) || undefined,
            },
            overrideAccess: true,
            req,
          })
          if (next <= Number(v.lowStockThreshold ?? 5)) {
            req.payload.logger.warn(`Low stock: ${doc.name} (${[v.label, v.option2].filter(Boolean).join(' / ')}, ${v.sku}) has ${next} left`)
          }
        }
        return doc
      },
      // Audit log (TOS-402): every price, "was" price and cost change, per SKU
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || !previousDoc) return doc
        const before = new Map(((previousDoc.variants ?? []) as VariantRow[]).map((v) => [v.sku, v]))
        const changes: { sku: string; field: string; from: unknown; to: unknown }[] = []
        for (const v of (doc.variants ?? []) as VariantRow[]) {
          const p = before.get(v.sku)
          if (!p) continue
          for (const field of ['price', 'compareAtPrice', 'cost'] as const) {
            if ((p[field] ?? null) !== (v[field] ?? null)) changes.push({ sku: String(v.sku), field, from: p[field] ?? null, to: v[field] ?? null })
          }
        }
        if (changes.length) {
          const first = changes[0]
          await audit(req, {
            action: 'price-change',
            collection: 'products',
            docId: doc.id,
            summary: `${doc.name}: ${first.field} ${first.from ?? '—'} → ${first.to ?? '—'} (${first.sku})${changes.length > 1 ? ` and ${changes.length - 1} more` : ''}`,
            changes,
          })
        }
        return doc
      },
      revalidateStorefront(paths),
    ],
    afterDelete: [revalidateStorefrontOnDelete(paths), auditDelete('products', (d) => String(d.name))],
  },
  endpoints: [
    {
      // POST /api/products/adjust-stock  { productId, changes: [{ sku, stock }], reason, note }
      // Used by the admin Inventory screen. Each change is logged as a stock movement with the reason and note.
      path: '/adjust-stock',
      method: 'post',
      handler: async (req) => {
        const { hasRole } = await import('../access/roles')
        if (!req.user || !hasRole(req.user, 'admin', 'store-manager', 'inventory-manager')) {
          return Response.json({ error: 'You don’t have permission to change stock.' }, { status: 403 })
        }
        const body = (await req.json?.()) as {
          productId?: number
          changes?: { sku: string; stock: number }[]
          reason?: StockReason
          note?: string
        }
        const reasons: StockReason[] = ['adjustment', 'restock', 'count', 'damaged', 'return']
        if (!body?.productId || !Array.isArray(body.changes) || !body.changes.length) {
          return Response.json({ error: 'productId and changes are required' }, { status: 400 })
        }
        const reason = reasons.includes(body.reason as StockReason) ? body.reason : 'adjustment'
        const product = await req.payload.findByID({ collection: 'products', id: body.productId, depth: 0, req })
        const bySku = new Map(body.changes.map((c) => [c.sku, Math.max(0, Math.floor(Number(c.stock)))]))
        const variants = (product.variants ?? []).map((v) => (bySku.has(v.sku) ? { ...v, stock: bySku.get(v.sku)! } : v))
        const updated = await req.payload.update({
          collection: 'products',
          id: product.id,
          data: { variants },
          req,
          overrideAccess: false,
          context: { stockReason: reason, stockNote: body.note?.slice(0, 200) },
        })
        return Response.json({ ok: true, totalStock: updated.totalStock, lowStock: updated.lowStock })
      },
    },
    exportEndpoint,
    importEndpoint,
    suggestEndpoint,
    facetsEndpoint,
    cardsEndpoint,
    pairsEndpoint,
  ],
  // Edit page (redesign): tabs for the main kinds of information; inside each tab, section cards with a
  // title and a one-line hint. Tabs and sections are presentation only: field names and data are unchanged.
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Product',
          fields: [
          {
            type: 'collapsible',
            label: 'Product information',
            admin: { className: 'tos-section', components: { Label: '/components/admin/product/SectionLabel#SectionLabel' }, description: 'What shoppers see first: the name, brand, category and description.' },
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
            ],
          },
          {
            type: 'collapsible',
            label: 'Photos',
            admin: { className: 'tos-section', components: { Label: '/components/admin/product/SectionLabel#SectionLabel' }, description: 'Extra photos for the gallery. Each variant’s own photo is set in the Variants & pricing tab.' },
            fields: [
                  { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true, label: 'Extra photos', admin: { description: 'Drag to reorder. Shown after the variant’s own photo.' } },
            ],
          },
          ],
        },
        {
          label: 'Variants & pricing',
          fields: [
          {
            type: 'collapsible',
            label: 'Variants, prices & stock',
            admin: { className: 'tos-section', components: { Label: '/components/admin/product/SectionLabel#SectionLabel' }, description: 'Each variant is a sellable SKU with its own price (Rs), stock and photo.' },
            fields: [
                  {
                    type: 'row',
                    fields: [
                      {
                        name: 'optionName',
                        label: 'Option 1',
                        type: 'select',
                        required: true,
                        defaultValue: 'Size',
                        options: OPTION_TYPES.map((o) => ({ label: o, value: o })),
                        admin: { width: '50%', description: 'What the variants differ by, e.g. Size.' },
                      },
                      {
                        name: 'option2Name',
                        label: 'Option 2 (optional)',
                        type: 'select',
                        options: OPTION_TYPES.map((o) => ({ label: o, value: o })),
                        admin: { width: '50%', description: 'A second dimension, e.g. Colour for shoes (size × colour).' },
                      },
                    ],
                  },
                  {
                    name: 'variants',
                    type: 'array',
                    required: true,
                    minRows: 1,
                    labels: { singular: 'Variant', plural: 'Variants' },
                    admin: { initCollapsed: true, components: { RowLabel: '/components/admin/VariantRowLabel#VariantRowLabel' } },
                    fields: [
                      {
                        type: 'row',
                        fields: [
                          { name: 'label', label: 'Option 1 value', type: 'text', required: true, admin: { width: '25%', description: 'e.g. 100 ml, EU 38' } },
                          {
                            name: 'option2',
                            label: 'Option 2 value',
                            type: 'text',
                            admin: { width: '25%', description: 'e.g. Black', condition: (data) => Boolean(data?.option2Name) },
                          },
                          { name: 'sku', type: 'text', required: true, index: true, admin: { width: '25%' } },
                          { name: 'barcode', type: 'text', admin: { width: '25%' } },
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
            ],
          },
          ],
        },
        {
          label: 'Details',
          fields: [
          {
            type: 'collapsible',
            label: 'Product details',
            admin: { className: 'tos-section', components: { Label: '/components/admin/product/SectionLabel#SectionLabel' }, description: 'Shown on the product page. The fields change with the product type (in the sidebar).' },
            fields: [
                  {
                    name: 'details',
                    type: 'group',
                    label: false,
                    fields: [
                      // Fragrance
                      {
                        type: 'row',
                        admin: { condition: isType('fragrance') },
                        fields: [
                          {
                            name: 'concentration',
                            type: 'select',
                            admin: { width: '33%' },
                            options: ['Parfum', 'Eau de Parfum', 'Eau de Toilette', 'Eau de Cologne', 'Body mist'].map((v) => ({ label: v, value: v })),
                          },
                          {
                            name: 'scentFamily',
                            type: 'select',
                            admin: { width: '33%' },
                            options: ['Floral', 'Fresh', 'Citrus', 'Woody', 'Oriental', 'Gourmand', 'Aquatic', 'Fruity'].map((v) => ({ label: v, value: v })),
                          },
                          {
                            name: 'longevity',
                            type: 'select',
                            admin: { width: '34%' },
                            options: ['Light (2–4 h)', 'Moderate (4–6 h)', 'Long-lasting (6–8 h)', 'Very long (8 h+)'].map((v) => ({ label: v, value: v })),
                          },
                        ],
                      },
                      {
                        type: 'row',
                        admin: { condition: isType('fragrance') },
                        fields: [
                          { name: 'topNotes', type: 'text', admin: { width: '33%', description: 'Comma separated' } },
                          { name: 'heartNotes', type: 'text', admin: { width: '33%' } },
                          { name: 'baseNotes', type: 'text', admin: { width: '34%' } },
                        ],
                      },
                      // Fragrance + footwear + accessory
                      {
                        name: 'gender',
                        type: 'select',
                        admin: { condition: isType('fragrance', 'footwear', 'accessory'), description: 'Used for "For her / For him" filters.' },
                        options: [
                          { label: 'Women', value: 'women' },
                          { label: 'Men', value: 'men' },
                          { label: 'Unisex', value: 'unisex' },
                          { label: 'Kids', value: 'kids' },
                        ],
                      },
                      // Footwear
                      {
                        type: 'row',
                        admin: { condition: isType('footwear') },
                        fields: [
                          {
                            name: 'footwearStyle',
                            label: 'Style',
                            type: 'select',
                            admin: { width: '33%' },
                            options: ['Sneakers', 'Sandals', 'Slides', 'Heels', 'Flats', 'Formal', 'Boots'].map((v) => ({ label: v, value: v })),
                          },
                          { name: 'material', type: 'text', admin: { width: '33%', description: 'e.g. Canvas upper, rubber sole' } },
                          {
                            name: 'sizeSystem',
                            type: 'select',
                            defaultValue: 'EU',
                            admin: { width: '34%' },
                            options: ['EU', 'UK', 'US'].map((v) => ({ label: v, value: v })),
                          },
                        ],
                      },
                      { name: 'fit', type: 'text', admin: { condition: isType('footwear'), description: 'e.g. True to size; half a size up for wide feet' } },
                      // Chocolate & treats
                      {
                        type: 'row',
                        admin: { condition: isType('chocolate') },
                        fields: [
                          { name: 'netWeight', label: 'Net weight (g)', type: 'number', admin: { width: '33%' } },
                          { name: 'cocoaPercent', label: 'Cocoa %', type: 'number', min: 0, max: 100, admin: { width: '33%' } },
                          { name: 'origin', type: 'text', admin: { width: '34%', description: 'e.g. Belgium, Sri Lanka' } },
                        ],
                      },
                      {
                        name: 'dietary',
                        type: 'select',
                        hasMany: true,
                        admin: { condition: isType('chocolate') },
                        options: ['Vegan', 'Vegetarian', 'Gluten-free', 'Sugar-free', 'Halal', 'Nut-free'].map((v) => ({ label: v, value: v })),
                      },
                      { name: 'allergens', type: 'text', admin: { condition: isType('chocolate'), description: 'e.g. Contains milk, soy; may contain nuts' } },
                      { name: 'storage', type: 'text', admin: { condition: isType('chocolate'), description: 'e.g. Store below 25°C, away from sunlight' } },
                      // Gifts
                      { name: 'contents', label: 'What’s inside', type: 'textarea', admin: { condition: isType('gift'), description: 'One item per line.' } },
                      {
                        type: 'row',
                        admin: { condition: isType('gift') },
                        fields: [
                          { name: 'giftWrapped', label: 'Arrives gift-wrapped', type: 'checkbox', admin: { width: '50%' } },
                          { name: 'personalisable', label: 'Can be personalised (message card)', type: 'checkbox', admin: { width: '50%' } },
                        ],
                      },
                    ],
                  },
                  { name: 'benefits', type: 'textarea', admin: { description: 'One benefit per line.' } },
                  { name: 'howToUse', type: 'textarea' },
                  { name: 'ingredients', type: 'textarea' },
            ],
          },
          ],
        },
        {
          label: 'Merchandising',
          fields: [
          {
            type: 'collapsible',
            label: 'Merchandising',
            admin: { className: 'tos-section', components: { Label: '/components/admin/product/SectionLabel#SectionLabel' }, description: 'Badges, collections and recommendations that help shoppers find this product.' },
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
                  {
                    type: 'row',
                    fields: [
                      { name: 'recipients', label: 'Good for (recipients)', type: 'relationship', relationTo: 'recipients', hasMany: true, admin: { width: '50%' } },
                      { name: 'occasions', type: 'relationship', relationTo: 'occasions', hasMany: true, admin: { width: '50%' } },
                    ],
                  },
                  {
                    name: 'concerns',
                    label: 'Skin / hair concerns',
                    type: 'relationship',
                    relationTo: 'concerns',
                    hasMany: true,
                    admin: { condition: isType('beauty'), description: 'Beauty products only.' },
                  },
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
        {
          label: 'SEO',
          fields: [
            {
              type: 'collapsible',
              label: 'Search engine listing',
              admin: {
                className: 'tos-section',
                components: { Label: '/components/admin/product/SectionLabel#SectionLabel' },
                description: 'How this product appears in Google and when its link is shared. Leave empty to use the name and short description.',
              },
              fields: [
                {
                  name: 'meta',
                  type: 'group',
                  label: false,
                  fields: [
                    OverviewField({}),
                    MetaTitleField({ hasGenerateFn: true }),
                    MetaDescriptionField({ hasGenerateFn: true }),
                    MetaImageField({ relationTo: 'media', hasGenerateFn: false }),
                    PreviewField({ hasGenerateFn: false }),
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      // Price range, stock, sales and rating at a glance (read from the fields below)
      name: 'overview',
      type: 'ui',
      admin: { position: 'sidebar', components: { Field: '/components/admin/product/ProductOverview#ProductOverview' } },
    },
    {
      name: 'productType',
      type: 'select',
      required: true,
      defaultValue: 'beauty',
      index: true,
      options: PRODUCT_TYPES.map((t) => ({ label: t.label, value: t.value })),
      admin: { position: 'sidebar', description: 'Controls the detail fields, filters and page sections.' },
    },
    slugField({ useAsSlug: 'name', overrides: (f) => ({ ...f, admin: { ...f.admin, position: 'sidebar' } }) }),
    {
      name: 'priceTBC',
      label: 'Price to be confirmed',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Shown as a warning in the admin until the prices are checked. Untick once they are.' },
    },
    // ----- computed / read-only -----
    { name: 'minPrice', type: 'number', index: true, admin: { readOnly: true, hidden: true } },
    { name: 'maxPrice', type: 'number', admin: { readOnly: true, hidden: true } },
    { name: 'totalStock', type: 'number', admin: { readOnly: true, hidden: true } },
    { name: 'lowStock', type: 'checkbox', index: true, admin: { readOnly: true, hidden: true } },
    { name: 'onSale', type: 'checkbox', index: true, admin: { readOnly: true, hidden: true } },
    {
      name: 'salesCount',
      type: 'number',
      defaultValue: 0,
      index: true,
      admin: { readOnly: true, hidden: true, description: 'Units sold (updated by orders). Drives "Bestsellers" sorting.' },
    },
    {
      name: 'rating',
      type: 'number',
      admin: { readOnly: true, hidden: true, description: 'Average of approved reviews (updated automatically).' },
    },
    { name: 'reviewCount', type: 'number', admin: { readOnly: true, hidden: true } },
    { name: 'searchText', type: 'text', index: true, admin: { hidden: true } },
  ],
}
