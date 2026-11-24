'use client'

import { IconChevronRight, IconShoppingBagPlus } from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'

import { Price } from '@/components/ui/Price'
import { Rating } from '@/components/ui/Rating'
import { minPrice, primaryVariant, productHref, type Product } from '@/lib/catalog'
import { useShop } from '@/lib/store/shop'
import { useProductCards } from '@/lib/store/useProductCards'

/**
 * Product cards inside the chat. Loaded from the catalogue by slug, so price, stock and photo are always
 * the live ones (never the assistant's words). One size: straight into the bag; several: the quick-add sheet.
 */
export function ChatProducts({ slugs, title, onNavigate }: { slugs: string[]; title?: string; onNavigate?: () => void }) {
  const { products, loading } = useProductCards(slugs)
  if (!loading && !products.length) return null
  return (
    <div className="flex flex-col gap-2">
      {title ? <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p> : null}
      <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-none" data-lenis-prevent>
        {loading
          ? slugs.slice(0, 3).map((s) => <div key={s} className="skeleton h-[248px] w-[150px] shrink-0 rounded-xl" />)
          : products.map((p) => <ChatProductCard key={p.slug} product={p} onNavigate={onNavigate} />)}
      </div>
    </div>
  )
}

function ChatProductCard({ product, onNavigate }: { product: Product; onNavigate?: () => void }) {
  const { addToCart, setQuickAdd } = useShop()
  const imgRef = useRef<HTMLDivElement>(null)
  const v = primaryVariant(product)
  const multi = product.variants.length > 1
  const soldOut = product.variants.every((x) => x.stock <= 0)
  const href = productHref(product)
  const add = () => (multi ? setQuickAdd(product) : addToCart(product, v, { fromEl: imgRef.current }))
  return (
    <article className="flex w-[150px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
      <Link href={href} onClick={onNavigate} className="group flex flex-1 flex-col">
        <div ref={imgRef} className="relative aspect-square bg-white">
          {v?.image ? (
            <Image src={v.image} alt={`${product.brand} ${product.name}`} fill sizes="150px" className="object-contain p-3 transition-transform duration-300 group-hover:scale-105" />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-0.5 px-2.5 pt-2">
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-ink-500">{product.brand}</span>
          <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink-900">{product.name}</span>
          {product.reviewCount > 0 ? <Rating value={product.rating} count={product.reviewCount} size={11} /> : null}
          <Price price={multi ? minPrice(product) : v.price} compareAt={multi ? null : v.compareAtPrice} prefix={multi ? 'From' : undefined} size="sm" showSaving={false} className="mt-auto pt-1" />
        </div>
      </Link>
      <div className="flex gap-1.5 p-2.5 pt-2">
        <button
          type="button"
          onClick={add}
          disabled={soldOut}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-full bg-ink-900 px-2 text-xs font-semibold text-white transition-colors hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
          aria-label={soldOut ? `${product.name} is sold out` : `${multi ? 'Choose options for' : 'Add to bag:'} ${product.brand} ${product.name}`}
        >
          {soldOut ? (
            'Sold out'
          ) : (
            <>
              <IconShoppingBagPlus size={14} aria-hidden /> {multi ? 'Choose' : 'Add'}
            </>
          )}
        </button>
        <Link
          href={href}
          onClick={onNavigate}
          aria-label={`View ${product.name}`}
          className="grid size-8 place-items-center rounded-full border border-line-strong text-ink-700 transition-colors hover:border-ink-900"
        >
          <IconChevronRight size={15} aria-hidden />
        </Link>
      </div>
    </article>
  )
}
