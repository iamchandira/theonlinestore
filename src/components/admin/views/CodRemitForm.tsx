'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Row = {
  id: number
  orderNumber: string
  delivered: string
  tracking: string
  customer: string
  amount: number
}
const lkr = (n: number) => `Rs ${n.toLocaleString('en-LK')}`

/** Tick the orders a courier payment covers, enter its reference, record it (POST /api/orders/cod-remittance). */
export function CodRemitForm({ rows, canRecord }: { rows: Row[]; canRecord: boolean }) {
  const router = useRouter()
  const [selected, setSelected] = useState<number[]>([])
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const total = rows.filter((r) => selected.includes(r.id)).reduce((n, r) => n + r.amount, 0)
  const all = selected.length === rows.length

  const record = async () => {
    setBusy(true)
    setMsg(null)
    const res = await fetch('/api/orders/cod-remittance', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selected, reference }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      recorded?: number
      total?: number
      error?: string
    }
    setBusy(false)
    if (!json.ok) return setMsg({ tone: 'danger', text: json.error ?? 'That didn’t work.' })
    setMsg({
      tone: 'success',
      text: `Recorded ${lkr(json.total ?? 0)} for ${json.recorded} order(s).`,
    })
    setSelected([])
    setReference('')
    router.refresh()
  }

  return (
    <>
      <div className="tos-table-wrap">
        <table className="tos-table">
          <thead>
            <tr>
              {canRecord && (
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={all}
                    onChange={() => setSelected(all ? [] : rows.map((r) => r.id))}
                  />
                </th>
              )}
              <th>Order</th>
              <th>Delivered</th>
              <th>Tracking</th>
              <th>Customer</th>
              <th className="num">Cash</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} aria-selected={selected.includes(r.id)}>
                {canRecord && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.orderNumber}`}
                      checked={selected.includes(r.id)}
                      onChange={() =>
                        setSelected((s) =>
                          s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id],
                        )
                      }
                    />
                  </td>
                )}
                <td>
                  <a
                    href={`/admin/collections/orders/${r.id}`}
                    className="tos-mono"
                    style={{ fontSize: 13 }}
                  >
                    {r.orderNumber}
                  </a>
                </td>
                <td>{r.delivered}</td>
                <td className="tos-mono">{r.tracking || '—'}</td>
                <td>{r.customer}</td>
                <td className="num">{lkr(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canRecord && (
        <div
          className="tos-filters"
          style={{ borderBottom: 0, borderTop: '1px solid var(--tos-line)' }}
        >
          <label>
            Courier’s payment reference
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. bank ref or remittance no."
              style={{
                height: 34,
                minWidth: 240,
                padding: '0 10px',
                border: '1px solid var(--tos-line-strong)',
                borderRadius: 8,
              }}
            />
          </label>
          <button
            type="button"
            className="tos-btn tos-btn--sm tos-btn--primary"
            disabled={busy || !selected.length || reference.trim().length < 3}
            onClick={() => void record()}
          >
            {busy ? 'Recording…' : `Record payment${selected.length ? ` · ${lkr(total)}` : ''}`}
          </button>
          {msg && (
            <span
              style={{
                color: msg.tone === 'success' ? 'var(--tos-success)' : 'var(--tos-danger)',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {msg.text}
            </span>
          )}
        </div>
      )}
    </>
  )
}
