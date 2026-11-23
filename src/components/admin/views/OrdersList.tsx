import { IconCash, IconClockHour4, IconPackage, IconReceipt } from '@tabler/icons-react'
import Link from 'next/link'
import type { ListViewServerProps, Where } from 'payload'

import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../../collections/Orders'
import { PAYMENT_METHODS } from '../../../collections/Transactions'
import { OrdersTable, type OrderRow } from './OrdersTable'
import { CleanListURL } from './CleanListURL'

const TABS = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'to-process', label: 'To process', statuses: ['processing'] },
  { key: 'awaiting-payment', label: 'Awaiting payment', statuses: ['pending-payment'] },
  {
    key: 'in-transit',
    label: 'Packed & shipped',
    statuses: ['packed', 'shipped', 'out-for-delivery'],
  },
  { key: 'done', label: 'Delivered', statuses: ['delivered', 'completed'] },
  {
    key: 'issues',
    label: 'On hold & cancelled',
    statuses: ['on-hold', 'cancelled', 'refunded', 'returned', 'failed-delivery'],
  },
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
const startOfToday = () => {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
  return new Date(`${day}T00:00:00+05:30`).toISOString()
}

/** Orders (replaces Payload's default list): status tabs, search, today's numbers. Fulfilment tools arrive in Sprint 6. */
export async function OrdersList(props: ListViewServerProps) {
  const { payload, searchParams } = props as ListViewServerProps & {
    searchParams?: Record<string, string | string[] | undefined>
  }
  const sp = (k: string) => {
    const v = searchParams?.[k]
    return (Array.isArray(v) ? v[0] : v) ?? ''
  }
  const tab = (TABS.some((t) => t.key === sp('tab')) ? sp('tab') : 'all') as TabKey
  const q = sp('q').trim().slice(0, 80)
  const page = Math.max(1, Number.parseInt(sp('page') || '1', 10) || 1)
  // Filters (TOS-701)
  const pay = PAYMENT_STATUSES.some((p) => p.value === sp('pay')) ? sp('pay') : ''
  const method = PAYMENT_METHODS.some((p) => p.value === sp('method')) ? sp('method') : ''
  const ship = sp('ship') === 'same-day' || sp('ship') === 'standard' ? sp('ship') : ''
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp('from')) ? sp('from') : ''
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp('to')) ? sp('to') : ''
  const filterCount = [pay, method, ship, from, to].filter(Boolean).length

  const base: Where[] = [
    ...(q
      ? [
          {
            or: [
              { orderNumber: { like: q.toUpperCase() } },
              { 'contact.email': { like: q.toLowerCase() } },
              { 'contact.phone': { like: q.replace(/\s/g, '') } },
              { 'contact.fullName': { like: q } },
              { 'shipment.trackingNumber': { like: q } },
            ],
          },
        ]
      : []),
    ...(pay ? [{ paymentStatus: { equals: pay } }] : []),
    ...(method ? [{ paymentMethod: { equals: method } }] : []),
    ...(ship ? [{ 'delivery.method': { equals: ship } }] : []),
    ...(from
      ? [{ createdAt: { greater_than_equal: new Date(`${from}T00:00:00+05:30`).toISOString() } }]
      : []),
    ...(to
      ? [
          {
            createdAt: {
              less_than: new Date(
                new Date(`${to}T00:00:00+05:30`).getTime() + 86_400_000,
              ).toISOString(),
            },
          },
        ]
      : []),
  ]
  const whereFor = (key: TabKey): Where => {
    const t = TABS.find((x) => x.key === key)!
    const parts = [...base, ...(t.statuses ? [{ status: { in: [...t.statuses] } }] : [])]
    return parts.length ? { and: parts } : {}
  }
  const today = startOfToday()
  const [res, todayOrders, ...counts] = await Promise.all([
    payload.find({
      collection: 'orders',
      where: whereFor(tab),
      sort: '-createdAt',
      page,
      limit: PAGE_SIZE,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'orders',
      where: {
        and: [{ createdAt: { greater_than_equal: today } }, { status: { not_in: ['cancelled'] } }],
      },
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: { totals: true },
    }),
    ...TABS.map((t) =>
      payload.count({ collection: 'orders', where: whereFor(t.key), overrideAccess: true }),
    ),
  ])
  const revenueToday = todayOrders.docs.reduce((n, o) => n + (o.totals?.total ?? 0), 0)
  const countOf = (key: TabKey) => counts[TABS.findIndex((t) => t.key === key)].totalDocs

  const href = (o: Record<string, string | number>) => {
    const p = new URLSearchParams()
    const merged = { tab, q, pay, method, ship, from, to, ...o }
    for (const [k, v] of Object.entries(merged))
      if (v && !(k === 'tab' && v === 'all') && !(k === 'page' && String(v) === '1'))
        p.set(k, String(v))
    return `/admin/collections/orders${p.size ? `?${p}` : ''}`
  }

  const kpis = [
    { label: 'Orders today', value: String(todayOrders.docs.length), icon: IconReceipt, tone: '' },
    { label: 'Sales today', value: lkr(revenueToday), icon: IconCash, tone: 'success' },
    {
      label: 'To process',
      value: String(countOf('to-process')),
      icon: IconPackage,
      tone: countOf('to-process') ? 'warning' : '',
    },
    {
      label: 'Awaiting payment',
      value: String(countOf('awaiting-payment')),
      icon: IconClockHour4,
      tone: 'info',
    },
  ]

  return (
    <div className="tos-page">
      <CleanListURL href={href({ page })} />
      <header className="tos-page__header">
        <div>
          <p className="tos-page__eyebrow">Sales</p>
          <h1 className="tos-page__title">Orders</h1>
          <p className="tos-page__subtitle">
            Every order from checkout. Totals are calculated by the server and can’t be edited.
            Select orders to change their status or print packing slips and invoices.
          </p>
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
              <Link
                key={t.key}
                href={href({ tab: t.key, page: 1 })}
                aria-current={t.key === tab ? 'page' : undefined}
              >
                {t.label} <em>{counts[i].totalDocs}</em>
              </Link>
            ))}
          </nav>
          <form className="tos-search" role="search" action="/admin/collections/orders">
            {tab !== 'all' && <input type="hidden" name="tab" value={tab} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Order number, name, phone or tracking no."
              aria-label="Search orders"
            />
          </form>
        </div>
        <form className="tos-filters" action="/admin/collections/orders">
          {tab !== 'all' && <input type="hidden" name="tab" value={tab} />}
          {q && <input type="hidden" name="q" value={q} />}
          <label>
            Payment
            <select name="pay" defaultValue={pay} className="tos-select">
              <option value="">Any</option>
              {PAYMENT_STATUSES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Method
            <select name="method" defaultValue={method} className="tos-select">
              <option value="">Any</option>
              {PAYMENT_METHODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Delivery
            <select name="ship" defaultValue={ship} className="tos-select">
              <option value="">Any</option>
              <option value="standard">Standard</option>
              <option value="same-day">Same-day</option>
            </select>
          </label>
          <label>
            From
            <input type="date" name="from" defaultValue={from} />
          </label>
          <label>
            To
            <input type="date" name="to" defaultValue={to} />
          </label>
          <button type="submit" className="tos-btn tos-btn--sm tos-btn--dark">
            Filter
          </button>
          {filterCount > 0 && (
            <Link
              className="tos-btn tos-btn--sm tos-btn--ghost"
              href={`/admin/collections/orders${tab !== 'all' ? `?tab=${tab}` : ''}`}
            >
              Clear {filterCount}
            </Link>
          )}
        </form>
        {res.docs.length ? (
          <OrdersTable
            rows={res.docs.map((o): OrderRow => ({
              id: o.id,
              orderNumber: o.orderNumber,
              createdAt: o.createdAt,
              itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
              customer: o.contact.fullName,
              phone: o.contact.phone,
              account: Boolean(o.customer),
              city: `${o.shippingAddress.city}, ${o.shippingAddress.district}`,
              sameDay: o.delivery?.method === 'same-day',
              gift: Boolean(o.gift?.wrap),
              method:
                PAYMENT_METHODS.find((m) => m.value === o.paymentMethod)?.label ?? o.paymentMethod,
              paymentStatus: o.paymentStatus,
              paymentLabel:
                PAYMENT_STATUSES.find((p) => p.value === o.paymentStatus)?.label ?? o.paymentStatus,
              status: o.status,
              statusLabel: ORDER_STATUSES.find((st) => st.value === o.status)?.label ?? o.status,
              tone: TONE[o.status] ?? 'muted',
              tracking: o.shipment?.trackingNumber ?? null,
              total: o.totals?.total ?? 0,
            }))}
          />
        ) : (
          <div className="tos-empty">
            {q || tab !== 'all' || filterCount
              ? 'No orders match.'
              : 'No orders yet. They’ll appear here as soon as shoppers check out.'}
          </div>
        )}
        <div className="tos-pager">
          <span>
            {res.totalDocs
              ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(res.totalDocs, page * PAGE_SIZE)} of ${res.totalDocs}`
              : ''}
          </span>
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
