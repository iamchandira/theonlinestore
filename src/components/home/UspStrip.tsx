import { IconCash, IconCreditCard, IconRosetteDiscountCheck, IconTruckDelivery } from '@tabler/icons-react'

import { Reveal, RevealItem } from '@/lib/motion/Reveal'

const usps = [
  { icon: IconRosetteDiscountCheck, title: '100% genuine brands', text: 'Sourced from authorised suppliers' },
  { icon: IconTruckDelivery, title: 'Island-wide delivery', text: 'Free over Rs 10,000' },
  { icon: IconCash, title: 'Cash on delivery', text: 'Pay when it arrives' },
  { icon: IconCreditCard, title: 'Pay in 3 instalments', text: 'Koko & Mintpay, 0% interest' },
]

/** Trust signals right after the first scroll: answers "can I trust this store?" early. */
export function UspStrip() {
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
