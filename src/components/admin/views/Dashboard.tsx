import {
  IconAlertTriangle,
  IconArrowRight,
  IconBox,
  IconCash,
  IconCheck,
  IconCircleDashed,
  IconLayoutDashboard,
  IconMessageStar,
  IconPackageOff,
  IconPackages,
  IconPlus,
  IconReceipt,
  IconTag,
} from '@tabler/icons-react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import { hasRole } from '../../../access/roles'
import { loadPaymentConfig } from '../../../lib/payments/config'

const LKR = (n: number) => `Rs ${Math.round(n).toLocaleString('en-LK')}`
/** Compact money for KPI tiles: Rs 16.7M, Rs 845K */
const LKRc = (n: number) =>
  n >= 1_000_000
    ? `Rs ${(n / 1_000_000).toFixed(1)}M`
    : n >= 10_000
      ? `Rs ${Math.round(n / 1000)}K`
      : LKR(n)
const TYPE_LABEL: Record<string, string> = {
  beauty: 'Beauty',
  fragrance: 'Fragrance',
  footwear: 'Footwear',
  gift: 'Gifts',
  chocolate: 'Chocolates',
  accessory: 'Accessories',
  home: 'Home',
}
const REASON: Record<string, string> = {
  initial: 'Opening stock',
  adjustment: 'Adjustment',
  restock: 'Restock',
  sale: 'Sale',
  return: 'Return',
  damaged: 'Damaged',
  count: 'Stock count',
}

function greeting(d = new Date()) {
  const h = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Colombo',
    }).format(d),
  )
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const relative = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h} h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** The last `days` calendar days in Sri Lanka time (YYYY-MM-DD), oldest first. */
function salesWindow(days: number) {
  const now = Date.now()
  const salesDays = Array.from({ length: days }, (_, i) => new Date(now - (days - 1 - i) * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }))
  return { since: salesDays[0], salesDays }
}

/** Store overview dashboard (replaces Payload's default dashboard). */
export async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const { payload, user } = req
  const name = (
    (user as { fullName?: string } | null)?.fullName ||
    user?.email?.split('@')[0] ||
    'there'
  ).split(' ')[0]

  // TOS-404: each role sees what's relevant to its job (admins and store managers see everything)
  const can = (...roles: Parameters<typeof hasRole>[1][]) =>
    hasRole(user, 'admin', 'store-manager', ...roles)
  const show = {
    sales: can('order-fulfillment', 'support'),
    stock: can('inventory-manager', 'order-fulfillment'),
    activity: can('inventory-manager', 'order-fulfillment', 'support'),
    reviews: can('marketing', 'support'),
    launch: can(),
    mix: can('inventory-manager', 'marketing'),
    stockValue: can('inventory-manager'),
    prices: can(),
    addProduct: can('marketing'),
    adjustStock: can('inventory-manager'),
    content: can('marketing'),
  }

  // Sales: the last 14 days (Sri Lanka time), cancelled orders excluded
  const { since, salesDays } = salesWindow(14)
  const [storeSettings, policies, payCfg] = await Promise.all([
    payload.findGlobal({ slug: 'store-settings', depth: 0 }),
    payload.findGlobal({ slug: 'policies', depth: 0 }),
    loadPaymentConfig(payload),
  ])
  const [all, movements, staff, home, pendingReviews, recentOrders] = await Promise.all([
    payload.find({
      collection: 'products',
      limit: 0,
      pagination: false,
      depth: 1,
      draft: true,
      select: {
        name: true,
        _status: true,
        productType: true,
        priceTBC: true,
        totalStock: true,
        lowStock: true,
        variants: true,
        optionName: true,
        option2Name: true,
      },
    }),
    payload.find({ collection: 'stock-movements', sort: '-createdAt', limit: 8, depth: 1 }),
    payload.count({ collection: 'users', where: { roles: { not_in: ['customer'] } } }),
    payload.findGlobal({ slug: 'home-page', depth: 0 }),
    payload.find({ collection: 'reviews', where: { status: { equals: 'pending' } }, sort: 'createdAt', limit: 4, depth: 1, overrideAccess: true }),
    payload.find({
      collection: 'orders',
      where: { and: [{ createdAt: { greater_than_equal: new Date(`${since}T00:00:00+05:30`).toISOString() } }, { status: { not_in: ['cancelled'] } }] },
      sort: '-createdAt',
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: { orderNumber: true, totals: true, createdAt: true, status: true, contact: true },
    }),
  ])
  const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
  const byDay = new Map(salesDays.map((d) => [d, 0]))
  for (const o of recentOrders.docs) byDay.set(dayKey(o.createdAt), (byDay.get(dayKey(o.createdAt)) ?? 0) + (o.totals?.total ?? 0))
  const revenue14 = [...byDay.values()].reduce((a, b) => a + b, 0)
  const orders14 = recentOrders.docs.length
  const maxDay = Math.max(1, ...byDay.values())

  const products = all.docs
  const published = products.filter((p) => p._status === 'published')
  const outOfStock = published.filter((p) => (p.totalStock ?? 0) <= 0)
  const priceTBC = products.filter((p) => p.priceTBC)
  const retailValue = products.reduce(
    (sum, p) =>
      sum + (p.variants ?? []).reduce((s, v) => s + (v.price ?? 0) * Math.max(0, v.stock ?? 0), 0),
    0,
  )
  const units = products.reduce((sum, p) => sum + (p.totalStock ?? 0), 0)

  // Low-stock variants (not just products), most urgent first
  const lowVariants = products
    .flatMap((p) =>
      (p.variants ?? [])
        .filter((v) => (v.stock ?? 0) <= (v.lowStockThreshold ?? 5))
        .map((v) => {
          const img = v.image && typeof v.image === 'object' ? v.image : null
          return {
            id: `${p.id}-${v.sku}`,
            productId: p.id,
            name: p.name,
            label: [v.label, v.option2].filter(Boolean).join(' / '),
            sku: v.sku,
            stock: v.stock ?? 0,
            image: img?.sizes?.thumb?.url || img?.url || null,
          }
        }),
    )
    .sort((a, b) => a.stock - b.stock)

  const byType = Object.entries(
    published.reduce<Record<string, number>>((acc, p) => {
      const t = p.productType ?? 'beauty'
      acc[t] = (acc[t] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])
  const maxType = Math.max(1, ...byType.map(([, n]) => n))

  const checklist = [
    {
      done: priceTBC.length === 0,
      title: 'Confirm product prices',
      text: `${priceTBC.length} products still marked “price to be confirmed”.`,
      href: '/admin/collections/products?tab=price-tbc',
      cta: 'Review prices',
    },
    {
      done: Boolean(storeSettings.contact?.phone && storeSettings.contact?.email),
      title: 'Add your contact details',
      text: 'Phone, WhatsApp, email, address and social links.',
      href: '/admin/globals/store-settings',
      cta: 'Store details',
    },
    {
      done: Boolean(policies.termsBody && policies.returnsBody && policies.privacyBody),
      title: 'Write your policies',
      text: 'Terms & conditions, returns & refunds, and privacy.',
      href: '/admin/globals/policies',
      cta: 'Edit policies',
    },
    {
      done: (home.rails?.length ?? 0) > 0,
      title: 'Set up the home page',
      text: 'Hero products and product rails.',
      href: '/admin/globals/home-page',
      cta: 'Edit home page',
    },
    {
      done: staff.totalDocs > 1,
      title: 'Invite your team',
      text: 'Give each staff member their own login and role.',
      href: '/admin/collections/users/create',
      cta: 'Add staff',
    },
    {
      done: payCfg.mode === 'live' && Boolean(payCfg.payhere.merchantId) && payCfg.bankTransfer.accounts.length > 0,
      title: 'Connect payments',
      text: `${payCfg.mode === 'live' ? 'Live mode' : 'Still in Test mode'} · ${payCfg.payhere.merchantId ? 'PayHere connected' : 'PayHere not connected'} · ${payCfg.bankTransfer.accounts.length} bank account(s).`,
      href: '/admin/globals/payment-settings',
      cta: 'Payment settings',
    },
  ]
  const doneCount = checklist.filter((c) => c.done).length

  const kpis = [
    {
      label: 'Live products',
      value: published.length.toLocaleString(),
      hint: `${products.length - published.length} drafts`,
      icon: IconBox,
      tone: '',
      href: '/admin/collections/products?tab=active',
    },
    {
      label: 'Low stock',
      value: String(lowVariants.filter((v) => v.stock > 0).length),
      hint: 'variants at or below threshold',
      icon: IconAlertTriangle,
      tone: 'warning',
      href: '/admin/inventory?filter=low',
    },
    {
      label: 'Sold out',
      value: String(outOfStock.length),
      hint: 'products with no stock',
      icon: IconPackageOff,
      tone: 'danger',
      href: '/admin/collections/products?tab=out',
    },
    ...(show.reviews
      ? [
          {
            label: 'Reviews waiting',
            value: String(pendingReviews.totalDocs),
            hint: 'need approval before they appear',
            icon: IconMessageStar,
            tone: pendingReviews.totalDocs ? 'warning' : '',
            href: '/admin/collections/reviews',
          },
        ]
      : []),
    {
      label: 'Stock value',
      value: LKRc(retailValue),
      hint: `${LKR(retailValue)} · ${units.toLocaleString()} units`,
      icon: IconCash,
      tone: 'success',
      href: '/admin/inventory',
    },
    {
      label: 'Prices to confirm',
      value: String(priceTBC.length),
      hint: 'imported with placeholder prices',
      icon: IconTag,
      tone: 'info',
      href: '/admin/collections/products?tab=price-tbc',
    },
  ]

  const KPI_FOR: Record<string, boolean> = {
    'Live products': true,
    'Low stock': show.stock,
    'Sold out': show.stock || show.content,
    'Reviews waiting': show.reviews,
    'Stock value': show.stockValue,
    'Prices to confirm': show.prices,
  }
  const visibleKpis = kpis.filter((k) => KPI_FOR[k.label])

  return (
    <div className="tos-page">
      <section className="tos-hello">
        <div>
          <h1>
            {greeting()}, {name}
          </h1>
          <p>
            {new Intl.DateTimeFormat('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: 'Asia/Colombo',
            }).format(new Date())}{' '}
            · Here’s what needs your attention in the store today.
          </p>
        </div>
        <div className="tos-actions">
          {show.addProduct && (
            <Link className="tos-btn tos-btn--primary" href="/admin/collections/products/create">
              <IconPlus size={17} /> Add product
            </Link>
          )}
          {show.adjustStock && (
            <Link
              className={`tos-btn${show.addProduct ? '' : ' tos-btn--primary'}`}
              href="/admin/inventory"
            >
              <IconPackages size={17} /> Adjust stock
            </Link>
          )}
          {!show.addProduct && show.reviews && (
            <Link className="tos-btn tos-btn--primary" href="/admin/collections/reviews">
              <IconMessageStar size={17} /> Moderate reviews
            </Link>
          )}
        </div>
      </section>

      <div className="tos-kpis">
        {visibleKpis.map((k) => (
          <Link key={k.label} href={k.href} className="tos-card tos-kpi">
            <span className={`tos-kpi__icon${k.tone ? ` tos-kpi__icon--${k.tone}` : ''}`}>
              <k.icon size={19} />
            </span>
            <span className="tos-kpi__label">{k.label}</span>
            <span className="tos-kpi__value">{k.value}</span>
            <span className="tos-kpi__hint">{k.hint}</span>
          </Link>
        ))}
      </div>

      <div className="tos-grid">
        <div className="tos-stack">
          {show.sales && (
            <section className="tos-card" aria-labelledby="d-sales">
              <div className="tos-card__head">
                <h2 id="d-sales">Sales · last 14 days</h2>
                <Link href="/admin/collections/orders">All orders →</Link>
              </div>
              {orders14 ? (
                <div className="tos-card__body tos-stack">
                  <div className="tos-sales-figures">
                    <div>
                      <span className="tos-kpi__label">Revenue</span>
                      <span className="tos-kpi__value">{LKRc(revenue14)}</span>
                    </div>
                    <div>
                      <span className="tos-kpi__label">Orders</span>
                      <span className="tos-kpi__value">{orders14}</span>
                    </div>
                    <div>
                      <span className="tos-kpi__label">Average order</span>
                      <span className="tos-kpi__value">{LKRc(Math.round(revenue14 / orders14))}</span>
                    </div>
                  </div>
                  <div className="tos-daybars" role="img" aria-label={`Daily revenue for the last 14 days, highest ${LKR(maxDay)}`}>
                    {[...byDay].map(([d, v]) => (
                      <span key={d} title={`${d}: ${LKR(v)}`} style={{ height: `${Math.max(3, (v / maxDay) * 100)}%`, opacity: v ? 0.9 : 0.25 }} />
                    ))}
                  </div>
                  <ul className="tos-list">
                    {recentOrders.docs.slice(0, 4).map((o) => (
                      <li key={o.id}>
                        <span className="tos-list__main">
                          <Link href={`/admin/collections/orders/${o.id}`}>{o.orderNumber}</Link>
                          <small>{o.contact?.fullName}</small>
                        </span>
                        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{LKR(o.totals?.total ?? 0)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="tos-empty">
                  <IconReceipt size={28} />
                  <p style={{ margin: '8px 0 0' }}>No orders in the last 14 days yet. Sales, average order value and recent orders appear here.</p>
                </div>
              )}
            </section>
          )}

          {show.stock && (
            <section className="tos-card" aria-labelledby="d-attention">
              <div className="tos-card__head">
                <h2 id="d-attention">Needs attention · stock</h2>
                <Link href="/admin/inventory?filter=low">Open inventory →</Link>
              </div>
              {lowVariants.length ? (
                <ul className="tos-list">
                  {lowVariants.slice(0, 7).map((v) => (
                    <li key={v.id}>
                      {v.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="tos-thumb" src={v.image} alt="" />
                      ) : (
                        <span className="tos-thumb" />
                      )}
                      <span className="tos-list__main">
                        <Link href={`/admin/collections/products/${v.productId}`}>{v.name}</Link>
                        <small>
                          {v.label} · <span className="tos-mono">{v.sku}</span>
                        </small>
                      </span>
                      <span
                        className={`tos-pill ${v.stock <= 0 ? 'tos-pill--danger' : 'tos-pill--warning'}`}
                      >
                        {v.stock <= 0 ? 'Sold out' : `${v.stock} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="tos-empty">All variants are comfortably stocked.</div>
              )}
            </section>
          )}

          {/* Roles focused on reviews always see this card; others only when something is waiting */}
          {show.reviews && (pendingReviews.totalDocs > 0 || !show.stock) && (
            <section className="tos-card" aria-labelledby="d-reviews">
              <div className="tos-card__head">
                <h2 id="d-reviews">Reviews waiting for approval · {pendingReviews.totalDocs}</h2>
                <Link href="/admin/collections/reviews">Moderate →</Link>
              </div>
              {pendingReviews.totalDocs === 0 && <div className="tos-empty">All caught up. New reviews from shoppers will appear here for approval.</div>}
              <ul className="tos-list">
                {pendingReviews.docs.map((r) => (
                  <li key={r.id}>
                    <span className="tos-list__main">
                      <Link href={`/admin/collections/reviews/${r.id}`}>
                        {r.title || r.body.slice(0, 60)}
                      </Link>
                      <small>
                        {'★'.repeat(r.rating)}
                        {'☆'.repeat(5 - r.rating)} · {r.authorName} ·{' '}
                        {r.product && typeof r.product === 'object' ? r.product.name : ''}
                      </small>
                    </span>
                    <span className="tos-pill tos-pill--warning">Waiting</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {show.activity && (
            <section className="tos-card" aria-labelledby="d-activity">
              <div className="tos-card__head">
                <h2 id="d-activity">Recent stock activity</h2>
                <Link href="/admin/collections/stock-movements">Full history →</Link>
              </div>
              {movements.docs.length ? (
                <ul className="tos-list">
                  {movements.docs.map((m) => {
                    const product = typeof m.product === 'object' ? m.product : null
                    const who =
                      typeof m.user === 'object' && m.user
                        ? m.user.fullName || m.user.email
                        : 'System'
                    return (
                      <li key={m.id}>
                        <span
                          className={`tos-change ${m.change >= 0 ? 'tos-change--up' : 'tos-change--down'}`}
                          style={{ width: 44 }}
                        >
                          {m.change > 0 ? `+${m.change}` : m.change}
                        </span>
                        <span className="tos-list__main">
                          {product ? (
                            <Link href={`/admin/collections/products/${product.id}`}>
                              {product.name}
                            </Link>
                          ) : (
                            m.sku
                          )}
                          <small>
                            {m.variantLabel} · {REASON[m.reason] ?? m.reason} · by {who}
                          </small>
                        </span>
                        <small className="tos-mono">{relative(m.createdAt)}</small>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="tos-empty">No stock changes yet.</div>
              )}
            </section>
          )}
        </div>

        <div className="tos-stack">
          {show.launch && (
            <section className="tos-card" aria-labelledby="d-launch">
              <div className="tos-card__head">
                <h2 id="d-launch">Launch checklist</h2>
                <span className="tos-pill tos-pill--brand tos-pill--plain">
                  {doneCount} of {checklist.length}
                </span>
              </div>
              <div style={{ padding: '14px 20px 0' }}>
                <div
                  className="tos-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={checklist.length}
                  aria-valuenow={doneCount}
                  aria-label="Launch readiness"
                >
                  <span style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
                </div>
              </div>
              <ul className="tos-checklist">
                {checklist.map((c) => (
                  <li key={c.title}>
                    <span className={`tos-check${c.done ? ' tos-check--done' : ''}`} aria-hidden>
                      {c.done ? <IconCheck size={14} stroke={3} /> : <IconCircleDashed size={0} />}
                    </span>
                    <span>
                      <strong>{c.title}</strong>
                      <small>{c.done ? 'Done' : c.text}</small>
                      {!c.done && c.href && (
                        <div>
                          <Link href={c.href}>{c.cta} →</Link>
                        </div>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {show.mix && (
            <section className="tos-card" aria-labelledby="d-mix">
              <div className="tos-card__head">
                <h2 id="d-mix">Catalogue mix</h2>
                <Link href="/admin/collections/products">All products →</Link>
              </div>
              <div className="tos-bars">
                {byType.map(([type, n]) => (
                  <div key={type} className="tos-bar">
                    <span>{TYPE_LABEL[type] ?? type}</span>
                    <span className="tos-bar__track">
                      <i style={{ width: `${(n / maxType) * 100}%` }} />
                    </span>
                    <span>{n}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="tos-card" aria-labelledby="d-quick">
            <div className="tos-card__head">
              <h2 id="d-quick">Quick actions</h2>
            </div>
            <div className="tos-quick">
              {show.addProduct && (
                <Link href="/admin/collections/products/create">
                  <IconPlus size={18} /> Add product
                </Link>
              )}
              {show.adjustStock && (
                <Link href="/admin/inventory">
                  <IconPackages size={18} /> Adjust stock
                </Link>
              )}
              {show.content && (
                <Link href="/admin/globals/home-page">
                  <IconLayoutDashboard size={18} /> Edit home page
                </Link>
              )}
              {show.reviews && (
                <Link href="/admin/collections/reviews">
                  <IconMessageStar size={18} /> Moderate reviews
                </Link>
              )}
              {show.content && (
                <Link href="/admin/search-insights">
                  <IconArrowRight size={18} /> Search insights
                </Link>
              )}
              <Link href="/admin/account">
                <IconArrowRight size={18} /> My account
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
