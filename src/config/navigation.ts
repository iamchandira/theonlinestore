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
  /** Product slugs whose images represent the category (beauty categories). */
  heroProducts?: string[]
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
    heroProducts: ['skin1004-madagascar-centella-ampoule', 'anua-peach-70-niacin-serum'],
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
    heroProducts: ['mielle-rosemary-mint-scalp-hair-oil', 'shiseido-fino-premium-touch-hair-mask'],
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
    heroProducts: ['dove-exfoliating-body-polish', 'nivea-super-10-glow-body-serum'],
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
    heroProducts: ['vaseline-emily-in-paris-tinted-lip-oil', 'esse-naturals-lip-balm'],
    children: [sub('lips', 'lip-balm', 'Lip Balms'), sub('lips', 'lip-oil', 'Lip Oils & Tints')],
  },
  { slug: 'fragrances', name: 'Fragrances', href: '/c/fragrances', tint: 'fragrance', blurb: 'Perfumes and body mists', icon: 'perfume' },
  { slug: 'footwear', name: 'Footwear', href: '/c/footwear', tint: 'footwear', blurb: 'Shoes, sandals and slides', icon: 'shoe' },
  { slug: 'gifts', name: 'Gifts', href: '/c/gifts', tint: 'gifts', blurb: 'Gift sets and hampers', icon: 'gift' },
  { slug: 'chocolates', name: 'Chocolates', href: '/c/chocolates', tint: 'chocolate', blurb: 'Imported treats', icon: 'candy' },
]

export const beautyCategories = categories.filter((c) => c.children)

/** Primary nav (desktop). "Beauty" and "Brands" open mega-menus. */
export const primaryNav = [
  { label: 'Beauty', href: '/c/beauty', mega: 'beauty' as const },
  { label: 'Fragrances', href: '/c/fragrances' },
  { label: 'Footwear', href: '/c/footwear' },
  { label: 'Gifts', href: '/c/gifts' },
  { label: 'Chocolates', href: '/c/chocolates' },
  { label: 'Brands', href: '/brands', mega: 'brands' as const },
  { label: 'Offers', href: '/offers', highlight: true },
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

export const popularSearches = ['Sunscreen', 'Niacinamide', 'CeraVe', 'Centella', 'Rosemary oil', 'Lip balm', 'Gift set']

export const footerNav = {
  shop: [
    { label: 'Skincare', href: '/c/skincare' },
    { label: 'Hair Care', href: '/c/hair-care' },
    { label: 'Body Care', href: '/c/body-care' },
    { label: 'Fragrances', href: '/c/fragrances' },
    { label: 'Gifts & Chocolates', href: '/c/gifts' },
    { label: 'All Brands', href: '/brands' },
  ],
  help: [
    { label: 'Track your order', href: '/track-order' },
    { label: 'Delivery information', href: '/delivery' },
    { label: 'Returns & refunds', href: '/returns' },
    { label: 'Payment options', href: '/payments' },
    { label: 'FAQs', href: '/faq' },
    { label: 'Contact us', href: '/contact' },
  ],
  company: [
    { label: 'About us', href: '/about' },
    { label: 'Beauty journal', href: '/blog' },
    { label: 'Genuine product promise', href: '/authenticity' },
    { label: 'Terms & conditions', href: '/terms' },
    { label: 'Privacy policy', href: '/privacy' },
  ],
}
