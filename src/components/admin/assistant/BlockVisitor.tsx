'use client'

import { useAuth, useDocumentInfo } from '@payloadcms/ui'
import { IconBan, IconLockOpen } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'

import { inCidr, isPrivateIp, rangeOf } from '@/lib/assistant/ip'

type Block = { id: number; label: string; type: string; value?: string; customer?: number | { id: number } | null; expiresAt?: string | null; reason?: string | null; hits?: number }
type Target = { type: 'ip' | 'range' | 'visitor' | 'customer'; label: string; value?: string; customer?: number }

const DURATIONS = [
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 24 * 7 },
  { label: '30 days', hours: 24 * 30 },
  { label: 'Until removed', hours: 0 },
]
const until = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const idOf = (v: Block['customer']) => (v && typeof v === 'object' ? v.id : (v ?? null))
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString()

/** Blocks that apply now (no end date, or ending in the future). */
async function fetchBlocks(): Promise<Block[]> {
  const q = new URLSearchParams({ depth: '0', limit: '200', 'where[or][0][expiresAt][exists]': 'false', 'where[or][1][expiresAt][greater_than]': new Date().toISOString() })
  const res = await fetch(`/api/chat-blocks?${q}`, { credentials: 'include' }).catch(() => null)
  return ((await res?.json().catch(() => null))?.docs ?? []) as Block[]
}

/**
 * "Block" card on a chat (sidebar): block the IP, its /24 range, the device or the signed-in customer,
 * and see or lift blocks that already apply. Store managers and admins only; others see the status.
 */
export function BlockVisitor() {
  const { id, initialData } = useDocumentInfo()
  const { user } = useAuth()
  const roles = ((user as { roles?: string[] } | null)?.roles ?? []) as string[]
  const canEdit = roles.some((r) => ['super-admin', 'admin', 'store-manager'].includes(r))
  const ip = String(initialData?.ip ?? '')
  const visitorId = String(initialData?.visitorId ?? '')
  const customerId = idOf(initialData?.customer as Block['customer'])
  const [blocks, setBlocks] = useState<Block[] | null>(null)
  const [hours, setHours] = useState(24)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Bumped after blocking or unblocking, to reload the list
  const [version, setVersion] = useState(0)
  const load = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    fetchBlocks().then((docs) => {
      if (cancelled) return
      setBlocks(
        docs.filter(
          (b) =>
            (b.type === 'ip' && b.value === ip.toLowerCase()) ||
            (b.type === 'range' && ip && b.value && inCidr(ip, b.value)) ||
            (b.type === 'visitor' && b.value === visitorId) ||
            (b.type === 'customer' && customerId && idOf(b.customer) === customerId),
        ),
      )
    })
    return () => {
      cancelled = true
    }
  }, [ip, visitorId, customerId, version])

  const targets: Target[] = [
    ...(ip ? [{ type: 'ip' as const, label: 'Block this IP', value: ip }] : []),
    // Ranges only for public addresses (a local or private range would block nobody useful)
    ...(ip && !isPrivateIp(ip) && rangeOf(ip) ? [{ type: 'range' as const, label: `Block range ${rangeOf(ip)}`, value: rangeOf(ip)! }] : []),
    ...(visitorId ? [{ type: 'visitor' as const, label: 'Block this device', value: visitorId }] : []),
    ...(customerId ? [{ type: 'customer' as const, label: 'Block this customer', customer: customerId }] : []),
  ]

  async function block(t: Target) {
    setBusy(true)
    setError('')
    const res = await fetch('/api/chat-blocks', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: t.type,
        ...(t.value ? { value: t.value } : {}),
        ...(t.customer ? { customer: t.customer } : {}),
        reason: reason.trim() || `Blocked from chat #${id}`,
        conversation: id,
        ...(hours ? { expiresAt: hoursFromNow(hours) } : {}),
      }),
    }).catch(() => null)
    if (!res?.ok) setError((await res?.json().catch(() => null))?.errors?.[0]?.message ?? 'Couldn’t block. Try again.')
    setReason('')
    load()
    setBusy(false)
  }

  async function unblock(b: Block) {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/chat-blocks/${b.id}`, { method: 'DELETE', credentials: 'include' }).catch(() => null)
    if (!res?.ok) setError('Couldn’t remove the block.')
    load()
    setBusy(false)
  }

  return (
    <div className="tos-block">
      {blocks === null ? (
        <p className="tos-block__muted">Checking…</p>
      ) : blocks.length ? (
        <ul className="tos-block__list">
          {blocks.map((b) => (
            <li key={b.id}>
              <span className="tos-pill tos-pill--danger">{b.label}</span>
              <span className="tos-block__muted">
                {b.expiresAt ? `until ${until.format(new Date(b.expiresAt))}` : 'until removed'}
                {b.hits ? ` · ${b.hits} blocked attempts` : ''}
              </span>
              {canEdit && (
                <button type="button" className="tos-btn tos-btn--sm" disabled={busy} onClick={() => unblock(b)}>
                  <IconLockOpen size={15} aria-hidden /> Unblock
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="tos-block__muted">Not blocked.</p>
      )}
      {canEdit && targets.length > 0 && (
        <div className="tos-block__form">
          <label className="tos-block__field">
            <span>For</span>
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))} disabled={busy}>
              {DURATIONS.map((d) => (
                <option key={d.hours} value={d.hours}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="tos-block__field">
            <span>Reason (optional)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. spam, scraping prices" disabled={busy} />
          </label>
          <div className="tos-block__buttons">
            {targets.map((t) => (
              <button key={t.type} type="button" className="tos-btn tos-btn--sm tos-btn--danger" disabled={busy} onClick={() => block(t)}>
                <IconBan size={15} aria-hidden /> {t.label}
              </button>
            ))}
          </div>
          <p className="tos-block__muted">Mobile networks share IP addresses: blocking the device is safest for one person.</p>
        </div>
      )}
      {error && <p className="tos-block__error">{error}</p>}
    </div>
  )
}
