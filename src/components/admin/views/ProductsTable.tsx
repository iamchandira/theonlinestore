'use client'

import { IconExternalLink } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export type Row = {
  id: number
  name: string
  slug: string
  brand: string
  category: string
  type: string
  status: 'draft' | 'published'
  image: string | null
  variants: number
  stock: number
  lowStock: boolean
  minPrice: number | null
  maxPrice: number | null
  onSale: boolean
  priceTBC: boolean
  isDemo: boolean
  updatedAt: string
}

const TYPE: Record<string, string> = { beauty: 'Beauty', fragrance: 'Fragrance', footwear: 'Footwear', gift: 'Gift', chocolate: 'Chocolate', accessory: 'Accessory', home: 'Home' }
const lkr = (n: number) => `Rs ${n.toLocaleString('en-LK')}`
const ago = (iso: string) => {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000)
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`
}

/** Selectable products table with bulk actions (publish, draft, confirm prices, delete). */
export function ProductsTable({ rows, sort, sortLinks }: { rows: Row[]; sort: string; sortLinks: Record<string, string> }) {
  const router = useRouter()
  const [selected, setSelected] = useState<number[]>([])
  const [pending, start] = useTransition()
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null)
  const all = rows.length > 0 && selected.length === rows.length

  const flash = (text: string, error?: boolean) => {
    setToast({ text, error })
    window.setTimeout(() => setToast(null), 2600)
  }

  const bulk = async (label: string, method: 'PATCH' | 'DELETE', data?: Record<string, unknown>) => {
    if (method === 'DELETE' && !window.confirm(`Delete ${selected.length} product(s)? This can’t be undone.`)) return
    const params = new URLSearchParams()
    selected.forEach((id, i) => params.set(`where[id][in][${i}]`, String(id)))
    if (data && '_status' in data) params.set('draft', data._status === 'draft' ? 'true' : 'false')
    const res = await fetch(`/api/products?${params}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    })
    const json = (await res.json().catch(() => ({}))) as { errors?: { message: string }[]; docs?: unknown[] }
    if (!res.ok || json.errors?.length) return flash(json.errors?.[0]?.message ?? 'Something went wrong', true)
    flash(`${label}: ${json.docs?.length ?? selected.length} product(s)`)
    setSelected([])
    start(() => router.refresh())
  }

  // These sort keys are shared with the server (ProductsList)
  const th = (label: string, asc: string, desc: string, cls = '') => (
    <th className={cls} aria-sort={sort === asc ? 'ascending' : sort === desc ? 'descending' : undefined}>
      <Link href={sortLinks[sort === asc ? desc : asc] ?? '#'}>
        {label} {sort === asc ? '↑' : sort === desc ? '↓' : ''}
      </Link>
    </th>
  )

  if (!rows.length) return <div className="tos-empty">No products match these filters.</div>

  return (
    <>
      <div className="tos-table-wrap" style={{ opacity: pending ? 0.6 : 1, transition: 'opacity .15s' }}>
        <table className="tos-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={all} onChange={() => setSelected(all ? [] : rows.map((r) => r.id))} aria-label="Select all products on this page" />
              </th>
              {th('Product', 'name', 'name')}
              <th>Type</th>
              <th>Status</th>
              {th('Inventory', 'stock-asc', 'stock-desc')}
              {th('Price', 'price-asc', 'price-desc', 'num')}
              <th className="num">Updated</th>
              <th aria-label="Open in store" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSel = selected.includes(r.id)
              const stockTone = r.stock <= 0 ? 'danger' : r.lowStock ? 'warning' : 'success'
              return (
                <tr key={r.id} aria-selected={isSel}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => setSelected((s) => (isSel ? s.filter((x) => x !== r.id) : [...s, r.id]))}
                      aria-label={`Select ${r.name}`}
                    />
                  </td>
                  <td>
                    <div className="tos-product-cell">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {r.image ? <img className="tos-thumb tos-thumb--lg" src={r.image} alt="" /> : <span className="tos-thumb tos-thumb--lg" />}
                      <div>
                        <Link href={`/admin/collections/products/${r.id}`}>{r.name}</Link>
                        <small>
                          {[r.brand, r.category].filter(Boolean).join(' · ')}
                          {r.isDemo && (
                            <>
                              {' '}
                              · <span style={{ color: 'var(--tos-info)', fontWeight: 600 }}>Demo</span>
                            </>
                          )}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="tos-pill tos-pill--plain tos-pill--muted">{TYPE[r.type] ?? r.type}</span>
                  </td>
                  <td>
                    <span className={`tos-pill ${r.status === 'published' ? 'tos-pill--success' : 'tos-pill--muted'}`}>{r.status === 'published' ? 'Active' : 'Draft'}</span>
                    {r.priceTBC && (
                      <span className="tos-pill tos-pill--info tos-pill--plain" style={{ marginLeft: 6 }} title="Price to be confirmed">
                        Price TBC
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`tos-pill tos-pill--${stockTone}`}>{r.stock <= 0 ? 'Sold out' : `${r.stock} in stock`}</span>
                    <small style={{ display: 'block', color: 'var(--tos-muted)', fontSize: 12, marginTop: 4 }}>
                      {r.variants} variant{r.variants === 1 ? '' : 's'}
                    </small>
                  </td>
                  <td className="num">
                    {r.minPrice == null ? '—' : r.maxPrice && r.maxPrice !== r.minPrice ? `${lkr(r.minPrice)} – ${lkr(r.maxPrice)}` : lkr(r.minPrice)}
                    {r.onSale && <small style={{ display: 'block', color: 'var(--tos-rose)', fontSize: 12, fontWeight: 600 }}>On sale</small>}
                  </td>
                  <td className="num" style={{ color: 'var(--tos-muted)', fontSize: 13 }}>
                    {ago(r.updatedAt)}
                  </td>
                  <td>
                    {r.status === 'published' && (
                      <a className="tos-btn tos-btn--ghost tos-btn--sm" href={`/p/${r.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${r.name} in the store`}>
                        <IconExternalLink size={16} />
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected.length > 0 && (
        <div className="tos-bulkbar" role="toolbar" aria-label="Bulk actions">
          <span>{selected.length} selected</span>
          <button className="tos-btn" type="button" disabled={pending} onClick={() => bulk('Published', 'PATCH', { _status: 'published' })}>
            Publish
          </button>
          <button className="tos-btn" type="button" disabled={pending} onClick={() => bulk('Moved to draft', 'PATCH', { _status: 'draft' })}>
            Move to draft
          </button>
          <button className="tos-btn" type="button" disabled={pending} onClick={() => bulk('Prices confirmed', 'PATCH', { priceTBC: false })}>
            Mark prices confirmed
          </button>
          <button className="tos-btn tos-btn--danger" type="button" disabled={pending} onClick={() => bulk('Deleted', 'DELETE')}>
            Delete
          </button>
          <button className="tos-btn" type="button" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}
      {toast && <div className={`tos-toast${toast.error ? ' tos-toast--error' : ''}`}>{toast.text}</div>}
    </>
  )
}
