'use client'

import { IconSearch } from '@tabler/icons-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const TYPES = [
  ['', 'All types'],
  ['beauty', 'Beauty'],
  ['fragrance', 'Fragrance'],
  ['footwear', 'Footwear'],
  ['gift', 'Gifts'],
  ['chocolate', 'Chocolates'],
  ['accessory', 'Accessories'],
  ['home', 'Home'],
] as const

/** Search + product type filter for the products list (updates the URL; the server re-queries). */
export function ProductsToolbar({ q, type, sort }: { q: string; type: string; sort: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [term, setTerm] = useState(q)

  const push = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    next.delete('page')
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`)
  }

  // Debounced search-as-you-type
  useEffect(() => {
    if (term.trim().toLowerCase() === q) return
    const t = window.setTimeout(() => push({ q: term.trim() }), 300)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term])

  return (
    <div className="tos-actions">
      <label className="tos-search">
        <IconSearch size={16} />
        <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          Search products
        </span>
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search name, brand or SKU" />
      </label>
      <select className="tos-select" value={type} onChange={(e) => push({ type: e.target.value })} aria-label="Product type">
        {TYPES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <select className="tos-select" value={sort} onChange={(e) => push({ sort: e.target.value === 'updated' ? '' : e.target.value })} aria-label="Sort products">
        <option value="updated">Recently updated</option>
        <option value="name">Name A–Z</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="stock-asc">Stock: low to high</option>
        <option value="stock-desc">Stock: high to low</option>
      </select>
    </div>
  )
}
