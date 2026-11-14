import { IconArrowRight } from '@tabler/icons-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import { SmileUnderline } from '@/components/ui/SectionHeader'
import { BRAND_GROUP_LABELS, getBrands, listProducts } from '@/lib/catalog/server'

export const metadata: Metadata = {
  title: 'All brands',
  description: 'Shop genuine K-beauty, derm and everyday beauty brands in Sri Lanka: CeraVe, La Roche-Posay, The Ordinary, SKIN1004, Medicube and more.',
  alternates: { canonical: '/brands' },
}

export const revalidate = 600

/** Brand directory grouped by type, with product counts. */
export default async function BrandsPage() {
  const brands = await getBrands()
  const counts = await Promise.all(brands.map(async (b) => [b.slug, (await listProducts({ brandSlug: b.slug, limit: 1 })).total] as const))
  const count = Object.fromEntries(counts)
  const groups = Object.entries(BRAND_GROUP_LABELS)
    .map(([key, label]) => ({ key, label, list: brands.filter((b) => b.group === key) }))
    .filter((g) => g.list.length)

  return (
    <div className="container-site py-6 md:py-8">
      <Breadcrumbs items={[{ name: 'Brands', href: '/brands' }]} />
      <header className="mb-8 mt-4 flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sunset-600">Authorised & genuine</p>
        <h1 className="text-3xl font-extrabold md:text-[2.75rem]">All brands</h1>
        <SmileUnderline className="mt-0.5" />
        <p className="mt-2 max-w-2xl text-ink-600">Every product comes from authorised suppliers. {brands.length} brands and counting.</p>
      </header>
      <div className="flex flex-col gap-10">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`g-${g.key}`}>
            <h2 id={`g-${g.key}`} className="mb-4 text-xl font-bold">
              {g.label}
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {g.list.map((b) => (
                <li key={b.slug}>
                  <Link
                    href={`/brands/${b.slug}`}
                    className="group flex h-full items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 transition-[border-color,box-shadow] hover:border-ink-900 hover:shadow-card md:p-5"
                  >
                    <span>
                      <span className="block font-display text-lg font-bold tracking-tight">{b.name}</span>
                      <span className="text-sm text-ink-500">{count[b.slug] ?? 0} products</span>
                    </span>
                    <IconArrowRight size={18} className="shrink-0 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-sunset-600" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
