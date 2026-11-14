'use client'

/**
 * Client shop state: bag (cart), wishlist and UI panels.
 * Persisted to localStorage (wrapped in try/catch so private mode still works).
 * Each bag line stores a snapshot of what the shopper saw (name, photo, price), so the browser never
 * needs the whole catalogue. Prices are re-checked on the server at checkout (Sprint 4), when the cart
 * moves to a server-side Payload `carts` collection; this API stays the same.
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { toast } from 'sonner'

import type { Product, Variant } from '@/lib/catalog'

export type CartLine = {
  slug: string
  sku: string
  qty: number
  name: string
  brand: string
  category: string
  image: string
  option: string
  label: string
  /** True when the product has more than one variant (shows "Size: 100 ml" in the bag) */
  multi: boolean
  price: number
  compareAtPrice: number | null
  stock: number
}

type Flight = { id: number; src: string; from: DOMRect; to: DOMRect }

type ShopState = {
  lines: CartLine[]
  itemCount: number
  subtotal: number
  addToCart: (product: Product, variant: Variant, opts?: { qty?: number; fromEl?: HTMLElement | null }) => void
  setQty: (sku: string, qty: number) => void
  removeLine: (sku: string) => void
  wishlist: string[]
  toggleWishlist: (product: Product) => void
  isWishlisted: (slug: string) => boolean
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  quickAdd: Product | null
  setQuickAdd: (p: Product | null) => void
  cartIconRef: RefObject<HTMLElement | null>
  /** Increments on every add, used to "bump" the cart badge. */
  addPulse: number
  /** Polite live-region message for screen readers. */
  announcement: string
}

const ShopContext = createContext<ShopState | null>(null)

const CART_KEY = 'tos.cart.v2' // v2 = snapshot lines (v1 Sprint 0 bags are ignored)
const WISH_KEY = 'tos.wishlist.v1'

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable (private mode): state still works in memory */
  }
}

const isLine = (l: unknown): l is CartLine =>
  Boolean(l && typeof l === 'object' && 'sku' in l && 'price' in l && 'name' in l && Number((l as CartLine).qty) > 0)

export function ShopProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [quickAdd, setQuickAdd] = useState<Product | null>(null)
  const [addPulse, setAddPulse] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [flights, setFlights] = useState<Flight[]>([])
  const cartIconRef = useRef<HTMLElement | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    // Hydrate persisted state after mount (avoids SSR mismatch)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(readJSON<unknown[]>(CART_KEY, []).filter(isLine))
    setWishlist(readJSON<string[]>(WISH_KEY, []))
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (hydrated) writeJSON(CART_KEY, lines)
  }, [lines, hydrated])
  useEffect(() => {
    if (hydrated) writeJSON(WISH_KEY, wishlist)
  }, [wishlist, hydrated])

  const launchFlight = useCallback(
    (src: string, fromEl?: HTMLElement | null) => {
      const target = cartIconRef.current
      if (reduceMotion || !fromEl || !target) return
      const from = fromEl.getBoundingClientRect()
      const to = target.getBoundingClientRect()
      if (to.width === 0) return // cart icon hidden at this breakpoint
      const id = Date.now() + Math.random()
      setFlights((f) => [...f, { id, src, from, to }])
    },
    [reduceMotion],
  )

  const addToCart: ShopState['addToCart'] = useCallback(
    (product, variant, opts) => {
      const qty = opts?.qty ?? 1
      setLines((prev) => {
        const existing = prev.find((l) => l.sku === variant.sku)
        if (existing) {
          return prev.map((l) =>
            l.sku === variant.sku ? { ...l, qty: Math.min(l.qty + qty, variant.stock), price: variant.price, stock: variant.stock } : l,
          )
        }
        return [
          ...prev,
          {
            slug: product.slug,
            sku: variant.sku,
            qty: Math.min(qty, variant.stock),
            name: product.name,
            brand: product.brand,
            category: product.category,
            image: variant.image,
            option: variant.option,
            label: variant.label,
            multi: product.variants.length > 1,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            stock: variant.stock,
          },
        ]
      })
      setAddPulse((n) => n + 1)
      launchFlight(variant.image, opts?.fromEl)
      const label = product.variants.length > 1 ? ` (${variant.label})` : ''
      setAnnouncement(`${product.brand} ${product.name}${label} added to your bag`)
      toast.success('Added to your bag', {
        description: `${product.brand} ${product.name}${label}`,
        action: { label: 'View bag', onClick: () => setCartOpen(true) },
      })
    },
    [launchFlight],
  )

  const setQty = useCallback((sku: string, qty: number) => {
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.sku !== sku) : prev.map((l) => (l.sku === sku ? { ...l, qty } : l))))
  }, [])

  const removeLine = useCallback((sku: string) => {
    setLines((prev) => prev.filter((l) => l.sku !== sku))
    setAnnouncement('Item removed from your bag')
  }, [])

  const toggleWishlist = useCallback((product: Product) => {
    setWishlist((prev) => {
      const has = prev.includes(product.slug)
      setAnnouncement(has ? 'Removed from wishlist' : 'Saved to wishlist')
      if (!has) toast('Saved to your wishlist', { description: `${product.brand} ${product.name}` })
      return has ? prev.filter((s) => s !== product.slug) : [...prev, product.slug]
    })
  }, [])

  const value = useMemo<ShopState>(() => {
    return {
      lines,
      itemCount: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.qty * l.price, 0),
      addToCart,
      setQty,
      removeLine,
      wishlist,
      toggleWishlist,
      isWishlisted: (slug) => wishlist.includes(slug),
      cartOpen,
      setCartOpen,
      quickAdd,
      setQuickAdd,
      cartIconRef,
      addPulse,
      announcement,
    }
  }, [lines, wishlist, cartOpen, quickAdd, addPulse, announcement, addToCart, setQty, removeLine, toggleWishlist])

  return (
    <ShopContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
      {/* Fly-to-bag: product thumbnail arcs into the cart icon */}
      <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden>
        <AnimatePresence>
          {flights.map((f) => (
            <motion.img
              key={f.id}
              src={f.src}
              alt=""
              className="absolute rounded-xl bg-white object-contain shadow-lift"
              style={{ left: 0, top: 0, width: 72, height: 72 }}
              initial={{
                x: f.from.left + f.from.width / 2 - 36,
                y: f.from.top + f.from.height / 2 - 36,
                scale: 1,
                opacity: 1,
              }}
              animate={{
                x: [
                  f.from.left + f.from.width / 2 - 36,
                  f.from.left + f.from.width / 2 - 36 + (f.to.left - f.from.left) * 0.35,
                  f.to.left + f.to.width / 2 - 36,
                ],
                y: [f.from.top + f.from.height / 2 - 36, f.from.top - 80, f.to.top + f.to.height / 2 - 36],
                scale: [1, 0.8, 0.25],
                opacity: [1, 1, 0.6],
              }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], times: [0, 0.4, 1] }}
              onAnimationComplete={() => setFlights((all) => all.filter((x) => x.id !== f.id))}
            />
          ))}
        </AnimatePresence>
      </div>
    </ShopContext.Provider>
  )
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>')
  return ctx
}
