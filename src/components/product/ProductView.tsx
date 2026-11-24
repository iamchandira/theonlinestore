'use client'

import {
  IconCash,
  IconHeart,
  IconHeartFilled,
  IconMinus,
  IconPlus,
  IconRosetteDiscountCheck,
  IconShoppingBagPlus,
  IconTruckDelivery,
  IconRefresh,
} from '@tabler/icons-react'
import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { AskAboutProduct } from '@/components/assistant/AskAboutProduct'
import { Badge, badgeLabel } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InstalmentLine } from '@/components/ui/InstalmentLine'
import { Price } from '@/components/ui/Price'
import { Rating } from '@/components/ui/Rating'
import { useStoreSettings } from '@/lib/store/StoreSettingsProvider'
import { brandHref, type ProductDetail } from '@/lib/catalog'
import { formatLKR } from '@/lib/format'
import { useShop } from '@/lib/store/shop'
import { cn } from '@/lib/utils/cn'

import { categoryTint } from './ProductCard'
import { ProductGallery, type GalleryImage } from './ProductGallery'
import { VariantSelector } from './VariantSelector'

type Props = { product: ProductDetail; details?: ReactNode }

/**
 * Product page body (TOS-106): gallery + purchase panel sharing the selected variant.
 * The variant is kept in the URL (?variant=SKU) so a shared link opens the same shade or size.
 */
export function ProductView({ product, details }: Props) {
  const store = useStoreSettings()
  const otherPayments = store.paymentMethods.filter((m) => m !== 'Cash on delivery')
  const { addToCart, toggleWishlist, isWishlisted, rememberViewed } = useShop()
  // Recently viewed (TOS-205)
  useEffect(() => rememberViewed(product.slug), [product.slug, rememberViewed])
  const firstInStock = product.variants.find((v) => v.stock > 0) ?? product.variants[0]
  const [sku, setSku] = useState(firstInStock.sku)
  const [qty, setQty] = useState(1)
  const [stickyVisible, setStickyVisible] = useState(false)
  const ctaRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  const variant = product.variants.find((v) => v.sku === sku) ?? firstInStock
  const multi = product.variants.length > 1
  const soldOut = variant.stock <= 0
  const lowStock = !soldOut && variant.stock <= 5
  const saved = isWishlisted(product.slug)
  const badge = product.badge ? badgeLabel[product.badge] : null
  const saving = variant.compareAtPrice && variant.compareAtPrice > variant.price ? variant.compareAtPrice - variant.price : 0

  // Gallery: one photo per variant (deduplicated), then extra gallery photos
  const images = useMemo<GalleryImage[]>(() => {
    const seen = new Set<string>()
    const list: GalleryImage[] = []
    for (const v of product.variants) {
      if (!v.image || seen.has(v.image)) continue
      seen.add(v.image)
      list.push({ src: v.image, large: v.imageLarge || v.image, alt: `${product.brand} ${product.name}${multi ? ` (${v.option2 ?? v.label})` : ''}` })
    }
    for (const g of product.gallery) list.push({ src: g.image, large: g.imageLarge, alt: g.alt || `${product.brand} ${product.name}` })
    return list
  }, [product, multi])
  const activeImage = Math.max(0, images.findIndex((i) => i.src === variant.image))

  // Read ?variant= on load (kept client-side so the page itself stays statically rendered)
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('variant')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fromUrl && product.variants.some((v) => v.sku === fromUrl)) setSku(fromUrl)
  }, [product.variants])

  const choose = (next: string) => {
    setSku(next)
    setQty(1)
    const url = new URL(window.location.href)
    url.searchParams.set('variant', next)
    window.history.replaceState(window.history.state, '', url)
  }

  // Sticky add-to-bag bar (phones/tablets): shown once the main button has scrolled above the viewport.
  // A rAF-throttled scroll check, not IntersectionObserver: IO only fires on crossings, so a fast fling or
  // jump that carries the button straight from below the screen to above it would never show the bar.
  useEffect(() => {
    const el = ctaRef.current
    if (!el) return
    let frame = 0
    const check = () => {
      frame = 0
      setStickyVisible(el.getBoundingClientRect().bottom < 0)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  useEffect(() => {
    // Lets other fixed UI (WhatsApp button) move out of the bar's way, via CSS only
    document.body.toggleAttribute('data-sticky-cta', stickyVisible)
    return () => document.body.removeAttribute('data-sticky-cta')
  }, [stickyVisible])

  const add = (fromEl?: HTMLElement | null) => {
    if (soldOut) return
    addToCart(product, variant, { qty, fromEl: fromEl ?? galleryRef.current })
  }

  return (
    <>
      <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        <div ref={galleryRef} className="lg:sticky lg:top-36 lg:self-start">
          <ProductGallery images={images} activeIndex={activeImage} tint={categoryTint[product.category] ?? ''} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
              {saving > 0 && <Badge tone="sale">Save {formatLKR(saving)}</Badge>}
            </div>
            <Link href={brandHref(product.brandSlug)} className="w-fit text-sm font-bold uppercase tracking-[0.1em] text-ink-500 hover:text-sunset-600">
              {product.brand}
            </Link>
            <h1 className="text-[1.75rem] font-bold leading-tight md:text-[2.25rem]">{product.name}</h1>
            {product.reviewCount > 0 ? (
              <a href="#reviews" className="flex w-fit items-center gap-2 text-sm text-ink-600 hover:text-ink-900">
                <Rating value={product.rating} size={16} />
                <span className="underline underline-offset-4">
                  {product.rating.toFixed(1)} · {product.reviewCount} review{product.reviewCount === 1 ? '' : 's'}
                </span>
              </a>
            ) : (
              <a href="#reviews" className="w-fit text-sm text-ink-600 underline underline-offset-4 hover:text-ink-900">
                Be the first to review
              </a>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Price price={variant.price} compareAt={variant.compareAtPrice} size="lg" />
            <InstalmentLine price={variant.price} className="text-sm" />
            {product.priceTBC && (
              <p className="text-xs text-ink-500">Prices are being confirmed by our team and may change.</p>
            )}
          </div>

          {product.shortDescription && <p className="text-ink-700">{product.shortDescription}</p>}

          {(product.recipientLabels.length > 0 || product.occasionLabels.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-sm font-semibold">Perfect for</span>
              {product.recipientLabels.map((r) => (
                <Link key={r.slug} href={`/gifts?recipient=${r.slug}`} className="inline-flex h-8 items-center rounded-full bg-tint-gifts px-3 text-sm font-medium text-ink-800 hover:bg-sunset-100">
                  {r.name}
                </Link>
              ))}
              {product.occasionLabels.slice(0, 4).map((o) => (
                <Link key={o.slug} href={`/gifts?occasion=${o.slug}`} className="inline-flex h-8 items-center rounded-full border border-line-strong px-3 text-sm font-medium hover:border-ink-900">
                  {o.name}
                </Link>
              ))}
            </div>
          )}

          <VariantSelector variants={product.variants} selected={variant} onSelect={(v) => choose(v.sku)} />

          {/* Stock status */}
          <p
            className={cn(
              'flex items-center gap-2 text-sm font-semibold',
              soldOut ? 'text-danger-600' : lowStock ? 'text-warning-600' : 'text-success-600',
            )}
            aria-live="polite"
          >
            <span className={cn('size-2 rounded-full', soldOut ? 'bg-danger-600' : lowStock ? 'bg-warning-600' : 'bg-success-600')} />
            {soldOut ? 'Out of stock' : lowStock ? `Only ${variant.stock} left` : 'In stock, ready to ship'}
          </p>

          {/* Quantity + add to bag + wishlist */}
          <div ref={ctaRef} className="flex flex-wrap items-center gap-3">
            <div className="flex h-13 items-center rounded-full border border-line-strong">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || soldOut} aria-label="Decrease quantity" className="grid size-13 place-items-center rounded-full hover:bg-ink-50 disabled:opacity-40">
                <IconMinus size={18} />
              </button>
              <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite" aria-label={`Quantity ${qty}`}>
                {qty}
              </span>
              <button type="button" onClick={() => setQty((q) => Math.min(variant.stock, q + 1))} disabled={qty >= variant.stock || soldOut} aria-label="Increase quantity" className="grid size-13 place-items-center rounded-full hover:bg-ink-50 disabled:opacity-40">
                <IconPlus size={18} />
              </button>
            </div>
            <Button size="lg" className="min-w-48 flex-1" onClick={() => add()} disabled={soldOut}>
              <IconShoppingBagPlus size={20} /> {soldOut ? 'Sold out' : 'Add to bag'}
            </Button>
            <button
              type="button"
              onClick={() => toggleWishlist(product)}
              aria-pressed={saved}
              aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
              className="grid size-13 place-items-center rounded-full border border-line-strong transition-colors hover:border-rose-600 hover:text-rose-600"
            >
              {saved ? <IconHeartFilled size={22} className="text-rose-600" /> : <IconHeart size={22} />}
            </button>
          </div>

          <AskAboutProduct slug={product.slug} name={`${product.brand} ${product.name}`.trim()} />

          {/* Reassurance */}
          <ul className="grid gap-2.5 rounded-xl border border-line bg-surface p-4 text-sm sm:grid-cols-2">
            <li className="flex items-start gap-2.5">
              <IconTruckDelivery size={20} className="mt-0.5 shrink-0 text-sunset-600" />
              <span>
                <strong className="font-semibold">Island-wide delivery</strong>
                <span className="block text-ink-500">
                  {store.deliveryEstimate}
                  {store.freeDeliveryThreshold != null ? `, free over ${formatLKR(store.freeDeliveryThreshold)}` : ''}
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <IconCash size={20} className="mt-0.5 shrink-0 text-sunset-600" />
              <span>
                <strong className="font-semibold">{store.paymentMethods.includes('Cash on delivery') ? 'Cash on delivery' : 'Easy payment'}</strong>
                {otherPayments.length > 0 && <span className="block text-ink-500">{store.paymentMethods.includes('Cash on delivery') ? 'Or ' : ''}{otherPayments.join(', ').toLowerCase().replace(/^\w/, (x) => x.toUpperCase())}</span>}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <IconRosetteDiscountCheck size={20} className="mt-0.5 shrink-0 text-sunset-600" />
              <span>
                <strong className="font-semibold">100% genuine</strong>
                <span className="block text-ink-500">From authorised suppliers</span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <IconRefresh size={20} className="mt-0.5 shrink-0 text-sunset-600" />
              <span>
                <strong className="font-semibold">Easy returns</strong>
                <span className="block text-ink-500">Unopened items within 7 days</span>
              </span>
            </li>
          </ul>

          <div id="details">{details}</div>
        </div>
      </div>

      {/* Sticky add-to-bag (phones/tablets). Fixed + transform only: never shifts the page layout. */}
      <AnimatePresence>
        {stickyVisible && (
          <motion.div
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[54] border-t border-line bg-surface/95 px-4 py-2.5 shadow-drawer backdrop-blur-xl md:bottom-0 md:pb-[max(0.625rem,env(safe-area-inset-bottom))] lg:hidden"
          >
            <div className="mx-auto flex max-w-xl items-center gap-3">
              <span className="relative size-11 shrink-0 overflow-hidden rounded-md border border-line bg-white">
                <Image src={variant.image} alt="" fill sizes="44px" className="object-contain p-0.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{product.name}</span>
                <span className="block truncate text-sm font-bold tabular-nums">
                  {formatLKR(variant.price)}
                  {multi && <span className="ml-1.5 font-normal text-ink-500">· {[variant.option2, variant.label].filter(Boolean).join(' · ')}</span>}
                </span>
              </span>
              <Button size="md" onClick={(e) => add(e.currentTarget)} disabled={soldOut} className="shrink-0">
                <IconShoppingBagPlus size={18} /> {soldOut ? 'Sold out' : 'Add'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
