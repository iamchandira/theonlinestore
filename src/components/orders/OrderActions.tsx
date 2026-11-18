'use client'

import { IconArrowBackUp, IconRepeat } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { reorderAction } from '@/app/(frontend)/orders/actions'
import { Button } from '@/components/ui/Button'
import { useShop, type CartLine } from '@/lib/store/shop'

/** One-tap reorder (TOS-305): adds this order's items to the bag at today's prices, then opens the bag. */
export function ReorderButton({ orderNumber, token }: { orderNumber: string; token: string }) {
  const { lines, setLinesFromServer, setCartOpen } = useShop()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const go = async () => {
    setBusy(true)
    setNote(null)
    const res = await reorderAction(orderNumber, token)
    setBusy(false)
    if ('error' in res) return setNote(res.error)
    if (!res.views.length) return setNote('These items are sold out right now.')
    const merged = new Map(lines.map((l) => [l.sku, { ...l }]))
    for (const v of res.views as unknown as CartLine[]) {
      const cur = merged.get(v.sku)
      merged.set(v.sku, cur ? { ...v, qty: Math.min(v.stock, cur.qty + v.qty) } : v)
    }
    setLinesFromServer([...merged.values()])
    if (res.issues.length) setNote(res.issues.map((i) => i.message).join(' '))
    setCartOpen(true)
  }
  return (
    <div className="flex flex-col gap-1">
      <Button variant="dark" onClick={() => void go()} loading={busy} disabled={busy}>
        <IconRepeat size={18} /> Buy again
      </Button>
      {note && <p className="text-sm text-ink-600">{note}</p>}
    </div>
  )
}

type Item = { sku: string; name: string; variant?: string | null; left: number; food: boolean }
const REASONS = [
  { value: 'damaged', label: 'Arrived damaged or faulty' },
  { value: 'wrong-item', label: 'Wrong item sent' },
  { value: 'size', label: 'Doesn’t fit (footwear)' },
  { value: 'changed-mind', label: 'Changed my mind (unopened)' },
  { value: 'other', label: 'Something else' },
]

/** Return request (TOS-706): choose items and quantities, a reason, and a few words. */
export function ReturnRequest({
  orderNumber,
  token,
  items,
  until,
}: {
  orderNumber: string
  token: string
  items: Item[]
  until: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const returnable = items.filter((i) => i.left > 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await fetch('/api/returns/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber,
        t: token,
        items: Object.entries(qty).map(([sku, q]) => ({ sku, qty: q })),
        reason,
        details,
      }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      returnNumber?: string
      error?: string
    }
    setBusy(false)
    if (!json.ok) return setError(json.error ?? 'That didn’t work. Please try again.')
    setDone(json.returnNumber ?? 'sent')
    router.refresh()
  }

  if (done)
    return (
      <p role="status" className="rounded-xl bg-success-50 px-4 py-3 text-sm text-success-600">
        Return <strong>{done}</strong> requested. We’ll reply by email within one working day.
      </p>
    )
  if (!returnable.length) return null
  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <IconArrowBackUp size={18} /> Return items
      </Button>
    )
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5"
    >
      <div>
        <h3 className="text-lg font-bold">Return items</h3>
        <p className="text-sm text-ink-600">
          Until {until}. Unopened items, or anything damaged or wrong. Some items can’t be returned (see our returns policy).
        </p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Which items?</legend>
        {items.map((i) => (
          <label
            key={i.sku}
            className={`flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm ${i.left ? '' : 'opacity-50'}`}
          >
            <span className="min-w-0">
              <span className="font-semibold">{i.name}</span>
              {i.variant ? <span className="text-ink-500"> · {i.variant}</span> : null}
              {i.food ? (
                <span className="block text-xs text-ink-500">Can’t be returned</span>
              ) : !i.left ? (
                <span className="block text-xs text-ink-500">Already requested</span>
              ) : null}
            </span>
            {i.left > 0 && (
              <select
                aria-label={`Quantity of ${i.name} to return`}
                value={qty[i.sku] ?? 0}
                onChange={(e) => setQty({ ...qty, [i.sku]: Number(e.target.value) })}
                className="h-10 rounded-lg border border-line-strong px-2"
              >
                {Array.from({ length: i.left + 1 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            )}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Reason
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          className="h-12 rounded-lg border border-line-strong px-3 font-normal"
        >
          <option value="">Choose a reason</option>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Tell us more{' '}
        {reason === 'changed-mind' || reason === 'size' ? (
          <span className="font-normal text-ink-500">(optional)</span>
        ) : null}
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          maxLength={1000}
          className="rounded-lg border border-line-strong px-3 py-2 font-normal"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button
          type="submit"
          loading={busy}
          disabled={busy || !Object.values(qty).some((n) => n > 0) || !reason}
        >
          Request return
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
