import { IconBrandWhatsapp, IconSparkles, IconX } from '@tabler/icons-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { ProductCard } from '@/components/product/ProductCard'
import { ButtonLink } from '@/components/ui/Button'
import { SmileUnderline } from '@/components/ui/SectionHeader'
import { site } from '@/config/site'
import type { Crumb, ListResult, SortKey } from '@/lib/catalog'
import { cn } from '@/lib/utils/cn'

import { Breadcrumbs } from './Breadcrumbs'
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
}

/**
 * Shared product listing layout (category, brand, offers, search):
 * breadcrumbs → title + count → sub-category chips → active filters + sort → 2/3/4-column grid → pagination.
 * Filters with counts and the mobile filter sheet arrive in Sprint 2 (TOS-202).
 */
export function ListingPage({ title, eyebrow, description, breadcrumbs, tint = 'sky', chips, filters, result, sort, basePath, params, empty }: Props) {
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

      <section className="container-site py-6 md:py-8" aria-label={`${title} products`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-ink-600" aria-live="polite">
              {total ? (
                <>
                  Showing <strong className="font-semibold text-ink-900">{from}–{to}</strong> of <strong className="font-semibold text-ink-900">{total}</strong> products
                </>
              ) : (
                'No products yet'
              )}
            </p>
            {filters?.map((f) => (
              <Link
                key={f.label}
                href={f.removeHref}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-sunset-50 pl-3 pr-2 text-sm font-medium text-sunset-800 hover:bg-sunset-100"
                aria-label={`Remove filter: ${f.label}`}
              >
                {f.label} <IconX size={14} aria-hidden />
              </Link>
            ))}
          </div>
          {total > 1 && <SortSelect value={sort} />}
        </div>

        {products.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
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
      </section>
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
