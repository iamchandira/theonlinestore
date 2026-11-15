'use client'

import { useEffect, useState } from 'react'

import type { Product } from '@/lib/catalog'

/**
 * Loads product cards for a list of slugs (wishlist, recently viewed) from /api/products/cards,
 * keeping the given order. Unpublished or deleted products simply drop out.
 */
export function useProductCards(slugs: string[], enabled = true) {
  const key = slugs.join(',')
  const [state, setState] = useState<{ key: string; products: Product[] } | null>(null)
  useEffect(() => {
    if (!enabled || !key) return
    const ctrl = new AbortController()
    fetch(`/api/products/cards?slugs=${encodeURIComponent(key)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((res: { products: Product[] }) => setState({ key, products: res.products }))
      .catch(() => {})
    return () => ctrl.abort()
  }, [key, enabled])
  const ready = !key || state?.key === key
  return { products: key && state?.key === key ? state.products : [], loading: enabled && !ready }
}
