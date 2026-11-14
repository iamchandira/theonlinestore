'use client'

import { IconMinus, IconPlus, IconShoppingBagPlus, IconTruckDelivery } from '@tabler/icons-react'
import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { InstalmentLine, Price } from '@/components/ui/Price'
import { Rating } from '@/components/ui/Rating'
import { site } from '@/config/site'
import { productHref, type Product } from '@/lib/catalog'
import { useShop } from '@/lib/store/shop'
import { cn } from '@/lib/utils/cn'

import { categoryTint } from './ProductCard'
import { VariantSelector } from './VariantSelector'

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDesktop(mq.matches)
    const on = () => setDesktop(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return desktop
}

/** Variant picker shown from "Choose options": bottom sheet on mobile, side drawer on desktop. */
export function QuickAddSheet() {
  const { quickAdd, setQuickAdd, addToCart } = useShop()
  const desktop = useIsDesktop()
  return (
    <Drawer
      open={Boolean(quickAdd)}
      onClose={() => setQuickAdd(null)}
      side={desktop ? 'right' : 'bottom'}
      title="Choose your option"
    >
      {quickAdd && (
        <QuickAddBody
          key={quickAdd.slug}
          product={quickAdd}
          onAdd={(variant, qty, el) => {
            addToCart(quickAdd, variant, { qty, fromEl: el })
            setQuickAdd(null)
          }}
        />
      )}
    </Drawer>
  )
}

function QuickAddBody({
  product,
  onAdd,
}: {
  product: Product
  onAdd: (v: Product['variants'][number], qty: number, el: HTMLElement | null) => void
}) {
  const [selected, setSelected] = useState(product.variants.find((v) => v.stock > 0) ?? product.variants[0])
  const [qty, setQty] = useState(1)
  const imgRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex gap-4">
        <div ref={imgRef} className={cn('relative size-28 shrink-0 overflow-hidden rounded-md', categoryTint[product.category])}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={selected.sku} className="absolute inset-0" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <Image src={selected.image} alt="" fill sizes="112px" className="object-contain p-2 mix-blend-multiply" />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-500">{product.brand}</p>
          <p className="font-semibold leading-snug">{product.name}</p>
          <Rating value={product.rating} count={product.reviewCount} />
          <Price price={selected.price} compareAt={selected.compareAtPrice} />
        </div>
      </div>

      <VariantSelector variants={product.variants} selected={selected} onSelect={setSelected} />

      <div className="flex items-center gap-3">
        <div className="flex h-12 items-center rounded-full border border-line-strong">
          <button type="button" className="grid size-12 place-items-center rounded-full hover:bg-ink-50 disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">
            <IconMinus size={18} />
          </button>
          <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite" aria-label={`Quantity ${qty}`}>
            {qty}
          </span>
          <button type="button" className="grid size-12 place-items-center rounded-full hover:bg-ink-50 disabled:opacity-40" onClick={() => setQty((q) => Math.min(selected.stock, q + 1))} disabled={qty >= selected.stock} aria-label="Increase quantity">
            <IconPlus size={18} />
          </button>
        </div>
        <Button size="lg" className="flex-1" onClick={() => onAdd(selected, qty, imgRef.current)}>
          <IconShoppingBagPlus size={20} /> Add to bag
        </Button>
      </div>
      <InstalmentLine price={selected.price * qty} />
      <p className="flex items-center gap-2 rounded-md bg-success-50 px-3 py-2.5 text-sm text-success-600">
        <IconTruckDelivery size={18} /> Island-wide delivery in {site.deliveryEstimate}
      </p>
      <Link href={productHref(product)} className="text-center text-sm font-semibold text-ink-700 underline underline-offset-4 hover:text-sunset-600">
        View full product details
      </Link>
    </div>
  )
}
