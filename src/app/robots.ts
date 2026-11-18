import type { MetadataRoute } from 'next'

import { site } from '@/config/site'

/** Search engines may crawl the shop, never the admin, checkout, accounts, orders or API. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/checkout', '/account', '/orders/', '/print/', '/track-order', '/wishlist', '/search', '/styleguide'] }],
    sitemap: `${site.url.replace(/\/$/, '')}/sitemap.xml`,
  }
}
