'use client'

import { useAuth, useDocumentInfo } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

type Ret = {
  id: number
  returnNumber: string
  status: string
  items: { sku: string; name: string; quantity: number; unitRefund?: number | null }[]
  order:
    | {
        id: number
        orderNumber: string
        paymentMethod: string
        totals?: { total?: number }
        refundedTotal?: number | null
      }
    | number
}

const lkr = (n: number) => `Rs ${n.toLocaleString('en-LK')}`
const LABEL: Record<string, string> = {
  requested: 'Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  received: 'Items received',
  refunded: 'Refunded',
  closed: 'Closed',
}
const TONE: Record<string, string> = {
  requested: 'warning',
  approved: 'info',
  received: 'brand',
  refunded: 'success',
  rejected: 'muted',
  closed: 'muted',
}

/**
 * Return panel (Sprint 6, TOS-706) in the return's sidebar: the next step for its status. Approve or reject
 * (with a note to the shopper), mark items received (and back into stock), refund, or close.
 * Calls POST /api/returns/:id/action, which checks roles and the order of steps.
 */
export function ReturnPanel() {
  const { id } = useDocumentInfo()
  const { user } = useAuth()
  const roles = ((user as { roles?: string[] } | null)?.roles ?? []) as string[]
  const has = (...r: string[]) =>
    roles.some((x) => x === 'super-admin' || x === 'admin' || r.includes(x))
  const [ret, setRet] = useState<Ret | null>(null)
  const [note, setNote] = useState('')
  const [restock, setRestock] = useState(true)
  const [amount, setAmount] = useState<number | ''>('')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    const r = await fetch(`/api/returns/${id}?depth=1`, { credentials: 'include' }).then((x) =>
      x.ok ? x.json() : null,
    )
    setRet(r)
    if (r)
      setAmount(
        r.items.reduce(
          (n: number, i: Ret['items'][number]) => n + (i.unitRefund ?? 0) * i.quantity,
          0,
        ),
      )
  }, [id])
  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/returns/${id}/action`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note, ...extra }),
    })
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    setBusy(false)
    if (!json.ok) return setError(json.error ?? 'That didn’t work.')
    window.location.reload()
  }

  if (!id) return null
  if (!ret) return <div className="tos-pay-panel tos-pay-panel--loading">Loading return…</div>
  const order = typeof ret.order === 'object' ? ret.order : null
  const manual = order && (order.paymentMethod === 'bank-transfer' || order.paymentMethod === 'cod')

  return (
    <div className="tos-pay-panel">
      <div className="tos-pay-panel__head">
        <span className="tos-pay-panel__title">Return</span>
        <span className={`tos-pill tos-pill--${TONE[ret.status] ?? 'muted'}`}>
          {LABEL[ret.status] ?? ret.status}
        </span>
      </div>
      {order && (
        <a href={`/admin/collections/orders/${order.id}`} className="tos-pay-link">
          Order {order.orderNumber}
        </a>
      )}
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {ret.items.map((i) => (
          <li key={i.sku}>
            {i.quantity} × {i.name}{' '}
            <span className="tos-pay-muted">({lkr(i.unitRefund ?? 0)} each)</span>
          </li>
        ))}
      </ul>

      {ret.status === 'requested' && has('store-manager', 'support') && (
        <>
          <textarea
            className="tos-pay-input"
            style={{ height: 64, paddingTop: 6 }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note to the shopper (needed to reject)"
            aria-label="Note to the shopper"
          />
          <div className="tos-pay-actions">
            <button
              type="button"
              className="tos-btn tos-btn--sm tos-btn--primary"
              disabled={busy}
              onClick={() => void act('approve')}
            >
              Approve
            </button>
            <button
              type="button"
              className="tos-btn tos-btn--sm"
              disabled={busy || note.trim().length < 3}
              onClick={() => void act('reject')}
            >
              Reject
            </button>
          </div>
        </>
      )}
      {ret.status === 'approved' && has('store-manager', 'support', 'order-fulfillment') && (
        <>
          <label
            className="tos-pay-muted"
            style={{ display: 'flex', gap: 6, alignItems: 'center' }}
          >
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
            />{' '}
            Resellable: put back into stock
          </label>
          <button
            type="button"
            className="tos-btn tos-btn--sm tos-btn--primary tos-btn--block"
            disabled={busy}
            onClick={() => void act('receive', { restock })}
          >
            Items received
          </button>
        </>
      )}
      {ret.status === 'received' && has('store-manager') && (
        <>
          <label className="tos-pay-muted">
            Refund (Rs)
            <input
              type="number"
              className="tos-pay-input"
              value={amount}
              min={1}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </label>
          {manual && (
            <input
              className="tos-pay-input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Bank reference of the refund you sent"
              aria-label="Refund reference"
            />
          )}
          <button
            type="button"
            className="tos-btn tos-btn--sm tos-btn--primary tos-btn--block"
            disabled={busy || !amount || (Boolean(manual) && reference.trim().length < 3)}
            onClick={() => void act('refund', { amount: Number(amount), reference })}
          >
            Refund {amount ? lkr(Number(amount)) : ''}
          </button>
        </>
      )}
      {['requested', 'approved', 'received', 'refunded'].includes(ret.status) &&
        has('store-manager') && (
          <button
            type="button"
            className="tos-btn tos-btn--sm tos-btn--ghost tos-btn--block"
            disabled={busy}
            onClick={() =>
              confirm('Close this return? No further steps can be taken.') && void act('close')
            }
          >
            Close return
          </button>
        )}
      {error && <p className="tos-pay-error">{error}</p>}
    </div>
  )
}
