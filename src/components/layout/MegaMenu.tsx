'use client'

import { IconArrowRight } from '@tabler/icons-react'
import { motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'

import { beautyCategories, categories, concerns, liveCategories, occasions, recipients } from '@/config/navigation'
import { useStoreSettings } from '@/lib/store/StoreSettingsProvider'
import { productHref, type Product } from '@/lib/catalog'
import { dropdown } from '@/lib/motion/variants'

export function BeautyMega({ onNavigate, feature }: { onNavigate: () => void; feature: Product | null }) {
  const live = liveCategories(beautyCategories, new Set(useStoreSettings().categories))
  return (
    <motion.div variants={dropdown} initial="hidden" animate="show" exit="exit" className="container-site">
      <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.3fr)] gap-8 rounded-b-2xl border border-t-0 border-line bg-surface p-8 shadow-lift">
        {live.map((c) => (
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
            <Link href={productHref(feature)} onClick={onNavigate} className="group relative mt-auto flex items-center gap-4 overflow-hidden rounded-xl bg-tint-skincare p-4">
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

export function BrandsMega({ onNavigate, groups }: { onNavigate: () => void; groups: Record<string, { name: string; slug: string }[]> }) {
  return (
    <motion.div variants={dropdown} initial="hidden" animate="show" exit="exit" className="container-site">
      <div className="grid grid-cols-3 gap-8 rounded-b-2xl border border-t-0 border-line bg-surface p-8 shadow-lift">
        {Object.entries(groups).map(([group, list]) => (
          <div key={group}>
            <p className="mb-3 font-display text-base font-bold">{group}</p>
            <ul className="grid grid-cols-2 gap-1">
              {list.map((b) => (
                <li key={b.slug}>
                  <Link href={`/brands/${b.slug}`} onClick={onNavigate} className="-mx-2 block rounded-md px-2 py-1.5 text-sm text-ink-600 hover:bg-ink-50 hover:text-ink-900">
                    {b.name}
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

const deptShortcuts: Record<string, { title: string; links: { label: string; href: string }[] }> = {
  fragrances: {
    title: 'Shop by',
    links: [
      { label: 'For her', href: '/c/fragrances?recipient=for-her' },
      { label: 'For him', href: '/c/fragrances?recipient=for-him' },
      { label: 'Gift-ready sets', href: '/c/fragrances?occasion=birthday' },
      { label: 'Under Rs 5,000', href: '/c/fragrances?max=5000' },
    ],
  },
  footwear: {
    title: 'Shop by',
    links: [
      { label: 'Women', href: '/c/footwear?recipient=for-her' },
      { label: 'Men', href: '/c/footwear?recipient=for-him' },
      { label: 'Kids', href: '/c/footwear/kids-shoes' },
      { label: 'Under Rs 5,000', href: '/c/footwear?max=5000' },
    ],
  },
  gifts: {
    title: 'Who is it for?',
    links: recipients.map((r) => ({ label: r.label, href: `/gifts?recipient=${r.slug}` })),
  },
  chocolates: {
    title: 'Perfect for',
    links: occasions.slice(0, 5).map((o) => ({ label: o.label, href: `/c/chocolates?occasion=${o.slug}` })),
  },
}

/** Mega-menu for a lifestyle department: sub-categories, shopping shortcuts and a featured product. */
export function DepartmentMega({ slug, feature, onNavigate }: { slug: string; feature: Product | null; onNavigate: () => void }) {
  const available = new Set(useStoreSettings().categories)
  const dept = liveCategories(categories, available).find((c) => c.slug === slug)
  if (!dept) return null
  const shortcuts = deptShortcuts[slug]
  return (
    <motion.div variants={dropdown} initial="hidden" animate="show" exit="exit" className="container-site">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] gap-8 rounded-b-2xl border border-t-0 border-line bg-surface p-8 shadow-lift">
        <div>
          <Link href={dept.href} onClick={onNavigate} className="mb-3 inline-flex items-center gap-1 font-display text-base font-bold hover:text-sunset-600">
            All {dept.name} <IconArrowRight size={16} />
          </Link>
          <ul className="flex flex-col gap-0.5">
            {dept.children?.map((s) => (
              <li key={s.href}>
                <Link href={s.href} onClick={onNavigate} className="-mx-2 block rounded-md px-2 py-1.5 text-sm text-ink-600 hover:bg-ink-50 hover:text-ink-900">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {shortcuts && (
          <div>
            <p className="mb-3 font-display text-base font-bold">{shortcuts.title}</p>
            <div className="flex flex-wrap gap-1.5">
              {shortcuts.links.map((l) => (
                <Link key={l.href} href={l.href} onClick={onNavigate} className="rounded-full border border-line-strong px-3 py-1.5 text-xs font-medium hover:border-ink-900">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
        {feature ? (
          <Link href={productHref(feature)} onClick={onNavigate} className="group relative flex items-center gap-4 overflow-hidden rounded-xl bg-canvas p-4">
            <span className="relative size-24 shrink-0">
              <Image src={feature.variants[0].image} alt="" fill sizes="96px" className="object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110" />
            </span>
            <span>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Popular now</span>
              <span className="mt-1 block font-display font-bold leading-snug">
                {feature.brand} {feature.name}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink-700 group-hover:text-sunset-600">
                Shop now <IconArrowRight size={15} />
              </span>
            </span>
          </Link>
        ) : (
          <p className="self-center rounded-xl bg-canvas p-5 text-sm text-ink-600">New {dept.name.toLowerCase()} arriving soon.</p>
        )}
      </div>
    </motion.div>
  )
}
