import 'server-only'

import { cache } from 'react'

import type { CheckoutSetting, Policy, StoreSetting } from '@/payload-types'

import { getPayloadClient } from '../catalog/server'
import { gatewayRoute, loadPaymentConfig } from '../payments/config'

/**
 * Store settings for the storefront (launch prep): Store details, free delivery, payment names and
 * instalment display, policies. Read once per request; saving any of these globals refreshes the store.
 * Everything here is public (no credentials).
 */

export type InstalmentDisplay = {
  /** Provider names shown on products, e.g. ["Koko", "Mintpay"] */
  providers: string[]
  /** Fee added to the price when paying in instalments (lowest of the providers shown) */
  feePercent: number
}

export type StorePublic = {
  name: string
  description: string
  deliveryEstimate: string
  contact: { phone: string; whatsapp: string; email: string; hours: string; address: string; businessRegistration: string }
  social: { facebook: string; instagram: string; tiktok: string; youtube: string }
  announcements: string[]
  /** null when free delivery is switched off */
  freeDeliveryThreshold: number | null
  /** Short names of the payment methods shoppers can use now, in checkout order */
  paymentMethods: string[]
  /** null hides every "3 × Rs X" line */
  instalments: InstalmentDisplay | null
  returns: { windowDays: number; nonReturnableTypes: string[] }
  /** Slugs of the categories that exist (menus and tiles only show these) */
  categories: string[]
}

const SHORT: Record<string, string> = { payhere: 'Cards', koko: 'Koko', mintpay: 'Mintpay', cod: 'Cash on delivery', 'bank-transfer': 'Bank transfer' }

export const getStoreSettings = cache(async (): Promise<StorePublic> => {
  const payload = await getPayloadClient()
  const [cats, s, c, p, pay] = await Promise.all([
    payload.find({ collection: 'categories', limit: 0, pagination: false, depth: 0, select: { slug: true } }),
    payload.findGlobal({ slug: 'store-settings', depth: 0 }) as Promise<StoreSetting>,
    payload.findGlobal({ slug: 'checkout-settings', depth: 0 }) as Promise<CheckoutSetting>,
    payload.findGlobal({ slug: 'policies', depth: 0 }) as Promise<Policy>,
    loadPaymentConfig(payload),
  ])
  const usable = Object.values(pay.methods)
    .filter((m) => m.enabled && (m.id === 'cod' || (m.id === 'bank-transfer' ? pay.bankTransfer.accounts.length > 0 : gatewayRoute(pay, m.id as 'payhere') !== null)))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const bnpl = (['koko', 'mintpay'] as const).filter((id) => usable.some((m) => m.id === id) && pay.instalmentDisplay[id].show)
  return {
    name: s.storeName || 'The Online Store',
    description: s.description ?? '',
    deliveryEstimate: s.deliveryEstimate || '2–4 working days',
    contact: {
      phone: s.contact?.phone ?? '',
      whatsapp: s.contact?.whatsapp ?? '',
      email: s.contact?.email ?? '',
      hours: s.contact?.hours ?? '',
      address: s.contact?.address ?? '',
      businessRegistration: s.contact?.businessRegistration ?? '',
    },
    social: { facebook: s.social?.facebook ?? '', instagram: s.social?.instagram ?? '', tiktok: s.social?.tiktok ?? '', youtube: s.social?.youtube ?? '' },
    announcements: (s.announcements ?? []).map((a) => a.text).filter(Boolean),
    freeDeliveryThreshold: c.freeDeliveryEnabled === false ? null : (c.freeThreshold ?? 10000),
    paymentMethods: usable.map((m) => SHORT[m.id]),
    instalments: bnpl.length ? { providers: bnpl.map((id) => SHORT[id]), feePercent: Math.min(...bnpl.map((id) => pay.instalmentDisplay[id].feePercent)) } : null,
    returns: { windowDays: p.returnWindowDays ?? 7, nonReturnableTypes: (p.nonReturnableTypes ?? ['chocolate']) as string[] },
    categories: cats.docs.map((d) => (d as { slug?: string }).slug).filter((x): x is string => Boolean(x)),
  }
})

export { refreshStoreSettings } from './refresh'
