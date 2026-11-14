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
        // --ci = card inset: ONE spacing value shared by the image overlays (badges, wishlist, quick add)
        // and the text block, so every edge lines up (12px on phones, 14px from 640px up).
        'group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-shadow duration-300 [--ci:12px] hover:shadow-lift sm:[--ci:14px]',
        // Visible keyboard focus for the whole card (the title link stretches over it)
        'has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-sunset-600 has-[a:focus-visible]:ring-offset-2',
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
          className="object-contain p-5 transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.05] sm:p-7"
        />

        {/* Badges: top-left, on the card inset */}
        <div className="pointer-events-none absolute left-[var(--ci)] top-[var(--ci)] flex flex-col items-start gap-1">
          {off > 0 && <Badge tone="sale" size="sm">-{off}%</Badge>}
          {badge && <Badge tone={badge.tone} size="sm">{badge.label}</Badge>}
        </div>

        {/*
          Round actions use a 36px visual circle inside a 44px tap target (WCAG 2.5.8).
          The 44px button is offset by 4px so the visible circle lands exactly on the card inset.
        */}
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className="group/wish absolute right-[calc(var(--ci)-4px)] top-[calc(var(--ci)-4px)] z-10 grid size-11 place-items-center rounded-full"
        >
          <motion.span
            key={String(saved)}
            initial={{ scale: saved ? 0.6 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            className={cn(
              'grid size-9 place-items-center rounded-full bg-white/95 shadow-soft ring-1 ring-ink-900/5 backdrop-blur transition-colors',
              saved ? 'text-rose-600' : 'text-ink-700 group-hover/wish:text-rose-600',
            )}
          >
            {saved ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
          </motion.span>
        </button>

        {/* Quick add: touch = round "+" (same size and inset as the heart); desktop = full-width bar on hover */}
        {!soldOut && (
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label={multi ? `Choose options for ${product.name}` : `Add ${product.name} to bag`}
            className={cn(
              'group/qa absolute z-10 rounded-full transition-[opacity,transform] duration-300 ease-[var(--ease-out-soft)] active:scale-95',
              // touch / < 1024px: 44px target, circle sits on the inset (bottom-right)
              'bottom-[calc(var(--ci)-4px)] right-[calc(var(--ci)-4px)] grid size-11 place-items-center',
              // desktop: bar spans the image on the inset, hidden until the card is hovered or focused
              'lg:inset-x-[var(--ci)] lg:bottom-[var(--ci)] lg:block lg:h-10 lg:w-auto',
              'lg:translate-y-2 lg:opacity-0 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100 lg:group-hover:translate-y-0 lg:group-hover:opacity-100',
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center gap-2 rounded-full bg-ink-900 text-white shadow-card transition-colors duration-200 group-hover/qa:bg-sunset-600',
                'size-9 lg:h-full lg:w-full lg:px-4',
              )}
            >
              <IconPlus size={20} stroke={2.25} className="lg:hidden" aria-hidden />
              <IconShoppingBagPlus size={18} className="hidden shrink-0 lg:block" aria-hidden />
              <span className="hidden truncate text-sm font-semibold leading-none lg:inline">{multi ? 'Choose options' : 'Quick add'}</span>
            </span>
          </button>
        )}
        {soldOut && (
          <span className="absolute inset-x-[var(--ci)] bottom-[var(--ci)] rounded-full bg-white/95 py-2 text-center text-sm font-semibold text-ink-700 shadow-soft">
            Sold out
          </span>
        )}
      </div>

      {/* Text block uses the same inset, so brand/name align with the badges above */}
      <div className="flex flex-1 flex-col gap-1.5 px-[var(--ci)] pb-[var(--ci)] pt-3">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-ink-500">{product.brand}</p>
        <h3 className="line-clamp-2 min-h-[2.6em] font-sans text-[0.9375rem] font-semibold leading-[1.3] tracking-normal text-ink-900">
          {/* Stretched link: whole card is clickable; focus ring is drawn on the card (see has-[a:focus-visible]) */}
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
