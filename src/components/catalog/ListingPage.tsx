import { IconBrandWhatsapp, IconSparkles, IconX } from '@tabler/icons-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { ProductCard } from '@/components/product/ProductCard'
import type { FacetGroup } from '@/lib/catalog/facets'
import { ButtonLink } from '@/components/ui/Button'
import { SmileUnderline } from '@/components/ui/SectionHeader'
import { site } from '@/config/site'
import type { Crumb, ListResult, SortKey } from '@/lib/catalog'
import { cn } from '@/lib/utils/cn'

import { Breadcrumbs } from './Breadcrumbs'
import { FilterSheetButton, FilterSidebar, ListingProvider, ListingResults } from './filters/Filters'
import { Pagination } from './Pagination'
import { SortSelect } from './SortSelect'

const tintBg: Record<string, string> = {
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

type Props = {
  title: string
  eyebrow?: string
  description?: string | null
  breadcrumbs: Crumb[]
  tint?: string
  /** Sub-category or related links shown as chips under the title */
  chips?: { label: string; href: string; active?: boolean }[]
  /** Active filters, each with a link that removes it */
  filters?: { label: string; removeHref: string }[]
  result: ListResult
  sort: SortKey
  basePath: string
  params: Record<string, string>
  empty?: ReactNode
  /** Facet groups with counts (TOS-202); omit to hide the filters */
  facets?: FacetGroup[]
  /** Encoded listing scope so the mobile filter sheet can fetch live counts */
  scopeToken?: string
  /** "Clear all filters" link (keeps search and sort) */
  clearHref?: string
  /** Extra content above the grid (e.g. "Did you mean") */
  notice?: ReactNode
}

/**
 * Shared product listing layout (category, brand, offers, search):
 * breadcrumbs → title → sub-category chips, then a sticky filter sidebar (desktop) or a Filters sheet
 * (phones) beside the results: count + sort → active filter chips → 2/3-column grid → pagination.
 */
export function ListingPage({ title, eyebrow, description, breadcrumbs, tint = 'sky', chips, filters, result, sort, basePath, params, empty, facets = [], scopeToken = '', clearHref, notice }: Props) {
  const hasFacets = facets.length > 0
  const { products, total, page, totalPages, limit } = result
  const from = total ? (page - 1) * limit + 1 : 0
  const to = Math.min(total, page * limit)
  return (
    <>
      <header className={cn('border-b border-line', tintBg[tint] ?? 'bg-tint-sky')}>
        <div className="container-site flex flex-col gap-3 pb-6 pt-5 md:pb-8 md:pt-6">
          <Breadcrumbs items={[...breadcrumbs, { name: title, href: basePath }]} />
          <div className="flex flex-col gap-1">
            {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.14em] text-sunset-600">{eyebrow}</p>}
            <h1 className="text-3xl font-extrabold md:text-[2.75rem]">{title}</h1>
            <SmileUnderline className="mt-0.5" />
          </div>
          {description && <p className="max-w-2xl text-ink-600">{description}</p>}
          {chips?.length ? (
            <nav aria-label={`${title} sections`} className="scrollbar-none -mx-4 mt-1 flex gap-2 overflow-x-auto px-4 pb-1">
              {chips.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  aria-current={c.active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors',
                    c.active ? 'border-ink-900 bg-ink-900 text-white' : 'border-line-strong bg-surface/90 text-ink-800 hover:border-ink-900',
                  )}
                >
                  {c.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </header>

      <ListingProvider>
        <section className="container-site py-6 md:py-8" aria-label={`${title} products`}>
          <div className={cn(hasFacets && 'lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8 xl:gap-10')}>
            {hasFacets && (
              <aside aria-label="Filters" className="hidden lg:block">
                <div data-lenis-prevent className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain pb-6 pr-2 [scrollbar-width:thin]">
                  <FilterSidebar facets={facets} />
                </div>
              </aside>
            )}
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-600" aria-live="polite">
                  {total ? (
                    <>
                      Showing <strong className="font-semibold text-ink-900">{from}–{to}</strong> of <strong className="font-semibold text-ink-900">{total}</strong> products
                    </>
                  ) : (
                    'No products found'
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {hasFacets && <FilterSheetButton facets={facets} scopeToken={scopeToken} total={total} />}
                  {total > 1 && <SortSelect value={sort} />}
                </div>
              </div>
              {filters && filters.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  {filters.map((f) => (
                    <Link
                      key={f.label + f.removeHref}
                      href={f.removeHref}
                      scroll={false}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-sunset-50 pl-3 pr-2 text-sm font-medium text-sunset-800 hover:bg-sunset-100"
                      aria-label={`Remove filter: ${f.label}`}
                    >
                      {f.label} <IconX size={14} aria-hidden />
                    </Link>
                  ))}
                  {clearHref && filters.length > 1 && (
                    <Link href={clearHref} scroll={false} className="px-2 text-sm font-semibold text-ink-700 underline underline-offset-4 hover:text-sunset-700">
                      Clear all
                    </Link>
                  )}
                </div>
              )}
              {notice}
              <ListingResults>
                {products.length ? (
                  <ul className={cn('grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3', !hasFacets && 'lg:grid-cols-4')}>
                    {products.map((p, i) => (
                      <li key={p.slug}>
                        <ProductCard product={p} priority={i < 4} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  (empty ?? <EmptyListing />)
                )}
                <Pagination page={page} totalPages={totalPages} basePath={basePath} params={params} />
              </ListingResults>
            </div>
          </div>
        </section>
      </ListingProvider>
    </>
  )
}

export function EmptyListing({ title = 'We’re curating this range', text }: { title?: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-sunset-50 text-sunset-600">
        <IconSparkles size={30} />
      </span>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="max-w-md text-ink-600">
        {text ?? 'New products are on their way. Tell us what you’re looking for and we’ll source it, or explore our bestsellers in the meantime.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <ButtonLink href="/c/beauty?sort=bestsellers" variant="dark">
          Shop bestsellers
        </ButtonLink>
        <ButtonLink href={`https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent('Hi! I’m looking for…')}`} variant="outline">
          <IconBrandWhatsapp size={18} /> Request a product
        </ButtonLink>
      </div>
    </div>
  )
}
