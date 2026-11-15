import type { Metadata } from 'next'

import { Checkout } from '@/components/checkout/Checkout'
import { getCurrentUser } from '@/lib/auth/server'
import { getPayloadClient } from '@/lib/catalog/server'
import { loadCheckoutConfig } from '@/lib/checkout/server'

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } }

/** One-page checkout (TOS-502). Guests welcome; signed-in shoppers get their details and addresses filled in. */
export default async function CheckoutPage() {
  const [user, payload] = await Promise.all([getCurrentUser(), getPayloadClient()])
  const config = await loadCheckoutConfig(payload)
  return (
    <Checkout
      user={
        user
          ? {
              fullName: user.fullName ?? '',
              email: user.email,
              phone: user.phone ?? '',
              addresses: (user.addresses ?? []).map((a) => ({
                id: a.id ?? '',
                label: a.label ?? 'Address',
                recipientName: a.recipientName,
                phone: a.phone,
                line1: a.line1,
                line2: a.line2 ?? '',
                city: a.city,
                district: a.district,
                postalCode: a.postalCode ?? '',
                landmark: a.landmark ?? '',
                isDefault: Boolean(a.isDefault),
              })),
            }
          : null
      }
      giftWrapFee={config.giftWrapFee}
      freeThreshold={config.delivery.freeThreshold}
      sameDayDistricts={config.delivery.sameDay.enabled ? config.delivery.sameDay.districts : []}
    />
  )
}
