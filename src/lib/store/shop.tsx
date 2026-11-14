'use client'

/**
 * Client shop state for Sprint 0: bag (cart), wishlist and UI panels.
 * Persisted to localStorage (wrapped in try/catch so private mode still works).
 * Sprint 4 moves the cart to a server-side Payload `carts` collection; this API stays the same.
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

import { getProduct, type Product, type Variant } from '@/lib/catalog'

export type CartLine = { slug: string; sku: string; qty: number }

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

const CART_KEY = 'tos.cart.v1'
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

export function resolveLine(line: CartLine) {
  const product = getProduct(line.slug)
  const variant = product?.variants.find((v) => v.sku === line.sku)
  return product && variant ? { product, variant, qty: line.qty } : null
}

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
    setLines(readJSON<CartLine[]>(CART_KEY, []))
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
          return prev.map((l) => (l.sku === variant.sku ? { ...l, qty: Math.min(l.qty + qty, variant.stock) } : l))
        }
        return [...prev, { slug: product.slug, sku: variant.sku, qty }]
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
    const resolved = lines.map(resolveLine).filter(Boolean) as NonNullable<ReturnType<typeof resolveLine>>[]
    return {
      lines,
      itemCount: resolved.reduce((n, l) => n + l.qty, 0),
      subtotal: resolved.reduce((n, l) => n + l.qty * l.variant.price, 0),
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
