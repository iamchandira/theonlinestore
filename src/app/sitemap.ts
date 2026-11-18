import type { MetadataRoute } from 'next'

import { site } from '@/config/site'
import { getPayloadClient } from '@/lib/catalog/server'

export const revalidate = 3600

/** Published products, categories and brands, plus the main pages. Rebuilt at most hourly. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, '')
  const payload = await getPayloadClient()
  const [products, categories, brands] = await Promise.all([
    payload.find({ collection: 'products', where: { _status: { equals: 'published' } }, limit: 0, pagination: false, depth: 0, select: { slug: true, updatedAt: true } }),
    payload.find({ collection: 'categories', limit: 0, pagination: false, depth: 0, select: { breadcrumbs: true, updatedAt: true } }),
    payload.find({ collection: 'brands', limit: 0, pagination: false, depth: 0, select: { slug: true, updatedAt: true } }),
  ])
  const page = (path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number] => ({ url: `${base}${path}`, priority, ...(lastModified ? { lastModified } : {}) })
  return [
    page('/', 1),
    page('/categories', 0.6),
    page('/brands', 0.6),
    page('/gifts', 0.7),
    page('/offers', 0.7),
    page('/terms', 0.2),
    page('/returns', 0.3),
    page('/privacy', 0.2),
    ...categories.docs.map((c) => {
      const url = (c as { breadcrumbs?: { url?: string | null }[] }).breadcrumbs?.at(-1)?.url
      return url ? page(`/c${url}`, 0.8, c.updatedAt) : null
    }).filter((x): x is MetadataRoute.Sitemap[number] => x !== null),
    ...brands.docs.map((b) => page(`/brands/${(b as { slug: string }).slug}`, 0.5, b.updatedAt)),
    ...products.docs.map((p) => page(`/p/${(p as { slug: string }).slug}`, 0.9, p.updatedAt)),
  ]
}
