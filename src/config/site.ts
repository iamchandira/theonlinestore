/**
 * Store-wide configuration for Sprint 0.
 * From Sprint 1, values marked [admin] move to a Payload "Store Settings" global so admins can edit them.
 */
export const site = {
  name: 'The Online Store',
  domain: 'theonlinestore.lk',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  tagline: 'Shop more. Live better.',
  description:
    'Genuine skincare, haircare, fragrances, footwear, gifts and chocolates, delivered island-wide in Sri Lanka. Cash on delivery, bank transfer, cards and Koko / Mintpay instalments.',
  currency: 'LKR',
  locale: 'en-LK',

  /** [admin] Orders at or above this subtotal ship free. */
  freeDeliveryThreshold: 10000,
  /** [admin] Shown as an estimate until district-based shipping lands in Sprint 4. */
  deliveryEstimate: '2–4 working days',

  /** [admin] Placeholders until confirmed by the business. */
  contact: {
    phone: '+94 77 000 0000',
    whatsapp: '94770000000',
    email: 'hello@theonlinestore.lk',
    hours: 'Mon–Sat, 9.00am – 6.00pm',
    address: 'Colombo, Sri Lanka',
  },
  social: {
    facebook: 'https://facebook.com/',
    instagram: 'https://instagram.com/',
    tiktok: 'https://tiktok.com/',
  },

  /** [admin] Rotating messages in the announcement bar. */
  announcements: [
    'Free island-wide delivery on orders over Rs 10,000',
    'Cash on Delivery available across Sri Lanka',
    'Pay in 3 interest-free instalments with Koko or Mintpay',
    '100% genuine brands, sourced from authorised suppliers',
    'Gift wrapping and handwritten notes on request',
  ],
} as const

export type SiteConfig = typeof site
