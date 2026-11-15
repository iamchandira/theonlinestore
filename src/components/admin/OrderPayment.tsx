'use client'

import { useAuth, useDocumentInfo } from '@payloadcms/ui'
import { IconCheck, IconExternalLink, IconFileTypePdf, IconX } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'

type Tx = {
  id: number
  reference: string
  method: string
  status: string
  amount: number
  createdAt: string
  signatureValid?: boolean | null
  simulated?: boolean | null
  message?: string | null
  providerRef?: string | null
}
type Slip = {
  id: number
  url?: string | null
  mimeType?: string | null
  filename?: string | null
  status: string
  note?: string | null
  reason?: string | null
  createdAt: string
  sizes?: { preview?: { url?: string | null } }
}
type OrderLite = {
  paymentMethod: string
  paymentStatus: string
  status: string
  totals?: { total?: number }
}

// Slips are private (served with the staff session cookie), so next/image's optimiser can't fetch them
// eslint-disable-next-line @next/next/no-img-element
const SlipImage = ({ src }: { src: string }) => <img src={src} alt="Payment slip" />

const lkr = (n: number) => `Rs ${n.toLocaleString('en-LK')}`
const when = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Colombo',
})
const PAY: Record<string, string> = {
  unpaid: 'Unpaid',
  pending: 'Processing',
  'slip-uploaded': 'Slip to verify',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
}
const TONE: Record<string, string> = {
  paid: 'success',
  'slip-uploaded': 'warning',
  pending: 'info',
  failed: 'danger',
  refunded: 'muted',
  unpaid: 'muted',
}
const TX: Record<string, string> = {
  initiated: 'Started',
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  chargeback: 'Charged back',
  'slip-uploaded': 'Slip sent',
  rejected: 'Slip rejected',
}

/**
 * Payment panel in the order sidebar (Sprint 5): payment state, bank slips with Verify / Reject, staff
 * actions (bank transfer received, cash collected) and every transaction for the order.
 * Actions go to POST /api/orders/:id/payment, which checks roles and writes the transactions log.
 */
export function OrderPayment() {
  const { id } = useDocumentInfo()
  const { user } = useAuth()
  const roles = ((user as { roles?: string[] } | null)?.roles ?? []) as string[]
  const has = (...r: string[]) =>
    roles.some((x) => x === 'super-admin' || x === 'admin' || r.includes(x))
  const [order, setOrder] = useState<OrderLite | null>(null)
  const [txs, setTxs] = useState<Tx[]>([])
  const [slips, setSlips] = useState<Slip[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<number | null>(null)
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const q = (c: string, extra = '') =>
      fetch(`/api/${c}?where[order][equals]=${id}&sort=-createdAt&depth=0&limit=50${extra}`, {
        credentials: 'include',
      }).then((r) => (r.ok ? r.json() : { docs: [] }))
    const [o, t, s] = await Promise.all([
      fetch(`/api/orders/${id}?depth=0`, { credentials: 'include' }).then((r) =>
        r.ok ? r.json() : null,
      ),
      q('transactions'),
      q('payment-slips'),
    ])
    setOrder(o)
    setTxs(t.docs ?? [])
    setSlips(s.docs ?? [])
  }, [id])

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action)
    setError(null)
    const res = await fetch(`/api/orders/${id}/payment`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    setBusy(null)
    if (!json.ok) return setError(json.error ?? 'That didn’t work.')
    // The order form shows status and timeline too: reload so everything is current
    window.location.reload()
  }

  if (!id) return null
  if (!order) return <div className="tos-pay-panel tos-pay-panel--loading">Loading payment…</div>
  const pending = slips.filter((s) => s.status === 'pending')
  const unpaid = order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded'

  return (
    <div className="tos-pay-panel">
      <div className="tos-pay-panel__head">
        <span className="tos-pay-panel__title">Payment</span>
        <span className={`tos-pill tos-pill--${TONE[order.paymentStatus] ?? 'muted'}`}>
          {PAY[order.paymentStatus] ?? order.paymentStatus}
        </span>
      </div>
      <p className="tos-pay-panel__amount">{lkr(order.totals?.total ?? 0)}</p>

      {pending.length > 0 && (
        <p className="tos-pay-panel__hint">
          Check the slip against your bank statement: amount, date and the order number as
          reference.
        </p>
      )}
      {slips.map((s) => (
        <div key={s.id} className="tos-pay-slip">
          <a
            href={s.url ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="tos-pay-slip__thumb"
            aria-label="Open slip in a new tab"
          >
            {s.mimeType === 'application/pdf' ? (
              <IconFileTypePdf size={28} />
            ) : (
              <SlipImage src={s.sizes?.preview?.url ?? s.url ?? ''} />
            )}
          </a>
          <div className="tos-pay-slip__body">
            <span>
              {when.format(new Date(s.createdAt))} ·{' '}
              <strong>
                {s.status === 'pending'
                  ? 'To verify'
                  : s.status === 'verified'
                    ? 'Verified'
                    : 'Rejected'}
              </strong>
            </span>
            {s.note && <span className="tos-pay-muted">“{s.note}”</span>}
            {s.reason && <span className="tos-pay-muted">Reason: {s.reason}</span>}
            <a href={s.url ?? '#'} target="_blank" rel="noreferrer" className="tos-pay-link">
              Open <IconExternalLink size={13} />
            </a>
            {s.status === 'pending' && has('store-manager', 'support') && (
              <div className="tos-pay-actions">
                {rejecting === s.id ? (
                  <>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why? e.g. amount doesn’t match"
                      aria-label="Reason for rejecting"
                      className="tos-pay-input"
                    />
                    <button
                      type="button"
                      className="tos-btn tos-btn--sm tos-btn--danger"
                      disabled={busy !== null || reason.trim().length < 3}
                      onClick={() => void act('reject-slip', { slipId: s.id, reason })}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="tos-btn tos-btn--sm"
                      onClick={() => setRejecting(null)}
                    >
                      Back
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="tos-btn tos-btn--sm tos-btn--primary"
                      disabled={busy !== null}
                      onClick={() => void act('verify-slip', { slipId: s.id })}
                    >
                      <IconCheck size={14} /> Verify
                    </button>
                    <button
                      type="button"
                      className="tos-btn tos-btn--sm"
                      disabled={busy !== null}
                      onClick={() => setRejecting(s.id)}
                    >
                      <IconX size={14} /> Reject
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {unpaid &&
        order.paymentMethod === 'bank-transfer' &&
        pending.length === 0 &&
        has('store-manager') && (
          <button
            type="button"
            className="tos-btn tos-btn--sm tos-btn--block"
            disabled={busy !== null}
            onClick={() =>
              confirm(
                'Mark this bank transfer as received? Only do this once you see it in the bank account.',
              ) && void act('mark-paid')
            }
          >
            Bank transfer received
          </button>
        )}
      {unpaid && order.paymentMethod === 'cod' && has('store-manager', 'order-fulfillment') && (
        <button
          type="button"
          className="tos-btn tos-btn--sm tos-btn--block"
          disabled={busy !== null}
          onClick={() =>
            confirm(`Record ${lkr(order.totals?.total ?? 0)} cash collected for this order?`) &&
            void act('cash-collected')
          }
        >
          Cash collected
        </button>
      )}
      {error && <p className="tos-pay-error">{error}</p>}

      {txs.length > 0 && (
        <details className="tos-pay-txs" open={txs.length <= 3}>
          <summary>Transactions ({txs.length})</summary>
          <ul>
            {txs.map((t) => (
              <li key={t.id}>
                <span className="tos-mono">{t.reference}</span>
                <span>
                  {TX[t.status] ?? t.status} · {lkr(t.amount)}
                  {t.simulated ? ' · test' : ''}
                  {t.signatureValid === false ? ' · signature failed' : ''}
                </span>
                <span className="tos-pay-muted">
                  {when.format(new Date(t.createdAt))}
                  {t.message ? ` · ${t.message}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
