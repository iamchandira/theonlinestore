'use client'

import { IconArrowRight, IconCandy, IconGift, IconPerfume, IconShoe } from '@tabler/icons-react'
import { motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'

import { categories, type Tint } from '@/config/navigation'
import { getProducts } from '@/lib/catalog'
import { fadeUp, stagger } from '@/lib/motion/variants'
import { cn } from '@/lib/utils/cn'

const tintBg: Record<Tint, string> = {
  skincare: 'bg-tint-skincare',
  hair: 'bg-tint-hair',
  body: 'bg-tint-body',
  lips: 'bg-tint-lips',
  fragrance: 'bg-tint-fragrance',
  chocolate: 'bg-tint-chocolate',
  footwear: 'bg-tint-footwear',
  gifts: 'bg-tint-gifts',
  sky: 'bg-tint-sky',
}
const iconTone: Record<string, string> = {
  perfume: 'text-[#7a4cc2]',
  shoe: 'text-ink-700',
  gift: 'text-sunset-600',
  candy: 'text-[#8a4b20]',
}
const icons = { perfume: IconPerfume, shoe: IconShoe, gift: IconGift, candy: IconCandy }

/**
 * Quick-access category tiles (Noor-style): big, rounded and colour-coded so each department
 * is recognisable at a glance. Horizontal snap scroll on phones, 4 × 2 grid on desktop.
 */
export function CategoryTiles() {
  return (
    <section aria-labelledby="cat-title" className="container-site py-10 md:py-14">
      <div className="mb-5 flex items-end justify-between">
        <h2 id="cat-title" className="text-2xl font-bold md:text-[1.75rem]">
          Shop by category
        </h2>
        <Link href="/categories" className="inline-flex h-11 items-center gap-1 text-sm font-semibold hover:text-sunset-600">
          All categories <IconArrowRight size={17} />
        </Link>
      </div>
      <motion.ul
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        variants={stagger(0.05)}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0"
      >
        {categories.map((c, i) => {
          const imgs = c.heroProducts ? getProducts(c.heroProducts) : []
          const Icon = c.icon ? icons[c.icon] : null
          return (
            <motion.li key={c.slug} variants={fadeUp} className="w-[42%] shrink-0 snap-start xs:w-[38%] sm:w-[30%] md:w-auto">
              <Link
                href={c.href}
                className={cn(
                  'group relative flex h-full flex-col overflow-hidden rounded-xl p-4 transition-shadow duration-300 hover:shadow-card md:p-5',
                  tintBg[c.tint],
                  i < 4 ? 'min-h-44 md:min-h-56' : 'min-h-44 md:min-h-40',
                )}
              >
                <span className="relative z-10">
                  <span className="block font-display text-[1.0625rem] font-bold md:text-xl">{c.name}</span>
                  <span className="mt-0.5 block text-xs text-ink-600 md:text-sm">{c.blurb}</span>
                </span>
                <span className="absolute bottom-3 left-4 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-ink-900 shadow-soft transition-transform duration-300 group-hover:translate-x-1 md:left-5">
                  <IconArrowRight size={17} />
                </span>
                {imgs.length > 0 ? (
                  <span aria-hidden className="absolute -bottom-2 -right-2 flex h-[62%] w-[70%] items-end justify-end">
                    {imgs.map((p, j) => (
                      <span
                        key={p.slug}
                        className={cn(
                          'relative h-full w-1/2 transition-transform duration-500 ease-[var(--ease-out-soft)]',
                          j === 0 ? 'z-10 group-hover:-translate-y-2 group-hover:-rotate-3' : '-ml-[12%] h-[85%] group-hover:-translate-y-1 group-hover:rotate-3',
                        )}
                      >
                        <Image src={p.variants[0].image} alt="" fill sizes="120px" className="object-contain object-bottom mix-blend-multiply" />
                      </span>
                    ))}
                  </span>
                ) : (
                  Icon && (
                    <Icon
                      aria-hidden
                      stroke={1.25}
                      className={cn(
                        'absolute -bottom-3 -right-3 size-24 opacity-90 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 md:size-28',
                        iconTone[c.icon!],
                      )}
                    />
                  )
                )}
              </Link>
            </motion.li>
          )
        })}
      </motion.ul>
    </section>
  )
}
