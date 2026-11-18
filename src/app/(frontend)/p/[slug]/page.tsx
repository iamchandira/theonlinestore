import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import { JsonLd } from '@/components/catalog/JsonLd'
import { RailSection } from '@/components/home/RailSection'
import { ProductDetails } from '@/components/product/ProductDetails'
import { ProductView } from '@/components/product/ProductView'
import { site } from '@/config/site'
import { RecentlyViewed } from '@/components/product/RecentlyViewed'
import { Reviews } from '@/components/product/Reviews'
import { getAllProductSlugs, getCrossSells, getProductBySlug, getProductReviews, getRelated, getUpsells } from '@/lib/catalog/server'

type Props = { params: Promise<{ slug: string }> }

/** Pre-render every published product; edits revalidate the page immediately (see Products hooks). */
export const revalidate = 3600
export async function generateStaticParams() {
  return (await getAllProductSlugs()).map((slug) => ({ slug }))
}

const abs = (u: string) => (u.startsWith('http') ? u : `${site.url}${u}`)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug)
  if (!product) return { title: 'Product not found' }
  const title = product.metaTitle?.replace(/ \| The Online Store$/, '') || `${product.brand} ${product.name}`
  const description = product.metaDescription || product.shortDescription || `Buy genuine ${product.brand} ${product.name} in Sri Lanka.`
  const image = product.variants[0]?.imageLarge
  return {
    title,
    description,
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: { type: 'website', title, description, images: image ? [{ url: abs(image) }] : undefined },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()
  const [pairs, upsellsRaw, related, reviews] = await Promise.all([getCrossSells(slug), getUpsells(product), getRelated(product), getProductReviews(product.id)])
  const pairSlugs = new Set(pairs.map((p) => p.slug))
  const upsells = upsellsRaw.filter((p) => !pairSlugs.has(p.slug))
  const shown = new Set([...pairSlugs, ...upsells.map((p) => p.slug)])
  const alsoLike = related.filter((p) => !shown.has(p.slug))

  const beautyRoots = ['skincare', 'hair-care', 'body-care', 'lips']
  const trail = [...(beautyRoots.includes(product.category) ? [{ name: 'Beauty', href: '/c/beauty' }] : []), ...product.breadcrumbs]

  // Structured data. Offers are published only once prices are confirmed (no placeholder prices in search results).
  const prices = product.variants.map((v) => v.price)
  const inStock = product.variants.some((v) => v.stock > 0)
  const productLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${product.brand} ${product.name}`,
    description: product.metaDescription || product.shortDescription,
    sku: product.variants[0]?.sku,
    image: product.variants.map((v) => abs(v.imageLarge || v.image)),
    brand: { '@type': 'Brand', name: product.brand },
    url: `${site.url}/p/${product.slug}`,
  }
  // Ratings in search results come from approved shopper reviews
  if (reviews.summary.count > 0) {
    const genuine = reviews.reviews
    productLd.aggregateRating = { '@type': 'AggregateRating', ratingValue: reviews.summary.average, reviewCount: reviews.summary.count, bestRating: 5, worstRating: 1 }
    productLd.review = genuine.slice(0, 5).map((r) => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      author: { '@type': 'Person', name: r.authorName },
      datePublished: r.createdAt.slice(0, 10),
      ...(r.title ? { name: r.title } : {}),
      reviewBody: r.body,
    }))
  }
  if (!product.priceTBC) {
    productLd.offers =
      product.variants.length > 1
        ? { '@type': 'AggregateOffer', priceCurrency: 'LKR', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}` }
        : { '@type': 'Offer', priceCurrency: 'LKR', price: prices[0], availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`, itemCondition: 'https://schema.org/NewCondition', url: `${site.url}/p/${product.slug}` }
  }

  return (
    <>
      <div className="container-site pb-10 pt-5 md:pb-14 md:pt-6">
        <div className="mb-5">
          <Breadcrumbs items={[...trail, { name: product.name, href: `/p/${product.slug}` }]} />
        </div>
        <ProductView product={product} details={<ProductDetails product={product} />} />
      </div>
      <Reviews productId={product.id} productName={`${product.brand} ${product.name}`} summary={reviews.summary} initial={reviews.reviews} totalPages={reviews.totalPages} />
      {pairs.length > 0 && (
        <RailSection id="pairs-title" eyebrow="Complete your routine" title="Pairs well with" products={pairs} tone="blush" />
      )}
      {upsells.length > 0 && (
        <RailSection id="upsell-title" eyebrow="Treat yourself" title="Upgrade your pick" description="Bigger sizes, richer formulas and premium alternatives." products={upsells} />
      )}
      {alsoLike.length > 0 && <RailSection id="related-title" eyebrow="More to explore" title="You may also like" products={alsoLike} />}
      <RecentlyViewed excludeSlug={product.slug} />
      <JsonLd data={productLd} />
    </>
  )
}
