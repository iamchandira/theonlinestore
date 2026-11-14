import { IconArrowRight, IconCake, IconGift, IconHeart, IconUser } from '@tabler/icons-react'
import Link from 'next/link'

import { SectionHeader } from '@/components/ui/SectionHeader'
import { Reveal, RevealItem } from '@/lib/motion/Reveal'

const finders = [
  { title: 'For her', text: 'Skincare, lip oils, body polish', href: '/c/gifts?for=her', icon: IconHeart, tone: 'bg-tint-lips text-rose-700' },
  { title: 'For him', text: 'Grooming, fragrance, footwear', href: '/c/gifts?for=him', icon: IconUser, tone: 'bg-tint-sky text-info-600' },
  { title: 'Under Rs 5,000', text: 'Thoughtful and affordable', href: '/c/gifts?max=5000', icon: IconGift, tone: 'bg-tint-gifts text-sunset-700' },
  { title: 'Birthdays & occasions', text: 'Hampers, chocolates, sets', href: '/c/gifts?occasion=birthday', icon: IconCake, tone: 'bg-tint-chocolate text-[#7a3f16]' },
]

/** Gift finder: answers the gift buyer's first question ("who is it for?") in one tap. */
export function GiftFinder() {
  return (
    <section aria-labelledby="gift-title" className="container-site py-10 md:py-14">
      <SectionHeader
        eyebrow="Gifting made easy"
        title={<span id="gift-title">Find the perfect gift</span>}
        description="Free gift wrapping and a handwritten note on request. We deliver island-wide."
      />
      <Reveal staggerChildren={0.07} className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {finders.map(({ title, text, href, icon: Icon, tone }) => (
          <RevealItem key={title}>
            <Link href={href} className={`group flex h-full flex-col gap-6 rounded-xl p-5 transition-shadow hover:shadow-card md:p-6 ${tone.split(' ')[0]}`}>
              <span className={`grid size-12 place-items-center rounded-full bg-white shadow-soft transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${tone.split(' ')[1]}`}>
                <Icon size={24} />
              </span>
              <span>
                <span className="flex items-center gap-1.5 font-display text-lg font-bold text-ink-900">
                  {title}
                  <IconArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <span className="text-sm text-ink-600">{text}</span>
              </span>
            </Link>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  )
}
