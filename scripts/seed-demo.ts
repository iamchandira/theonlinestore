/**
 * DEMO lifestyle products for Fragrances, Footwear, Gifts and Chocolates (Sprint 1.5).
 * Clearly flagged (`isDemo`), with fictional brands and generated illustrations instead of photos,
 * so layouts, filters and the admin can be designed before the real catalogues arrive.
 *
 *   pnpm seed:demo            add / refresh demo products (idempotent)
 *   pnpm seed:demo --remove   delete every demo product, its photos, stock history and demo brands
 */
import 'dotenv/config'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'

import config from '../src/payload.config'
import { occasions as navOccasions, recipients as navRecipients } from '../src/config/navigation'
import * as art from './demo/art'

const ctx = { disableRevalidate: true }
const REMOVE = process.argv.includes('--remove')

type V = { label: string; option2?: string; price: number; compareAt?: number; stock: number; art: string }
type Demo = {
  slug: string
  name: string
  brand: string
  category: string
  productType: 'fragrance' | 'footwear' | 'gift' | 'chocolate'
  optionName: string
  option2Name?: string
  short: string
  benefits?: string[]
  howToUse?: string
  badge?: 'bestseller' | 'new' | 'trending' | 'gift' | 'limited'
  recipients: string[]
  occasions: string[]
  details: Record<string, unknown>
  variants: V[]
  rating: number
  reviews: number
}

const BRANDS: Record<string, { group: string; description: string }> = {
  'Ceylon Scent Co.': { group: 'fragrance', description: 'Demo brand for design and testing: island-inspired fragrances.' },
  'Stride Lanka': { group: 'footwear', description: 'Demo brand for design and testing: everyday footwear.' },
  'Gift Studio': { group: 'gifts', description: 'Demo brand for design and testing: curated hampers and gift boxes.' },
  'Kandy Cocoa Co.': { group: 'gifts', description: 'Demo brand for design and testing: chocolates and sweet treats.' },
}

/** Cartesian helper for footwear: sizes × colours. */
const grid = (sizes: string[], colours: [string, string][], price: number, stockFor: (s: string, c: string) => number, artFor: (hex: string) => string, compareAt?: number): V[] =>
  colours.flatMap(([name, hex]) => sizes.map((s) => ({ label: s, option2: name, price, compareAt, stock: stockFor(s, name), art: artFor(hex) })))

const DEMOS: Demo[] = [
  // ---------------- Fragrances ----------------
  {
    slug: 'demo-velvet-jasmine-edp', name: 'Velvet Jasmine Eau de Parfum', brand: 'Ceylon Scent Co.', category: 'womens-perfume', productType: 'fragrance',
    optionName: 'Size', short: 'A soft, luminous floral built around night-blooming jasmine, with a warm vanilla dry-down.', badge: 'bestseller',
    benefits: ['Long-lasting, skin-close sillage', 'Gift-boxed, ready to give'], howToUse: 'Spray on pulse points: wrists, neck and behind the ears.',
    recipients: ['for-her'], occasions: ['birthday', 'anniversary', 'valentines', 'mothers-day'],
    details: { concentration: 'Eau de Parfum', scentFamily: 'Floral', longevity: 'Long-lasting (6–8 h)', gender: 'women', topNotes: 'Bergamot, pink pepper', heartNotes: 'Jasmine sambac, tuberose', baseNotes: 'Vanilla, musk, sandalwood' },
    variants: [
      { label: '30 ml', price: 6950, stock: 18, art: art.perfume('#e7a1b0') },
      { label: '50 ml', price: 9950, compareAt: 11500, stock: 12, art: art.perfume('#e7a1b0') },
      { label: '100 ml', price: 15950, stock: 4, art: art.perfume('#e7a1b0') },
    ],
    rating: 4.7, reviews: 86,
  },
  {
    slug: 'demo-oud-monsoon-edp', name: 'Oud Monsoon Eau de Parfum', brand: 'Ceylon Scent Co.', category: 'mens-cologne', productType: 'fragrance',
    optionName: 'Size', short: 'Smoky oud and rain-washed cedar: a bold evening scent that lingers.', badge: 'trending',
    recipients: ['for-him'], occasions: ['birthday', 'fathers-day', 'anniversary'],
    details: { concentration: 'Eau de Parfum', scentFamily: 'Woody', longevity: 'Very long (8 h+)', gender: 'men', topNotes: 'Cardamom, saffron', heartNotes: 'Oud, cedarwood', baseNotes: 'Amber, leather, vetiver' },
    variants: [
      { label: '50 ml', price: 10950, stock: 14, art: art.perfume('#2b2f3a', '#c9a45c', 'EAU DE PARFUM', true) },
      { label: '100 ml', price: 16950, compareAt: 18950, stock: 7, art: art.perfume('#2b2f3a', '#c9a45c', 'EAU DE PARFUM', true) },
    ],
    rating: 4.6, reviews: 54,
  },
  {
    slug: 'demo-sea-breeze-edt', name: 'Sea Breeze Eau de Toilette', brand: 'Ceylon Scent Co.', category: 'unisex-fragrance', productType: 'fragrance',
    optionName: 'Size', short: 'Fresh sea salt, lime and driftwood, inspired by the southern coast.', badge: 'new',
    recipients: ['for-her', 'for-him', 'for-friends'], occasions: ['birthday', 'thank-you'],
    details: { concentration: 'Eau de Toilette', scentFamily: 'Aquatic', longevity: 'Moderate (4–6 h)', gender: 'unisex', topNotes: 'Lime, sea salt', heartNotes: 'Lotus, sage', baseNotes: 'Driftwood, ambergris' },
    variants: [
      { label: '50 ml', price: 7450, stock: 22, art: art.perfume('#7cc6d6', '#e9eef2', 'EAU DE TOILETTE') },
      { label: '100 ml', price: 11450, stock: 9, art: art.perfume('#7cc6d6', '#e9eef2', 'EAU DE TOILETTE') },
    ],
    rating: 4.4, reviews: 31,
  },
  {
    slug: 'demo-pink-petal-body-mist', name: 'Pink Petal Body Mist', brand: 'Ceylon Scent Co.', category: 'body-mists', productType: 'fragrance',
    optionName: 'Size', short: 'A light, fruity-floral mist for an easy everyday refresh.',
    recipients: ['for-her', 'for-friends'], occasions: ['thank-you', 'birthday'],
    details: { concentration: 'Body mist', scentFamily: 'Fruity', longevity: 'Light (2–4 h)', gender: 'women', topNotes: 'Pear, lychee', heartNotes: 'Peony, rose', baseNotes: 'Soft musk' },
    variants: [
      { label: '150 ml', price: 2950, stock: 40, art: art.mist('#f4a3c0') },
      { label: '250 ml', price: 3950, stock: 3, art: art.mist('#f4a3c0') },
    ],
    rating: 4.3, reviews: 112,
  },
  {
    slug: 'demo-cinnamon-tea-discovery-set', name: 'Cinnamon & Tea Discovery Set', brand: 'Ceylon Scent Co.', category: 'body-mists', productType: 'fragrance',
    optionName: 'Set', short: 'Four 10 ml minis inspired by Ceylon cinnamon, black tea, frangipani and coconut.', badge: 'gift',
    recipients: ['for-her', 'for-him', 'for-friends'], occasions: ['christmas', 'avurudu', 'thank-you'],
    details: { concentration: 'Eau de Parfum', scentFamily: 'Oriental', gender: 'unisex' },
    variants: [{ label: '4 × 10 ml', price: 5950, compareAt: 6950, stock: 15, art: art.giftBox('#7a3f16', '#c9a45c') }],
    rating: 4.8, reviews: 40,
  },
  // ---------------- Footwear ----------------
  {
    slug: 'demo-cloud-runner-sneakers', name: 'Cloud Runner Sneakers', brand: 'Stride Lanka', category: 'sneakers', productType: 'footwear',
    optionName: 'Shoe size', option2Name: 'Colour', short: 'Lightweight everyday sneakers with a cushioned sole and breathable knit upper.', badge: 'bestseller',
    recipients: ['for-her'], occasions: ['birthday'],
    details: { footwearStyle: 'Sneakers', material: 'Knit upper, EVA cushioned sole', sizeSystem: 'EU', gender: 'women', fit: 'True to size. Go half a size up for wide feet.' },
    variants: grid(['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40'], [['White', '#f3f1ee'], ['Black', '#23262e']], 8950, (s, c) => (s === 'EU 38' && c === 'Black' ? 0 : s === 'EU 40' ? 2 : 8), (hex) => art.sneaker(hex, '#ffffff', '#ff5a1f'), 9950),
    rating: 4.6, reviews: 128,
  },
  {
    slug: 'demo-urban-court-sneakers', name: 'Urban Court Sneakers', brand: 'Stride Lanka', category: 'sneakers', productType: 'footwear',
    optionName: 'Shoe size', option2Name: 'Colour', short: 'Clean, court-inspired sneakers that go with everything.', badge: 'new',
    recipients: ['for-him'], occasions: ['birthday', 'fathers-day'],
    details: { footwearStyle: 'Sneakers', material: 'Synthetic leather upper, rubber sole', sizeSystem: 'EU', gender: 'men', fit: 'True to size.' },
    variants: grid(['EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44'], [['White', '#f6f6f4'], ['Navy', '#1f2a44']], 9950, (s) => (s === 'EU 44' ? 3 : 10), (hex) => art.sneaker(hex, '#f3f1ee', '#1d5fd1')),
    rating: 4.5, reviews: 64,
  },
  {
    slug: 'demo-island-comfort-slides', name: 'Island Comfort Slides', brand: 'Stride Lanka', category: 'sandals-slides', productType: 'footwear',
    optionName: 'Shoe size', option2Name: 'Colour', short: 'Soft contoured footbed slides for home, beach and everything in between.',
    recipients: ['for-her', 'for-him'], occasions: ['thank-you'],
    details: { footwearStyle: 'Slides', material: 'Cork-blend footbed, faux suede strap', sizeSystem: 'EU', gender: 'unisex', fit: 'Runs slightly large. Go half a size down.' },
    variants: grid(['EU 37', 'EU 39', 'EU 41', 'EU 43'], [['Sand', '#c8a27a'], ['Black', '#2b2b2b']], 4450, () => 12, (hex) => art.slide(hex), 4950),
    rating: 4.2, reviews: 39,
  },
  {
    slug: 'demo-pearl-strap-flats', name: 'Pearl Strap Flats', brand: 'Stride Lanka', category: 'heels-flats', productType: 'footwear',
    optionName: 'Shoe size', option2Name: 'Colour', short: 'Ballet flats with a pearl strap detail: comfortable enough for all day.',
    recipients: ['for-her'], occasions: ['wedding', 'birthday'],
    details: { footwearStyle: 'Flats', material: 'Faux leather, padded insole', sizeSystem: 'EU', gender: 'women', fit: 'True to size.' },
    variants: grid(['EU 36', 'EU 37', 'EU 38', 'EU 39'], [['Blush', '#f2c4c4'], ['Nude', '#e5c7a8']], 6450, (s) => (s === 'EU 36' ? 1 : 7), (hex) => art.flat(hex)),
    rating: 4.4, reviews: 22,
  },
  {
    slug: 'demo-little-steps-sneakers', name: 'Little Steps Sneakers', brand: 'Stride Lanka', category: 'kids-shoes', productType: 'footwear',
    optionName: 'Shoe size', option2Name: 'Colour', short: 'Easy hook-and-loop sneakers for little feet on the go.',
    recipients: ['for-kids'], occasions: ['birthday', 'christmas'],
    details: { footwearStyle: 'Sneakers', material: 'Canvas upper, flexible rubber sole', sizeSystem: 'EU', gender: 'kids', fit: 'Leave a thumb’s width at the toe for growing room.' },
    variants: grid(['EU 24', 'EU 26', 'EU 28', 'EU 30'], [['Sky', '#8cc7f2'], ['Pink', '#f5a3c7']], 3950, () => 10, (hex) => art.sneaker(hex, '#ffffff', '#ffd166', true)),
    rating: 4.7, reviews: 45,
  },
  // ---------------- Gifts ----------------
  {
    slug: 'demo-ceylon-tea-treats-hamper', name: 'Ceylon Tea & Treats Hamper', brand: 'Gift Studio', category: 'gift-hampers', productType: 'gift',
    optionName: 'Set', short: 'A woven hamper of premium Ceylon tea, cookies and chocolates: a classic for any celebration.', badge: 'bestseller',
    recipients: ['for-parents', 'for-friends'], occasions: ['avurudu', 'christmas', 'thank-you'],
    details: { contents: 'Ceylon black tea (100 g)\nButter cookies tin\nDark chocolate bar\nKithul treacle sweets\nHandwritten message card', giftWrapped: true, personalisable: true },
    variants: [{ label: 'Classic hamper', price: 8950, stock: 20, art: art.hamper('#c99a5b') }],
    rating: 4.8, reviews: 73,
  },
  {
    slug: 'demo-celebration-hamper', name: 'Celebration Hamper', brand: 'Gift Studio', category: 'gift-hampers', productType: 'gift',
    optionName: 'Size', short: 'Our biggest hamper: sparkling juice, chocolates, snacks and a scented candle.', badge: 'gift',
    recipients: ['for-couples', 'for-parents'], occasions: ['wedding', 'christmas', 'anniversary'],
    details: { contents: 'Sparkling grape juice\nAssorted pralines box\nGourmet snacks\nScented soy candle\nMessage card', giftWrapped: true, personalisable: true },
    variants: [
      { label: 'Classic', price: 12950, stock: 10, art: art.hamper('#b9864a') },
      { label: 'Deluxe', price: 19950, compareAt: 22500, stock: 5, art: art.hamper('#a8743a', true) },
    ],
    rating: 4.9, reviews: 28,
  },
  {
    slug: 'demo-self-care-spa-box', name: 'Self-Care Spa Box', brand: 'Gift Studio', category: 'gift-boxes', productType: 'gift',
    optionName: 'Set', short: 'Bath salts, a body mist, lip balm and a silk scrunchie: a pamper night in a box.', badge: 'trending',
    recipients: ['for-her'], occasions: ['birthday', 'mothers-day', 'thank-you'],
    details: { contents: 'Lavender bath salts\nPink Petal body mist (150 ml)\nLip balm\nSilk scrunchie', giftWrapped: true, personalisable: true },
    variants: [{ label: 'Gift box', price: 7450, compareAt: 8450, stock: 16, art: art.giftBox('#f4a3c0', '#ffffff') }],
    rating: 4.7, reviews: 58,
  },
  {
    slug: 'demo-gentlemans-grooming-kit', name: 'Gentleman’s Grooming Kit', brand: 'Gift Studio', category: 'gift-boxes', productType: 'gift',
    optionName: 'Set', short: 'Beard oil, face wash and a travel cologne in a reusable gift tin.',
    recipients: ['for-him'], occasions: ['fathers-day', 'birthday'],
    details: { contents: 'Beard oil (30 ml)\nCharcoal face wash\nOud Monsoon travel spray (10 ml)\nReusable tin', giftWrapped: true },
    variants: [{ label: 'Gift tin', price: 6950, stock: 9, art: art.giftBox('#1f2a44', '#c9a45c') }],
    rating: 4.5, reviews: 19,
  },
  {
    slug: 'demo-personalised-keepsake-box', name: 'Personalised Keepsake Box', brand: 'Gift Studio', category: 'personalised-gifts', productType: 'gift',
    optionName: 'Set', short: 'A wooden keepsake box engraved with a name, filled with chocolates and a candle.', badge: 'new',
    recipients: ['for-couples', 'for-her', 'for-him'], occasions: ['wedding', 'anniversary', 'valentines'],
    details: { contents: 'Engraved wooden box\nAssorted chocolates (12 pcs)\nScented tealight candles', giftWrapped: true, personalisable: true },
    variants: [{ label: 'Engraved box', price: 9450, stock: 8, art: art.giftBox('#b9864a', '#e0115a') }],
    rating: 4.9, reviews: 14,
  },
  // ---------------- Chocolates ----------------
  {
    slug: 'demo-dark-chocolate-70-bar', name: 'Single-Origin Dark Chocolate 70%', brand: 'Kandy Cocoa Co.', category: 'chocolate-bars', productType: 'chocolate',
    optionName: 'Weight', short: 'Deep, fruity dark chocolate made from Sri Lankan cocoa.',
    recipients: ['for-friends', 'for-him'], occasions: ['thank-you'],
    details: { netWeight: 100, cocoaPercent: 70, origin: 'Sri Lanka', dietary: ['Vegan', 'Gluten-free'], allergens: 'May contain traces of milk and nuts', storage: 'Store below 25°C, away from sunlight' },
    variants: [{ label: '100 g', price: 1450, stock: 60, art: art.chocolateBar('#5b2a1a', '#3f1d10') }],
    rating: 4.6, reviews: 92,
  },
  {
    slug: 'demo-sea-salt-caramel-bar', name: 'Milk Chocolate Sea Salt Caramel', brand: 'Kandy Cocoa Co.', category: 'chocolate-bars', productType: 'chocolate',
    optionName: 'Weight', short: 'Creamy milk chocolate with a ribbon of salted caramel.', badge: 'bestseller',
    recipients: ['for-her', 'for-kids', 'for-friends'], occasions: ['birthday', 'thank-you'],
    details: { netWeight: 100, cocoaPercent: 34, origin: 'Belgium', dietary: ['Vegetarian'], allergens: 'Contains milk, soy. May contain nuts', storage: 'Store below 25°C' },
    variants: [{ label: '100 g', price: 1250, stock: 75, art: art.chocolateBar('#8a4b20', '#c96a2b') }],
    rating: 4.8, reviews: 150,
  },
  {
    slug: 'demo-assorted-pralines-box', name: 'Assorted Pralines Box', brand: 'Kandy Cocoa Co.', category: 'chocolate-boxes', productType: 'chocolate',
    optionName: 'Size', short: 'Hand-finished pralines in six flavours, in a ribboned gift box.', badge: 'gift',
    recipients: ['for-her', 'for-parents', 'for-couples'], occasions: ['anniversary', 'christmas', 'avurudu', 'thank-you'],
    details: { netWeight: 200, cocoaPercent: 54, origin: 'Belgium', dietary: ['Vegetarian'], allergens: 'Contains milk, hazelnuts, soy', storage: 'Store below 22°C' },
    variants: [
      { label: '12 pieces', price: 3950, stock: 30, art: art.chocolateBox('#5b2a1a') },
      { label: '24 pieces', price: 6950, compareAt: 7950, stock: 14, art: art.chocolateBox('#5b2a1a') },
    ],
    rating: 4.7, reviews: 77,
  },
  {
    slug: 'demo-heart-truffles-box', name: 'Heart Truffles Gift Box', brand: 'Kandy Cocoa Co.', category: 'chocolate-boxes', productType: 'chocolate',
    optionName: 'Size', short: 'Silky ganache truffles in a heart-shaped box: made for Valentine’s.', badge: 'limited',
    recipients: ['for-couples', 'for-her'], occasions: ['valentines', 'anniversary'],
    details: { netWeight: 150, cocoaPercent: 60, origin: 'Belgium', dietary: ['Vegetarian'], allergens: 'Contains milk, soy', storage: 'Keep refrigerated in hot weather' },
    variants: [{ label: '9 truffles', price: 4950, stock: 6, art: art.chocolateBox('#c8102e', '#f3d27a', true) }],
    rating: 4.9, reviews: 33,
  },
  {
    slug: 'demo-kithul-coconut-bites', name: 'Kithul & Coconut Sweet Bites', brand: 'Kandy Cocoa Co.', category: 'sweet-treats', productType: 'chocolate',
    optionName: 'Size', short: 'Chewy coconut bites sweetened with kithul treacle: an Avurudu favourite.', badge: 'new',
    recipients: ['for-parents', 'for-friends', 'for-kids'], occasions: ['avurudu', 'thank-you'],
    details: { netWeight: 250, origin: 'Sri Lanka', dietary: ['Vegan', 'Gluten-free'], allergens: 'Contains coconut', storage: 'Store in a cool, dry place' },
    variants: [
      { label: '250 g', price: 1850, stock: 45, art: art.sweets('#8a4b20') },
      { label: '500 g', price: 3250, stock: 20, art: art.sweets('#8a4b20') },
    ],
    rating: 4.5, reviews: 48,
  },
]

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

async function upsertTaxonomy(payload: Payload, collection: 'recipients' | 'occasions', slug: string, name: string) {
  const found = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  if (found.docs[0]) return found.docs[0].id
  return (await payload.create({ collection, data: { name, slug, generateSlug: false }, context: ctx })).id
}

/**
 * A few clearly-labelled sample reviews per demo product, so the reviews UI can be designed and tested.
 * They're flagged `isSample`, shown with a "Sample review" badge, never used in structured data, and
 * deleted with the demo products. Real products never get sample reviews.
 */
const SAMPLE_NAMES = ['Nadeesha K.', 'Ruwan P.', 'Fathima R.', 'Dilini S.', 'Kasun W.', 'Amaya J.', 'Tharindu M.', 'Shenali D.']
const SAMPLE_TEXT: Record<string, [number, string, string][]> = {
  fragrance: [
    [5, 'Compliments all day', 'Lasts from morning until evening on my skin and it doesn’t feel heavy in our heat. The bottle looks lovely on my dresser too.'],
    [4, 'Lovely, a little soft', 'Beautiful scent, very elegant. I reapply once in the afternoon, but I still reach for it most days.'],
    [5, 'Perfect gift', 'Bought it for my sister’s birthday and she loved it. Arrived gift-wrapped with a handwritten note.'],
  ],
  footwear: [
    [5, 'So comfortable', 'Wore them all day in Colombo and my feet didn’t hurt once. True to size for me.'],
    [4, 'Great fit, runs slightly snug', 'Really comfortable and light. If you are between sizes, go half a size up.'],
    [5, 'My go-to pair', 'Easy to clean, goes with everything, and delivery to Kandy took two days.'],
  ],
  gift: [
    [5, 'Beautifully packed', 'Sent this to my parents for their anniversary. Everything arrived fresh and the packing was gorgeous.'],
    [5, 'Made her day', 'Ordered on Thursday, delivered on Saturday with a lovely card. Will order again for Avurudu.'],
    [4, 'Good value', 'Nice selection and well presented. I would love a slightly bigger box option.'],
  ],
  chocolate: [
    [5, 'Rich and not too sweet', 'You can really taste the Sri Lankan cocoa. Arrived in perfect condition even in the heat.'],
    [4, 'Lovely treat', 'Delicious and nicely wrapped. Keep it in the fridge after opening.'],
    [5, 'Gift-worthy', 'Gave it to my team at work and everyone asked where it was from.'],
  ],
}

async function seedSampleReviews(payload: Payload, productId: number, d: Demo, index: number) {
  await payload.delete({ collection: 'reviews', where: { and: [{ product: { equals: productId } }, { isSample: { equals: true } }] }, overrideAccess: true, context: ctx })
  const texts = SAMPLE_TEXT[d.productType] ?? SAMPLE_TEXT.gift
  const count = 2 + (index % 2) // 2 or 3 per product
  for (let k = 0; k < count; k++) {
    const [rating, title, body] = texts[(index + k) % texts.length]
    await payload.create({
      collection: 'reviews',
      data: {
        product: productId,
        rating,
        title,
        body,
        authorName: SAMPLE_NAMES[(index * 3 + k) % SAMPLE_NAMES.length],
        authorEmail: 'sample@example.com',
        status: 'approved',
        isSample: true,
        helpfulCount: (index + k * 3) % 7,
      },
      overrideAccess: true,
      context: ctx,
    })
  }
  return count
}

async function remove(payload: Payload) {
  const products = await payload.find({ collection: 'products', where: { isDemo: { equals: true } }, limit: 0, pagination: false, depth: 0, draft: true })
  for (const p of products.docs) {
    await payload.delete({ collection: 'stock-movements', where: { product: { equals: p.id } }, overrideAccess: true })
    await payload.delete({ collection: 'reviews', where: { product: { equals: p.id } }, overrideAccess: true })
    await payload.delete({ collection: 'products', id: p.id, context: ctx })
  }
  const media = await payload.delete({ collection: 'media', where: { filename: { like: 'demo-' } }, context: ctx })
  const brands = await payload.delete({ collection: 'brands', where: { description: { like: 'Demo brand' } }, context: ctx })
  payload.logger.info(`Removed ${products.docs.length} demo products, ${media.docs.length} photos, ${brands.docs.length} demo brands`)
}

async function main() {
  const payload = await getPayload({ config })
  if (REMOVE) {
    await remove(payload)
    process.exit(0)
  }

  const recipientIds = new Map<string, number>()
  for (const r of navRecipients) recipientIds.set(r.slug, (await upsertTaxonomy(payload, 'recipients', r.slug, r.label)) as number)
  const occasionIds = new Map<string, number>()
  for (const o of navOccasions) occasionIds.set(o.slug, (await upsertTaxonomy(payload, 'occasions', o.slug, o.label)) as number)

  const brandIds = new Map<string, number>()
  for (const [name, b] of Object.entries(BRANDS)) {
    const slug = slugify(name)
    const found = await payload.find({ collection: 'brands', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
    const doc = found.docs[0]
      ? await payload.update({ collection: 'brands', id: found.docs[0].id, data: { group: b.group as never, description: b.description }, context: ctx })
      : await payload.create({ collection: 'brands', data: { name, slug, generateSlug: false, group: b.group as never, description: b.description }, context: ctx })
    brandIds.set(name, doc.id)
  }

  const catIds = new Map<string, number>()
  const cats = await payload.find({ collection: 'categories', limit: 0, pagination: false, depth: 0 })
  for (const c of cats.docs) catIds.set(c.slug ?? '', c.id)

  // Illustrations → media (one per distinct artwork per product)
  const mediaFor = async (product: Demo, svg: string, key: string) => {
    const filename = `demo-${product.slug.replace(/^demo-/, '')}-${key}.webp`
    const existing = await payload.find({ collection: 'media', where: { filename: { equals: filename } }, limit: 1, depth: 0 })
    if (existing.docs[0]) return existing.docs[0].id as number
    const data = await sharp(Buffer.from(svg)).webp({ quality: 88 }).toBuffer()
    const doc = await payload.create({
      collection: 'media',
      data: { alt: `${product.name} (sample illustration)`, credit: 'Demo illustration' },
      file: { data, mimetype: 'image/webp', name: filename, size: data.length },
      context: ctx,
    })
    return doc.id as number
  }

  let created = 0
  let updated = 0
  let reviewsAdded = 0
  for (const [i, d] of DEMOS.entries()) {
    const artIds = new Map<string, number>()
    const variants = []
    for (const [j, v] of d.variants.entries()) {
      const artKey = slugify(v.option2 ?? (new Set(d.variants.map((x) => x.art)).size > 1 ? v.label : 'main'))
      if (!artIds.has(v.art)) artIds.set(v.art, await mediaFor(d, v.art, artKey))
      variants.push({
        label: v.label,
        option2: v.option2,
        sku: `DEMO-${String(i + 1).padStart(2, '0')}-${String(j + 1).padStart(2, '0')}`,
        price: v.price,
        compareAtPrice: v.compareAt ?? null,
        stock: v.stock,
        lowStockThreshold: 3,
        image: artIds.get(v.art),
      })
    }
    const data = {
      name: d.name,
      slug: d.slug,
      generateSlug: false,
      productType: d.productType,
      isDemo: true,
      brand: brandIds.get(d.brand),
      categories: [catIds.get(d.category)].filter(Boolean),
      shortDescription: d.short,
      benefits: d.benefits?.join('\n') ?? null,
      howToUse: d.howToUse ?? null,
      optionName: d.optionName,
      option2Name: d.option2Name ?? null,
      variants,
      details: d.details,
      badge: d.badge ?? null,
      recipients: d.recipients.map((r) => recipientIds.get(r)).filter(Boolean),
      occasions: d.occasions.map((o) => occasionIds.get(o)).filter(Boolean),
      priceTBC: false,
      salesCount: d.badge === 'bestseller' ? d.reviews * 3 : d.reviews,
      _status: 'published' as const,
    }
    if (!data.categories.length) throw new Error(`Category "${d.category}" not found. Run pnpm seed:catalog first.`)
    const found = await payload.find({ collection: 'products', where: { slug: { equals: d.slug } }, limit: 1, depth: 0, draft: true })
    let productId: number
    if (found.docs[0]) {
      productId = (await payload.update({ collection: 'products', id: found.docs[0].id, data: data as never, context: { ...ctx, skipStockLog: true } })).id
      updated++
    } else {
      productId = (await payload.create({ collection: 'products', data: data as never, context: ctx })).id
      created++
    }
    reviewsAdded += await seedSampleReviews(payload, productId, d, i)
  }
  payload.logger.info(`Sample reviews: ${reviewsAdded} (labelled "Sample review", demo products only)`)
  payload.logger.info(`Demo products: ${created} created, ${updated} updated (${DEMOS.length} total)`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
