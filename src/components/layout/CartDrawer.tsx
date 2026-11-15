'use client'

import { IconLock, IconMinus, IconPlus, IconShoppingBag, IconTrash, IconTruckDelivery } from '@tabler/icons-react'
import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { categoryTint } from '@/components/product/ProductCard'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { InstalmentLine } from '@/components/ui/Price'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { site } from '@/config/site'
import { primaryVariant, productHref, type Product } from '@/lib/catalog'
import { formatLKR } from '@/lib/format'
import { useShop } from '@/lib/store/shop'

/**
 * Bag drawer: keeps shoppers on the page they were browsing.
 * Free-delivery progress nudges basket size; totals are shown upfront; checkout is one tap away.
 */
export function CartDrawer({ suggestions: pool = [] }: { suggestions?: Product[] }) {
  const { lines: items, itemCount, subtotal, cartOpen, setCartOpen, setQty, removeLine, addToCart, lastAdded } = useShop()
  const remaining = Math.max(0, site.freeDeliveryThreshold - subtotal)
  const inBag = new Set(items.map((i) => i.slug))
  // "Pairs well with" the product just added (TOS-204), falling back to small add-ons
  const pairs = usePairs(cartOpen ? lastAdded : null)
  const pairedWith = items.find((i) => i.slug === lastAdded)
  const pairList = pairs.filter((p) => !inBag.has(p.slug)).slice(0, 3)
  const suggestions = pairList.length ? pairList : pool.filter((p) => !inBag.has(p.slug)).slice(0, 3)
  const suggestionTitle = pairList.length && pairedWith ? `Pairs well with ${pairedWith.name}` : 'Add a little extra'

  return (
    <Drawer
      open={cartOpen}
      onClose={() => setCartOpen(false)}
      title={
        <span>
          Your bag <span className="font-sans text-base font-medium text-ink-500">({itemCount})</span>
        </span>
      }
      footer={
        items.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Subtotal</span>
              <span className="font-display text-xl font-bold tabular-nums">{formatLKR(subtotal)}</span>
            </div>
            <p className="-mt-2 text-xs text-ink-500">Delivery and discount codes are applied at checkout.</p>
            <ButtonLink href="/checkout" size="lg" block onClick={() => setCartOpen(false)}>
              <IconLock size={18} /> Secure checkout
            </ButtonLink>
            <InstalmentLine price={subtotal} className="text-center" />
            <button type="button" onClick={() => setCartOpen(false)} className="h-10 text-sm font-semibold text-ink-700 underline-offset-4 hover:underline">
              Continue shopping
            </button>
          </div>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <div className="grid size-24 place-items-center rounded-full bg-sunset-50">
            <IconShoppingBag size={44} className="text-sunset-500" stroke={1.5} />
          </div>
          <h3 className="text-xl font-bold">Your bag is feeling light</h3>
          <p className="max-w-xs text-ink-500">Discover K-beauty favourites, derm-approved skincare and gifts they’ll love.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <ButtonLink href="/c/skincare" variant="dark" onClick={() => setCartOpen(false)}>
              Shop skincare
            </ButtonLink>
            <ButtonLink href="/offers" variant="outline" onClick={() => setCartOpen(false)}>
              Today’s offers
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="border-b border-line bg-canvas px-5 py-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <IconTruckDelivery size={19} className="shrink-0 text-sunset-600" />
              {remaining > 0 ? (
                <span>
                  You’re <strong className="tabular-nums">{formatLKR(remaining)}</strong> away from <strong>free delivery</strong>
                </span>
              ) : (
                <span className="font-semibold text-success-600">You’ve unlocked free island-wide delivery 🎉</span>
              )}
            </p>
            <ProgressBar value={subtotal} max={site.freeDeliveryThreshold} label="Progress to free delivery" />
          </div>

          <ul className="divide-y divide-line px-5">
            <AnimatePresence initial={false}>
              {items.map((line) => (
                <motion.li
                  key={line.sku}
                  layout
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24, height: 0, paddingTop: 0, paddingBottom: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-3.5 py-4"
                >
                  <Link href={productHref(line)} onClick={() => setCartOpen(false)} className={`relative size-22 shrink-0 overflow-hidden rounded-md ${categoryTint[line.category] ?? 'bg-ink-50'}`}>
                    <Image src={line.image} alt={`${line.brand} ${line.name}`} fill sizes="88px" className="object-contain p-1.5 mix-blend-multiply" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-ink-500">{line.brand}</p>
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{line.name}</p>
                    {line.multi && <p className="text-xs text-ink-500">{line.option}: {line.label}</p>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex h-9 items-center rounded-full border border-line-strong">
                        <button type="button" aria-label={`Decrease quantity of ${line.name}`} onClick={() => setQty(line.sku, line.qty - 1)} className="grid size-9 place-items-center rounded-full hover:bg-ink-50">
                          <IconMinus size={15} />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">{line.qty}</span>
                        <button type="button" aria-label={`Increase quantity of ${line.name}`} onClick={() => setQty(line.sku, Math.min(line.stock, line.qty + 1))} disabled={line.qty >= line.stock} className="grid size-9 place-items-center rounded-full hover:bg-ink-50 disabled:opacity-40">
                          <IconPlus size={15} />
                        </button>
                      </div>
                      <span className="font-display font-bold tabular-nums">{formatLKR(line.price * line.qty)}</span>
                    </div>
                  </div>
                  <button type="button" aria-label={`Remove ${line.name}`} onClick={() => removeLine(line.sku)} className="-mr-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-danger-50 hover:text-danger-600">
                    <IconTrash size={18} />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {suggestions.length > 0 && (
            <div className="border-t border-line bg-canvas px-5 py-4">
              <p className="mb-3 text-sm font-bold">{suggestionTitle}</p>
              <ul className="flex flex-col gap-2.5">
                {suggestions.map((p) => {
                  const v = primaryVariant(p)
                  return (
                    <li key={p.slug} className="flex items-center gap-3 rounded-md bg-surface p-2 shadow-xs">
                      <span className={`relative size-12 shrink-0 overflow-hidden rounded ${categoryTint[p.category]}`}>
                        <Image src={v.image} alt="" fill sizes="48px" className="object-contain p-1 mix-blend-multiply" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-semibold">{p.brand} {p.name}</span>
                        <span className="text-sm text-ink-600 tabular-nums">{formatLKR(v.price)}</span>
                      </span>
                      <Button size="sm" variant="outline" onClick={() => addToCart(p, v)} aria-label={`Add ${p.name} to bag`}>
                        <IconPlus size={16} /> Add
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}

/** Cross-sells for one product, fetched once per slug while the bag is open. */
function usePairs(slug: string | null) {
  const [state, setState] = useState<{ slug: string; products: Product[] } | null>(null)
  useEffect(() => {
    if (!slug || state?.slug === slug) return
    const ctrl = new AbortController()
    fetch(`/api/products/pairs?slug=${encodeURIComponent(slug)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((res: { products: Product[] }) => setState({ slug, products: res.products }))
      .catch(() => {})
    return () => ctrl.abort()
  }, [slug, state?.slug])
  return slug && state?.slug === slug ? state.products : []
}
