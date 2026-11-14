'use client'

import { IconHeart, IconHeartFilled, IconPlus, IconShoppingBagPlus } from '@tabler/icons-react'
import { motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'

import { Badge, badgeLabel } from '@/components/ui/Badge'
import { InstalmentLine, Price } from '@/components/ui/Price'
import { Rating } from '@/components/ui/Rating'
import { minPrice, primaryVariant, productHref, type Product } from '@/lib/catalog'
import { percentOff, pluralize } from '@/lib/format'
import { useShop } from '@/lib/store/shop'
import { cn } from '@/lib/utils/cn'

export const categoryTint: Record<string, string> = {
  skincare: 'bg-tint-skincare',
  'hair-care': 'bg-tint-hair',
  'body-care': 'bg-tint-body',
  lips: 'bg-tint-lips',
  fragrances: 'bg-tint-fragrance',
  footwear: 'bg-tint-footwear',
  gifts: 'bg-tint-gifts',
  chocolates: 'bg-tint-chocolate',
}

const optionNoun: Record<string, string> = { Size: 'size', Shade: 'shade', Scent: 'scent', Flavour: 'flavour', Pack: 'pack', Set: 'set' }

type ProductCardProps = {
  product: Product
  /** Prioritise image loading (first row above the fold). */
  priority?: boolean
  className?: string
}

/**
 * Product card UX: brand → 2-line name → rating → price (+ was / % off) → BNPL line.
 * Quick add stays on the page (single variant adds directly, multi-variant opens a picker).
 * Wishlist and quick-add are 44px targets; the whole card is one link (keyboard: Tab to card, then to actions).
 */
export function ProductCard({ product, priority, className }: ProductCardProps) {
  const { addToCart, setQuickAdd, toggleWishlist, isWishlisted } = useShop()
  const imgRef = useRef<HTMLDivElement>(null)
  const v = primaryVariant(product)
  const multi = product.variants.length > 1
  const from = minPrice(product)
  const off = percentOff(v.price, v.compareAtPrice)
  const saved = isWishlisted(product.slug)
  const badge = product.badge ? badgeLabel[product.badge] : null
  const soldOut = product.variants.every((x) => x.stock <= 0)
  const lowStock = !soldOut && product.variants.reduce((n, x) => n + x.stock, 0) <= 8

  const onQuickAdd = () => {
    if (multi) setQuickAdd(product)
    else addToCart(product, v, { fromEl: imgRef.current })
  }

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-shadow duration-300 hover:shadow-lift',
        className,
      )}
    >
      <div ref={imgRef} className="relative aspect-[4/5] overflow-hidden bg-white">
        <Image
          src={v.image}
          alt={`${product.brand} ${product.name}`}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 260px, (min-width: 768px) 30vw, 48vw"
          className="object-contain p-4 transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.06] sm:p-7"
        />
        {/* top-left badges */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {off > 0 && <Badge tone="sale" size="sm">-{off}%</Badge>}
          {badge && <Badge tone={badge.tone} size="sm">{badge.label}</Badge>}
        </div>
        {/* wishlist */}
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className="absolute right-1.5 top-1.5 z-10 grid size-11 place-items-center rounded-full text-ink-700 transition-colors hover:text-rose-600"
        >
          <motion.span
            key={String(saved)}
            initial={{ scale: saved ? 0.6 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            className="grid size-9 place-items-center rounded-full bg-white/90 shadow-soft backdrop-blur"
          >
            {saved ? <IconHeartFilled size={19} className="text-rose-600" /> : <IconHeart size={19} />}
          </motion.span>
        </button>
        {/* quick add: always visible on touch, slides up on desktop hover */}
        {!soldOut && (
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label={multi ? `Choose options for ${product.name}` : `Add ${product.name} to bag`}
            className={cn(
              'absolute bottom-2.5 right-2.5 z-10 grid size-11 place-items-center rounded-full bg-ink-900 text-white shadow-card transition-all duration-300',
              'hover:bg-sunset-600 active:scale-95',
              'lg:bottom-3 lg:left-3 lg:right-3 lg:flex lg:h-11 lg:w-auto lg:translate-y-3 lg:gap-2 lg:text-sm lg:font-semibold lg:opacity-0 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100 lg:group-hover:translate-y-0 lg:group-hover:opacity-100',
            )}
          >
            <IconShoppingBagPlus size={20} className="hidden lg:block" />
            <IconPlus size={22} className="lg:hidden" />
            <span className="hidden lg:inline">{multi ? 'Choose options' : 'Quick add'}</span>
          </button>
        )}
        {soldOut && (
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-white/90 py-2 text-center text-sm font-semibold text-ink-700">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-ink-500">{product.brand}</p>
        <h3 className="line-clamp-2 min-h-[2.6em] font-sans text-[0.9375rem] font-semibold leading-[1.3] tracking-normal text-ink-900">
          <Link href={productHref(product)} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <Rating value={product.rating} count={product.reviewCount} size={13} />
        <div className="mt-auto pt-1.5">
          <Price price={multi ? from : v.price} compareAt={multi ? null : v.compareAtPrice} prefix={multi ? 'From' : undefined} size="sm" showSaving={false} />
          <div className="mt-1 flex items-center justify-between gap-2">
            {multi ? (
              <p className="text-xs font-medium text-ink-600">{pluralize(product.variants.length, optionNoun[v.option] ?? 'option')}</p>
            ) : lowStock ? (
              <p className="text-xs font-semibold text-warning-600">Only a few left</p>
            ) : (
              <InstalmentLine price={v.price} compact className="truncate" />
            )}
          </div>
        </div>
      </div>
    </motion.article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface" aria-hidden>
      <div className="skeleton aspect-[4/5]" />
      <div className="flex flex-col gap-2 p-4">
        <div className="skeleton h-3 w-16 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton mt-2 h-5 w-24 rounded" />
      </div>
    </div>
  )
}
