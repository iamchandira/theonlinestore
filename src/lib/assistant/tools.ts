import type { Payload, Where } from 'payload'

import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'

import type { Product as PProduct } from '@/payload-types'

import {
  descendantIds,
  getCategoryTree,
  getCrossSells,
  productFacts,
  toDetail,
  toProduct,
} from '../catalog/server'
import { normalizeQuery, searchProductIds } from '../catalog/search'
import type { Product } from '../catalog/types'
import { formatLKR } from '../format'
import type { Vocabulary } from './knowledge'

/**
 * Tools the shopping assistant (Gemini) may call. Lookups only read published products and never
 * return costs, codes, orders or customer data. Display tools (cards, quick replies, WhatsApp) only
 * describe what the chat should show; the endpoint checks them before they reach the shopper.
 */

export const SLUG = /^[a-z0-9-]{1,120}$/

export const TOOL_DECLARATIONS = [
  {
    name: 'search_products',
    description:
      'Find products in the store catalogue. Use English keywords in `query` (translate Sinhala/Tamil/Singlish) and the filter slugs listed in the system prompt. Returns up to `limit` products with facts. Call it before recommending anything.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Keywords, e.g. "niacinamide serum", "running shoes", "dark chocolate". Optional when filters are given.',
        },
        category: { type: 'string', description: 'Category slug' },
        brand: { type: 'string', description: 'Brand slug' },
        concern: {
          type: 'string',
          description: 'Concern slug (skin/hair need such as dry skin, acne)',
        },
        recipient: { type: 'string', description: 'Recipient slug (who it is for)' },
        occasion: { type: 'string', description: 'Occasion slug' },
        productType: {
          type: 'string',
          enum: ['beauty', 'fragrance', 'footwear', 'gift', 'chocolate', 'accessory', 'home'],
        },
        gender: {
          type: 'string',
          enum: ['women', 'men', 'unisex', 'kids'],
          description: 'Fragrance, footwear and accessories only',
        },
        minPrice: { type: 'number', description: 'Rupees' },
        maxPrice: { type: 'number', description: 'Rupees' },
        onSale: { type: 'boolean' },
        sort: {
          type: 'string',
          enum: ['relevance', 'bestsellers', 'price-asc', 'price-desc', 'rating', 'new'],
        },
        limit: { type: 'integer', minimum: 1, maximum: 8 },
      },
    },
  },
  {
    name: 'get_product',
    description:
      'Full details of one product (description, benefits, how to use, ingredients, sizes with price and availability, details, similar products). Use for questions about a specific product.',
    parametersJsonSchema: {
      type: 'object',
      properties: { slug: { type: 'string' } },
      required: ['slug'],
    },
  },
  {
    name: 'show_products',
    description:
      'Show product cards (photo, price, Add to bag) in the chat. Only use slugs returned by search_products or get_product. Use it whenever you recommend products; 1–6 cards, best first.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        slugs: { type: 'array', items: { type: 'string' }, maxItems: 6 },
        title: { type: 'string', description: 'Short heading, e.g. "For dry skin"' },
      },
      required: ['slugs'],
    },
  },
  {
    name: 'suggest_replies',
    description:
      'Show 2–5 tappable quick replies under your message, e.g. answers to the question you just asked ("Oily", "Dry", "Combination"). Write them in the shopper’s language.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
      },
      required: ['options'],
    },
  },
  {
    name: 'whatsapp_handoff',
    description:
      'Offer a button to continue on WhatsApp with a person. Use when the shopper asks for a person, when you cannot help, or for orders, complaints and payments problems.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description:
            'One or two sentences in English summarising what the shopper needs, for the staff member.',
        },
      },
      required: ['summary'],
    },
  },
  {
    name: 'add_to_bag',
    description:
      'Put products into the shopper’s bag when they ask you to (e.g. "add these to my bag"). Only slugs returned by search_products or get_product. Give the size/option label when the shopper chose one; products with several sizes and no size chosen open a size picker.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          maxItems: 6,
          items: {
            type: 'object',
            properties: { slug: { type: 'string' }, size: { type: 'string', description: 'Variant label, e.g. "50 ml" or "UK 7 / Black"' }, qty: { type: 'integer', minimum: 1, maximum: 10 } },
            required: ['slug'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'note_unanswered',
    description:
      'Record a store-related question you could not answer from the store information, so staff can add the answer.',
    parametersJsonSchema: {
      type: 'object',
      properties: { question: { type: 'string' } },
      required: ['question'],
    },
  },
] as const

export type ToolName = (typeof TOOL_DECLARATIONS)[number]['name']

/** What the chat should show, collected while the tools run. */
export type BagItem = { slug: string; sku: string | null; qty: number }

export type TurnEffects = {
  products: { slugs: string[]; title: string } | null
  replies: string[]
  handoff: string | null
  unanswered: string[]
  /** Products to put in the bag (the shopper's browser adds them; sku null = let them pick the size) */
  bag?: BagItem[]
}

export type ToolContext = {
  payload: Payload
  vocab: Vocabulary
  /** Slugs the shopper may be shown this turn: tool results, the product being viewed, and products shown earlier in the chat */
  seen: Set<string>
  effects: TurnEffects
  /** Slugs from this turn's latest search, best first (cards to fall back on) */
  lastSearch?: string[]
}

const clip = (s: string | null | undefined, n: number) => {
  const t = String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

/** Matches a filter value the model gave (slug or name, any case) to a real slug. */
function resolve(list: { slug: string; name: string }[], raw: unknown) {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const v = raw.trim().toLowerCase()
  return (
    list.find((x) => x.slug === v) ??
    list.find((x) => x.name.toLowerCase() === v) ??
    list.find((x) => x.name.toLowerCase().includes(v) || v.includes(x.slug)) ??
    null
  )
}

function priceText(p: Product) {
  if (!p.variants.length) return 'ask us on WhatsApp'
  const prices = p.variants.map((v) => v.price)
  const lo = Math.min(...prices)
  const hi = Math.max(...prices)
  return lo === hi ? formatLKR(lo) : `${formatLKR(lo)}–${formatLKR(hi)}`
}

function summary(p: Product, doc: PProduct, vocab: Vocabulary) {
  const inStock = p.variants.some((v) => v.stock > 0)
  const sale = p.variants.find((v) => v.compareAtPrice && v.compareAtPrice > v.price)
  const names = (slugs: string[], list: { slug: string; name: string }[]) =>
    slugs.map((s) => list.find((x) => x.slug === s)?.name ?? s)
  return {
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    type: p.productType,
    category: vocab.categories.find((c) => c.slug === p.subcategory)?.name ?? p.subcategory,
    price: priceText(p),
    ...(sale ? { onSale: `was ${formatLKR(sale.compareAtPrice!)}` } : {}),
    inStock,
    sizes:
      p.variants.length > 1
        ? p.variants.map((v) => [v.label, v.option2].filter(Boolean).join(' / '))
        : undefined,
    rating: p.reviewCount
      ? `${p.rating.toFixed(1)}/5 from ${p.reviewCount} reviews`
      : 'no reviews yet',
    about: clip(doc.shortDescription, 220),
    concerns: names(p.concerns, vocab.concerns),
    for: names(p.recipients, vocab.recipients),
    occasions: names(p.occasions, vocab.occasions),
    details: Object.fromEntries(productFacts(doc)),
    url: `/p/${p.slug}`,
  }
}

const SORTS: Record<string, string> = {
  bestsellers: '-salesCount',
  'price-asc': 'minPrice',
  'price-desc': '-minPrice',
  rating: '-rating',
  new: '-createdAt',
}

async function searchProducts(ctx: ToolContext, args: Record<string, unknown>) {
  const { payload, vocab } = ctx
  const limit = Math.min(Math.max(Number(args.limit) || 6, 1), 8)
  const and: Where[] = [{ _status: { equals: 'published' } }]
  const applied: Record<string, string> = {}

  const cat = resolve(vocab.categories, args.category)
  if (cat) {
    const { bySlug } = await getCategoryTree()
    const node = bySlug.get(cat.slug)
    if (node) and.push({ categories: { in: descendantIds(node) } })
    applied.category = cat.slug
  }
  for (const [key, collection, field] of [
    ['brand', 'brands', 'brand'],
    ['concern', 'concerns', 'concerns'],
    ['recipient', 'recipients', 'recipients'],
    ['occasion', 'occasions', 'occasions'],
  ] as const) {
    const list = key === 'brand' ? vocab.brands : vocab[collection as 'concerns']
    const hit = resolve(list, args[key])
    if (!hit) continue
    const found = await payload.find({
      collection,
      where: { slug: { equals: hit.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      select: { slug: true },
    })
    const id = found.docs[0]?.id
    if (!id) continue
    and.push(field === 'brand' ? { brand: { equals: id } } : { [field]: { in: [id] } })
    applied[key] = hit.slug
  }
  if (
    typeof args.productType === 'string' &&
    vocab.productTypes.some((t) => t.slug === args.productType)
  ) {
    and.push({ productType: { equals: args.productType } })
    applied.productType = args.productType
  }
  if (typeof args.gender === 'string' && ['women', 'men', 'unisex', 'kids'].includes(args.gender)) {
    // Unisex products suit everyone
    and.push({
      'details.gender': { in: args.gender === 'unisex' ? ['unisex'] : [args.gender, 'unisex'] },
    })
    applied.gender = args.gender
  }
  if (Number(args.maxPrice) > 0) and.push({ minPrice: { less_than_equal: Number(args.maxPrice) } })
  if (Number(args.minPrice) > 0)
    and.push({ maxPrice: { greater_than_equal: Number(args.minPrice) } })
  if (args.onSale === true) and.push({ onSale: { equals: true } })

  const query = typeof args.query === 'string' ? args.query.slice(0, 80) : ''
  const sort = typeof args.sort === 'string' ? args.sort : 'relevance'
  let ranked: number[] | null = null
  let note: string | undefined
  if (normalizeQuery(query).length >= 2) {
    ranked = await searchProductIds(payload, query, 300)
    if (!ranked.length) {
      ranked = null
      note = Object.keys(applied).length
        ? `Nothing matched "${query}"; these match the filters only.`
        : `Nothing matched "${query}".`
      if (!Object.keys(applied).length) return { results: [], total: 0, note }
    }
  }
  const where: Where = { and: ranked ? [...and, { id: { in: ranked } }] : and }
  const res = await payload.find({
    collection: 'products',
    where,
    // In stock first, then the chosen order (search relevance is applied below)
    sort: ranked && sort === 'relevance' ? undefined : (SORTS[sort] ?? '-salesCount'),
    limit: ranked && sort === 'relevance' ? 300 : 40,
    depth: 1,
    overrideAccess: true,
  })
  let docs = res.docs as PProduct[]
  if (ranked && sort === 'relevance') {
    const rank = new Map(ranked.map((id, i) => [id, i]))
    docs = [...docs].sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9))
  }
  docs = [...docs].sort((a, b) => Number((b.totalStock ?? 0) > 0) - Number((a.totalStock ?? 0) > 0))
  const picked = docs.slice(0, limit)
  const results = picked.map((d) => summary(toProduct(d), d, vocab))
  results.forEach((r) => ctx.seen.add(r.slug))
  if (results.length) ctx.lastSearch = results.map((r) => r.slug)
  return { results, total: res.totalDocs, filters: applied, ...(note ? { note } : {}) }
}

async function getProduct(ctx: ToolContext, args: Record<string, unknown>) {
  const slug = String(args.slug ?? '')
    .trim()
    .toLowerCase()
  if (!SLUG.test(slug)) return { error: 'Unknown product' }
  const doc = (
    await ctx.payload.find({
      collection: 'products',
      where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: slug } }] },
      limit: 1,
      depth: 2,
      overrideAccess: true,
    })
  ).docs[0] as PProduct | undefined
  if (!doc) return { error: 'No such product in the store' }
  const p = toDetail(doc)
  ctx.seen.add(slug)
  let description = ''
  try {
    description = p.description
      ? convertLexicalToPlaintext({
          data: p.description as Parameters<typeof convertLexicalToPlaintext>[0]['data'],
        })
      : ''
  } catch {
    description = ''
  }
  const similar = (await getCrossSells(slug, 4)).map((x) => ({
    slug: x.slug,
    name: `${x.brand} ${x.name}`.trim(),
    price: priceText(x),
  }))
  similar.forEach((s) => ctx.seen.add(s.slug))
  return {
    ...summary(p, doc, ctx.vocab),
    description: clip(description || p.shortDescription, 1500),
    benefits: p.benefits.length ? p.benefits.slice(0, 10) : 'not listed on our site',
    howToUse: clip(p.howToUse, 600) || 'not listed on our site',
    ingredients: clip(p.ingredients, 600) || 'not listed on our site',
    notes: p.notes ?? undefined,
    contents: p.contents.length ? p.contents : undefined,
    fit: p.fit || undefined,
    storage: p.storage || undefined,
    allergens: p.allergens || undefined,
    variants: p.variants.map((v) => ({
      size: [v.label, v.option2].filter(Boolean).join(' / '),
      price: formatLKR(v.price),
      ...(v.compareAtPrice && v.compareAtPrice > v.price
        ? { was: formatLKR(v.compareAtPrice) }
        : {}),
      available: v.stock > 0,
      ...(v.stock > 0 && v.stock <= 5 ? { note: 'only a few left' } : {}),
    })),
    pairsWellWith: similar,
    important: 'These are all the facts we have about this product. Anything not listed here is unknown: say it is not on our website yet. Do not add directions, claims or details from general knowledge.',
  }
}

/** Runs one tool call and returns the result sent back to the model. */
export async function runTool(
  ctx: ToolContext,
  name: string,
  rawArgs: unknown,
): Promise<Record<string, unknown>> {
  const args = (rawArgs && typeof rawArgs === 'object' ? rawArgs : {}) as Record<string, unknown>
  try {
    switch (name as ToolName) {
      case 'search_products':
        return await searchProducts(ctx, args)
      case 'get_product':
        return await getProduct(ctx, args)
      case 'show_products': {
        const slugs = (Array.isArray(args.slugs) ? args.slugs : [])
          .map((s) => String(s).trim().toLowerCase())
          .filter((s) => SLUG.test(s) && ctx.seen.has(s))
        const unique = [...new Set(slugs)].slice(0, 6)
        if (!unique.length)
          return {
            shown: 0,
            error:
              'Search first: only products returned by search_products or get_product can be shown.',
          }
        ctx.effects.products = { slugs: unique, title: clip(String(args.title ?? ''), 60) }
        return { shown: unique.length }
      }
      case 'suggest_replies': {
        const options = (Array.isArray(args.options) ? args.options : [])
          .map((o) => clip(String(o), 40))
          .filter(Boolean)
          .slice(0, 5)
        ctx.effects.replies = [...new Set(options)]
        return { shown: ctx.effects.replies.length }
      }
      case 'whatsapp_handoff':
        ctx.effects.handoff = clip(String(args.summary ?? ''), 300) || 'Customer needs help'
        return { shown: true }
      case 'add_to_bag': {
        const items = (Array.isArray(args.items) ? args.items : []).slice(0, 6) as { slug?: unknown; size?: unknown; qty?: unknown }[]
        const out: BagItem[] = []
        const added: string[] = []
        for (const it of items) {
          const slug = String(it.slug ?? '').trim().toLowerCase()
          if (!SLUG.test(slug) || !ctx.seen.has(slug)) continue
          const doc = (
            await ctx.payload.find({ collection: 'products', where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: slug } }] }, limit: 1, depth: 0, overrideAccess: true, select: { name: true, variants: true } })
          ).docs[0] as Pick<PProduct, 'name' | 'variants'> | undefined
          const variants = (doc?.variants ?? []).filter((v) => (v.stock ?? 0) > 0)
          if (!doc || !variants.length) {
            added.push(`${slug}: sold out, not added`)
            continue
          }
          const size = typeof it.size === 'string' ? it.size.trim().toLowerCase() : ''
          const label = (v: (typeof variants)[number]) => [v.label, v.option2].filter(Boolean).join(' / ').toLowerCase()
          const match = size ? variants.find((v) => label(v) === size) ?? variants.find((v) => label(v).includes(size)) : null
          const sku = match?.sku ?? (variants.length === 1 && (doc.variants ?? []).length === 1 ? variants[0].sku : null)
          out.push({ slug, sku, qty: Math.min(Math.max(Number(it.qty) || 1, 1), 10) })
          added.push(sku ? `${doc.name}${match ? ` (${[match.label, match.option2].filter(Boolean).join(' / ')})` : ''}: added` : `${doc.name}: the shopper will pick the size`)
        }
        if (!out.length) return { added: 0, results: added, error: added.length ? undefined : 'Search first: only products from this chat can be added.' }
        ctx.effects.bag = [...(ctx.effects.bag ?? []), ...out]
        return { results: added }
      }
      case 'note_unanswered':
        ctx.effects.unanswered.push(clip(String(args.question ?? ''), 200))
        return { noted: true }
      default:
        return { error: `Unknown tool ${name}` }
    }
  } catch (e) {
    return {
      error: 'Lookup failed',
      detail: e instanceof Error ? e.message.slice(0, 120) : 'error',
    }
  }
}
