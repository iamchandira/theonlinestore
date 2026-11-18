import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const isProd = process.env.NODE_ENV === 'production'

/** Basic browser protections on every response (HTTPS-only is added by Caddy). */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
]

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile)
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  images: {
    // AVIF is ~5–10x slower to encode than WebP. In development every first view of an image is encoded
    // on the spot, so dev uses WebP only; production adds AVIF (smaller files) and caches the results.
    formats: isProd ? ['image/avif', 'image/webp'] : ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    localPatterns: [
      { pathname: '/api/media/file/**' },
      // Shopper review photos (served only once the review is approved)
      { pathname: '/api/review-media/file/**' },
      { pathname: '/brand/**' },
      { pathname: '/catalogue/**' },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
