import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { index } from '@payloadcms/db-postgres/drizzle/pg-core'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { AuditLogs } from './collections/AuditLogs'
import { Brands } from './collections/Brands'
import { Discounts } from './collections/Discounts'
import { Couriers } from './collections/Couriers'
import { Orders } from './collections/Orders'
import { Returns } from './collections/Returns'
import { PaymentSlips } from './collections/PaymentSlips'
import { Transactions } from './collections/Transactions'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Products } from './collections/Products'
import { ReviewMedia } from './collections/ReviewMedia'
import { Reviews } from './collections/Reviews'
import { SearchQueries } from './collections/SearchQueries'
import { StockMovements } from './collections/StockMovements'
import { Concerns, Occasions, Recipients, Tags } from './collections/Taxonomies'
import { Users } from './collections/Users'
import { CheckoutSettings } from './globals/CheckoutSettings'
import { PaymentSettings } from './globals/PaymentSettings'
import { Policies } from './globals/Policies'
import { StoreSettings } from './globals/StoreSettings'
import { HomePage } from './globals/HomePage'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const siteName = 'The Online Store'

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' · The Online Store Admin',
      description: 'Store management for theonlinestore.lk',
      icons: [{ rel: 'icon', type: 'image/png', url: '/brand/icon-192.png' }],
    },
    components: {
      graphics: {
        Logo: '/components/admin/Graphics#AdminLogo',
        Icon: '/components/admin/Graphics#AdminIcon',
      },
      // Fully custom admin UI (Sprint 1.5): sidebar, header actions, command palette, dashboard, inventory
      Nav: '/components/admin/Nav#Nav',
      actions: ['/components/admin/HeaderActions#HeaderActions'],
      providers: ['/components/admin/CommandPalette#CommandPaletteProvider'],
      beforeLogin: ['/components/admin/LoginIntro#LoginIntro'],
      views: {
        dashboard: { Component: '/components/admin/views/Dashboard#Dashboard' },
        inventory: { Component: '/components/admin/views/Inventory#Inventory', path: '/inventory' },
        importExport: { Component: '/components/admin/views/ImportExport#ImportExport', path: '/import-export' },
        searchInsights: { Component: '/components/admin/views/SearchInsights#SearchInsights', path: '/search-insights' },
        cod: { Component: '/components/admin/views/CodReconciliation#CodReconciliation', path: '/cod' },
      },
    },
    theme: 'light',
  },
  collections: [Orders, Returns, Transactions, PaymentSlips, Discounts, Products, Reviews, ReviewMedia, Categories, Brands, Tags, Concerns, Occasions, Recipients, StockMovements, SearchQueries, Media, Users, Couriers, AuditLogs],
  globals: [StoreSettings, HomePage, CheckoutSettings, PaymentSettings, Policies],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Development syncs the schema automatically ("push"). Production applies these migrations with
    // `pnpm payload migrate`, run by deploy/deploy.sh before every build (one runner, never at start-up).
    // After changing collections or fields: `pnpm payload migrate:create <name>` and commit the file.
    migrationDir: path.resolve(dirname, 'migrations'),
    // Typo-tolerant search (TOS-201): trigram matching + edit distance, created before the schema syncs
    extensions: ['pg_trgm', 'fuzzystrmatch'],
    afterSchemaInit: [
      ({ schema, extendTable }) => {
        // Declared here (not in raw SQL) so Payload's schema sync and migrations know about the index
        extendTable({
          table: schema.tables.products,
          extraConfig: (t) => ({ productsSearchTextTrgm: index('products_search_text_trgm').using('gin', t.searchText.op('gin_trgm_ops')) }),
        })
        return schema
      },
    ],
  }),
  sharp,
  // Transactional email over SMTP (local dev: Mailpit, inbox at http://localhost:8026). Without SMTP_HOST, emails go to the console.
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'hello@theonlinestore.lk',
        defaultFromName: process.env.EMAIL_FROM_NAME || 'The Online Store',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        },
      })
    : undefined,
  // Runs scheduled publish/unpublish jobs (TOS-110) and the unpaid-order release (Sprint 5) while the server is up.
  // Not in tests: they call the release function directly.
  jobs: {
    autoRun: [{ cron: '* * * * *', queue: 'default', limit: 20 }],
    shouldAutoRun: () => process.env.NODE_ENV !== 'test',
    tasks: [
      {
        slug: 'releaseUnpaidOrders',
        label: 'Release unpaid orders',
        schedule: [{ cron: '*/5 * * * *', queue: 'default' }],
        outputSchema: [{ name: 'released', type: 'number' }],
        handler: async ({ req }) => {
          const { releaseUnpaidOrders } = await import('./lib/payments/service')
          return { output: { released: await releaseUnpaidOrders(req.payload) } }
        },
      },
    ],
  },
  plugins: [
    // Category tree: adds `parent` + `breadcrumbs` (e.g. /skincare/serums) to categories
    nestedDocsPlugin({
      collections: ['categories'],
      generateLabel: (_, doc) => String(doc.name ?? ''),
      generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
    }),
    // SEO fields (meta title, description, image) with sensible auto-generated defaults
    seoPlugin({
      collections: ['products', 'categories', 'brands'],
      uploadsCollection: 'media',
      tabbedUI: false,
      generateTitle: ({ doc }) => `${(doc as { name?: string }).name ?? ''} | ${siteName}`,
      generateDescription: ({ doc }) =>
        String((doc as { shortDescription?: string; description?: unknown }).shortDescription ?? '').slice(0, 160),
    }),
  ],
})
