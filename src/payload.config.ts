import { postgresAdapter } from '@payloadcms/db-postgres'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Brands } from './collections/Brands'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Products } from './collections/Products'
import { StockMovements } from './collections/StockMovements'
import { Concerns, Occasions, Recipients, Tags } from './collections/Taxonomies'
import { Users } from './collections/Users'
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
      },
    },
    theme: 'light',
  },
  collections: [Products, Categories, Brands, Tags, Concerns, Occasions, Recipients, StockMovements, Media, Users],
  globals: [HomePage],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  // Runs scheduled publish/unpublish jobs (TOS-110) while the server is up
  jobs: {
    autoRun: [{ cron: '* * * * *', queue: 'default', limit: 20 }],
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
