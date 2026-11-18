/**
 * Storefront catalogue shapes. These are plain, serialisable objects (safe to pass from Server to
 * Client Components). Server code maps Payload documents into them in `./server.ts`.
 */

export type Variant = {
  sku: string
  option: string
  label: string
  /** Second option (e.g. Colour for shoes), or null for single-option products */
  option2Name: string | null
  option2: string | null
  price: number
  compareAtPrice: number | null
  stock: number
  /** Card-sized image URL */
  image: string
  /** Full-size image URL (product page gallery) */
  imageLarge: string
}

export type Badge = 'bestseller' | 'new' | 'trending' | 'gift' | 'limited' | null

export type ProductType = 'beauty' | 'fragrance' | 'footwear' | 'gift' | 'chocolate' | 'accessory' | 'home'

export type Product = {
  id: number
  slug: string
  brand: string
  brandSlug: string
  name: string
  /** Top-level category slug (drives the category mood tint), e.g. "skincare" */
  category: string
  /** Most specific category slug, e.g. "serums" */
  subcategory: string
  concerns: string[]
  tags: string[]
  badge: Badge
  productType: ProductType
  /** Sample content for design/testing (shown with a "Sample" tag; removed before launch) */
  recipients: string[]
  occasions: string[]
  rating: number
  reviewCount: number
  priceTBC: boolean
  variants: Variant[]
}

export type Crumb = { name: string; href: string }

export type ProductDetail = Product & {
  shortDescription: string
  /** Lexical rich text JSON (rendered with Payload's <RichText>) */
  description: unknown
  benefits: string[]
  howToUse: string
  ingredients: string
  gallery: { image: string; imageLarge: string; alt: string }[]
  breadcrumbs: Crumb[]
  concernLabels: { slug: string; name: string }[]
  recipientLabels: { slug: string; name: string }[]
  occasionLabels: { slug: string; name: string }[]
  /** Type-specific facts shown in a "Details" list, e.g. [["Concentration", "Eau de Parfum"], ["Cocoa", "70%"]] */
  facts: [string, string][]
  notes: { top: string; heart: string; base: string } | null
  contents: string[]
  fit: string
  storage: string
  allergens: string
  metaTitle: string | null
  metaDescription: string | null
  updatedAt: string
}

export type CategoryNode = {
  id: number
  slug: string
  name: string
  blurb: string | null
  description: string | null
  tint: string
  /** e.g. /c/skincare/serums */
  href: string
  parentId: number | null
  children: CategoryNode[]
}

export type BrandSummary = { id: number; name: string; slug: string; group: string; description?: string | null }

export type SortKey = 'recommended' | 'bestsellers' | 'new' | 'price-asc' | 'price-desc' | 'rating'

export type ListResult = { products: Product[]; total: number; page: number; totalPages: number; limit: number }
