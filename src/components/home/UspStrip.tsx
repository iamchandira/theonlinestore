import { IconCash, IconCreditCard, IconRosetteDiscountCheck, IconTruckDelivery } from '@tabler/icons-react'

import { formatLKR } from '@/lib/format'
import { Reveal, RevealItem } from '@/lib/motion/Reveal'
import { getStoreSettings } from '@/lib/store/settings'


/** Trust signals right after the first scroll: answers "can I trust this store?" early. */
export async function UspStrip() {
  // Only promises what's switched on in Admin › Settings (free delivery, COD, instalments)
  const store = await getStoreSettings()
  const usps = [
    { icon: IconRosetteDiscountCheck, title: '100% genuine brands', text: 'Sourced from authorised suppliers' },
    { icon: IconTruckDelivery, title: 'Island-wide delivery', text: store.freeDeliveryThreshold != null ? `Free over ${formatLKR(store.freeDeliveryThreshold)}` : store.deliveryEstimate },
    ...(store.paymentMethods.includes('Cash on delivery') ? [{ icon: IconCash, title: 'Cash on delivery', text: 'Pay when it arrives' }] : []),
    store.instalments
      ? { icon: IconCreditCard, title: 'Pay in 3 instalments', text: `With ${store.instalments.providers.join(' & ')}` }
      : store.paymentMethods.some((m) => m !== 'Cash on delivery')
        ? { icon: IconCreditCard, title: 'Easy payment', text: store.paymentMethods.filter((m) => m !== 'Cash on delivery').join(', ') }
        : { icon: IconCreditCard, title: 'Simple checkout', text: 'Guest checkout in a few steps' },
  ]
  return (
    <section aria-label="Why shop with us" className="container-site">
      <Reveal staggerChildren={0.07} className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        {usps.map(({ icon: Icon, title, text }) => (
          <RevealItem key={title} className="flex items-center gap-2.5 bg-surface p-3 sm:gap-3 sm:p-4 md:p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sunset-50 text-sunset-600 sm:size-11">
              <Icon size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.8125rem] font-bold leading-tight sm:text-sm md:text-[0.9375rem]">{title}</span>
              <span className="hidden text-xs text-ink-500 sm:block md:text-sm">{text}</span>
            </span>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  )
}
