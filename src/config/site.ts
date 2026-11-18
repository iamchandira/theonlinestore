/**
 * Fixed store identity used at build time (URL, domain, currency). Everything the owner can change
 * (contact details, social links, announcements, free delivery, description) lives in
 * Admin › Settings › Store details / Checkout & delivery and is read via lib/store/settings.ts.
 */
export const site = {
  name: 'The Online Store',
  domain: 'theonlinestore.lk',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  tagline: 'Shop more. Live better.',
  currency: 'LKR',
  locale: 'en-LK',
} as const

export type SiteConfig = typeof site
