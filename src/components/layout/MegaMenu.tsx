'use client'

import { IconArrowRight } from '@tabler/icons-react'
import { motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'

import { beautyCategories, concerns } from '@/config/navigation'
import { brandGroups, brandSlug, getProduct } from '@/lib/catalog'
import { dropdown } from '@/lib/motion/variants'

export function BeautyMega({ onNavigate }: { onNavigate: () => void }) {
  const feature = getProduct('medicube-collagen-night-wrapping-mask')
  return (
    <motion.div variants={dropdown} initial="hidden" animate="show" exit="exit" className="container-site">
      <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.3fr)] gap-8 rounded-b-2xl border border-t-0 border-line bg-surface p-8 shadow-lift">
        {beautyCategories.map((c) => (
          <div key={c.slug}>
            <Link href={c.href} onClick={onNavigate} className="mb-3 inline-flex items-center gap-1 font-display text-base font-bold hover:text-sunset-600">
              {c.name} <IconArrowRight size={16} />
            </Link>
            <ul className="flex flex-col gap-0.5">
              {c.children?.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} onClick={onNavigate} className="-mx-2 block rounded-md px-2 py-1.5 text-sm text-ink-600 hover:bg-ink-50 hover:text-ink-900">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-500">Shop by concern</p>
            <div className="flex flex-wrap gap-1.5">
              {concerns.slice(0, 6).map((c) => (
                <Link key={c.slug} href={`/c/beauty?concern=${c.slug}`} onClick={onNavigate} className="rounded-full border border-line-strong px-3 py-1.5 text-xs font-medium hover:border-ink-900">
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
          {feature && (
            <Link href={`/p/${feature.slug}`} onClick={onNavigate} className="group relative mt-auto flex items-center gap-4 overflow-hidden rounded-xl bg-tint-skincare p-4">
              <span className="relative size-24 shrink-0">
                <Image src={feature.variants[0].image} alt="" fill sizes="96px" className="object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110" />
              </span>
              <span>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Trending now</span>
                <span className="mt-1 block font-display font-bold leading-snug">{feature.brand} {feature.name}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink-700 group-hover:text-sunset-600">
                  Shop now <IconArrowRight size={15} />
                </span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function BrandsMega({ onNavigate }: { onNavigate: () => void }) {
  return (
    <motion.div variants={dropdown} initial="hidden" animate="show" exit="exit" className="container-site">
      <div className="grid grid-cols-3 gap-8 rounded-b-2xl border border-t-0 border-line bg-surface p-8 shadow-lift">
        {Object.entries(brandGroups).map(([group, list]) => (
          <div key={group}>
            <p className="mb-3 font-display text-base font-bold">{group}</p>
            <ul className="grid grid-cols-2 gap-1">
              {list.map((b) => (
                <li key={b}>
                  <Link href={`/brands/${brandSlug(b)}`} onClick={onNavigate} className="-mx-2 block rounded-md px-2 py-1.5 text-sm text-ink-600 hover:bg-ink-50 hover:text-ink-900">
                    {b}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
