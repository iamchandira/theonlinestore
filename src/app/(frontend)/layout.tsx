import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { ChatAssistant } from '@/components/assistant/ChatAssistant'
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
import { getStoreSettings } from '@/lib/store/settings'

import { fontVariables } from './fonts'
import './globals.css'

/** Name and default description come from Admin › Settings › Store details. */
export async function generateMetadata(): Promise<Metadata> {
  const store = await getStoreSettings()
  return {
    metadataBase: new URL(site.url),
    title: {
      default: `${store.name}: Beauty, Fragrances, Gifts & More in Sri Lanka`,
      template: `%s | ${store.name}`,
    },
    description: store.description,
    applicationName: store.name,
    openGraph: {
      type: 'website',
      siteName: store.name,
      locale: 'en_LK',
      images: [{ url: '/brand/og-default.jpg', width: 1200, height: 480, alt: store.name }],
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: '/' },
  }
}

export const viewport: Viewport = {
  themeColor: '#ff5a1f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const [nav, bagSuggestions, store] = await Promise.all([getNavData(), getBagSuggestions(), getStoreSettings()])
  return (
    <html lang="en-LK" className={fontVariables}>
      <body>
        <Providers store={store}>
          <AnnouncementBar />
          <Header nav={nav} />
          <main id="main" className="min-h-[60vh]">
            {children}
          </main>
          <Footer store={store} />
          <CartDrawer suggestions={bagSuggestions} />
          <QuickAddSheet />
          <MobileBottomNav />
          <WhatsAppFab />
          {store.assistant ? <ChatAssistant /> : null}
        </Providers>
      </body>
    </html>
  )
}
