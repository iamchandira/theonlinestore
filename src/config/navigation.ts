/**
 * Information architecture: max 7 top-level items (docs/08-ux-guidelines.md › IA).
 * Category slugs match seed/catalogue/products.json.
 */

export type Tint =
  | 'skincare'
  | 'hair'
  | 'body'
  | 'lips'
  | 'fragrance'
  | 'chocolate'
  | 'footwear'
  | 'gifts'
  | 'sky'

export type CategoryDef = {
  slug: string
  name: string
  href: string
  tint: Tint
  blurb: string
  /** Tabler icon key for categories without catalogue photography yet. */
  icon?: 'perfume' | 'shoe' | 'gift' | 'candy'
  children?: { slug: string; name: string; href: string }[]
}

const sub = (parent: string, slug: string, name: string) => ({
  slug,
  name,
  href: `/c/${parent}/${slug}`,
})

export const categories: CategoryDef[] = [
  {
    slug: 'skincare',
    name: 'Skincare',
    href: '/c/skincare',
    tint: 'skincare',
    blurb: 'K-beauty and derm favourites',
    children: [
      sub('skincare', 'cleansers', 'Cleansers'),
      sub('skincare', 'serums', 'Serums & Ampoules'),
      sub('skincare', 'moisturizers', 'Moisturisers'),
      sub('skincare', 'sunscreen', 'Sunscreen'),
      sub('skincare', 'masks', 'Masks'),
      sub('skincare', 'toners-mists', 'Toners & Mists'),
      sub('skincare', 'eye-care', 'Eye, Lash & Brow'),
      sub('skincare', 'gift-sets', 'Gift Sets'),
    ],
  },
  {
    slug: 'hair-care',
    name: 'Hair Care',
    href: '/c/hair-care',
    tint: 'hair',
    blurb: 'Shampoos, oils and treatments',
    children: [
      sub('hair-care', 'shampoos', 'Shampoos'),
      sub('hair-care', 'conditioners', 'Conditioners'),
      sub('hair-care', 'hair-oils', 'Hair Oils'),
      sub('hair-care', 'hair-treatments', 'Masks & Treatments'),
      sub('hair-care', 'styling', 'Styling'),
    ],
  },
  {
    slug: 'body-care',
    name: 'Body Care',
    href: '/c/body-care',
    tint: 'body',
    blurb: 'Lotions, polishes and daily care',
    children: [
      sub('body-care', 'body-lotion', 'Lotions & Creams'),
      sub('body-care', 'body-scrubs', 'Scrubs & Polishes'),
      sub('body-care', 'body-wash', 'Body Wash'),
      sub('body-care', 'petroleum-jelly', 'Petroleum Jelly'),
      sub('body-care', 'deodorants', 'Deodorants'),
    ],
  },
  {
    slug: 'lips',
    name: 'Lips',
    href: '/c/lips',
    tint: 'lips',
    blurb: 'Balms, oils and tints',
    children: [sub('lips', 'lip-balm', 'Lip Balms'), sub('lips', 'lip-oil', 'Lip Oils & Tints')],
  },
  {
    slug: 'fragrances',
    name: 'Fragrances',
    href: '/c/fragrances',
    tint: 'fragrance',
    blurb: 'Perfumes, colognes and body mists',
    icon: 'perfume',
    children: [
      sub('fragrances', 'womens-perfume', 'Women’s perfume'),
      sub('fragrances', 'mens-cologne', 'Men’s cologne'),
      sub('fragrances', 'unisex-fragrance', 'Unisex'),
      sub('fragrances', 'body-mists', 'Body mists & sets'),
    ],
  },
  {
    slug: 'footwear',
    name: 'Footwear',
    href: '/c/footwear',
    tint: 'footwear',
    blurb: 'Sneakers, sandals and everyday pairs',
    icon: 'shoe',
    children: [
      sub('footwear', 'sneakers', 'Sneakers'),
      sub('footwear', 'sandals-slides', 'Sandals & slides'),
      sub('footwear', 'heels-flats', 'Heels & flats'),
      sub('footwear', 'kids-shoes', 'Kids’ shoes'),
    ],
  },
  {
    slug: 'gifts',
    name: 'Gifts',
    href: '/c/gifts',
    tint: 'gifts',
    blurb: 'Hampers, gift sets and surprises',
    icon: 'gift',
    children: [
      sub('gifts', 'gift-hampers', 'Gift hampers'),
      sub('gifts', 'gift-boxes', 'Gift boxes & sets'),
      sub('gifts', 'personalised-gifts', 'Personalised gifts'),
    ],
  },
  {
    slug: 'chocolates',
    name: 'Chocolates',
    href: '/c/chocolates',
    tint: 'chocolate',
    blurb: 'Boxes, bars and imported treats',
    icon: 'candy',
    children: [
      sub('chocolates', 'chocolate-boxes', 'Chocolate boxes'),
      sub('chocolates', 'chocolate-bars', 'Bars & tablets'),
      sub('chocolates', 'sweet-treats', 'Sweet treats'),
    ],
  },
]

/** Beauty departments (grouped under the "Beauty" menu); everything else is its own top-level department. */
export const BEAUTY_SLUGS = ['skincare', 'hair-care', 'body-care', 'lips']
export const beautyCategories = categories.filter((c) => BEAUTY_SLUGS.includes(c.slug))
export const lifestyleDepartments = categories.filter((c) => !BEAUTY_SLUGS.includes(c.slug))

/** Primary nav (desktop). "Beauty" and "Brands" open mega-menus. */
/**
 * Only categories that exist in the admin appear in menus, tiles and the footer, so a new store never
 * links to an empty page. `available` = category slugs present in the database.
 */
export function liveCategories(list: CategoryDef[], available: ReadonlySet<string>): CategoryDef[] {
  return list.filter((c) => available.has(c.slug)).map((c) => ({ ...c, children: c.children?.filter((s) => available.has(s.slug)) }))
}
/** True for links that don't point at a category, or at one that exists. */
export const linkIsLive = (href: string, available: ReadonlySet<string>) => !href.startsWith('/c/') || available.has(href.split('/').filter(Boolean).at(-1) ?? '')

export type MegaKey = 'beauty' | 'brands' | 'fragrances' | 'footwear' | 'gifts' | 'chocolates'

export const primaryNav: { label: string; href: string; mega?: MegaKey; highlight?: boolean }[] = [
  { label: 'Beauty', href: '/c/beauty', mega: 'beauty' },
  { label: 'Fragrances', href: '/c/fragrances', mega: 'fragrances' },
  { label: 'Footwear', href: '/c/footwear', mega: 'footwear' },
  { label: 'Gifts', href: '/c/gifts', mega: 'gifts' },
  { label: 'Chocolates', href: '/c/chocolates', mega: 'chocolates' },
  { label: 'Brands', href: '/brands', mega: 'brands' },
  { label: 'Offers', href: '/offers', highlight: true },
]

/** Gifting vocabulary shared by the seed, Gift Finder and filters. */
export const recipients = [
  { slug: 'for-her', label: 'For her' },
  { slug: 'for-him', label: 'For him' },
  { slug: 'for-couples', label: 'For couples' },
  { slug: 'for-kids', label: 'For kids' },
  { slug: 'for-parents', label: 'For parents' },
  { slug: 'for-friends', label: 'Friends & colleagues' },
]
export const occasions = [
  { slug: 'birthday', label: 'Birthday' },
  { slug: 'anniversary', label: 'Anniversary' },
  { slug: 'avurudu', label: 'Avurudu' },
  { slug: 'valentines', label: 'Valentine’s Day' },
  { slug: 'mothers-day', label: 'Mother’s Day' },
  { slug: 'fathers-day', label: 'Father’s Day' },
  { slug: 'christmas', label: 'Christmas' },
  { slug: 'wedding', label: 'Wedding' },
  { slug: 'thank-you', label: 'Thank you' },
]

export const concerns = [
  { slug: 'acne', label: 'Acne & breakouts' },
  { slug: 'brightening', label: 'Brightening' },
  { slug: 'hydration', label: 'Hydration' },
  { slug: 'sensitive', label: 'Sensitive skin' },
  { slug: 'dark-spots', label: 'Dark spots' },
  { slug: 'anti-aging', label: 'Anti-ageing' },
  { slug: 'sun-protection', label: 'Sun protection' },
  { slug: 'hair-fall', label: 'Hair fall' },
]

export const popularSearches = ['Perfume', 'Sneakers', 'Gift hamper', 'Chocolate box', 'Sunscreen', 'CeraVe', 'Lip balm']

export const footerNav = {
  shop: [
    { label: 'Skincare', href: '/c/skincare' },
    { label: 'Hair Care', href: '/c/hair-care' },
    { label: 'Body Care', href: '/c/body-care' },
    { label: 'Fragrances', href: '/c/fragrances' },
    { label: 'Footwear', href: '/c/footwear' },
    { label: 'Gifts', href: '/c/gifts' },
    { label: 'Chocolates', href: '/c/chocolates' },
    { label: 'All Brands', href: '/brands' },
  ],
  // Only pages that exist. Delivery, FAQ, contact and about pages come with the content pages (Sprint 9).
  help: [
    { label: 'Track your order', href: '/track-order' },
    { label: 'Returns & refunds', href: '/returns' },
    { label: 'My account', href: '/account' },
  ],
  company: [
    { label: 'Terms & conditions', href: '/terms' },
    { label: 'Privacy policy', href: '/privacy' },
  ],
}
