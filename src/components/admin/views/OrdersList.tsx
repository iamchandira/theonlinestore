import { IconCash, IconClockHour4, IconPackage, IconReceipt } from '@tabler/icons-react'
import Link from 'next/link'
import type { ListViewServerProps, Where } from 'payload'

import { ORDER_STATUSES } from '../../../collections/Orders'

const TABS = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'to-process', label: 'To process', statuses: ['processing'] },
  { key: 'awaiting-payment', label: 'Awaiting payment', statuses: ['pending-payment'] },
  { key: 'in-transit', label: 'Packed & shipped', statuses: ['packed', 'shipped', 'out-for-delivery'] },
  { key: 'done', label: 'Delivered', statuses: ['delivered', 'completed'] },
  { key: 'issues', label: 'On hold & cancelled', statuses: ['on-hold', 'cancelled', 'refunded', 'returned', 'failed-delivery'] },
] as const
type TabKey = (typeof TABS)[number]['key']
const PAGE_SIZE = 25

const TONE: Record<string, string> = {
  'pending-payment': 'warning',
  processing: 'info',
  packed: 'brand',
  shipped: 'brand',
  'out-for-delivery': 'brand',
  delivered: 'success',
  completed: 'success',
  'on-hold': 'warning',
  cancelled: 'muted',
  refunded: 'muted',
  returned: 'muted',
  'failed-delivery': 'danger',
}
const lkr = (n: number) => `Rs ${n.toLocaleString('en-LK')}`
const when = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Colombo' })
const startOfToday = () => {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
  return new Date(`${day}T00:00:00+05:30`).toISOString()
}

/** Orders (replaces Payload's default list): status tabs, search, today's numbers. Fulfilment tools arrive in Sprint 6. */
export async function OrdersList(props: ListViewServerProps) {
  const { payload, searchParams } = props as ListViewServerProps & { searchParams?: Record<string, string | string[] | undefined> }
  const sp = (k: string) => {
    const v = searchParams?.[k]
    return (Array.isArray(v) ? v[0] : v) ?? ''
  }
  const tab = (TABS.some((t) => t.key === sp('tab')) ? sp('tab') : 'all') as TabKey
  const q = sp('q').trim().slice(0, 80)
  const page = Math.max(1, Number.parseInt(sp('page') || '1', 10) || 1)

  const base: Where[] = q
    ? [{ or: [{ orderNumber: { like: q.toUpperCase() } }, { 'contact.email': { like: q.toLowerCase() } }, { 'contact.phone': { like: q.replace(/\s/g, '') } }, { 'contact.fullName': { like: q } }] }]
    : []
  const whereFor = (key: TabKey): Where => {
    const t = TABS.find((x) => x.key === key)!
    const parts = [...base, ...(t.statuses ? [{ status: { in: [...t.statuses] } }] : [])]
    return parts.length ? { and: parts } : {}
  }
  const today = startOfToday()
  const [res, todayOrders, ...counts] = await Promise.all([
    payload.find({ collection: 'orders', where: whereFor(tab), sort: '-createdAt', page, limit: PAGE_SIZE, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'orders', where: { and: [{ createdAt: { greater_than_equal: today } }, { status: { not_in: ['cancelled'] } }] }, limit: 0, pagination: false, depth: 0, overrideAccess: true, select: { totals: true } }),
    ...TABS.map((t) => payload.count({ collection: 'orders', where: whereFor(t.key), overrideAccess: true })),
  ])
  const revenueToday = todayOrders.docs.reduce((n, o) => n + (o.totals?.total ?? 0), 0)
  const countOf = (key: TabKey) => counts[TABS.findIndex((t) => t.key === key)].totalDocs

  const href = (o: Record<string, string | number>) => {
    const p = new URLSearchParams()
    const merged = { tab, q, ...o }
    for (const [k, v] of Object.entries(merged)) if (v && !(k === 'tab' && v === 'all') && !(k === 'page' && String(v) === '1')) p.set(k, String(v))
    return `/admin/collections/orders${p.size ? `?${p}` : ''}`
  }

  const kpis = [
    { label: 'Orders today', value: String(todayOrders.docs.length), icon: IconReceipt, tone: '' },
    { label: 'Sales today', value: lkr(revenueToday), icon: IconCash, tone: 'success' },
    { label: 'To process', value: String(countOf('to-process')), icon: IconPackage, tone: countOf('to-process') ? 'warning' : '' },
    { label: 'Awaiting payment', value: String(countOf('awaiting-payment')), icon: IconClockHour4, tone: 'info' },
  ]

  return (
    <div className="tos-page">
      <header className="tos-page__header">
        <div>
          <p className="tos-page__eyebrow">Sales</p>
          <h1 className="tos-page__title">Orders</h1>
          <p className="tos-page__subtitle">Every order from checkout. Totals are calculated by the server and can’t be edited. Packing, couriers and tracking arrive in Sprint 6.</p>
        </div>
      </header>
      <div className="tos-kpis" style={{ marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="tos-card tos-kpi">
            <span className={`tos-kpi__icon${k.tone ? ` tos-kpi__icon--${k.tone}` : ''}`}>
              <k.icon size={19} />
            </span>
            <span className="tos-kpi__label">{k.label}</span>
            <span className="tos-kpi__value">{k.value}</span>
          </div>
        ))}
      </div>
      <section className="tos-card">
        <div className="tos-toolbar">
          <nav className="tos-tabs" aria-label="Filter orders">
            {TABS.map((t, i) => (
              <Link key={t.key} href={href({ tab: t.key, page: 1 })} aria-current={t.key === tab ? 'page' : undefined}>
                {t.label} <em>{counts[i].totalDocs}</em>
              </Link>
            ))}
          </nav>
          <form className="tos-search" role="search" action="/admin/collections/orders">
            {tab !== 'all' && <input type="hidden" name="tab" value={tab} />}
            <input name="q" defaultValue={q} placeholder="Order number, name, email or phone" aria-label="Search orders" />
          </form>
        </div>
        {res.docs.length ? (
          <div className="tos-table-wrap">
            <table className="tos-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Delivery</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {res.docs.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/collections/orders/${o.id}`} className="tos-term-link tos-mono" style={{ fontSize: 13, color: 'var(--tos-ink)' }}>
                        {o.orderNumber}
                      </Link>
                      <small style={{ display: 'block', color: 'var(--tos-muted)', fontSize: 12 }}>
                        {when.format(new Date(o.createdAt))} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s)
                      </small>
                    </td>
                    <td>
                      {o.contact.fullName}
                      <small style={{ display: 'block', color: 'var(--tos-muted)', fontSize: 12 }}>
                        {o.contact.phone} · {o.customer ? 'Account' : 'Guest'}
                      </small>
                    </td>
                    <td>
                      {o.shippingAddress.city}, {o.shippingAddress.district}
                      <small style={{ display: 'block', color: 'var(--tos-muted)', fontSize: 12 }}>{o.delivery?.method === 'same-day' ? 'Same-day' : 'Standard'}{o.gift?.wrap ? ' · Gift wrap' : ''}</small>
                    </td>
                    <td>
                      {o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Bank transfer'}
                      <small style={{ display: 'block' }}>
                        <span className={`tos-pill tos-pill--plain tos-pill--${o.paymentStatus === 'paid' ? 'success' : 'muted'}`}>{o.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}</span>
                      </small>
                    </td>
                    <td>
                      <span className={`tos-pill tos-pill--${TONE[o.status] ?? 'muted'}`}>{ORDER_STATUSES.find((s) => s.value === o.status)?.label ?? o.status}</span>
                    </td>
                    <td className="num">{lkr(o.totals?.total ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="tos-empty">{q || tab !== 'all' ? 'No orders match.' : 'No orders yet. They’ll appear here as soon as shoppers check out.'}</div>
        )}
        <div className="tos-pager">
          <span>{res.totalDocs ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(res.totalDocs, page * PAGE_SIZE)} of ${res.totalDocs}` : ''}</span>
          <span className="tos-actions">
            {res.hasPrevPage && (
              <Link className="tos-btn tos-btn--sm" href={href({ page: page - 1 })}>
                ← Previous
              </Link>
            )}
            {res.hasNextPage && (
              <Link className="tos-btn tos-btn--sm" href={href({ page: page + 1 })}>
                Next →
              </Link>
            )}
          </span>
        </div>
      </section>
    </div>
  )
}
