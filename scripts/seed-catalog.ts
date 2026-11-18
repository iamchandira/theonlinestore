/**
 * Imports the Sprint 0 seed catalogue (seed/catalogue/products.json + public/catalogue/*) into Payload (TOS-107).
 * Idempotent: re-running updates existing records (matched by slug / filename) instead of duplicating them.
 *
 * Usage: pnpm seed:catalog
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload, type Payload } from 'payload'

import config from '../src/payload.config'
import { assertLocalDatabase } from './devOnly'

assertLocalDatabase('seed:catalog')
import { categories as navCategories, concerns as navConcerns, occasions as navOccasions, recipients as navRecipients } from '../src/config/navigation'

type SeedVariant = { sku: string; option: string; label: string; price: number; compareAtPrice: number | null; stock: number; image: string }
type SeedProduct = {
  slug: string
  brand: string
  name: string
  category: string
  subcategory: string
  concerns: string[]
  tags: string[]
  badge: string | null
  rating: number
  reviewCount: number
  variants: SeedVariant[]
}

const root = process.cwd()
const seed = JSON.parse(fs.readFileSync(path.join(root, 'seed/catalogue/products.json'), 'utf8')) as { products: SeedProduct[] }
const ctx = { disableRevalidate: true }

const brandGroups: Record<string, string> = {
  Anua: 'k-beauty', COSRX: 'k-beauty', Celimax: 'k-beauty', 'Dr. Althea': 'k-beauty', Medicube: 'k-beauty', SKIN1004: 'k-beauty',
  CeraVe: 'derm', Cetaphil: 'derm', 'La Roche-Posay': 'derm', 'The Ordinary': 'derm',
}
const tagNames: Record<string, string> = {
  'k-beauty': 'K-Beauty', 'j-beauty': 'J-Beauty', derm: 'Derm-approved', everyday: 'Everyday', bestseller: 'Bestseller',
  new: 'New', trending: 'Trending', gift: 'Gift idea', limited: 'Limited edition',
}
const concernNames: Record<string, string> = Object.fromEntries(navConcerns.map((c) => [c.slug, c.label]))
const titleCase = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/** Find by a field or create; returns the id. Updates the doc when it already exists. */
async function upsert(payload: Payload, collection: 'brands' | 'tags' | 'concerns' | 'categories' | 'recipients' | 'occasions', where: Record<string, unknown>, data: Record<string, unknown>) {
  const found = await payload.find({ collection, where: { slug: { equals: where.slug } }, limit: 1, depth: 0 })
  if (found.docs[0]) {
    const doc = await payload.update({ collection, id: found.docs[0].id, data: data as never, context: ctx })
    return doc.id
  }
  const doc = await payload.create({ collection, data: data as never, context: ctx })
  return doc.id
}

async function main() {
  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(m)

  // ---------- Taxonomies ----------
  const tagIds = new Map<string, number>()
  for (const t of new Set(seed.products.flatMap((p) => p.tags))) {
    tagIds.set(t, (await upsert(payload, 'tags', { slug: t }, { name: tagNames[t] ?? titleCase(t), slug: t, generateSlug: false })) as number)
  }
  const concernIds = new Map<string, number>()
  for (const c of new Set([...navConcerns.map((x) => x.slug), ...seed.products.flatMap((p) => p.concerns)])) {
    concernIds.set(c, (await upsert(payload, 'concerns', { slug: c }, { name: concernNames[c] ?? titleCase(c), slug: c, generateSlug: false })) as number)
  }
  const recipientIds = new Map<string, number>()
  for (const r of navRecipients) recipientIds.set(r.slug, (await upsert(payload, 'recipients', { slug: r.slug }, { name: r.label, slug: r.slug, generateSlug: false })) as number)
  const occasionIds = new Map<string, number>()
  for (const o of navOccasions) occasionIds.set(o.slug, (await upsert(payload, 'occasions', { slug: o.slug }, { name: o.label, slug: o.slug, generateSlug: false })) as number)
  log(`Tags: ${tagIds.size}, concerns: ${concernIds.size}, recipients: ${recipientIds.size}, occasions: ${occasionIds.size}`)

  // ---------- Brands ----------
  const brandIds = new Map<string, number>()
  for (const b of new Set(seed.products.map((p) => p.brand))) {
    const slug = b.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    brandIds.set(b, (await upsert(payload, 'brands', { slug }, { name: b, slug, generateSlug: false, group: brandGroups[b] ?? 'everyday' })) as number)
  }
  log(`Brands: ${brandIds.size}`)

  // ---------- Categories (tree from the navigation IA) ----------
  const catIds = new Map<string, number>()
  for (const [i, c] of navCategories.entries()) {
    const id = (await upsert(payload, 'categories', { slug: c.slug }, { name: c.name, slug: c.slug, generateSlug: false, blurb: c.blurb, tint: c.tint, order: i, parent: null })) as number
    catIds.set(c.slug, id)
    for (const [j, child] of (c.children ?? []).entries()) {
      const cid = (await upsert(payload, 'categories', { slug: child.slug }, { name: child.name, slug: child.slug, generateSlug: false, tint: c.tint, order: j, parent: id })) as number
      catIds.set(child.slug, cid)
    }
  }
  log(`Categories: ${catIds.size}`)

  // ---------- Media ----------
  const mediaIds = new Map<string, number>()
  for (const p of seed.products) {
    for (const v of p.variants) {
      const file = path.basename(v.image)
      if (mediaIds.has(file)) continue
      // Media is stored as WebP (see Media upload.formatOptions), so match either the original or the .webp name
      const webp = file.replace(/\.[a-z0-9]+$/i, '.webp')
      const existing = await payload.find({
        collection: 'media',
        where: { or: [{ filename: { equals: file } }, { filename: { equals: webp } }] },
        sort: 'createdAt',
        limit: 1,
        depth: 0,
      })
      if (existing.docs[0]) {
        mediaIds.set(file, existing.docs[0].id as number)
        continue
      }
      const alt = `${p.brand} ${p.name}${p.variants.length > 1 ? ` (${v.label})` : ''}`
      const doc = await payload.create({ collection: 'media', data: { alt }, filePath: path.join(root, 'public/catalogue', file), context: ctx })
      mediaIds.set(file, doc.id as number)
    }
  }
  log(`Media: ${mediaIds.size}`)

  // ---------- Products ----------
  let created = 0
  let updated = 0
  for (const p of seed.products) {
    const option = p.variants[0].option
    const sizeNote = p.variants.length === 1 && /\d/.test(p.variants[0].label) ? ` (${p.variants[0].label})` : ''
    const concernText = p.concerns.map((c) => (concernNames[c] ?? titleCase(c)).toLowerCase())
    const data = {
      name: p.name,
      slug: p.slug,
      generateSlug: false,
      brand: brandIds.get(p.brand),
      categories: [catIds.get(p.subcategory) ?? catIds.get(p.category)].filter(Boolean),
      shortDescription: `${p.brand} ${p.name}${sizeNote}.${concernText.length ? ` A good pick for ${concernText.join(', ')}.` : ''}`,
      optionName: option,
      variants: p.variants.map((v) => ({
        label: v.label,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        stock: v.stock,
        lowStockThreshold: 5,
        image: mediaIds.get(path.basename(v.image)),
      })),
      badge: p.badge,
      productType: 'beauty' as const,
      // Gifting signals for the obvious beauty gifts (lips, polishes, sets); the store team refines the rest
      recipients: (p.category === 'lips' || p.tags.includes('gift') ? ['for-her'] : []).map((r) => recipientIds.get(r)).filter(Boolean),
      occasions: (p.tags.includes('gift') ? ['birthday', 'thank-you', 'mothers-day'] : p.category === 'lips' ? ['valentines'] : [])
        .map((o) => occasionIds.get(o))
        .filter(Boolean),
      tags: p.tags.map((t) => tagIds.get(t)).filter(Boolean),
      concerns: p.concerns.map((c) => concernIds.get(c)).filter(Boolean),
      priceTBC: true,
      // Ratings come only from real, approved reviews (Sprint 2); the catalogue's numbers only seed popularity
      salesCount: p.badge === 'bestseller' ? p.reviewCount * 3 : p.reviewCount,
      _status: 'published' as const,
    }
    const found = await payload.find({ collection: 'products', where: { slug: { equals: p.slug } }, limit: 1, depth: 0, draft: true })
    if (found.docs[0]) {
      await payload.update({ collection: 'products', id: found.docs[0].id, data: data as never, context: { ...ctx, skipStockLog: true } })
      updated++
    } else {
      await payload.create({ collection: 'products', data: data as never, context: ctx })
      created++
    }
  }
  log(`Products: ${created} created, ${updated} updated`)

  // ---------- Home page merchandising ----------
  const idOf = async (slug: string) => (await payload.find({ collection: 'products', where: { slug: { equals: slug } }, limit: 1, depth: 0 })).docs[0]?.id
  const hero = (
    await Promise.all(
      ['demo-velvet-jasmine-edp', 'anua-peach-70-niacin-serum', 'demo-cloud-runner-sneakers', 'demo-ceylon-tea-treats-hamper'].map(idOf),
    )
  ).filter(Boolean)
  await payload.updateGlobal({
    slug: 'home-page',
    context: ctx,
    data: {
      heroProducts: hero as number[],
      rails: [
        { eyebrow: 'Today only', title: 'Deals of the day', linkLabel: 'All offers', source: 'sale', limit: 12, style: 'plain', placement: 'top', countdown: true },
        {
          eyebrow: 'Ready to give',
          title: 'Gifts they’ll love',
          description: 'Hampers, gift boxes and treats, wrapped and delivered island-wide.',
          linkLabel: 'Shop gifts',
          source: 'category',
          category: catIds.get('gifts'),
          limit: 12,
          style: 'cream',
          placement: 'top',
        },
        { eyebrow: 'Signature scents', title: 'Fragrances for every mood', linkLabel: 'Shop fragrances', source: 'category', category: catIds.get('fragrances'), limit: 12, style: 'lilac', placement: 'bottom' },
        { eyebrow: 'Step out in style', title: 'Footwear favourites', linkLabel: 'Shop footwear', source: 'category', category: catIds.get('footwear'), limit: 12, style: 'plain', placement: 'bottom' },
        {
          eyebrow: 'Seoul to Colombo',
          title: 'Trending in K-Beauty',
          description: 'Centella, snail mucin and niacinamide heroes from SKIN1004, Medicube, Anua and COSRX.',
          linkLabel: 'Shop K-Beauty',
          source: 'tag',
          tag: tagIds.get('k-beauty'),
          limit: 12,
          style: 'blush',
          placement: 'bottom',
        },
        { eyebrow: 'Sweet treats', title: 'Chocolates & treats', linkLabel: 'Shop chocolates', source: 'category', category: catIds.get('chocolates'), limit: 12, style: 'cream', placement: 'bottom' },
        { eyebrow: 'Just landed', title: 'New arrivals', linkLabel: 'View all', source: 'new', limit: 12, style: 'plain', placement: 'bottom' },
      ],
    } as never,
  })
  log('Home page rails configured')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
