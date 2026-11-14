import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { CartDrawer } from '@/components/layout/CartDrawer'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { Providers } from '@/components/layout/Providers'
import { WhatsAppFab } from '@/components/layout/WhatsAppFab'
import { QuickAddSheet } from '@/components/product/QuickAddSheet'
import { site } from '@/config/site'
import { getBagSuggestions, getNavData } from '@/lib/catalog/server'

import { fontVariables } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: Beauty, Fragrances, Gifts & More in Sri Lanka`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'en_LK',
    images: [{ url: '/brand/og-default.jpg', width: 1200, height: 480, alt: site.name }],
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/' },
}

export const viewport: Viewport = {
  themeColor: '#ff5a1f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const [nav, bagSuggestions] = await Promise.all([getNavData(), getBagSuggestions()])
  return (
    <html lang="en-LK" className={fontVariables}>
      <body>
        <Providers>
          <AnnouncementBar />
          <Header nav={nav} />
          <main id="main" className="min-h-[60vh]">
            {children}
          </main>
          <Footer />
          <CartDrawer suggestions={bagSuggestions} />
          <QuickAddSheet />
          <MobileBottomNav />
          <WhatsAppFab />
        </Providers>
      </body>
    </html>
  )
}
