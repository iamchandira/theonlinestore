'use client'

import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useState } from 'react'

import { ProductCard } from '@/components/product/ProductCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { Product } from '@/lib/catalog'
import { cn } from '@/lib/utils/cn'

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'skincare', label: 'Skincare' },
  { key: 'hair-care', label: 'Hair' },
  { key: 'body-care', label: 'Body' },
] as const

/** Bestseller grid with category tabs. Tab indicator and grid items animate with shared layout. */
export function BestSellers({ products }: { products: Product[] }) {
  const [tab, setTab] = useState<(typeof tabs)[number]['key']>('all')
  const list = products.filter((p) => tab === 'all' || p.category === tab).slice(0, 8)

  return (
    <section aria-labelledby="bestsellers-title" className="container-site py-10 md:py-14">
      <SectionHeader eyebrow="Loved by shoppers" title={<span id="bestsellers-title">Bestsellers</span>} action={{ label: 'View all', href: '/c/beauty?sort=bestsellers' }} />
      <LayoutGroup>
        <div role="tablist" aria-label="Filter bestsellers" className="scrollbar-none -mx-4 mb-6 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn('relative h-10 shrink-0 rounded-full px-5 text-sm font-semibold transition-colors', tab === t.key ? 'text-white' : 'text-ink-700 hover:bg-ink-50')}
            >
              {tab === t.key && <motion.span layoutId="best-tab" className="absolute inset-0 rounded-full bg-ink-900" transition={{ type: 'spring', stiffness: 450, damping: 35 }} />}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
        <motion.ul layout role="tabpanel" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((p) => (
              <motion.li
                key={p.slug}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProductCard product={p} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </LayoutGroup>
    </section>
  )
}
