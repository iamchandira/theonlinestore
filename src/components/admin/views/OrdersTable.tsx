'use client'

import { IconFileInvoice, IconPackage, IconPrinter } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export type OrderRow = {
  id: number
  orderNumber: string
  createdAt: string
  itemCount: number
  customer: string
  phone: string
  account: boolean
  city: string
  sameDay: boolean
  gift: boolean
  method: string
  paymentStatus: string
  paymentLabel: string
  status: string
  statusLabel: string
  tone: string
  tracking: string | null
  total: number
}

const lkr = (n: number) => `Rs ${n.toLocaleString('en-LK')}`
const when = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Colombo',
})
const BULK = [
  { value: 'packed', label: 'Packed' },
  { value: 'out-for-delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'on-hold', label: 'On hold' },
  { value: 'cancelled', label: 'Cancelled' },
]

/** Orders table with selection (TOS-701): bulk status changes (each checked by the lifecycle rules) and printing. */
export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<number[]>([])
  const [status, setStatus] = useState('packed')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{
    tone: 'success' | 'danger'
    text: string
    lines?: string[]
  } | null>(null)
  const all = rows.length > 0 && selected.length === rows.length
  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const print = (doc: 'slip' | 'invoice') =>
    window.open(`/print/orders?ids=${selected.join(',')}&doc=${doc}`, '_blank', 'noopener')

  const apply = async () => {
    setBusy(true)
    setResult(null)
    const res = await fetch('/api/orders/bulk-status', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selected, status }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      updated?: number
      failed?: { orderNumber?: string; error?: string }[]
      error?: string
    }
    setBusy(false)
    if (json.error) return setResult({ tone: 'danger', text: json.error })
    const failed = json.failed ?? []
    setResult({
      tone: failed.length ? 'danger' : 'success',
      text: `${json.updated ?? 0} order${json.updated === 1 ? '' : 's'} updated${failed.length ? `, ${failed.length} not changed:` : '.'}`,
      lines: failed.map((f) => `${f.orderNumber ?? 'Order'}: ${f.error}`),
    })
    setSelected([])
    router.refresh()
  }

  return (
    <>
      {selected.length > 0 && (
        <div className="tos-bulkbar" role="region" aria-label="Bulk actions">
          <strong>{selected.length} selected</strong>
          <label className="tos-bulkbar__field">
            Set status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="tos-select"
            >
              {BULK.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="tos-btn tos-btn--sm tos-btn--primary"
            disabled={busy}
            onClick={() => void apply()}
          >
            <IconPackage size={15} /> {busy ? 'Updating…' : 'Apply'}
          </button>
          <span className="tos-bulkbar__sep" />
          <button type="button" className="tos-btn tos-btn--sm" onClick={() => print('slip')}>
            <IconPrinter size={15} /> Packing slips
          </button>
          <button type="button" className="tos-btn tos-btn--sm" onClick={() => print('invoice')}>
            <IconFileInvoice size={15} /> Invoices
          </button>
          <button
            type="button"
            className="tos-btn tos-btn--sm tos-btn--ghost"
            onClick={() => setSelected([])}
          >
            Clear
          </button>
        </div>
      )}
      {result && (
        <div className={`tos-callout tos-callout--${result.tone}`} role="status">
          {result.text}
          {result.lines?.length ? (
            <ul>
              {result.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      <div className="tos-table-wrap">
        <table className="tos-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  aria-label="Select all orders on this page"
                  checked={all}
                  onChange={() => setSelected(all ? [] : rows.map((r) => r.id))}
                />
              </th>
              <th>Order</th>
              <th>Customer</th>
              <th>Delivery</th>
              <th>Payment</th>
              <th>Status</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} aria-selected={selected.includes(o.id)}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${o.orderNumber}`}
                    checked={selected.includes(o.id)}
                    onChange={() => toggle(o.id)}
                  />
                </td>
                <td>
                  <Link
                    href={`/admin/collections/orders/${o.id}`}
                    className="tos-term-link tos-mono"
                    style={{ fontSize: 13, color: 'var(--tos-ink)' }}
                  >
                    {o.orderNumber}
                  </Link>
                  <small style={{ display: 'block', color: 'var(--tos-muted)', fontSize: 12 }}>
                    {when.format(new Date(o.createdAt))} · {o.itemCount} item(s)
                  </small>
                </td>
                <td>
                  {o.customer}
                  <small style={{ display: 'block', color: 'var(--tos-muted)', fontSize: 12 }}>
                    {o.phone} · {o.account ? 'Account' : 'Guest'}
                  </small>
                </td>
                <td>
                  {o.city}
                  <small style={{ display: 'block', color: 'var(--tos-muted)', fontSize: 12 }}>
                    {o.sameDay ? 'Same-day' : 'Standard'}
                    {o.gift ? ' · Gift wrap' : ''}
                    {o.tracking ? ` · ${o.tracking}` : ''}
                  </small>
                </td>
                <td>
                  {o.method}
                  <small style={{ display: 'block' }}>
                    <span
                      className={`tos-pill tos-pill--plain tos-pill--${o.paymentStatus === 'paid' ? 'success' : o.paymentStatus === 'slip-uploaded' ? 'warning' : 'muted'}`}
                    >
                      {o.paymentLabel}
                    </span>
                  </small>
                </td>
                <td>
                  <span className={`tos-pill tos-pill--${o.tone}`}>{o.statusLabel}</span>
                </td>
                <td className="num">{lkr(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
