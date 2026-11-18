'use client'

import { IconDeviceFloppy, IconMinus, IconPlus, IconSearch } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

export type InvRow = {
  productId: number
  product: string
  brand: string
  type: string
  variant: string
  sku: string
  stock: number
  threshold: number
  price: number
  image: string | null
}

const REASONS = [
  ['restock', 'Restock / delivery received'],
  ['count', 'Stock count correction'],
  ['adjustment', 'Manual adjustment'],
  ['damaged', 'Damaged / expired'],
  ['return', 'Customer return'],
] as const

/** Inline stock editor: edit many variants, then save them in one go with a reason and an optional note. */
export function InventoryTable({
  rows,
  initialFilter,
  readOnly = false,
}: {
  rows: InvRow[]
  initialFilter: 'all' | 'low' | 'out'
  readOnly?: boolean
}) {
  const router = useRouter()
  const [filter, setFilter] = useState(initialFilter)
  const [q, setQ] = useState('')
  const [edits, setEdits] = useState<Record<string, number>>({})
  const [reason, setReason] = useState<(typeof REASONS)[number][0]>('restock')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [, start] = useTransition()
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null)

  const value = (r: InvRow) => edits[r.sku] ?? r.stock
  const counts = {
    all: rows.length,
    low: rows.filter((r) => r.stock > 0 && r.stock <= r.threshold).length,
    out: rows.filter((r) => r.stock <= 0).length,
  }
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter === 'low' && !(r.stock > 0 && r.stock <= r.threshold)) return false
      if (filter === 'out' && r.stock > 0) return false
      if (term && !`${r.product} ${r.brand} ${r.sku} ${r.variant}`.toLowerCase().includes(term))
        return false
      return true
    })
  }, [rows, filter, q])

  const dirty = Object.entries(edits).filter(
    ([sku, v]) => rows.find((r) => r.sku === sku)?.stock !== v,
  )
  const set = (sku: string, v: number) =>
    setEdits((e) => ({ ...e, [sku]: Math.max(0, Math.min(99999, Math.floor(v || 0))) }))

  const save = async () => {
    setSaving(true)
    const byProduct = new Map<number, { sku: string; stock: number }[]>()
    for (const [sku, stock] of dirty) {
      const row = rows.find((r) => r.sku === sku)!
      byProduct.set(row.productId, [...(byProduct.get(row.productId) ?? []), { sku, stock }])
    }
    let failed = 0
    for (const [productId, changes] of byProduct) {
      const res = await fetch('/api/products/adjust-stock', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, changes, reason, note }),
      })
      if (!res.ok) failed++
    }
    setSaving(false)
    if (failed) {
      setToast({
        text: `${failed} product(s) couldn’t be saved. Check your permissions.`,
        error: true,
      })
    } else {
      setToast({
        text: `Saved ${dirty.length} change(s). Logged as “${REASONS.find((r) => r[0] === reason)?.[1]}”.`,
      })
      setEdits({})
      setNote('')
      start(() => router.refresh())
    }
    window.setTimeout(() => setToast(null), 3200)
  }

  return (
    <section className="tos-card">
      <div className="tos-toolbar">
        <div className="tos-tabs" role="group" aria-label="Filter variants">
          {(['all', 'low', 'out'] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All variants' : f === 'low' ? 'Low stock' : 'Sold out'}{' '}
              <em>{counts[f]}</em>
            </button>
          ))}
        </div>
        <label className="tos-search">
          <IconSearch size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product, SKU or variant"
            aria-label="Search inventory"
          />
        </label>
      </div>

      <div className="tos-table-wrap">
        <table className="tos-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>SKU</th>
              <th className="num">Price</th>
              <th>Status</th>
              <th className="num">Available</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const v = value(r)
              const changed = v !== r.stock
              const tone = v <= 0 ? 'danger' : v <= r.threshold ? 'warning' : 'success'
              return (
                <tr key={r.sku} className={changed ? 'tos-dirty' : undefined}>
                  <td>
                    <div className="tos-product-cell" style={{ minWidth: 220 }}>
                      {r.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="tos-thumb" src={r.image} alt="" />
                      ) : (
                        <span className="tos-thumb" />
                      )}
                      <div>
                        <Link href={`/admin/collections/products/${r.productId}`}>{r.product}</Link>
                        <small>
                          {r.brand}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>{r.variant}</td>
                  <td className="tos-mono">{r.sku}</td>
                  <td className="num">Rs {r.price.toLocaleString('en-LK')}</td>
                  <td>
                    <span className={`tos-pill tos-pill--${tone}`}>
                      {v <= 0 ? 'Sold out' : v <= r.threshold ? 'Low' : 'In stock'}
                    </span>
                  </td>
                  <td className="num">
                    {readOnly ? (
                      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</strong>
                    ) : (
                      <span className="tos-stepper">
                        <button
                          type="button"
                          onClick={() => set(r.sku, v - 1)}
                          aria-label={`Decrease ${r.product} ${r.variant}`}
                        >
                          <IconMinus size={14} />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={v}
                          onChange={(e) => set(r.sku, Number(e.target.value))}
                          aria-label={`Stock for ${r.product} ${r.variant}`}
                        />
                        <button
                          type="button"
                          onClick={() => set(r.sku, v + 1)}
                          aria-label={`Increase ${r.product} ${r.variant}`}
                        >
                          <IconPlus size={14} />
                        </button>
                      </span>
                    )}
                    {changed && (
                      <small
                        style={{
                          display: 'block',
                          marginTop: 4,
                          fontSize: 12,
                          color: v > r.stock ? 'var(--tos-success)' : 'var(--tos-danger)',
                          fontWeight: 700,
                        }}
                      >
                        {v > r.stock ? '+' : ''}
                        {v - r.stock} (was {r.stock})
                      </small>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!visible.length && <div className="tos-empty">No variants match.</div>}
      </div>

      {dirty.length > 0 && (
        <div className="tos-bulkbar" role="toolbar" aria-label="Save stock changes">
          <span>
            {dirty.length} change{dirty.length === 1 ? '' : 's'}
          </span>
          <select
            className="tos-select"
            value={reason}
            onChange={(e) => setReason(e.target.value as typeof reason)}
            aria-label="Reason"
            style={{ height: 32 }}
          >
            {REASONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional), e.g. GRN-1042"
            aria-label="Note"
            style={{
              height: 32,
              borderRadius: 999,
              border: 0,
              padding: '0 12px',
              font: '500 13px var(--font-body)',
              minWidth: 200,
            }}
          />
          <button
            className="tos-btn tos-btn--primary"
            type="button"
            onClick={save}
            disabled={saving}
          >
            <IconDeviceFloppy size={16} /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="tos-btn" type="button" onClick={() => setEdits({})} disabled={saving}>
            Discard
          </button>
        </div>
      )}
      {toast && (
        <div className={`tos-toast${toast.error ? ' tos-toast--error' : ''}`}>{toast.text}</div>
      )}
    </section>
  )
}
