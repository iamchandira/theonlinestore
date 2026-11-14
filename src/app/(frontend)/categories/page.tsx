import { IconArrowRight } from '@tabler/icons-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import { SmileUnderline } from '@/components/ui/SectionHeader'
import { getCategoryTree } from '@/lib/catalog/server'
import { cn } from '@/lib/utils/cn'

export const metadata: Metadata = { title: 'All categories', alternates: { canonical: '/categories' } }
export const revalidate = 600

const tintBg: Record<string, string> = {
  skincare: 'bg-tint-skincare', hair: 'bg-tint-hair', body: 'bg-tint-body', lips: 'bg-tint-lips',
  fragrance: 'bg-tint-fragrance', chocolate: 'bg-tint-chocolate', footwear: 'bg-tint-footwear', gifts: 'bg-tint-gifts', sky: 'bg-tint-sky',
}

/** Category directory (also the "Categories" tab of the mobile bottom nav). */
export default async function CategoriesPage() {
  const { roots } = await getCategoryTree()
  return (
    <div className="container-site py-6 md:py-8">
      <Breadcrumbs items={[{ name: 'Categories', href: '/categories' }]} />
      <header className="mb-8 mt-4 flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold md:text-[2.75rem]">Shop by category</h1>
        <SmileUnderline className="mt-0.5" />
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {roots.map((c) => (
          <li key={c.slug} className={cn('flex flex-col rounded-2xl p-5', tintBg[c.tint] ?? 'bg-tint-sky')}>
            <Link href={c.href} className="group mb-3 flex items-center justify-between gap-2">
              <span>
                <span className="block font-display text-xl font-bold">{c.name}</span>
                {c.blurb && <span className="text-sm text-ink-600">{c.blurb}</span>}
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/90 shadow-soft transition-transform group-hover:translate-x-1">
                <IconArrowRight size={17} />
              </span>
            </Link>
            {c.children.length > 0 && (
              <ul className="mt-auto flex flex-wrap gap-1.5">
                {c.children.map((s) => (
                  <li key={s.slug}>
                    <Link href={s.href} className="inline-flex h-9 items-center rounded-full bg-white/80 px-3 text-sm font-medium hover:bg-white">
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
